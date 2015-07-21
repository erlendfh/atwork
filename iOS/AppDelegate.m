/**
 * Copyright (c) 2015-present, Facebook, Inc.
 * All rights reserved.
 *
 * This source code is licensed under the BSD-style license found in the
 * LICENSE file in the root directory of this source tree. An additional grant
 * of patent rights can be found in the PATENTS file in the same directory.
 */

#import "AppDelegate.h"

#import "RCTRootView.h"
#import "RCTEventDispatcher.h"

@implementation AppDelegate

- (BOOL)application:(UIApplication *)application didFinishLaunchingWithOptions:(NSDictionary *)launchOptions
{
  RCTRootView *rootView = [[RCTRootView alloc] initWithBridge:self.bridge moduleName:@"AtWork"];

  self.window = [[UIWindow alloc] initWithFrame:[UIScreen mainScreen].bounds];
  UIViewController *rootViewController = [[UIViewController alloc] init];
  rootViewController.view = rootView;
  self.window.rootViewController = rootViewController;
  [self.window makeKeyAndVisible];
  return YES;
}

-(void)applicationWillTerminate:(UIApplication *)application
{
  UILocalNotification* notification = [UILocalNotification new];
  notification.alertBody = @"Application will terminate";
  [application presentLocalNotificationNow:notification];
}

-(void) application:(UIApplication *)application handleActionWithIdentifier:(NSString *)identifier forLocalNotification:(UILocalNotification *)notification completionHandler:(void (^)())completionHandler
{
  NSDictionary* body = @{@"identifier": identifier,
                         @"notification":@{@"category":notification.category,
                                           @"userInfo":notification.userInfo}};
  
  [self.bridge.eventDispatcher sendAppEventWithName:@"ReceivedActionForLocalNotification" body:body];

  completionHandler();
}

-(RCTBridge*)bridge {
  if (!_bridge) {
    NSURL* jsCodeLocation = [NSURL URLWithString:@"http://localhost:8081/index.ios.bundle"];
    //   jsCodeLocation = [[NSBundle mainBundle] URLForResource:@"main" withExtension:@"jsbundle"];

    _bridge = [[RCTBridge alloc] initWithBundleURL:jsCodeLocation
                                    moduleProvider:nil
                                     launchOptions:nil];
  }
  
  return _bridge;
}

@end
