# RN HealthKit - Blood Glucose Tracker

A comprehensive React Native application for tracking and managing blood glucose readings. This app serves as both a standalone tracking tool and an integration point with Apple HealthKit for iOS. (Although made to be for both Apple and Android, it was not tested or has never been built to an Android device at this time).

## Recent Updates

### Added Features

- **Enhanced Chart View**
  - Time range selection for viewing readings (1 hour, 3 hours, 6 hours, 12 hours)
  - Chronological display with oldest readings on the left and newest on the right
  - Simplified time labels showing only start and end times
  - Improved readability with cleaner x-axis

### Modified Features

- **Data Retrieval**
  - Limited HealthKit data retrieval to the last year of readings
  - Optimized database queries for better performance
  - Removed development console logs for release mode compatibility

### Removed Features

- **Chart View**
  - Removed bar chart visualization
  - Removed intermediate time labels on x-axis
  - Simplified the chart interface for better user experience

## Release Notes

### Version 1.1.0

#### Breaking Changes

- Removed support for viewing data beyond one year from HealthKit
- Removed bar chart visualization from the chart view
- Removed intermediate time labels on the x-axis

#### New Features

- Added time range selection with four options:
  - 1 hour view
  - 3 hours view
  - 6 hours view
  - 12 hours view
- Implemented chronological display of readings (oldest to newest)
- Added simplified time labels showing only start and end times
- Improved chart readability with cleaner x-axis

#### Performance Improvements

- Optimized database queries for faster data retrieval
- Removed development console logs for better release mode performance
- Improved chart rendering performance
- Enhanced data filtering for selected time ranges

#### Bug Fixes

- Fixed chronological ordering of readings in chart view
- Corrected time label display to show only start and end times
- Improved data consistency when switching between time ranges
- Fixed chart scaling issues with different time ranges

#### Technical Changes

- Updated HealthKit data retrieval to enforce one-year limit
- Removed development-only console logs
- Optimized database queries for better performance
- Improved error handling in data retrieval

## Detailed Application Overview

### Core Functionality

#### 1. Blood Glucose Data Management

- **Manual Entry**

  - Input blood glucose readings with precise values (mg/dL)
  - Add timestamps and optional notes
  - Track source of readings (manual vs. health platform)
  - Edit or delete existing entries

- **Health Platform Integration**

  - **iOS Integration**

    - Seamless connection with Apple HealthKit
    - Import existing blood glucose readings (limited to last year)
    - Write new readings back to HealthKit
    - Automatic background synchronization
    - Permission management for health data access

#### 2. Data Visualization

- **List View**

  - Chronological display of all readings
  - Detailed entry information:
    - Blood glucose value
    - Timestamp
    - Source indication
    - Visual indicators for high/low readings
  - Color-coded entries based on glucose ranges
  - Support for entry deletion
  - Search and filter capabilities

- **Chart View**
  - Interactive line chart for trend analysis
  - Time range selection (1h, 3h, 6h, 12h)
  - Chronological display (oldest to newest)
  - Simplified time labels (start and end times only)
  - Real-time average calculation
  - Visual elements:
    - Individual reading points
    - High/low range indicators
    - Trend lines

#### 3. Customization Features

- **Glucose Range Settings**
  - Customizable thresholds:
    - Low range (< 70 mg/dL default)
    - Normal range (70-180 mg/dL default)
    - High range (> 180 mg/dL default)
  - User-adjustable ranges in settings
  - Visual feedback based on ranges

#### 4. Data Storage and Management

- **Local Storage**

  - SQLite database implementation
  - Reliable data persistence
  - Offline access capability
  - Efficient data retrieval
  - Automatic backup handling

- **Data Synchronization**
  - Two-way sync with HealthKit
  - Automatic import of new readings
  - Manual import option
  - Duplicate prevention
  - Conflict resolution

#### 5. User Interface

- **Home Screen**

  - Quick overview of recent readings
  - Average glucose calculation
  - Visual status indicators
  - Navigation to key features
  - Recent activity summary
  - Time period selection
  - Data import functionality

- **Settings Screen**
  - Range customization
  - HealthKit permissions
  - App preferences
  - Data management options

### Development and Release Mode Configuration

#### Development Mode Features

- Reactotron integration for debugging
- Development-only logging
- Chrome DevTools connection
- Detailed error tracking

#### Release Mode Optimizations

- All development tools disabled
- No console logging
- Optimized performance
- Reactotron configuration excluded

To build the app in release mode:

