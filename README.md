# RN HealthKit - Blood Glucose Tracker

A comprehensive React Native application for tracking and managing blood glucose readings. This app serves as both a standalone tracking tool and an integration point with Apple HealthKit for iOS.

## About This Project

This application was entirely developed using AI assistance through Cursor IDE. The development process involved:

- AI-powered code generation and implementation
- AI-assisted debugging and error resolution
- AI-guided architectural decisions
- AI-driven documentation and README creation

The use of AI in development has enabled:

- Rapid prototyping and iteration
- Consistent code quality and style
- Comprehensive error handling
- Efficient implementation of complex features
- Detailed documentation and comments

## Features

- Track blood glucose readings
- View readings in list or grid format
- Calculate and display key metrics:
  - Current reading
  - Estimated A1C
  - Average glucose
  - In-range percentage
  - High/low readings percentage
- Time range selection (1W, 2W, 1M, 3M, 6M, 1Y)
- HealthKit integration for iOS
  - Import blood glucose data from HealthKit
  - Export readings to HealthKit
  - Automatic sync with HealthKit
- Customizable target ranges
- Detailed statistics and insights

## Recent Updates

### Added Features

- **Enhanced Logging System**
  - Development-only logging in debug mode
  - Automatic logging suppression in production
  - Improved error tracking and debugging
  - Better performance in production builds

### Modified Features

- **Data Retrieval**

  - Optimized database queries for better performance
  - Improved filtering of readings based on selected time range
  - Enhanced error handling and logging

- **Home Screen**
  - Enhanced metric calculations
  - Improved performance by removing redundant calculations
  - Added proper error handling for calculations

## Core Functionality

### 1. Blood Glucose Data Management

- **Manual Entry**

  - Input blood glucose readings with precise values (mg/dL)
  - Add timestamps and optional notes
  - Track source of readings (manual vs. health platform)
  - Edit or delete existing entries

- **Health Platform Integration**
  - Seamless connection with Apple HealthKit
  - Import existing blood glucose readings
  - Write new readings back to HealthKit
  - Automatic background synchronization
  - Permission management for health data access

### 2. Data Visualization

- **List View**
  - Chronological display of all readings
  - Detailed entry information:
    - Blood glucose value
    - Timestamp
    - Source indication
    - Visual indicators for high/low readings
  - Color-coded entries based on glucose ranges
  - Support for entry deletion

### 3. Customization Features

- **Glucose Range Settings**
  - Customizable thresholds:
    - Low range (< 70 mg/dL default)
    - Normal range (70-180 mg/dL default)
    - High range (> 180 mg/dL default)
  - User-adjustable ranges in settings
  - Visual feedback based on ranges

### 4. Data Storage and Management

- **Local Storage**

  - SQLite database implementation
  - Reliable data persistence
  - Offline access capability
  - Efficient data retrieval

- **Data Synchronization**
  - Two-way sync with HealthKit
  - Automatic import of new readings
  - Manual import option
  - Duplicate prevention

### 5. User Interface

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

## Prerequisites

- Node.js (v18 or higher)
- npm or yarn
- iOS:
  - Xcode 15.0 or higher
  - CocoaPods
  - iOS Simulator or physical device running iOS 15.1 or higher

## Installation

1. **Clone the repository**

   ```bash
   git clone https://github.com/yourusername/RN_HealthKit.git
   cd RN_HealthKit
   ```

2. **Install dependencies**

   ```bash
   npm install
   ```

3. **iOS Setup**

   ```bash
   cd ios
   pod install
   cd ..
   ```

4. **Environment Configuration**
   - Open `ios/RN_HealthKit.xcworkspace` in Xcode
   - Select your target device/simulator
   - Update the Bundle Identifier if needed
   - Ensure your Apple Developer account is properly configured
   - Enable HealthKit capabilities in Xcode:
     - Select your target
     - Go to "Signing & Capabilities"
     - Click "+" and add "HealthKit"

## Running the App

1. **Start the Metro Bundler**

   ```bash
   npm start
   ```

2. **Run on iOS**
   ```bash
   npm run ios
   ```

## HealthKit Permissions

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
│   └── BloodGlucoseListScreen.tsx
├── services/         # Business logic
│   ├── database.ts   # SQLite operations
│   └── healthService.ts  # HealthKit integration
├── types/           # TypeScript definitions
│   └── BloodGlucose.ts
└── utils/          # Utility functions
    └── logger.ts   # Logging utility
```

## Troubleshooting

### Common Issues

1. **iOS Build Issues**

   - Ensure CocoaPods is installed and up to date
   - Run `pod install` in the ios directory
   - Clean the build folder in Xcode (Product > Clean Build Folder)

2. **HealthKit Permissions Not Working**

   - Verify HealthKit capabilities are enabled in Xcode
   - Check that the app has the necessary entitlements
   - Ensure the device/simulator has HealthKit enabled

3. **Database Issues**
   - The app uses SQLite for local storage
   - Data is stored in the app's documents directory
   - If data is not showing, try restarting the app

## License

This project is licensed under the MIT License - see the LICENSE file for details.

## Support

For support, please open an issue in the GitHub repository or contact the maintainers.
