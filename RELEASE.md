# Release Notes

## Version 1.2.0

### New Features

- **Enhanced Data Synchronization**
  - Added automatic sync check every 12 hours
  - Implemented user prompts for syncing with HealthKit
  - Enhanced sync feedback and error handling
  - Improved sync status tracking

### Performance Improvements

- **Home Screen Optimizations**

  - Fixed infinite loop issues in data processing
  - Removed redundant calculations
  - Enhanced metric calculations to respect selected time range
  - Improved error handling for calculations

- **Chart View Enhancements**
  - Improved filtering of readings based on selected time range
  - Optimized chart rendering performance
  - Enhanced data consistency when switching time ranges

### Bug Fixes

- Fixed infinite loop in HomeScreen calculations
- Corrected metric calculations to properly respect time ranges
- Improved error handling in sync process
- Fixed chart display issues with time range changes

### Technical Changes

- Implemented proper subscription system for range updates
- Enhanced error handling throughout the application
- Optimized data processing and calculations
- Improved state management in HomeScreen

## Version 1.1.0

### Breaking Changes

- Removed support for viewing data beyond one year from HealthKit
- Removed bar chart visualization from the chart view
- Removed intermediate time labels on the x-axis

### New Features

- Added time range selection with four options:
  - 1 hour view
  - 3 hours view
  - 6 hours view
  - 12 hours view
- Implemented chronological display of readings (oldest to newest)
- Added simplified time labels showing only start and end times
- Improved chart readability with cleaner x-axis

### Performance Improvements

- Optimized database queries for faster data retrieval
- Removed development console logs for better release mode performance
- Improved chart rendering performance
- Enhanced data filtering for selected time ranges

### Bug Fixes

- Fixed chronological ordering of readings in chart view
- Corrected time label display to show only start and end times
- Improved data consistency when switching between time ranges
- Fixed chart scaling issues with different time ranges

### Technical Changes

- Updated HealthKit data retrieval to enforce one-year limit
- Removed development-only console logs
- Optimized database queries for better performance
- Improved error handling in data retrieval

## Version 1.0.0

- Initial release of the Blood Glucose Tracker app
- Basic functionality for tracking and managing blood glucose readings
- Integration with Apple HealthKit
- Local storage using SQLite
- Basic chart visualization
- Manual entry of readings
- Settings for glucose ranges

## Installation Instructions

### iOS

1. Download from the App Store
2. Open the app
3. Grant HealthKit permissions when prompted
4. Start tracking your blood glucose readings

## Support

For support or to report issues, please visit our GitHub repository or contact support@rnhealthkit.com

## License

This application is licensed under the MIT License. See LICENSE file for details.
