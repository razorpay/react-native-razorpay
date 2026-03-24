/**
 * Sample React Native App
 * https://github.com/facebook/react-native
 *
 * @format
 */

import { NewAppScreen } from '@react-native/new-app-screen';
import { StatusBar, StyleSheet, useColorScheme, View, Button } from 'react-native';
import {
  SafeAreaProvider,
  useSafeAreaInsets,
} from 'react-native-safe-area-context';
import RazorpayCheckout from 'react-native-razorpay';

function App() {
  const isDarkMode = useColorScheme() === 'dark';

  return (
    <SafeAreaProvider>
      <StatusBar barStyle={isDarkMode ? 'light-content' : 'dark-content'} />
      <AppContent />
    </SafeAreaProvider>
  );
}

function AppContent() {
  const safeAreaInsets = useSafeAreaInsets();

  return (
    <View style={styles.container}>
      
      <Button
        title="Pay"
        testID="pay-button"
        onPress={() => {
          console.log("Paying");
          RazorpayCheckout.open({
            "description": "Test Payment",
            "currency": "INR",
            "amount": "100",
            "name": "Test App - React Native",
            "theme": {
                "color": "#F37254"
                },
                "key":"rzp_test_1sjnKZ3EsBduvp"
          }).then((data) => {
            console.log(data);
          }).catch((error) => {
            console.log(error);
          });
        }}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
});

export default App;
