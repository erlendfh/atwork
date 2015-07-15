//
//  AWLocationManager.swift
//  AtWork
//
//  Created by Erlend Halvorsen on 15/07/15.
//  Copyright (c) 2015 Facebook. All rights reserved.
//

import Foundation
import CoreLocation


@objc(AWLocationManager)
class AWLocationManager: NSObject, CLLocationManagerDelegate, RCTBridgeModule {
  let manager: CLLocationManager
  var bridge: RCTBridge?
  
  override init() {
    manager = CLLocationManager()
    bridge = nil
    super.init()
    manager.delegate = self
  }
  
  @objc func test() {
    NSLog("It Works!")
  }
  
  @objc func authorizationStatus(callback: RCTResponseSenderBlock) {
    let status = CLLocationManager.authorizationStatus()
    callback([NSNull(), stringFromAuthStatus(status)]);
  }

  @objc func requestAlwaysAuthorization() {
    NSLog("Requesting auth")
    manager.requestAlwaysAuthorization()
  }
  
  func locationManager(manager: CLLocationManager!, didChangeAuthorizationStatus status: CLAuthorizationStatus) {
    NSLog("Changed auth status")
    self.bridge?.eventDispatcher.sendAppEventWithName("ChangedLocationAuthorizationStatus", body:stringFromAuthStatus(status))
  }
  
  func stringFromAuthStatus(status:CLAuthorizationStatus) -> NSString {
    var result = "Unknown"
    
    switch status {
    case .NotDetermined: result = "NotDetermined"
    case .Restricted: result = "Restricted"
    case .Denied: result = "Denied"
    case .AuthorizedAlways: result = "AuthorizedAlways"
    case .AuthorizedWhenInUse: result = "AuthorizedWhenInUse"
    }
    
    return result;
  }
  
}
