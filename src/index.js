/**
* Sample React Native App demonstrating simplified Razorpay integration
* Matches the Swift code usage pattern provided by the user
* @flow
*/

import React, { Component } from 'react';
import {
  AppRegistry,
  StyleSheet,
  Text,
  View,
  TouchableHighlight,
  Alert,
} from 'react-native';

import RazorpayCheckout from 'react-native-razorpay';

class example extends Component {

  constructor(props) {
    super(props);
    this.state = {
      turboAvailable: false,
      turboInitialized: false
    };
  }

  async componentDidMount() {
    // Check if Turbo is available - equivalent to checking Turbo availability in Swift
    const turboAvailable = await RazorpayCheckout.isTurboAvailable();
    this.setState({ turboAvailable });
    
    if (turboAvailable) {
      console.log('✅ Turbo UPI is available');
      // Set up session token delegation - equivalent to TurboSessionDelegate in Swift
      await this.setupTurboSessionDelegation();
    } else {
      console.log('❌ Turbo UPI is not available. Enable with: npx razorpay-turbo on');
    }
  }

  // Equivalent to TurboSessionDelegate implementation in Swift
  setupTurboSessionDelegation = async () => {
    try {
      // Set up callback delegation for session tokens
      await RazorpayCheckout.setTurboSessionCallback();
      
      // Listen for token requests from native SDK - equivalent to fetchToken callback
      RazorpayCheckout.onTurboSessionTokenRequested(async (data) => {
        console.log('🔄 Native SDK requesting session token...', data);
        
        try {
          // Fetch token from your backend - equivalent to requestToken in Swift
          const sessionToken = await this.fetchSessionTokenFromBackend();
          
          // Note: In the simplified API, session tokens are handled via callback delegation
          // No need to manually set tokens as in the Swift example
          
          console.log('✅ Session token provided to native SDK');
        } catch (error) {
          console.error('❌ Failed to fetch session token:', error);
        }
      });
      
      console.log('🔧 Turbo session delegation setup complete');
    } catch (error) {
      console.error('❌ Failed to setup session delegation:', error);
    }
  }

  // Equivalent to requestToken function in Swift
  fetchSessionTokenFromBackend = async () => {
    // This is where you would implement your backend call
    // Replace with your actual backend endpoint and authentication
    
    const mockResponse = {
      token: `turbo_token_${Date.now()}`
    };
    
    // Simulate API delay
    await new Promise(resolve => setTimeout(resolve, 500));
    
    console.log('🎫 Generated session token:', mockResponse.token);
    return mockResponse.token;
    
    /* 
    // Real implementation would look like this:
    const response = await fetch('https://api.razorpay.com/v1/upi/turbo/customer/session', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': 'Basic your_base64_credentials'
      },
      body: JSON.stringify({
        customer_reference: '+919876543210' // Dynamic user reference
      })
    });
    
    const data = await response.json();
    return data.token;
    */
  }

  // Equivalent to razorpay.upiTurbo.initialize() in Swift
  initializeTurbo = async () => {
    const razorpayKey = 'rzp_test_1DP5mmOlF5G5ag'; // Replace with your key
    
    try {
      await RazorpayCheckout.initializeTurbo(razorpayKey);
      this.setState({ turboInitialized: true });
      Alert.alert('Success', 'Turbo UPI initialized successfully!');
    } catch (error) {
      Alert.alert('Error', `Turbo initialization failed: ${error.message}`);
    }
  }

  // Equivalent to razorpay.upiTurbo.manageUpiAccount() in Swift
  manageUpiAccounts = async () => {
    const razorpayKey = 'rzp_test_1DP5mmOlF5G5ag'; // Replace with your key
    
    try {
      await RazorpayCheckout.manageUpiAccounts(
        '+919876543210', // Replace with actual mobile number
        razorpayKey,
        '#3395ff' // Theme color
      );
      Alert.alert('Success', 'UPI account management completed');
    } catch (error) {
      Alert.alert('Error', `UPI management failed: ${error.message}`);
    }
  }

