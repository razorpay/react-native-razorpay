/**
 * Sample React Native App
 * https://github.com/facebook/react-native
 *
 * @format
 * @flow
 */

import React, { Component } from 'react';
import { Button, StyleSheet, View, NativeModules, NativeEventEmitter } from 'react-native';

import RazorpayCheckout from 'react-native-razorpay';
import base64 from 'react-native-base64'

export default class ButtonBasics extends Component {

  _onPressButton() {

    fetch('https://api.razorpay.com/v1/orders', {
      method: 'POST',
      headers: new Headers({
        Accept: 'application/json',
        'Content-Type': 'application/json',
        'Authorization': `Basic ${base64.encode('rzp_test_1DP5mmOlF5G5ag:thisissupersecret')}`
      }),
      body: JSON.stringify({
        amount: 100,
        currency: 'INR',
        "receipt": "rcptid_11"
      })
    }).then((res) => {
      return res.json();
    }).then((payment) => {
      console.log('PAYMENT :', payment.id);
      var options = {
        description: 'Credits towards consultation',
        image: 'https://i.imgur.com/3g7nmJC.png',
        currency: 'INR',
        key: 'rzp_test_1DP5mmOlF5G5ag',
        amount: '100',
        name: 'foo',
        prefill: {
          email: 'void@razorpay.com',
          contact: '9191919191',
          name: 'Razorpay Software'
        },
        order_id: payment.id,
        theme: { color: '#F37254' }
      }
      console.log(options);
      RazorpayCheckout.open(options).then().catch();
    }).catch()
    /* RazorpayCheckout.open(options).then((data) => {
      // handle success
      alert(`Success: ${data.razorpay_payment_id}`);
      console.log(data.razorpay_payment_id);
    }).catch((error) => {
      // handle failure
      alert(`Error: ${error.code} | ${error.description}`);
      console.log(error.description);
    }); */
  }

  render() {
    return (

      <View style={styles.container}>
        <View style={styles.buttonContainer}>
          <Button
            onPress={this._onPressButton}
            title="Press Me"
          />
        </View>
      </View>
    );
  }
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    justifyContent: 'center',
  },
  buttonContainer: {
    margin: 20
  },
  alternativeLayoutButtonContainer: {
    margin: 20,
    flexDirection: 'row',
    justifyContent: 'space-between'
  }
});