```bash
# For iOS
npx react-native run-ios --configuration Release

# For Android
npx react-native run-android --variant=release
```

#### Debugging and Logging

- Development mode includes Reactotron for advanced debugging
- Console logging is automatically disabled in release builds
- Error handling is optimized for production
- Performance monitoring tools are development-only

#### 6. Technical Features

- **Development Tools**

  - Reactotron integration
  - Comprehensive logging system
  - Debug mode features
  - Performance monitoring

- **Platform-Specific Features**

  - iOS:
    - HealthKit integration
    - Native iOS UI components
    - iOS-specific permissions
    - Background processing

#### 7. Data Privacy and Security

- Local storage of sensitive health data
- Secure handling of HealthKit permissions
- User-controlled data sharing
- No external server communication
- Data encryption at rest

#### 8. Error Handling and Recovery

- Graceful handling of:
  - Network connectivity issues
  - HealthKit permission denials
  - Data synchronization conflicts
  - Storage errors
- Automatic retry mechanisms
- User-friendly error messages
- Data recovery options

## Features

- **Manual Entry**: Add blood glucose readings with custom notes
- **Health Data Integration**: Sync with Apple HealthKit
- **Data Visualization**:
  - List view of all readings
  - Chart view showing trends over time
- **Customizable Ranges**: Set custom low and high blood glucose ranges
- **Local Storage**: All data is stored locally using SQLite
- **Development Tools**: Integrated with Reactotron for debugging

## Prerequisites

- Node.js (v18 or higher)
- npm or yarn
- iOS:
  - Xcode 15.0 or higher
  - CocoaPods
  - iOS Simulator or physical device running iOS 15.1 or higher
- Android:
  - Android Studio
  - Android SDK
  - Android Emulator or physical device running Android 6.0 or higher

## Installation

1. **Clone the repository**

   ```bash
   git clone https://github.com/yourusername/RN_HealthKit.git
   cd RN_HealthKit
   ```

2. **Install dependencies**

   ```bash
   # Using npm
   npm install

   # OR using yarn
   yarn install
   ```

3. **iOS Setup**

   ```bash
   # Navigate to iOS directory
   cd ios

   # Install CocoaPods dependencies
   pod install

   # Return to project root
   cd ..
   ```

4. **Environment Configuration**

   - **iOS Setup**

     1. Open `ios/RN_HealthKit.xcworkspace` in Xcode
     2. Select your target device/simulator
     3. Update the Bundle Identifier if needed
     4. Ensure your Apple Developer account is properly configured
     5. Enable HealthKit capabilities in Xcode:
        - Select your target
        - Go to "Signing & Capabilities"
        - Click "+" and add "HealthKit"

   - **Android Setup**
     1. Open the `android` folder in Android Studio
     2. Let Android Studio sync the project
     3. Update the application ID if needed
     4. Ensure you have the correct SDK version installed

## Running the App

1. **Start the Metro Bundler**

   ```bash
   # Using npm
   npm start

   # OR using yarn
   yarn start
   ```

2. **Run on iOS**

   ```bash
   # Using npm
   npm run ios

   # OR using yarn
   yarn ios
   ```

3. **Run on Android**

   ```bash
   # Using npm
   npm run android

   # OR using yarn
   yarn android
   ```

## Development Tools Setup

### Reactotron Setup

