#!/bin/bash

# Create output directories
mkdir -p ios/RN_HealthKit/Images.xcassets/AppIcon.appiconset
mkdir -p ios/RN_HealthKit/Images.xcassets/LaunchImage.imageset

# First convert SVGs to high-res PNGs
magick convert -background none -density 1024 assets/icon.svg ios/RN_HealthKit/Images.xcassets/AppIcon.appiconset/base.png
magick convert -background none -density 1024 assets/splash.svg ios/RN_HealthKit/Images.xcassets/LaunchImage.imageset/base.png

# Generate app icons
sips -z 40 40 ios/RN_HealthKit/Images.xcassets/AppIcon.appiconset/base.png --out ios/RN_HealthKit/Images.xcassets/AppIcon.appiconset/20@2x.png
sips -z 60 60 ios/RN_HealthKit/Images.xcassets/AppIcon.appiconset/base.png --out ios/RN_HealthKit/Images.xcassets/AppIcon.appiconset/20@3x.png
sips -z 58 58 ios/RN_HealthKit/Images.xcassets/AppIcon.appiconset/base.png --out ios/RN_HealthKit/Images.xcassets/AppIcon.appiconset/29@2x.png
sips -z 87 87 ios/RN_HealthKit/Images.xcassets/AppIcon.appiconset/base.png --out ios/RN_HealthKit/Images.xcassets/AppIcon.appiconset/29@3x.png
sips -z 80 80 ios/RN_HealthKit/Images.xcassets/AppIcon.appiconset/base.png --out ios/RN_HealthKit/Images.xcassets/AppIcon.appiconset/40@2x.png
sips -z 120 120 ios/RN_HealthKit/Images.xcassets/AppIcon.appiconset/base.png --out ios/RN_HealthKit/Images.xcassets/AppIcon.appiconset/40@3x.png
sips -z 120 120 ios/RN_HealthKit/Images.xcassets/AppIcon.appiconset/base.png --out ios/RN_HealthKit/Images.xcassets/AppIcon.appiconset/60@2x.png
sips -z 180 180 ios/RN_HealthKit/Images.xcassets/AppIcon.appiconset/base.png --out ios/RN_HealthKit/Images.xcassets/AppIcon.appiconset/60@3x.png

# Generate launch images
sips -z 1242 2436 ios/RN_HealthKit/Images.xcassets/LaunchImage.imageset/base.png --out ios/RN_HealthKit/Images.xcassets/LaunchImage.imageset/LaunchImage@3x.png
sips -z 828 1624 ios/RN_HealthKit/Images.xcassets/LaunchImage.imageset/base.png --out ios/RN_HealthKit/Images.xcassets/LaunchImage.imageset/LaunchImage@2x.png
sips -z 414 812 ios/RN_HealthKit/Images.xcassets/LaunchImage.imageset/base.png --out ios/RN_HealthKit/Images.xcassets/LaunchImage.imageset/LaunchImage.png

# Clean up base images
rm ios/RN_HealthKit/Images.xcassets/AppIcon.appiconset/base.png
rm ios/RN_HealthKit/Images.xcassets/LaunchImage.imageset/base.png 