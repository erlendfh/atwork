//
//  AWLocationManagerBridge.m
//  AtWork
//
//  Created by Erlend Halvorsen on 15/07/15.
//  Copyright (c) 2015 Facebook. All rights reserved.
//

#import "RCTBridgeModule.h"

@interface RCT_EXTERN_MODULE(AWLocationManager, NSObject)

RCT_EXTERN_METHOD(test)
RCT_EXTERN_METHOD(authorizationStatus:(RCTResponseSenderBlock)callback)
RCT_EXTERN_METHOD(requestAlwaysAuthorization)
RCT_EXTERN_METHOD(startMonitoringForRegion:(NSDictionary*)region callback:(RCTResponseSenderBlock)callback);
RCT_EXTERN_METHOD(stopMonitoringForRegion:(NSDictionary*)region callback:(RCTResponseSenderBlock)callback);
@end