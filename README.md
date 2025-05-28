# Le'lah's Data Visualization Tool

An interactive data visualization web application that allows users to upload CSV data and create beautiful, insightful visualizations with advanced filtering capabilities.

![Data Visualization Tool](preview.png)

## Features

- 📊 Multiple chart types (Bar, Line, Scatter, Pie, Radar, Doughnut)
- 📈 Real-time data visualization
- 🔍 Advanced filtering capabilities
  - Range sliders for numeric data
  - Multi-select filters for categorical data
  - Real-time filter updates
- 📱 Responsive design
- 📊 Interactive data insights
- 💾 Save and load visualizations
- 📱 Mobile-friendly interface

## Tech Stack

- React 18
- Chart.js
- Tailwind CSS
- JavaScript/JSX

## Getting Started

1. Clone the repository:
   ```bash
   git clone https://github.com/lelahmckoy/data-visualization-tool.git
   cd data-visualization-tool
   ```

2. Open the project:
   - Simply open `index.html` in your browser
   - Or use a local server:
     ```bash
     python3 server.py
     ```

3. Access the application:
   - Navigate to `http://localhost:3000` in your browser

## How to Use

1. **Upload Data**
   - Click the file upload button
   - Select your CSV file
   - The app automatically detects columns and data types

2. **Choose Visualization**
   - Select chart type from the dropdown
   - Pick columns for X and Y axes
   - Customize chart appearance

3. **Apply Filters**
   - Use range sliders for numeric data
   - Select/deselect categories
   - Combine multiple filters
   - View filtered results in real-time

4. **Save Visualizations**
   - Name and save your current view
   - Access saved visualizations later
   - Export filtered data

## Sample Data

The app comes with sample student performance data that includes:
- Academic metrics
- Study habits
- Lifestyle factors
- Personal information

Perfect for educational analysis and data exploration!

## Deployment

This app is deployed on Vercel and can be accessed at: [Live Demo](https://lelah-data-viz.vercel.app)

## Local Development

To run the app locally:

1. Clone the repository
2. No build process required!
3. Start the Python server:
   ```bash
   python3 server.py
   ```
4. Open `http://localhost:3000`

## Contributing

Feel free to:
1. Fork the repository
2. Create a feature branch
3. Submit a pull request

## License

MIT License - feel free to use this project for your own learning and development!

## Author

Created by Le'lah McKoy

## Acknowledgments

- Chart.js for visualization capabilities
- Tailwind CSS for styling
- React for UI components
