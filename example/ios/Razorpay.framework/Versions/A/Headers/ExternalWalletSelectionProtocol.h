//
//  ExternalWalletSelectionProtocol.h
//  Razorpay
//
//  Created by Akshay Bhalotia on 15/11/16.
//  Copyright © 2016 Razorpay. All rights reserved.
//

#import <Foundation/Foundation.h>

@protocol ExternalWalletSelectionProtocol <NSObject>

- (void)onExternalWalletSelected:(nonnull NSString *)walletName
                 WithPaymentData:(nullable NSDictionary *)paymentData;

@end
