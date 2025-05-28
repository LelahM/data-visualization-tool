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

  React.useEffect(() => {
    if (chartRef.current && filteredData.length > 0 && selectedColumns.x && selectedColumns.y) {
      const ctx = chartRef.current.getContext('2d');
      
      if (chart) {
        chart.destroy();
      }

      const chartConfig = {
        type: chartType,
        data: {
          labels: filteredData.map(item => item[selectedColumns.x]),
          datasets: [{
            label: selectedColumns.y,
            data: filteredData.map(item => parseFloat(item[selectedColumns.y])),
            backgroundColor: [
              'rgba(75, 192, 192, 0.2)',
              'rgba(255, 99, 132, 0.2)',
              'rgba(255, 206, 86, 0.2)',
              'rgba(54, 162, 235, 0.2)',
              'rgba(153, 102, 255, 0.2)',
            ],
            borderColor: [
              'rgba(75, 192, 192, 1)',
              'rgba(255, 99, 132, 1)',
              'rgba(255, 206, 86, 1)',
              'rgba(54, 162, 235, 1)',
              'rgba(153, 102, 255, 1)',
            ],
            borderWidth: 1
          }]
        },
        options: {
          responsive: true,
          scales: chartType !== 'pie' ? {
            y: {
              beginAtZero: true
            }
          } : undefined,
        }
      };

      const newChart = new Chart(ctx, chartConfig);
      setChart(newChart);
      return () => newChart.destroy();
    }
  }, [filteredData, chartType, selectedColumns]);

  const handleFileUpload = (event) => {
    const file = event.target.files[0];
    if (file) {
      parseCSV(file);
    }
  };

  return (
    <div className="min-h-screen py-8 px-4">
      <div className="max-w-7xl mx-auto">
        {/* Introduction Section */}
        <div className="text-center mb-12">
          <h1 className="text-4xl font-bold text-purple-800 mb-4">Le'lah's Data Visualization Tool</h1>
          <div className="bg-white rounded-lg shadow-lg p-6 mb-8 max-w-3xl mx-auto">
            <h2 className="text-2xl font-semibold text-purple-600 mb-4">Welcome to Your Data Journey!</h2>
            <p className="text-gray-600 mb-4">
              This tool helps you transform your data into beautiful and insightful visualizations. Perfect for analyzing
              student performance data, business metrics, or any dataset you want to explore.
            </p>
            <div className="bg-purple-50 p-4 rounded-md">
              <h3 className="font-semibold text-purple-700 mb-2">How to Use:</h3>
              <ol className="text-left text-gray-600 space-y-2">
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
          <div className="bg-white rounded-lg shadow-lg p-6">
            <h2 className="text-xl font-semibold text-purple-700 mb-4">Upload Your Data</h2>
            <input
              type="file"
              accept=".csv"
              onChange={handleFileUpload}
              className="block w-full text-sm text-gray-500 file:mr-4 file:py-2 file:px-4 file:rounded-full file:border-0 
                       file:text-sm file:font-semibold file:bg-purple-50 file:text-purple-700 hover:file:bg-purple-100"
            />
            
            {columns.length > 0 && (
              <div className="mt-6">
                <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
                  <div>
                    <label className="block text-sm font-medium text-gray-700">X-Axis Column</label>
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
                    <label className="block text-sm font-medium text-gray-700">Y-Axis Column</label>
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
                  <label className="block text-sm font-medium text-gray-700">Chart Type</label>
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
              className="mb-4 px-4 py-2 bg-purple-600 text-white rounded-full hover:bg-purple-700 
                         transition-colors duration-200 flex items-center space-x-2"
            >
              <span>{showFilterPanel ? 'Hide Filters' : 'Show Filters'}</span>
              <svg className={`w-5 h-5 transform ${showFilterPanel ? 'rotate-180' : ''}`} 
                   fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M19 9l-7 7-7-7" />
              </svg>
            </button>

            {showFilterPanel && (
              <div className="bg-white rounded-lg shadow-lg p-6 mb-8">
                <h3 className="text-xl font-semibold text-purple-700 mb-4">Advanced Filters</h3>
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                  {Object.entries(rangeFilters).map(([column, range]) => (
                    <div key={column} className="space-y-2">
                      <label className="block text-sm font-medium text-gray-700">
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
                      <label className="block text-sm font-medium text-gray-700">
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
                  <div className="text-sm text-gray-500">
                    Showing {filteredData.length} of {data.length} records
                  </div>
                  <button
                    onClick={() => {
                      initializeFilters(columns, data);
                    }}
                    className="px-4 py-2 bg-gray-100 text-gray-700 rounded-md hover:bg-gray-200"
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
          <div className="mb-8 bg-white rounded-lg shadow-lg p-6">
            <h3 className="text-xl font-semibold text-purple-700 mb-4">Data Insights</h3>
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
              {Object.entries(dataStats).map(([column, stats]) => (
                <div key={column} className="bg-purple-50 rounded-lg p-4">
                  <h4 className="font-medium text-purple-700 mb-2">{column}</h4>
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
            <div className="bg-white rounded-lg shadow-lg p-6 mb-8">
              <div className="flex justify-between items-center mb-4">
                <h2 className="text-xl font-semibold text-purple-700">Visualization</h2>
                <span className="text-sm text-gray-500">
                  Showing {filteredData.length} of {data.length} records
                </span>
              </div>
              <canvas ref={chartRef}></canvas>
            </div>

            <div className="mt-8">
              <h2 className="text-xl font-semibold text-purple-700 mb-4">Data Table</h2>
              <div className="overflow-x-auto bg-white rounded-lg shadow">
                <table className="min-w-full">
                  <thead className="bg-purple-50">
                    <tr>
                      {columns.map(column => (
                        <th key={column} className="px-6 py-3 text-left text-xs font-medium text-purple-700 uppercase tracking-wider">
                          {column}
                        </th>
                      ))}
                    </tr>
                  </thead>
                  <tbody className="bg-white divide-y divide-gray-200">
                    {filteredData.map((row, index) => (
                      <tr key={index}>
                        {columns.map(column => (
                          <td key={column} className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                            {row[column]}
                          </td>
                        ))}
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          </>
        ) : (
          <div className="text-center text-gray-500 mt-8">
            {data.length > 0 ? 'No data matches the current filters' : 'Upload a CSV file to get started'}
          </div>
        )}
      </div>
    </div>
  );
};

const root = ReactDOM.createRoot(document.getElementById('root'));
root.render(<App />);