1. Download and install Reactotron from [GitHub Releases](https://github.com/infinitered/reactotron/releases)
2. Start Reactotron
3. Run the app in development mode
4. Logs will automatically appear in Reactotron

## HealthKit Permissions

### iOS Permissions

The app requires the following HealthKit permissions:

- Blood Glucose (read/write)
- Date of Birth (read)
- Biological Sex (read)
- Weight (read)

These permissions are requested when the app first launches. Users can manage these permissions in their device's Health app settings.

## Project Structure

```
src/
├── screens/           # App screens
│   ├── HomeScreen.tsx
│   ├── SettingsScreen.tsx
│   ├── AddBloodGlucoseScreen.tsx
│   ├── BloodGlucoseListScreen.tsx
│   └── BloodGlucoseChartScreen.tsx
├── services/         # Business logic
│   ├── database.ts   # SQLite operations
│   └── healthService.ts  # HealthKit/Google Fit integration
├── types/           # TypeScript definitions
│   ├── BloodGlucose.ts
│   └── reactotron.d.ts
├── config/          # Configuration files
│   └── ReactotronConfig.ts
└── components/      # Reusable UI components
```

## Troubleshooting

### Common Issues

1. **iOS Build Issues**

   - Ensure CocoaPods is installed and up to date
   - Run `pod install` in the ios directory
   - Clean the build folder in Xcode (Product > Clean Build Folder)

2. **Reactotron Not Showing Logs**

   - Ensure Reactotron desktop app is running
   - Check that the app is running in development mode
   - Verify the Reactotron configuration in `src/config/ReactotronConfig.ts`

3. **HealthKit Permissions Not Working**

   - Verify HealthKit capabilities are enabled in Xcode
   - Check that the app has the necessary entitlements
   - Ensure the device/simulator has HealthKit enabled

4. **Database Issues**
   - The app uses SQLite for local storage
   - Data is stored in the app's documents directory
   - If data is not showing, try restarting the app

## Contributing

1. Fork the repository
2. Create your feature branch (`git checkout -b feature/amazing-feature`)
3. Commit your changes (`git commit -m 'Add some amazing feature'`)
4. Push to the branch (`git push origin feature/amazing-feature`)
5. Open a Pull Request

## License

This project is licensed under the MIT License - see the LICENSE file for details.

## Support

For support, please open an issue in the GitHub repository or contact the maintainers.

## Testing

### Test Suite Overview

The application includes a comprehensive test suite covering:

1. **Component Tests**

   - HomeScreen
   - SettingsScreen
   - ReminderScreen
   - AddReadingScreen
   - EditReadingScreen
   - App component

2. **Service Tests**

   - DatabaseService
   - HealthService
   - SettingsService
   - A1CService
   - ChartService
   - NotificationService

3. **Utility Tests**

   - Date/time formatting
   - A1C calculations
   - Range classification
   - Time frame calculations

4. **Type Tests**

   - BloodGlucose
   - BloodGlucoseRanges
   - TimeFrame
   - ChartData
   - NotificationChannel

5. **Theme Tests**
   - Color validation
   - Typography
   - Spacing
   - Shadows
   - Border radius

### Running Tests

1. **Install Testing Dependencies**

   ```bash
   npm install --save-dev @testing-library/react-native @testing-library/jest-native
   ```

2. **Run All Tests**

   ```bash
   npm test
   ```

3. **Run Specific Test Files**

   ```bash
   # Run component tests
   npm test -- HomeScreen.test.tsx

   # Run service tests
   npm test -- database.test.ts

   # Run utility tests
   npm test -- utils.test.ts
   ```

4. **Run Tests with Coverage**

   ```bash
   npm test -- --coverage
   ```

### Test Structure

Each test file follows a consistent structure:

```typescript
describe('Component/Service Name', () => {
  beforeEach(() => {
    // Setup and mock initialization
  });

  it('should handle specific functionality', () => {
    // Test implementation
  });

  it('should handle edge cases', () => {
    // Edge case testing
  });

  it('should handle errors gracefully', () => {
    // Error handling testing
  });
});
```

### Testing Best Practices

1. **Component Testing**

   - Test rendering of all UI elements
   - Verify user interactions
   - Check state changes
   - Validate error handling
   - Test navigation

2. **Service Testing**

   - Mock external dependencies
   - Test all public methods
   - Verify error handling
   - Check data transformations
   - Validate singleton patterns

3. **Utility Testing**

   - Test all exported functions
   - Verify edge cases
   - Check type safety
   - Validate calculations

4. **Type Testing**
   - Verify required properties
   - Check optional properties
   - Validate type constraints
   - Test type compatibility

### Continuous Integration

The test suite is integrated with the CI pipeline:

1. **Pre-commit Hooks**

   - Run linting
   - Execute quick tests
   - Check type definitions

2. **Pull Request Checks**

   - Run full test suite
   - Generate coverage report
   - Verify type safety
   - Check for breaking changes

3. **Release Process**
   - Full test suite execution
   - Coverage threshold verification
   - Performance benchmarks
   - Type checking

### Debugging Tests

1. **Using Jest Debugger**

   ```bash
   npm test -- --debug
   ```

2. **Debugging Specific Tests**

   ```bash
   npm test -- --testNamePattern="specific test name"
   ```

3. **Viewing Coverage Report**

   ```bash
   npm test -- --coverage --watchAll=false
   ```

### Test Maintenance

1. **Adding New Tests**

   - Follow existing patterns
   - Include edge cases
   - Test error scenarios
   - Maintain coverage

2. **Updating Tests**

   - Update when features change
   - Maintain test isolation
   - Keep mocks current
   - Update type definitions

3. **Test Documentation**
   - Document test purpose
   - Explain complex scenarios
   - Note edge cases
   - Document mock setup
