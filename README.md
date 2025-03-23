Built completely by AI
# Blood Glucose Tracker

A comprehensive React Native mobile application designed to help users track and manage their blood glucose readings. The app integrates with both Apple HealthKit (iOS) and Google Fit (Android) to import existing blood glucose data, while also allowing manual entry of readings. This provides a unified platform for diabetes management across different devices and platforms.

## Features

- **Health Data Integration**

  - Import blood glucose readings from Apple HealthKit (iOS)
  - Import blood glucose readings from Google Fit (Android)
  - Automatic data synchronization with health platforms
  - Support for both metric and imperial units

- **Manual Data Entry**

  - Add new blood glucose readings manually
  - Include notes and timestamps with each reading
  - Edit or delete existing readings

- **Data Visualization**

  - View readings in a chronological list
  - Interactive charts showing trends over time
  - Filter and sort readings by date range
  - Export data functionality

- **Local Storage**

  - Secure local storage using SQLite
  - Offline access to all readings
  - Data persistence between app launches

- **Cross-Platform Support**
  - Native iOS implementation using HealthKit
  - Native Android implementation using Google Fit
  - Consistent user experience across platforms

## Prerequisites

Before you begin, ensure you have the following installed:

- **Development Environment**

  - Node.js (v18 or later)
  - npm (v9 or later) or yarn (v1.22 or later)
  - Git

- **iOS Development**

  - Xcode (v14 or later)
  - CocoaPods
  - iOS 13.0 or later
  - A Mac computer (required for iOS development)

- **Android Development**
  - Android Studio (latest version)
  - Android SDK
  - Android 6.0 (API level 23) or later
  - JDK 11 or later

## Installation

1. **Clone the Repository**

   ```bash
   git clone https://github.com/yourusername/RN_HealthKit.git
   cd RN_HealthKit
   ```

2. **Install Dependencies**

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
├── screens/           # App screens (list, add, charts)
├── services/         # Business logic and API calls
│   ├── database.ts   # SQLite database operations
│   ├── healthService.ts  # HealthKit/Google Fit integration
│   └── types.ts      # TypeScript interfaces
├── types/           # TypeScript type definitions
└── components/      # Reusable UI components
```

## Troubleshooting

### Common Issues

1. **iOS Build Issues**

   - Clean the build folder in Xcode
   - Delete derived data
   - Run `pod install` again
   - Ensure all certificates are valid

2. **Android Build Issues**

   - Clean the project in Android Studio
   - Update Gradle version if needed
   - Check SDK version compatibility
   - Ensure all dependencies are properly linked

3. **Metro Bundler Issues**
   - Clear Metro cache: `npm start -- --reset-cache`
   - Check for port conflicts
   - Ensure all dependencies are properly installed

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
