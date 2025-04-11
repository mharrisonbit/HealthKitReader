#!/bin/bash

# Create output directories
mkdir -p ios/RN_HealthKit/Images.xcassets/AppIcon.appiconset
mkdir -p ios/RN_HealthKit/Images.xcassets/LaunchImage.imageset

# Set Inkscape path
INKSCAPE="/opt/homebrew/bin/inkscape"

# Generate app icons
$INKSCAPE -w 40 -h 40 assets/icon.svg -o ios/RN_HealthKit/Images.xcassets/AppIcon.appiconset/20@2x.png
$INKSCAPE -w 60 -h 60 assets/icon.svg -o ios/RN_HealthKit/Images.xcassets/AppIcon.appiconset/20@3x.png
$INKSCAPE -w 58 -h 58 assets/icon.svg -o ios/RN_HealthKit/Images.xcassets/AppIcon.appiconset/29@2x.png
$INKSCAPE -w 87 -h 87 assets/icon.svg -o ios/RN_HealthKit/Images.xcassets/AppIcon.appiconset/29@3x.png
$INKSCAPE -w 80 -h 80 assets/icon.svg -o ios/RN_HealthKit/Images.xcassets/AppIcon.appiconset/40@2x.png
$INKSCAPE -w 120 -h 120 assets/icon.svg -o ios/RN_HealthKit/Images.xcassets/AppIcon.appiconset/40@3x.png
$INKSCAPE -w 120 -h 120 assets/icon.svg -o ios/RN_HealthKit/Images.xcassets/AppIcon.appiconset/60@2x.png
$INKSCAPE -w 180 -h 180 assets/icon.svg -o ios/RN_HealthKit/Images.xcassets/AppIcon.appiconset/60@3x.png
$INKSCAPE -w 20 -h 20 assets/icon.svg -o ios/RN_HealthKit/Images.xcassets/AppIcon.appiconset/ipad20.png
$INKSCAPE -w 40 -h 40 assets/icon.svg -o ios/RN_HealthKit/Images.xcassets/AppIcon.appiconset/ipad20@2x.png
$INKSCAPE -w 29 -h 29 assets/icon.svg -o ios/RN_HealthKit/Images.xcassets/AppIcon.appiconset/ipad29.png
$INKSCAPE -w 58 -h 58 assets/icon.svg -o ios/RN_HealthKit/Images.xcassets/AppIcon.appiconset/ipad29@2x.png
$INKSCAPE -w 40 -h 40 assets/icon.svg -o ios/RN_HealthKit/Images.xcassets/AppIcon.appiconset/ipad40.png
$INKSCAPE -w 80 -h 80 assets/icon.svg -o ios/RN_HealthKit/Images.xcassets/AppIcon.appiconset/ipad40@2x.png
$INKSCAPE -w 76 -h 76 assets/icon.svg -o ios/RN_HealthKit/Images.xcassets/AppIcon.appiconset/ipad76.png
$INKSCAPE -w 152 -h 152 assets/icon.svg -o ios/RN_HealthKit/Images.xcassets/AppIcon.appiconset/ipad76@2x.png
$INKSCAPE -w 167 -h 167 assets/icon.svg -o ios/RN_HealthKit/Images.xcassets/AppIcon.appiconset/ipad83.5@2x.png
$INKSCAPE -w 1024 -h 1024 assets/icon.svg -o ios/RN_HealthKit/Images.xcassets/AppIcon.appiconset/ios-marketing.png

# Generate launch images
$INKSCAPE -w 1242 -h 2436 assets/splash.svg -o ios/RN_HealthKit/Images.xcassets/LaunchImage.imageset/launch@3x.png
$INKSCAPE -w 828 -h 1792 assets/splash.svg -o ios/RN_HealthKit/Images.xcassets/LaunchImage.imageset/launch@2x.png
$INKSCAPE -w 414 -h 896 assets/splash.svg -o ios/RN_HealthKit/Images.xcassets/LaunchImage.imageset/launch.png 