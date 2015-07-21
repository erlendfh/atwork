//
//  AWUtils.swift
//  AtWork
//
//  Created by Erlend Halvorsen on 20/07/15.
//  Copyright (c) 2015 Facebook. All rights reserved.
//

import Foundation

@objc(AWUtils)
class AWUtils: NSObject {
 
  @objc func presentLocalNotification(notification:UILocalNotification) {
    UIApplication.sharedApplication().presentLocalNotificationNow(notification)
  }
  
  @objc func registerForNotifications() {
  
    let action1 = UIMutableUserNotificationAction();
    action1.title = "Cancel";
    action1.destructive = true;
    action1.authenticationRequired = false;
    action1.activationMode = .Background;
    action1.identifier = "cancel_job";

    let actionCategory = UIMutableUserNotificationCategory();
    actionCategory.identifier = "new_job";
    actionCategory.setActions([action1], forContext: .Default);

    let categories = Set<NSObject>([actionCategory])
    let types: UIUserNotificationType = (.Alert | .Sound | .Badge);
    
    let settings = UIUserNotificationSettings(forTypes:types, categories: categories)

    UIApplication.sharedApplication().registerUserNotificationSettings(settings);
  }

}