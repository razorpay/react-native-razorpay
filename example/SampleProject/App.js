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
 

 export default class ButtonBasics extends Component {
  _onPressButton() {
var options = {
    description: 'Credits towards consultation',
    image: 'https://i.imgur.com/3g7nmJC.png',
    currency: 'INR',
    key: 'rzp_test_TgsFEggdZjTPWR',
    amount: '100',
    name: 'foo',
    prefill: {
      email: 'void@razorpay.com',
      contact: '9191919191',
      name: 'Razorpay Software'
    },
    theme: {color: '#F37254'}
  }
    RazorpayCheckout.open(options).then((data) => {
    // handle success
    alert(`Success: ${data.razorpay_payment_id}`);
    console.log(data.razorpay_payment_id);
  }).catch((error) => {
    // handle failure
    alert(`Error: ${error.code} | ${error.description}`);
    console.log(error.description);
  });
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

