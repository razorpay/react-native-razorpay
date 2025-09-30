import { Text, View, StyleSheet, Button } from 'react-native';
import RazorpayCheckout from 'react-native-razorpay';



export default function App() {
  return (
    <View style={styles.container}>
      <Button title = "Pay with Razorpay" onPress={()=>{
        console.log(RazorpayCheckout.multiply(12,12))
          RazorpayCheckout.open({
            "description": "Test Payment",
            "currency": "INR",
            "amount": "100",
            "name": "Test App - React Native",
            "theme": {
                "color": "#F37254"
                },
            "key":"rzp_test_1DP5mmOlF5G5ag"
        }, (data:any)=>{
            console.log(data);
        }, (error:any) => {
            console.log(error);
        });
      }}/>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
  },
});