  // Equivalent to razorpay.open() in Swift with payment callbacks
  payWithRazorpay = () => {
    var options = {
      description: 'Credits towards consultation',
      image: 'https://i.imgur.com/3g7nmJC.png',
      currency: 'INR',
      key: 'rzp_test_1DP5mmOlF5G5ag', // Replace with your key
      amount: '5000',
      name: 'Turbo UPI Payment',
      prefill: {
        email: 'user@example.com',
        contact: '+919876543210',
        name: 'Test User'
      },
      theme: {color: '#F37254'}
    }
    
    // Equivalent to payment success/error callbacks in Swift
    RazorpayCheckout.open(options).then((data) => {
      // Equivalent to onPaymentSuccess in RazorpayPaymentCompletionProtocolWithData
      Alert.alert('Payment Success', `Payment ID: ${data.razorpay_payment_id}`);
    }).catch((error) => {
      // Equivalent to onPaymentError in RazorpayPaymentCompletionProtocolWithData
      Alert.alert('Payment Failed', `Error: ${error.code} | ${error.description}`);
    });
  }

  render() {
    const { turboAvailable, turboInitialized } = this.state;
    
    return (
      <View style={styles.container}>
        <Text style={styles.header}>Simplified Razorpay Integration</Text>
        <Text style={styles.subheader}>Matches Swift Code Pattern</Text>
        
        <Text style={styles.status}>
          Turbo Status: {turboAvailable ? '✅ Available' : '❌ Not Available'}
        </Text>
        
        {turboAvailable && (
          <>
            <TouchableHighlight 
              style={[styles.button, turboInitialized ? styles.buttonSuccess : styles.buttonPrimary]}
              onPress={this.initializeTurbo}
              disabled={turboInitialized}
            >
              <Text style={styles.buttonText}>
                {turboInitialized ? '✅ Turbo Initialized' : 'Initialize Turbo'}
              </Text>
            </TouchableHighlight>

            <TouchableHighlight 
              style={[styles.button, styles.buttonSecondary]}
              onPress={this.manageUpiAccounts}
              disabled={!turboInitialized}
            >
              <Text style={styles.buttonText}>Manage UPI Accounts</Text>
            </TouchableHighlight>
          </>
        )}

        <TouchableHighlight 
          style={[styles.button, styles.buttonPay]}
          onPress={this.payWithRazorpay}
        >
          <Text style={styles.buttonText}>
            {turboAvailable ? 'Pay with Turbo UPI' : 'Pay (Standard)'}
          </Text>
        </TouchableHighlight>

        {!turboAvailable && (
          <Text style={styles.helpText}>
            To enable Turbo UPI, run: {'\n'}
            npx razorpay-turbo on
          </Text>
        )}
      </View>
    );
  }

}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: '#F5FCFF',
    padding: 20,
  },
  header: {
    fontSize: 24,
    fontWeight: 'bold',
    marginBottom: 10,
    textAlign: 'center',
  },
  subheader: {
    fontSize: 16,
    color: '#666',
    marginBottom: 20,
    textAlign: 'center',
  },
  status: {
    fontSize: 16,
    marginBottom: 20,
    textAlign: 'center',
  },
  button: {
    backgroundColor: '#007AFF',
    paddingHorizontal: 20,
    paddingVertical: 12,
    borderRadius: 8,
    marginVertical: 8,
    minWidth: 200,
  },
  buttonPrimary: {
    backgroundColor: '#007AFF',
  },
  buttonSecondary: {
    backgroundColor: '#34C759',
  },
  buttonSuccess: {
    backgroundColor: '#28A745',
  },
  buttonPay: {
    backgroundColor: '#FF3B30',
  },
  buttonText: {
    color: 'white',
    fontSize: 16,
    fontWeight: 'bold',
    textAlign: 'center',
  },
  helpText: {
    fontSize: 14,
    color: '#666',
    textAlign: 'center',
    marginTop: 20,
    fontFamily: 'Courier',
  }
});

AppRegistry.registerComponent('example', () => example);
