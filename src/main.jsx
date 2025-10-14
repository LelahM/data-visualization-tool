const App = () => {
  const [data, setData] = React.useState([]);
  const [filteredData, setFilteredData] = React.useState([]);
  const [chartType, setChartType] = React.useState('bar');
  const [columns, setColumns] = React.useState([]);
  const [selectedColumns, setSelectedColumns] = React.useState({ x: '', y: '' });
  const [filters, setFilters] = React.useState({});
  const [savedVisualizations, setSavedVisualizations] = React.useState(
    JSON.parse(localStorage.getItem('savedVisualizations') || '[]')
  );
  const chartRef = React.useRef(null);
  const [chart, setChart] = React.useState(null);
  const [activeFilters, setActiveFilters] = React.useState({});
  const [rangeFilters, setRangeFilters] = React.useState({});
  const [selectedCategories, setSelectedCategories] = React.useState({});
  const [highlightedData, setHighlightedData] = React.useState(null);
  const [showFilterPanel, setShowFilterPanel] = React.useState(false);
  const [dataStats, setDataStats] = React.useState({});
  const [darkMode, setDarkMode] = React.useState(false);
  const colorThemes = [
    {
      name: 'Purple Dream',
      background: 'bg-purple-400', // slightly darker purple
      chart: ['#a78bfa', '#c084fc', '#fbbf24', '#34d399', '#60a5fa'],
      text: 'text-white',
    },
    {
      name: 'Navy Blue',
      background: 'bg-blue-900', // navy blue
      chart: ['#1e3a8a', '#2563eb', '#60a5fa', '#818cf8', '#fbbf24'],
      text: 'text-white',
    },
    {
      name: 'Classic Pink',
      background: 'bg-pink-600', // ultra pink
      chart: ['#db2777', '#f472b6', '#be185d', '#fbbf24', '#60a5fa'],
      text: 'text-white',
    },
  ];
  const [themeIdx, setThemeIdx] = React.useState(0);
  const theme = colorThemes[themeIdx];
  const [showHelp, setShowHelp] = React.useState(false);
  const [annotation, setAnnotation] = React.useState({ show: false, x: '', y: '', note: '' });
  const [annotations, setAnnotations] = React.useState([]);

  // --- New state for advanced data organization ---
  const [columnSearch, setColumnSearch] = React.useState('');
  const [visibleColumns, setVisibleColumns] = React.useState([]);
  const [pinnedColumns, setPinnedColumns] = React.useState([]);
  const [sortConfig, setSortConfig] = React.useState({ key: '', direction: 'asc' });
  const [groupBy, setGroupBy] = React.useState('');
  const [page, setPage] = React.useState(1);
  const [rowsPerPage, setRowsPerPage] = React.useState(20);
  const [globalSearch, setGlobalSearch] = React.useState('');

  // --- Update visible columns when columns change ---
  React.useEffect(() => {
    setVisibleColumns(columns);
  }, [columns]);

  // --- Column search and hide/show logic ---
  const filteredColumns = columns.filter(col => col.toLowerCase().includes(columnSearch.toLowerCase()));
  const toggleColumnVisibility = (col) => {
    setVisibleColumns(prev => prev.includes(col) ? prev.filter(c => c !== col) : [...prev, col]);
  };
  const togglePinColumn = (col) => {
    setPinnedColumns(prev => prev.includes(col) ? prev.filter(c => c !== col) : [...prev, col]);
  };

  // --- Sorting logic ---
  const handleSort = (col) => {
    setSortConfig(prev => prev.key === col ? { key: col, direction: prev.direction === 'asc' ? 'desc' : 'asc' } : { key: col, direction: 'asc' });
  };
  let sortedData = [...filteredData];
  if (sortConfig.key) {
    sortedData.sort((a, b) => {
      if (a[sortConfig.key] < b[sortConfig.key]) return sortConfig.direction === 'asc' ? -1 : 1;
      if (a[sortConfig.key] > b[sortConfig.key]) return sortConfig.direction === 'asc' ? 1 : -1;
      return 0;
    });
  }

  // --- Global search logic ---
  let searchedData = sortedData;
  if (globalSearch) {
    searchedData = sortedData.filter(row =>
      visibleColumns.some(col => String(row[col]).toLowerCase().includes(globalSearch.toLowerCase()))
    );
  }

  // --- Grouping logic ---
  let groupedData = {};
  let groupedKeys = [];
  if (groupBy && visibleColumns.includes(groupBy)) {
    groupedData = searchedData.reduce((acc, row) => {
      const key = row[groupBy] || 'Other';
      if (!acc[key]) acc[key] = [];
      acc[key].push(row);
      return acc;
    }, {});
    groupedKeys = Object.keys(groupedData);
  }

  // --- Pagination logic ---
  const totalRows = groupBy ? groupedKeys.reduce((sum, key) => sum + groupedData[key].length, 0) : searchedData.length;
  const totalPages = Math.max(1, Math.ceil(totalRows / rowsPerPage));
  const paginatedData = groupBy
    ? groupedKeys.flatMap(key => groupedData[key]).slice((page - 1) * rowsPerPage, page * rowsPerPage)
    : searchedData.slice((page - 1) * rowsPerPage, page * rowsPerPage);

  // --- Export filtered data as CSV ---
  const exportFilteredCSV = () => {
    const rows = [visibleColumns.join(',')].concat(
      searchedData.map(row => visibleColumns.map(col => JSON.stringify(row[col] ?? '')).join(','))
    );
    const csv = rows.join('\n');
    const blob = new Blob([csv], { type: 'text/csv' });
    const link = document.createElement('a');
    link.href = URL.createObjectURL(blob);
    link.download = 'filtered_data.csv';
    link.click();
  };

  const calculateDataStats = (data) => {
    const stats = {};
    columns.forEach(column => {
      if (typeof data[0][column] === 'number') {
        stats[column] = {
          min: Math.min(...data.map(d => d[column])),
          max: Math.max(...data.map(d => d[column])),
          avg: data.reduce((sum, d) => sum + d[column], 0) / data.length
        };
      } else {
        const categories = [...new Set(data.map(d => d[column]))];
        stats[column] = {
          categories,
          counts: categories.reduce((acc, cat) => {
            acc[cat] = data.filter(d => d[column] === cat).length;
            return acc;
          }, {})
        };
      }
    });
    setDataStats(stats);
  };

  const parseCSV = (file) => {
    // Support both File and {name, text} object
    if (file.text) {
      // Custom object from ZIP handler
      file.text().then(csvText => {
        const lines = csvText.split('\n');
        const headers = lines[0].split(',').map(h => h.trim());
        setColumns(headers);
        setSelectedColumns({ x: headers[0], y: headers[1] });
        const parsedData = lines.slice(1)
          .filter(line => line.trim() !== '')
          .map(line => {
            const values = line.split(',');
            const row = {};
            headers.forEach((header, index) => {
              const value = values[index]?.trim();
              row[header] = isNaN(value) ? value : parseFloat(value);
            });
            return row;
          });
        setData(parsedData);
        setFilteredData(parsedData);
        calculateDataStats(parsedData);
        initializeFilters(headers, parsedData);
      });
      return;
    }
    const reader = new FileReader();
    reader.onload = (event) => {
      const csvText = event.target.result;
      const lines = csvText.split('\n');
      const headers = lines[0].split(',').map(h => h.trim());
      setColumns(headers);
      setSelectedColumns({ x: headers[0], y: headers[1] });
      
      const parsedData = lines.slice(1)
        .filter(line => line.trim() !== '')
        .map(line => {
          const values = line.split(',');
          const row = {};
          headers.forEach((header, index) => {
            const value = values[index]?.trim();
            row[header] = isNaN(value) ? value : parseFloat(value);
          });
          return row;
        });
      setData(parsedData);
      setFilteredData(parsedData);
      calculateDataStats(parsedData);
      initializeFilters(headers, parsedData);
    };
    reader.readAsText(file);
  };

  const initializeFilters = (headers, data) => {
    const newRangeFilters = {};
    const newCategoryFilters = {};

    headers.forEach(header => {
      const values = data.map(row => row[header]);
      if (typeof values[0] === 'number') {
        newRangeFilters[header] = {
          min: Math.min(...values),
          max: Math.max(...values),
          currentMin: Math.min(...values),
          currentMax: Math.max(...values)
        };
      } else {
        newCategoryFilters[header] = [...new Set(values)];
      }
    });

    setRangeFilters(newRangeFilters);
    setSelectedCategories(newCategoryFilters);
  };

  const applyFilters = React.useCallback(() => {
    let result = [...data];

    // Apply range filters
    Object.entries(rangeFilters).forEach(([column, range]) => {
      result = result.filter(row => 
        row[column] >= range.currentMin && row[column] <= range.currentMax
      );
    });

    // Apply category filters
    Object.entries(selectedCategories).forEach(([column, categories]) => {
      if (categories && categories.length > 0) {
        result = result.filter(row => categories.includes(row[column]));
      }
    });

    setFilteredData(result);
  }, [data, rangeFilters, selectedCategories]);

  React.useEffect(() => {
    applyFilters();
  }, [rangeFilters, selectedCategories, applyFilters]);

  const saveVisualization = () => {
    const visualization = {
      id: Date.now(),
      name: prompt('Enter a name for this visualization:'),
      chartType,
      selectedColumns,
      filters
    };
    
    if (visualization.name) {
      const updated = [...savedVisualizations, visualization];
      setSavedVisualizations(updated);
      localStorage.setItem('savedVisualizations', JSON.stringify(updated));
    }
  };

  const loadVisualization = (saved) => {
    setChartType(saved.chartType);
    setSelectedColumns(saved.selectedColumns);
    setFilters(saved.filters);
  };

  const handleChartClick = (e) => {
    if (!chart) return;
    const points = chart.getElementsAtEventForMode(e.nativeEvent, 'nearest', { intersect: true }, true);
    if (points.length) {
      const idx = points[0].index;
      setAnnotation({ show: true, x: filteredData[idx][selectedColumns.x], y: filteredData[idx][selectedColumns.y], note: '' });
    }
  };

  const saveAnnotation = () => {
    setAnnotations(prev => [...prev, { ...annotation }]);
    setAnnotation({ show: false, x: '', y: '', note: '' });
  };

  React.useEffect(() => {
    if (chartRef.current && filteredData.length > 0 && selectedColumns.x && selectedColumns.y) {
      const ctx = chartRef.current.getContext('2d');
      if (chart) chart.destroy();
      // --- Chart.js background plugin for white background ---
      const whiteBgPlugin = {
        id: 'white-bg',
        beforeDraw: (chart) => {
          const ctx = chart.ctx;
          ctx.save();
          ctx.globalCompositeOperation = 'destination-over';
          ctx.fillStyle = '#fff';
          ctx.fillRect(0, 0, chart.width, chart.height);
          ctx.restore();
        }
      };
      // --- Pie chart config ---
      const isPie = chartType === 'pie' || chartType === 'doughnut';
      const chartConfig = {
        type: chartType,
        data: {
          labels: filteredData.map(item => String(item[selectedColumns.x])),
          datasets: [{
            label: selectedColumns.y,
            data: filteredData.map(item => parseFloat(item[selectedColumns.y])),
            backgroundColor: isPie ? theme.chart : theme.chart,
            borderColor: isPie ? '#fff' : theme.chart,
            borderWidth: isPie ? 2 : 3,
            pointRadius: isPie ? 0 : 7,
            pointHoverRadius: isPie ? 0 : 12,
            pointBackgroundColor: isPie ? undefined : theme.chart[0],
            pointBorderColor: isPie ? undefined : '#fff',
            pointBorderWidth: isPie ? undefined : 2,
          }],
        },
        options: {
          responsive: true,
          animation: { duration: 600, easing: 'easeOutQuart' },
          plugins: {
            tooltip: {
              enabled: true,
              callbacks: {
                label: (ctx) => isPie
                  ? `${ctx.label}: ${ctx.parsed} (${selectedColumns.y})`
                  : `${selectedColumns.y}: ${ctx.parsed.y} (${selectedColumns.x}: ${ctx.label})`,
              },
              backgroundColor: '#fff',
              titleColor: theme.chart[0],
              bodyColor: '#333',
              borderColor: theme.chart[0],
              borderWidth: 2,
              padding: 14,
              titleFont: { weight: 'bold', size: 16 },
              bodyFont: { size: 15 },
            },
            legend: { labels: { color: darkMode ? '#fff' : '#333', font: { weight: 'bold', size: 16 } } },
            datalabels: {
              display: true,
              color: darkMode ? '#fff' : '#222',
              font: { weight: 'bold', size: 14 },
              anchor: isPie ? 'center' : 'end',
              align: isPie ? 'center' : 'top',
              formatter: (value, ctx) => isPie ? value : value,
            },
          },
          scales: isPie ? undefined : {
            y: {
              beginAtZero: true,
              ticks: { color: darkMode ? '#fff' : '#333', font: { weight: 'bold', size: 15 } },
              grid: { color: darkMode ? '#444' : '#e5e7eb', lineWidth: 1.5 },
              title: { display: true, text: selectedColumns.y, color: theme.chart[0], font: { weight: 'bold', size: 16 } },
            },
            x: {
              ticks: { color: darkMode ? '#fff' : '#333', font: { weight: 'bold', size: 15 } },
              grid: { color: darkMode ? '#444' : '#e5e7eb', lineWidth: 1.5 },
              title: { display: true, text: selectedColumns.x, color: theme.chart[0], font: { weight: 'bold', size: 16 } },
            },
          },
          onClick: handleChartClick,
        },
        plugins: [whiteBgPlugin, {
          id: 'annotations',
          afterDraw: (chart) => {
            const ctx = chart.ctx;
            annotations.forEach(a => {
              const idx = chart.data.labels.indexOf(a.x);
              if (idx !== -1) {
                const meta = chart.getDatasetMeta(0);
                const pt = meta.data[idx];
                if (pt) {
                  ctx.save();
                  ctx.beginPath();
                  ctx.arc(pt.x, pt.y, 12, 0, 2 * Math.PI);
                  ctx.fillStyle = 'rgba(245, 158, 11, 0.5)';
                  ctx.fill();
                  ctx.font = 'bold 12px sans-serif';
                  ctx.fillStyle = '#f59e42';
                  ctx.fillText('📝', pt.x - 8, pt.y - 16);
                  ctx.restore();
                }
              }
            });
          }
        }],
      };
      const newChart = new Chart(ctx, chartConfig);
      setChart(newChart);
      return () => newChart.destroy();
    }
  }, [filteredData, chartType, selectedColumns, themeIdx, darkMode, annotations]);

  // Add JSZip for ZIP file support
  const JSZip = window.JSZip;

  // Helper to handle ZIP file upload
  const handleZipUpload = async (file) => {
    try {
      const arrayBuffer = await file.arrayBuffer();
      const zip = await JSZip.loadAsync(arrayBuffer);
      // Find the first CSV file in the ZIP
      const csvFile = Object.values(zip.files).find(f => f.name.endsWith('.csv'));
      if (!csvFile) {
        alert('No CSV file found in the ZIP.');
        return;
      }
      const csvText = await csvFile.async('text');
      // Use the same CSV parsing logic, but pass a File-like object
      const fakeFile = new File([csvText], csvFile.name, { type: 'text/csv' });
      parseCSV(fakeFile);
    } catch (err) {
      alert('Failed to extract CSV from ZIP: ' + err.message);
    }
  };

  // Update file upload handler to support ZIP
  const handleFileUpload = async (event) => {
    const file = event.target.files[0];
    if (!file) return;
    if (file.name.endsWith('.zip')) {
      if (!window.JSZip) {
        alert('ZIP support requires JSZip.');
        return;
      }
      await handleZipUpload(file);
      return;
    }
    if (!file.name.endsWith('.csv')) {
      alert('Unsupported file type. Please upload a CSV or ZIP file.');
      return;
    }
    parseCSV(file);
  };

  // Theme and dark mode effect
  React.useEffect(() => {
    const html = document.documentElement;
    // Remove all theme background/text classes
    colorThemes.forEach(t => {
      html.classList.remove(t.background, t.text);
    });
    // Add current theme classes
    html.classList.add(theme.background, theme.text);
    // Handle dark mode
    if (darkMode) {
      html.classList.add('dark');
    } else {
      html.classList.remove('dark');
    }
  }, [themeIdx, darkMode]);

  // Chart export handlers
  const exportChart = (type = 'png') => {
    if (!chartRef.current) return;
    const chartInstance = chart;
    if (!chartInstance) return;
    if (type === 'png') {
      const url = chartInstance.toBase64Image('image/png', 1);
      const link = document.createElement('a');
      link.href = url;
      link.download = 'chart.png';
      link.click();
    } else if (type === 'svg') {
      // Chart.js does not natively support SVG export, so show a message
      alert('SVG export is not supported by Chart.js natively.');
    }
  };

  // --- New: Export chart data as CSV ---
  const exportChartDataCSV = () => {
    if (!filteredData.length || !selectedColumns.x || !selectedColumns.y) return;
    const rows = [[selectedColumns.x, selectedColumns.y]];
    filteredData.forEach(row => {
      rows.push([row[selectedColumns.x], row[selectedColumns.y]]);
    });
    const csv = rows.map(r => r.join(',')).join('\n');
    const blob = new Blob([csv], { type: 'text/csv' });
    const link = document.createElement('a');
    link.href = URL.createObjectURL(blob);
    link.download = 'chart_data.csv';
    link.click();
  };

  // --- New: Copy chart image to clipboard ---
  const copyChartToClipboard = async () => {
    if (!chartRef.current) return;
    try {
      const canvas = chartRef.current;
      canvas.toBlob(async (blob) => {
        if (blob) {
          await navigator.clipboard.write([
            new window.ClipboardItem({ 'image/png': blob })
          ]);
          alert('Chart image copied to clipboard!');
        }
      }, 'image/png');
    } catch (err) {
      alert('Copy to clipboard failed: ' + err.message);
    }
  };

  return (
    <div className={`min-h-screen py-8 px-4 transition-colors duration-300 ${theme.background} ${theme.text} ${darkMode ? 'dark' : ''}`}>
      <div className="max-w-7xl mx-auto">
        {/* Top Bar with Dark Mode, Theme, Help */}
        <div className="flex justify-between items-center mb-4">
          <div className="flex gap-2">
            <select
              value={themeIdx}
              onChange={e => setThemeIdx(Number(e.target.value))}
              className={`rounded px-2 py-1 border ${darkMode ? 'bg-gray-900 border-gray-700 text-purple-200' : 'border-purple-200 bg-white text-purple-700'} shadow`}
              aria-label="Select color theme"
            >
              {colorThemes.map((t, i) => (
                <option key={t.name} value={i}>{t.name}</option>
              ))}
            </select>
          </div>
          <div className="flex gap-2">
            <button
              onClick={() => setShowHelp(true)}
              className={`px-3 py-1 rounded-full ${darkMode ? 'bg-gray-800 text-purple-200 hover:bg-gray-700' : 'bg-purple-100 text-purple-700 hover:bg-purple-200'} shadow transition`}
              aria-label="Show help"
            >
              ❓ Help
            </button>
            <button
              onClick={() => setDarkMode(dm => !dm)}
              className={`px-4 py-2 rounded-full ${darkMode ? 'bg-gray-800 text-purple-200 hover:bg-gray-700' : 'bg-purple-100 text-purple-700 hover:bg-purple-200'} shadow transition-colors duration-200`}
              aria-label="Toggle dark mode"
            >
              {darkMode ? '🌙 Dark' : '☀️ Light'} Mode
            </button>
          </div>
        </div>
        {/* Introduction Section */}
        <div className="text-center mb-12">
          <h1 className="text-5xl font-extrabold mb-4 text-white font-['Dancing Script',cursive]">Le'lah's Data Visualization Tool</h1>
          <div className={`rounded-lg shadow-lg p-6 mb-8 max-w-3xl mx-auto ${theme.background} ${theme.text} ${darkMode ? 'bg-gray-900' : ''}`}> 
            <h2 className="text-2xl font-semibold mb-4 text-white font-['Dancing Script',cursive]">Welcome to Your Data Journey!</h2>
            <p className="mb-4 text-white">
              This tool helps you transform your data into beautiful and insightful visualizations. Perfect for analyzing
              student performance data, business metrics, or any dataset you want to explore.
            </p>
            <div className="p-4 rounded-md bg-white bg-opacity-10">
              <h3 className="font-semibold mb-2 text-white">How to Use:</h3>
              <ol className="text-left space-y-2 text-white">
                <li>1. Upload your CSV file using the button below</li>
                <li>2. Select your desired chart type from the dropdown menu</li>
                <li>3. Choose which data columns to visualize</li>
                <li>4. Apply filters to focus on specific data points</li>
                <li>5. Save your favorite visualizations for later reference</li>
              </ol>
            </div>
          </div>
        </div>

        {/* Upload Section */}
        <div className="mb-8 max-w-2xl mx-auto">
          <div className={`rounded-lg shadow-lg p-6 ${theme.background} ${theme.text} ${darkMode ? 'bg-gray-900' : ''}`}> 
            <h2 className={`text-xl font-semibold mb-4 ${theme.name === 'Navy Blue' ? 'text-white' : darkMode ? 'text-purple-200' : 'text-purple-700'}`}>Upload Your Data</h2>
            <input
              type="file"
              accept=".csv,.zip"
              onChange={handleFileUpload}
              className={`block w-full text-sm file:mr-4 file:py-2 file:px-4 file:rounded-full file:border-0 file:text-sm file:font-semibold ${darkMode ? 'file:bg-gray-800 file:text-purple-200 hover:file:bg-gray-700' : 'file:bg-purple-50 file:text-purple-700 hover:file:bg-purple-100'}`}
            />
            
            {columns.length > 0 && (
              <div className="mt-6">
                <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
                  <div>
                    <label className="block text-sm font-medium">X-Axis Column</label>
                    <select 
                      value={selectedColumns.x} 
                      onChange={(e) => setSelectedColumns(prev => ({ ...prev, x: e.target.value }))}
                      className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-purple-500 focus:ring-purple-500"
                    >
                      {columns.map(column => (
                        <option key={column} value={column}>{column}</option>
                      ))}
                    </select>
                  </div>
                  <div>
                    <label className="block text-sm font-medium">Y-Axis Column</label>
                    <select 
                      value={selectedColumns.y} 
                      onChange={(e) => setSelectedColumns(prev => ({ ...prev, y: e.target.value }))}
                      className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-purple-500 focus:ring-purple-500"
                    >
                      {columns.map(column => (
                        <option key={column} value={column}>{column}</option>
                      ))}
                    </select>
                  </div>
                </div>

                <div className="mt-4">
                  <label className="block text-sm font-medium">Chart Type</label>
                  <select 
                    value={chartType} 
                    onChange={(e) => setChartType(e.target.value)}
                    className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-purple-500 focus:ring-purple-500"
                  >
                    <option value="bar">Bar Chart</option>
                    <option value="line">Line Chart</option>
                    <option value="scatter">Scatter Plot</option>
                    <option value="pie">Pie Chart</option>
                    <option value="radar">Radar Chart</option>
                    <option value="doughnut">Doughnut Chart</option>
                  </select>
                </div>
              </div>
            )}
          </div>
        </div>

        {/* Enhanced Filter Panel */}
        {columns.length > 0 && (
          <div className="mb-8">
            <button
              onClick={() => setShowFilterPanel(!showFilterPanel)}
              className={`mb-4 px-4 py-2 rounded-full flex items-center space-x-2 transition-colors duration-200 ${darkMode ? 'bg-purple-800 text-white hover:bg-purple-900' : 'bg-purple-600 text-white hover:bg-purple-700'}`}
            >
              <span>{showFilterPanel ? 'Hide Filters' : 'Show Filters'}</span>
              <svg className={`w-5 h-5 transform ${showFilterPanel ? 'rotate-180' : ''}`} fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M19 9l-7 7-7-7" />
              </svg>
            </button>

            {showFilterPanel && (
              <div className={`rounded-lg shadow-lg p-6 mb-8 ${theme.background} ${theme.text} ${darkMode ? 'bg-gray-900' : ''}`}> 
                <h3 className={`text-xl font-semibold mb-4 ${darkMode ? 'text-purple-200' : 'text-purple-700'}`}>Advanced Filters</h3>
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                  {Object.entries(rangeFilters).map(([column, range]) => (
                    <div key={column} className="space-y-2">
                      <label className="block text-sm font-medium">
                        {column} Range
                      </label>
                      <div className="space-y-4">
                        <div className="flex items-center space-x-4">
                          <input
                            type="number"
                            value={range.currentMin}
                            onChange={(e) => {
                              const value = parseFloat(e.target.value);
                              setRangeFilters(prev => ({
                                ...prev,
                                [column]: { ...prev[column], currentMin: value }
                              }));
                            }}
                            className="w-24 rounded-md border-gray-300"
                          />
                          <span>to</span>
                          <input
                            type="number"
                            value={range.currentMax}
                            onChange={(e) => {
                              const value = parseFloat(e.target.value);
                              setRangeFilters(prev => ({
                                ...prev,
                                [column]: { ...prev[column], currentMax: value }
                              }));
                            }}
                            className="w-24 rounded-md border-gray-300"
                          />
                        </div>
                        <div className="px-2">
                          <input
                            type="range"
                            min={range.min}
                            max={range.max}
                            value={range.currentMin}
                            onChange={(e) => {
                              const value = parseFloat(e.target.value);
                              setRangeFilters(prev => ({
                                ...prev,
                                [column]: { ...prev[column], currentMin: value }
                              }));
                            }}
                            className="w-full accent-purple-600"
                          />
                          <input
                            type="range"
                            min={range.min}
                            max={range.max}
                            value={range.currentMax}
                            onChange={(e) => {
                              const value = parseFloat(e.target.value);
                              setRangeFilters(prev => ({
                                ...prev,
                                [column]: { ...prev[column], currentMax: value }
                              }));
                            }}
                            className="w-full accent-purple-600"
                          />
                        </div>
                      </div>
                    </div>
                  ))}

                  {Object.entries(selectedCategories).map(([column, categories]) => (
                    <div key={column} className="space-y-2">
                      <label className="block text-sm font-medium">
                        {column} Categories
                      </label>
                      <div className="max-h-48 overflow-y-auto p-2 border rounded-md">
                        {Array.isArray(categories) && categories.map((category) => (
                          <label key={category} className="flex items-center space-x-2 p-1 hover:bg-purple-50">
                            <input
                              type="checkbox"
                              checked={selectedCategories[column].includes(category)}
                              onChange={(e) => {
                                setSelectedCategories(prev => ({
                                  ...prev,
                                  [column]: e.target.checked
                                    ? [...prev[column], category]
                                    : prev[column].filter(c => c !== category)
                                }));
                              }}
                              className="rounded text-purple-600"
                            />
                            <span className="text-sm">{category}</span>
                          </label>
                        ))}
                      </div>
                    </div>
                  ))}
                </div>

                <div className="mt-6 flex justify-between items-center">
                  <div className={`text-sm ${darkMode ? 'text-gray-400' : 'text-gray-500'}`}>Showing {filteredData.length} of {data.length} records</div>
                  <button
                    onClick={() => {
                      initializeFilters(columns, data);
                    }}
                    className={`px-4 py-2 rounded-md ${darkMode ? 'bg-gray-800 text-gray-200 hover:bg-gray-700' : 'bg-gray-100 text-gray-700 hover:bg-gray-200'}`}
                  >
                    Reset Filters
                  </button>
                </div>
              </div>
            )}
          </div>
        )}

        {/* Data Statistics Panel */}
        {Object.keys(dataStats).length > 0 && (
          <div className={`mb-8 rounded-lg shadow-lg p-6 ${theme.background} ${theme.text} ${darkMode ? 'bg-gray-900' : ''}`}> 
            <h3 className={`text-xl font-semibold mb-4 ${darkMode ? 'text-purple-200' : 'text-purple-700'}`}>Data Insights</h3>
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
              {Object.entries(dataStats).map(([column, stats]) => (
                <div key={column} className={`${darkMode ? 'bg-gray-800' : 'bg-purple-50'} rounded-lg p-4`}>
                  <h4 className={`font-medium mb-2 ${darkMode ? 'text-purple-200' : 'text-purple-700'}`}>{column}</h4>
                  {stats.min !== undefined ? (
                    <div className="space-y-1">
                      <p className="text-sm">Min: {stats.min.toFixed(2)}</p>
                      <p className="text-sm">Max: {stats.max.toFixed(2)}</p>
                      <p className="text-sm">Average: {stats.avg.toFixed(2)}</p>
                    </div>
                  ) : (
                    <div className="space-y-1">
                      {Object.entries(stats.counts).map(([cat, count]) => (
                        <p key={cat} className="text-sm">
                          {cat}: {count} ({((count/data.length)*100).toFixed(1)}%)
                        </p>
                      ))}
                    </div>
                  )}
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Chart and Data Display */}
        {filteredData.length > 0 ? (
          <>
            <div className={`rounded-lg shadow-lg p-6 mb-8 transition-colors duration-300 ${theme.background} ${theme.text} ${darkMode ? 'bg-gray-900' : ''}`}> 
              <div className="flex justify-between items-center mb-4">
                <h2 className={`text-xl font-semibold ${darkMode ? 'text-purple-200' : 'text-purple-700'}`}>Visualization</h2>
                <span className={`text-sm ${darkMode ? 'text-gray-300' : 'text-gray-500'}`}>Showing {filteredData.length} of {data.length} records</span>
              </div>
              {/* Export Buttons */}
              <div className="flex gap-2 mb-4">
                <button
                  onClick={() => exportChart('png')}
                  className={`${darkMode ? 'bg-purple-800 hover:bg-purple-900' : 'bg-purple-600 hover:bg-purple-700'} text-white px-3 py-1 rounded transition-colors duration-200`}
                >
                  Export PNG
                </button>
                <button
                  onClick={() => exportChart('svg')}
                  className={`${darkMode ? 'bg-purple-800 hover:bg-purple-900' : 'bg-purple-600 hover:bg-purple-700'} text-white px-3 py-1 rounded transition-colors duration-200`}
                >
                  Export SVG
                </button>
                {/* New: Export chart data as CSV */}
                <button
                  onClick={exportChartDataCSV}
                  className={`${darkMode ? 'bg-blue-800 hover:bg-blue-900' : 'bg-blue-500 hover:bg-blue-600'} text-white px-3 py-1 rounded transition-colors duration-200`}
                >
                  Export Chart Data CSV
                </button>
                {/* New: Copy chart image to clipboard */}
                <button
                  onClick={copyChartToClipboard}
                  className={`${darkMode ? 'bg-green-800 hover:bg-green-900' : 'bg-green-500 hover:bg-green-600'} text-white px-3 py-1 rounded transition-colors duration-200`}
                >
                  Copy Chart Image
                </button>
              </div>
              <div className="relative">
                <canvas ref={chartRef}></canvas>
                {/* Annotation Modal */}
                {annotation.show && (
                  <div className="absolute top-0 left-0 w-full h-full flex items-center justify-center bg-black bg-opacity-40 z-10">
                    <div className={`${darkMode ? 'bg-gray-900' : 'bg-white'} rounded-lg p-6 shadow-lg w-80`}>
                      <h3 className={`font-bold mb-2 ${darkMode ? 'text-purple-200' : 'text-purple-700'}`}>Add Annotation</h3>
                      <div className="mb-2 text-sm">X: {annotation.x}, Y: {annotation.y}</div>
                      <textarea
                        className={`w-full border rounded p-2 mb-2 ${darkMode ? 'bg-gray-800 text-gray-200 border-gray-700' : ''}`}
                        rows={3}
                        placeholder="Enter your note..."
                        value={annotation.note}
                        onChange={e => setAnnotation(a => ({ ...a, note: e.target.value }))}
                      />
                      <div className="flex gap-2 justify-end">
                        <button onClick={() => setAnnotation({ show: false, x: '', y: '', note: '' })} className={`px-3 py-1 rounded ${darkMode ? 'bg-gray-800 text-gray-200 hover:bg-gray-700' : 'bg-gray-100 hover:bg-gray-200'}`}>Cancel</button>
                        <button onClick={saveAnnotation} className={`${darkMode ? 'bg-purple-800 hover:bg-purple-900' : 'bg-purple-600 hover:bg-purple-700'} px-3 py-1 rounded text-white`}>Save</button>
                      </div>
                    </div>
                  </div>
                )}
              </div>
            </div>

            {/* --- Data Table Controls --- */}
            <div className="mb-4 flex flex-wrap gap-2 items-center">
              <input
                type="text"
                placeholder="Global search..."
                value={globalSearch}
                onChange={e => { setGlobalSearch(e.target.value); setPage(1); }}
                className="px-2 py-1 rounded border border-gray-300 text-black"
                style={{ minWidth: 180 }}
              />
              <input
                type="text"
                placeholder="Search columns..."
                value={columnSearch}
                onChange={e => setColumnSearch(e.target.value)}
                className="px-2 py-1 rounded border border-gray-300 text-black"
                style={{ minWidth: 180 }}
              />
              <div className="flex flex-wrap gap-1 items-center">
                {filteredColumns.map(col => (
                  <span key={col} className="flex items-center gap-1 bg-white bg-opacity-70 rounded px-2 py-1 text-xs text-black">
                    <input type="checkbox" checked={visibleColumns.includes(col)} onChange={() => toggleColumnVisibility(col)} />
                    <span>{col}</span>
                    <button onClick={() => togglePinColumn(col)} className="ml-1 text-xs" title="Pin/unpin column">{pinnedColumns.includes(col) ? '📌' : '📍'}</button>
                  </span>
                ))}
              </div>
              <select value={groupBy} onChange={e => setGroupBy(e.target.value)} className="px-2 py-1 rounded border border-gray-300 text-black">
                <option value="">Group by...</option>
                {columns.map(col => <option key={col} value={col}>{col}</option>)}
              </select>
              <button onClick={exportFilteredCSV} className="px-3 py-1 rounded bg-blue-500 text-white hover:bg-blue-600">Export CSV</button>
            </div>

            {/* --- Data Table with Pagination, Pinning, Sorting, Hide/Show, Grouping --- */}
            <div className={`overflow-x-auto rounded-lg shadow ${theme.background} ${theme.text} ${darkMode ? 'bg-gray-900' : ''}`}> 
              <table className="min-w-full">
                <thead className={darkMode ? 'bg-gray-800' : 'bg-purple-50'}>
                  <tr>
                    {pinnedColumns.concat(visibleColumns.filter(col => !pinnedColumns.includes(col))).map(column => (
                      <th
                        key={column}
                        className={`px-6 py-3 text-left text-xs font-medium uppercase tracking-wider cursor-pointer ${darkMode ? 'text-purple-200' : 'text-purple-700'} ${pinnedColumns.includes(column) ? 'bg-yellow-100' : ''}`}
                        onClick={() => handleSort(column)}
                      >
                        {column}
                        {sortConfig.key === column && (sortConfig.direction === 'asc' ? ' ▲' : ' ▼')}
                      </th>
                    ))}
                  </tr>
                </thead>
                <tbody className={darkMode ? 'bg-gray-900 divide-y divide-gray-800' : 'bg-white divide-y divide-gray-200'}>
                  {groupBy && groupedKeys.length > 0 ? (
                    groupedKeys.slice((page-1)*rowsPerPage, page*rowsPerPage).map(key => (
                      <React.Fragment key={key}>
                        <tr className="bg-blue-100 text-gray-800"><td colSpan={visibleColumns.length}><b>{groupBy}: {key}</b> ({groupedData[key].length} rows)</td></tr>
                        {groupedData[key].map((row, idx) => (
                          <tr key={idx}>
                            {pinnedColumns.concat(visibleColumns.filter(col => !pinnedColumns.includes(col))).map(column => (
                              <td key={column} className={`px-6 py-4 whitespace-nowrap text-sm ${darkMode ? 'text-gray-300' : 'text-gray-500'}`}>{row[column]}</td>
                            ))}
                          </tr>
                        ))}
                      </React.Fragment>
                    ))
                  ) : (
                    paginatedData.map((row, index) => (
                      <tr key={index}>
                        {pinnedColumns.concat(visibleColumns.filter(col => !pinnedColumns.includes(col))).map(column => (
                          <td key={column} className={`px-6 py-4 whitespace-nowrap text-sm ${darkMode ? 'text-gray-300' : 'text-gray-500'}`}>{row[column]}</td>
                        ))}
                      </tr>
                    ))
                  )}
                </tbody>
              </table>
            </div>
            {/* --- Pagination Controls --- */}
            <div className="flex justify-between items-center mt-2 mb-8">
              <div className="flex gap-2 items-center">
                <button onClick={() => setPage(1)} disabled={page === 1} className="px-2">⏮️</button>
                <button onClick={() => setPage(p => Math.max(1, p-1))} disabled={page === 1} className="px-2">◀️</button>
                <span>Page {page} of {totalPages}</span>
                <button onClick={() => setPage(p => Math.min(totalPages, p+1))} disabled={page === totalPages} className="px-2">▶️</button>
                <button onClick={() => setPage(totalPages)} disabled={page === totalPages} className="px-2">⏭️</button>
              </div>
              <div>
                Rows per page:
                <select value={rowsPerPage} onChange={e => { setRowsPerPage(Number(e.target.value)); setPage(1); }} className="ml-2 px-2 py-1 rounded border border-gray-300 text-black">
                  {[10, 20, 50, 100, 200].map(n => <option key={n} value={n}>{n}</option>)}
                </select>
              </div>
            </div>
          </>
        ) : (
          <div className={`text-center mt-8 ${darkMode ? 'text-gray-400' : 'text-gray-500'}`}>
            {data.length > 0 ? 'No data matches the current filters' : 'Upload a CSV file to get started'}
          </div>
        )}
      </div>
      {/* Help/Onboarding Modal */}
      {showHelp && (
        <div className="fixed inset-0 bg-black bg-opacity-40 flex items-center justify-center z-50">
          <div className={`${darkMode ? 'bg-gray-900' : 'bg-white'} rounded-lg p-8 shadow-xl max-w-lg w-full relative animate-fade-in`}>
            <button onClick={() => setShowHelp(false)} className={`absolute top-2 right-2 text-2xl ${darkMode ? 'text-gray-500 hover:text-purple-300' : 'text-gray-400 hover:text-purple-600'}`}>&times;</button>
            <h2 className={`text-2xl font-bold mb-4 ${darkMode ? 'text-purple-200' : 'text-purple-700'}`}>Welcome to the Data Visualization Tool!</h2>
            <ol className={`list-decimal pl-6 space-y-2 ${darkMode ? 'text-gray-300' : 'text-gray-700'}`}>
              <li>Upload your CSV data to get started.</li>
              <li>Choose chart type and columns to visualize.</li>
              <li>Apply filters and explore insights.</li>
              <li>Click on chart points to annotate them.</li>
              <li>Switch color themes and dark mode for your style.</li>
              <li>Export charts as PNG images.</li>
              <li>Save and revisit your favorite visualizations.</li>
            </ol>
            <div className="mt-6 text-right">
              <button onClick={() => setShowHelp(false)} className={`${darkMode ? 'bg-purple-800 hover:bg-purple-900' : 'bg-purple-600 hover:bg-purple-700'} px-4 py-2 rounded text-white`}>Got it!</button>
            </div>
          </div>
        </div>
      )}
      {/* Saved Visualizations Mini-Preview */}
      {savedVisualizations.length > 0 && (
        <div className="mt-12">
          <h3 className={`text-lg font-semibold mb-2 ${darkMode ? 'text-purple-200' : 'text-purple-700'}`}>Saved Visualizations</h3>
          <div className="flex gap-4 overflow-x-auto pb-2">
            {savedVisualizations.map((viz, i) => (
              <div key={viz.id} className={`min-w-[180px] rounded-lg shadow p-3 flex flex-col items-center hover:scale-105 transition-transform cursor-pointer ${darkMode ? 'bg-gray-900' : 'bg-white'}`} onClick={() => loadVisualization(viz)}>
                <div className={`w-36 h-20 rounded mb-2 flex items-center justify-center text-2xl ${darkMode ? 'bg-gray-800 text-purple-400' : 'bg-purple-50 text-purple-400'}`}>
                  <span>{viz.chartType === 'bar' ? '📊' : viz.chartType === 'line' ? '📈' : '🟠'}</span>
                </div>
                <div className={`text-xs truncate w-full text-center ${darkMode ? 'text-gray-200' : 'text-gray-700'}`}>{viz.name || 'Untitled'}</div>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
};

const root = ReactDOM.createRoot(document.getElementById('root'));
root.render(<App />);
