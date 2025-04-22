# Release Notes

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

## Version 0.9.0 (Beta)

### Features Added

- Basic blood glucose tracking functionality
- Initial HealthKit integration
- Simple chart visualization
- Local data storage implementation
- Basic settings management

### Improvements

- Enhanced data synchronization
- Improved error handling
- Better user feedback
- Optimized performance

## Version 0.8.0 (Alpha)

### Initial Development

- Project setup
- Basic UI implementation
- Core functionality development
- HealthKit integration groundwork
- Database structure implementation

## Installation Instructions

### iOS

1. Download from the App Store
2. Open the app
3. Grant HealthKit permissions when prompted
4. Start tracking your blood glucose readings

### Android

_Note: Android version is currently in development and not available for release._

## Upgrade Notes

### From Beta to 1.0.0

- No data migration required
- All existing data will be preserved
- New features will be available immediately after update

## Support

For support or to report issues, please visit our GitHub repository or contact support@rnhealthkit.com

## License

This application is licensed under the MIT License. See LICENSE file for details.
