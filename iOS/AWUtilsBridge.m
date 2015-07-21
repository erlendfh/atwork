//
//  AWUtilsBridge.m
//  AtWork
//
//  Created by Erlend Halvorsen on 20/07/15.
//  Copyright (c) 2015 Facebook. All rights reserved.
//

#import "RCTBridgeModule.h"
#import "RCTConvert.h"

@implementation RCTConvert (UILocalNotification)

+ (UILocalNotification *)UILocalNotification:(id)json
{
  NSDictionary *details = [self NSDictionary:json];
  UILocalNotification *notification = [[UILocalNotification alloc] init];
  notification.fireDate = [RCTConvert NSDate:details[@"fireDate"]] ?: [NSDate date];
  notification.alertBody = [RCTConvert NSString:details[@"alertBody"]];
  notification.category = [RCTConvert NSString:details[@"category"]];
  notification.userInfo = [RCTConvert NSDictionary:details[@"userInfo"]];
  return notification;
}

@end

@interface RCT_EXTERN_MODULE(AWUtils, NSObject)

RCT_EXTERN_METHOD(presentLocalNotification:(UILocalNotification*)notification)

RCT_EXTERN_METHOD(registerForNotifications)

@end