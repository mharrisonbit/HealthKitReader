import UIKit
import React
import HealthKit

@UIApplicationMain
class AppDelegate: UIResponder, UIApplicationDelegate, RCTBridgeDelegate {
  var window: UIWindow?
  var bridge: RCTBridge?

  func application(_ application: UIApplication, didFinishLaunchingWithOptions launchOptions: [UIApplication.LaunchOptionsKey : Any]? = nil) -> Bool {
    self.bridge = RCTBridge(delegate: self, launchOptions: launchOptions)
    guard let bridge = self.bridge else {
      return false
    }
    
    let rootView = RCTRootView(bridge: bridge, moduleName: "RN_HealthKit", initialProperties: nil)
    
    // Set background color on the window instead of the root view
    self.window = UIWindow(frame: UIScreen.main.bounds)
    if #available(iOS 13.0, *) {
      self.window?.backgroundColor = UIColor.systemBackground
    } else {
      self.window?.backgroundColor = UIColor.white
    }
    
    let rootViewController = UIViewController()
    rootViewController.view = rootView
    self.window?.rootViewController = rootViewController
    self.window?.makeKeyAndVisible()
    
    // Request HealthKit authorization
    if HKHealthStore.isHealthDataAvailable() {
      let healthStore = HKHealthStore()
      let typesToRead = Set([
        HKObjectType.quantityType(forIdentifier: .bloodGlucose)!,
        HKObjectType.characteristicType(forIdentifier: .dateOfBirth)!,
        HKObjectType.characteristicType(forIdentifier: .biologicalSex)!,
        HKObjectType.quantityType(forIdentifier: .bodyMass)!
      ])
      
      let typesToWrite = Set([
        HKObjectType.quantityType(forIdentifier: .bloodGlucose)!
      ])
      
      healthStore.requestAuthorization(toShare: typesToWrite, read: typesToRead) { (success, error) in
        if let error = error {
          print("Error requesting HealthKit authorization: \(error.localizedDescription)")
        }
      }
    }
    
    return true
  }
  
  func sourceURL(for bridge: RCTBridge!) -> URL! {
#if DEBUG
    return RCTBundleURLProvider.sharedSettings().jsBundleURL(forBundleRoot: "index")
#else
    return Bundle.main.url(forResource: "main", withExtension: "jsbundle")
#endif
  }
}
