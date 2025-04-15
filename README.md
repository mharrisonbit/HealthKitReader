# RN HealthKit - Blood Glucose Tracker

A comprehensive React Native application for tracking and managing blood glucose readings. This app serves as both a standalone tracking tool and an integration point with device health platforms (Apple HealthKit for iOS and Google Fit for Android).

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
    - Import existing blood glucose readings
    - Write new readings back to HealthKit
    - Automatic background synchronization
    - Permission management for health data access

  - **Android Integration**
    - Google Fit integration
    - Import and export blood glucose data
    - Maintain data synchronization
    - Handle Android-specific permissions

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
  - Default 7-day view with customization options
  - Visual elements:
    - Individual reading points
    - High/low range indicators
    - Trend lines
  - Time range selection
  - Zoom and pan capabilities

#### 3. Customization Features

- **Glucose Range Settings**
  - Customizable thresholds:
    - Low range (< 70 mg/dL default)
    - Normal range (70-180 mg/dL default)
    - High range (> 180 mg/dL default)
  - User-adjustable ranges in settings
  - Visual feedback based on ranges
  - Alert thresholds configuration

#### 4. Data Storage and Management

- **Local Storage**

  - SQLite database implementation
  - Reliable data persistence
  - Offline access capability
  - Efficient data retrieval
  - Automatic backup handling

- **Data Synchronization**
  - Two-way sync with health platforms
  - Automatic import of new readings
  - Manual import option
  - Duplicate prevention
  - Conflict resolution
  - Background sync capability

#### 5. User Interface

- **Home Screen**

  - Quick overview of recent readings
  - Average glucose calculation
  - Visual status indicators
  - Navigation to key features
  - Recent activity summary
  - **Landscape Mode Features**
    - 24-hour chart view with day-by-day navigation
    - Interactive date selection for viewing historical data
    - Automatic loading indicators during data fetch
    - Navigation controls to move between days with data
    - Disabled navigation when no more data is available
    - Optimized chart display for landscape orientation
    - Hidden import button in landscape mode for better space utilization

- **Settings Screen**
  - Range customization
  - Health platform permissions
  - App preferences
  - Data management options
  - User preferences

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

  - Android:
    - Google Fit integration
    - Material Design components
    - Android-specific permissions
    - Background services

#### 7. Data Privacy and Security

- Local storage of sensitive health data
- Secure handling of health platform permissions
- User-controlled data sharing
- No external server communication
- Data encryption at rest

#### 8. Error Handling and Recovery

- Graceful handling of:
  - Network connectivity issues
  - Health platform permission denials
  - Data synchronization conflicts
  - Storage errors
- Automatic retry mechanisms
- User-friendly error messages
- Data recovery options

## Features

- **Manual Entry**: Add blood glucose readings with custom notes
- **Health Data Integration**:
  - iOS: Sync with Apple HealthKit
  - Android: Sync with Google Fit
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

### Android Permissions

The app requires the following Google Fit permissions:

- Fitness Activity Read
- Fitness Body Read
- Fitness Blood Glucose Read

These permissions are requested when the app first launches. Users can manage these permissions in their device's Google Fit settings.

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
