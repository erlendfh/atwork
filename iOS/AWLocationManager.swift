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
    NSLog("Monitored regions: %@", manager.monitoredRegions)
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
  
  @objc func startMonitoringForRegion(region:Dictionary<String, NSString>, callback:RCTResponseSenderBlock) {
    NSLog("Monitoring region %@", region);
    manager.startMonitoringForRegion(CLCircularRegion(
      center:CLLocationCoordinate2D(
        latitude: region["latitude"]!.doubleValue,
        longitude: region["longitude"]!.doubleValue),
      radius: region["radius"]!.doubleValue, identifier: region["identifier"] as! String));
    callback([NSNull()]);
  }
  
  func locationManager(manager: CLLocationManager!, didChangeAuthorizationStatus status: CLAuthorizationStatus) {
    NSLog("Changed auth status")
    self.bridge?.eventDispatcher.sendAppEventWithName("ChangedLocationAuthorizationStatus", body:stringFromAuthStatus(status))
  }

  func dictionaryForCLRegion(region:CLCircularRegion!) -> Dictionary<String, String> {
    return [
      "latitude": region.center.latitude.description,
      "longitude": region.center.longitude.description,
      "radius": region.radius.description,
      "identifier": region.identifier
    ]
  }
  
  func locationManager(manager: CLLocationManager!, didEnterRegion region: CLRegion!) {
    if (region.isKindOfClass(CLCircularRegion)) {
      self.bridge?.eventDispatcher.sendAppEventWithName("DidEnterRegion", body:self.dictionaryForCLRegion(region as! CLCircularRegion))
    }
  }
  
  func locationManager(manager: CLLocationManager!, didExitRegion region: CLRegion!) {
    if (region.isKindOfClass(CLCircularRegion)) {
      self.bridge?.eventDispatcher.sendAppEventWithName("DidExitRegion", body:self.dictionaryForCLRegion(region as! CLCircularRegion))
    }
    return
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
