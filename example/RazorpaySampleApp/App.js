import React from "react";
import {useState} from "react";
import {
  SafeAreaView,
  StyleSheet,
  ScrollView,
  View,
  Modal,
  Text,
  Button,
  Alert,
  TouchableHighlight,
  Image,
  StatusBar,
} from 'react-native';

import {
  Header,
  LearnMoreLinks,
  Colors,
  DebugInstructions,
  ReloadInstructions,
} from 'react-native/Libraries/NewAppScreen';
import { TouchableOpacity, TextInput } from "react-native-gesture-handler";
// import Razorpay from 'react-native-customui';
import RazorpayCheckout from 'react-native-razorpay';
import { color } from "react-native-reanimated";

const App: () => React$Node = () =>{

  
 
  const [modalVisible, setModalVisible] = useState(false);
  const [imageUrl, onChangeText] = React.useState('Image URL');
  const [companyName, onChangeCompName] = React.useState('Razorpay Demo');
  const [color, onChangeColor] = React.useState('#2B4486');

  startPayment=()=>{
    if(imageUrl==="Image URL"){
        onChangeText("https://i.imgur.com/3g7nmJC.png")
    }

    var options = {
        name:companyName,
        description: "Online Store",
        image: imageUrl,
        currency: 'INR',
        key: 'rzp_live_ILgsfZCZoFIKMb',
        amount: '100',
        prefill: {
          email: 'void@razorpay.com',
          contact: '9191919191',
          name: 'Razorpay Software'
        },
        theme: {color: color}
      }
        RazorpayCheckout.open(options).then((data) => {
        // handle success
        alert(`Success: ${data.razorpay_payment_id}`);
      }).catch((error) => {
        // handle failure
        alert(`Error: ${error.code} | ${error.description}`);
      });
      }
  
  return(
    <>
    <Modal
        animationType="slide"
        transparent={false}
        visible={modalVisible}
        onRequestClose={() => {
          // Alert.alert("Modal has been closed.");
          console.log(imageUrl);
        }}>
        <ScrollView>
       <View style={styles.header_container}>
       <View style={styles.settings_header}>
          <TouchableHighlight activeOpacity = { .5 } onPress={() => {
                setModalVisible(!modalVisible);
              }}> 
          <Image style={styles.settings_logo}
            source={require('./assets/images/back_arrow.png')}
            
          ></Image>
          </TouchableHighlight>
        </View>
        <View style={styles.logo_header}>
          
          <Image style={styles.razorpay_logo_modal}
            source={require('./assets/images/Logo.png')}
          ></Image>
        </View>
        
      </View>
      <Text style={{
          fontFamily:"./assets/fonts/lato_bold.ttf",
          fontSize:24,
          color:"#162F56",
          marginStart:16,
          marginTop:32,
      }}>Settings</Text>

      <Text style={{
          fontFamily:"./assets/fonts/lato_normal.ttf",
          fontSize:14,
          color:"rgba(22, 47, 86, 0.54);",
          marginStart:16,
          marginTop:4
      }}>Customize Razorpay checkout to suit your  needs</Text>

      <View
        style={{
          borderBottomColor: "#E7EBF1",
          borderBottomWidth: 1,
          marginTop:21,

        }}
      />

      <Text style={{
        fontFamily:"./assets/fonts/lato_bold.ttf",
        fontSize:12,
        color:"rgba(22, 47, 86, 0.54);",
        marginStart:24,
        marginTop:27
      }}>COMPANY LOGO</Text>

      <View style={{borderWidth:1,borderColor:"#EDF0F5", width:"100%",margin:16}}>
        <Text style={{fontFamily:"./assets/fonts/lato_normal.ttf",fontSize:12,color:"rgba(22, 47, 86, 0.38);",marginStart:24,marginTop:20}}> 
          Company Image URL
        </Text>
        <TextInput style={{
          width:"100%",borderBottomWidth:2,borderBottomColor:"rgba(22, 47, 86, 0.24);",marginLeft:24,fontFamily:"./assets/fonts/lato_normal.ttf",fontSize:14,color:"rgba(22, 47, 86, 0.87)"
        }}
        value={imageUrl}
        onChangeText={text => onChangeText(text)}
        ></TextInput>
        <Text
          style={{fontFamily:"./assets/fonts/lato_normal.ttf",fontSize:12, color:"rgba(22, 47, 86, 0.38);",marginLeft:24,marginTop:2,marginBottom:20}}
        >A square image of minimum 256x256 px and public URL</Text>
      </View>


          <Text style={{
            fontFamily:"./assets/fonts/lato_bold.ttf",
            fontSize:12,
            color:"rgba(22, 47, 86, 0.54);",
            marginStart:24,
            marginTop:27
          }}>Brand Details</Text>

          <View style={{borderWidth:1,borderColor:"#EDF0F5", width:"100%",margin:16}}>
            <Text style={{fontFamily:"./assets/fonts/lato_normal.ttf",fontSize:12,color:"rgba(22, 47, 86, 0.38);",marginStart:24,marginTop:20}}> 
              Company Name
            </Text>
            <TextInput style={{
              width:"100%",borderBottomWidth:2,borderBottomColor:"rgba(22, 47, 86, 0.24);",marginLeft:24,fontFamily:"./assets/fonts/lato_normal.ttf",fontSize:14,color:"rgba(22, 47, 86, 0.87)"
            }}
            value={companyName}
            onChangeText={text => onChangeCompName(text)}
            ></TextInput>
            <Text
              style={{fontFamily:"./assets/fonts/lato_normal.ttf",fontSize:12, color:"rgba(22, 47, 86, 0.38);",marginEnd:24,marginLeft:24,marginTop:2,marginBottom:20}}
            >This will be visible on checkout</Text>
            <View
              style={{
              borderBottomColor: "#E7EBF1",
              borderBottomWidth: 1,
              marginTop:21,

            }}
            />

          <Text style={{fontFamily:"./assets/fonts/lato_normal.ttf",fontSize:12,color:"rgba(22, 47, 86, 0.38);",marginStart:24,marginTop:20}}> 
              Theme Color
            </Text>
            <View style={{flexDirection:"row"}}>
              <View style={{width:20, height:20, borderColor:color,backgroundColor:color, borderWidth:2,alignSelf:"center",marginStart:24}}/>
            <TextInput style={{
              width:"100%",borderBottomWidth:2,borderBottomColor:"rgba(22, 47, 86, 0.24);",marginEnd:24,fontFamily:"./assets/fonts/lato_normal.ttf",fontSize:14,color:"rgba(22, 47, 86, 0.87)"
            }}
            value={color}
            onChangeText={text => onChangeColor(text)}
            ></TextInput>
            </View>
            <Text
              style={{fontFamily:"./assets/fonts/lato_normal.ttf",fontSize:12, color:"rgba(22, 47, 86, 0.38);",marginLeft:24,marginTop:2,marginBottom:20}}
            >This will be visible on checkout</Text>

          </View>
        
        <Text style={{alignSelf:"center",width:"100%",
                backgroundColor:"rgba(209, 45, 45, 0.1)",
                borderTopColor:"rgba(209, 45, 45, 0.54)",
                borderTopWidth:1,
                fontFamily:"./assets/fonts/lato_bold.ttf",
                fontSize:14,
                paddingTop:35,
                paddingStart:20,
                paddingEnd:20,
                paddingBottom:35,
                color:"#162F56"
              }}>
          This is a demo application. We will not deliver any actual product. Any payments you make will be refunded back to your account automatically.
        </Text>

            
          </ScrollView>
    </Modal>


<StatusBar barStyle="dark-content" />

      <View style={styles.header_container}>
        <View style={styles.logo_header}>
          <Image style={styles.razorpay_logo}
            source={require('./assets/images/Logo.png')}
          ></Image>
        </View>
        <View style={styles.settings_header}>
          <TouchableHighlight activeOpacity = { .5 } onPress={() => {
                setModalVisible(!modalVisible);
              }}> 
          <Image style={styles.settings_logo}
            source={require('./assets/images/settings.png')}
            
          ></Image>
          </TouchableHighlight>
        </View>
      </View>
      <View style={styles.integrate_rzp}>
          <Text style={styles.integrate_rzp_text}>
            Integrate Razorpay with your business
          </Text>
          <View style={{justifyContent:"center"}}>
          <Image style={{alignSelf:"flex-end",}}
            source={require('./assets/images/arrow_forward.png')}
          ></Image>
          </View>
      </View>
      <Text style={{
        fontFamily:"./assets/fonts/lato_bold.ttf",
        fontSize:24,
        margin:20,
        marginStart:16,
      }}>
        My Cart
      </Text>
      <View style={styles.card}>
        <View style={styles.card_image}>
          <Image style={{height:80,
              width:80,
              alignSelf:"center",
              margin:12}}
            source={require('./assets/images/tshirt.png')}
          ></Image>
        </View>
        <View style={styles.card_content}>
          <Text style={{fontFamily:"./assets/fonts/lato_bold.ttf",
                fontSize:14,
                marginStart:16,
                marginTop:16,
                color:"rgba(22, 47, 86, 0.87)"
              }}>
              Sample T Shirt
            </Text>    
          <View style={{marginStart:16,
            marginTop:4,
            flexDirection:"row",
            }}>
                <Text style={{
                    fontFamily:"./assets/fonts/lato_normal.ttf",
                    fontSize:12,
                    color:"rgba(22, 47, 86, 0.54)"
                }}>
                  Color :
                </Text>
                <Text style={{
                    fontFamily:"./assets/fonts/lato_normal.ttf",
                    fontSize:12,
                    color:"rgba(22, 47, 86, 0.87)"
                }}>
                   Black
                </Text>
                <Text style={{
                    marginStart:20,
                    fontFamily:"./assets/fonts/lato_normal.ttf",
                    fontSize:12,
                    color:"rgba(22, 47, 86, 0.54)"
                }}>
                  Size :
                </Text>
                <Text style={{
                    fontFamily:"./assets/fonts/lato_normal.ttf",
                    fontSize:12,
                    color:"rgba(22, 47, 86, 0.87)"

                }}>
                   L 
                </Text>
            </View>
            <Text style={{
                fontFamily:"./assets/fonts/lato_bold.ttf",
                fontSize:16,
                color:"#162F56",
                marginStart:16,
                marginTop:14
            }}>₹1.00</Text>
        </View>

      </View>
      <View
        style={styles.bottom}
        >
        <View style={{alignSelf:"center",
          flexDirection:"row",
          justifyContent:"center",
          width: "100%",
          marginBottom:20
        }}>
          <Text style={{ alignSelf:"flex-start",marginEnd:"40%", fontFamily:"./assets/fonts/lato_bold.ttf", fontSize:20,color:"rgba(22, 47, 86, 0.38)" }}>Total Amount:</Text> 
          <Text style={{ alignSelf:"flex-end",fontFamily:"./assets/fonts/lato_bold.ttf", fontSize:20,color:"#162F56" }}>₹1.00</Text>          

        </View>
        <TouchableHighlight activeOpacity = { .5 } onPress={() => {startPayment()}}> 
        <Text  style={{alignSelf:"center",backgroundColor:"#2B83EA",marginBottom:32, marginStart:16,marginEnd:16,paddingTop:10,paddingBottom:10,width:"80%",textAlign:"center",
            fontSize:14,fontFamily:"./assets/fonts/lato_bold.ttf",color:"#ffffff"}}>
          Pay Now
        </Text>
        </TouchableHighlight>
        <Text style={{alignSelf:"center",width:"100%",
                backgroundColor:"rgba(209, 45, 45, 0.1)",
                borderTopColor:"rgba(209, 45, 45, 0.54)",
                borderTopWidth:1,
                fontFamily:"./assets/fonts/lato_bold.ttf",
                fontSize:14,
                paddingTop:35,
                paddingStart:20,
                paddingEnd:20,
                paddingBottom:35,
                color:"#162F56"
              }}>
          This is a demo application. We will not deliver any actual product. Any payments you make will be refunded back to your account automatically.
        </Text>
      </View>
    </>
  )
}

const styles = StyleSheet.create({
    header_container:{
      // flex:1,
      flexDirection:"row",

    },
    logo_header:{
      width:"80%",
      backgroundColor:"#2B4486",
      justifyContent:"center",
    },
    settings_header:{
      width:"20%",
      backgroundColor:"#2B4486",
      justifyContent:"center",

    },
    razorpay_logo:{
      alignSelf:"center",
      marginLeft:"25%",
      marginTop:20,
      marginBottom:20,
    },
    settings_logo:{
      alignSelf:"center",

    },
    integrate_rzp:{
      width:"100%",
      backgroundColor:"#4B95ED",
      flexDirection:"row",
    },
    integrate_rzp_text:{
      width:"90%",
      marginLeft:20,
      marginTop:16,
      marginBottom:16,
      color:"#ffffff",
      fontSize:14,
      fontFamily:"./assets/fonts/lato_bold.ttf",
  
    },card:{
      borderColor:"#EDF0F5",
      borderWidth:2,
      flexDirection:"row",
      marginStart:16,
      marginEnd:16,
      borderRadius:10
    },
    card_image:{
      width:"30%",
      backgroundColor:"rgba(22, 47, 86, 0.1)",
      justifyContent:"center"
    },
    cart_content:{
      width:"80%",
      flexDirection:"column"
    },
    bottom:{
      flex: 1,
      justifyContent: 'flex-end',
      flexDirection:"column",
    },
    razorpay_logo_modal:{
      alignSelf:"center",
      marginRight:"25%",
      marginTop:20,
      marginBottom:20,
    }
    


    
});

function payWithRazorpay(){
 
//   finalImageUrl :String = "https://s3.amazonaws.com/rzp-mobile/images/rzp.png"
//   if (this.imageUrl!=="Razorpay Demo") {
//       finalImageUrl = imageUrl;
//   }
//   var options = {
//     name:companyName,
    
//     image:finalImageUrl,
//     description: 'Credits towards consultation',
//     currency: 'INR',
//     theme:{
//       color:this.color
//     },
//     key_id: 'rzp_test_1DP5mmOlF5G5ag',
//     amount: '100',
//     email: 'gaurav.kumar@example.com',
//     contact: '9123456789',
    
//  }
 
//  RazorpayCheckout.open(options).then((data) => {
//     // handle success
//     alert(`Success: ${data.razorpay_payment_id}`);
// }).catch((error) => {
//     // handle failure
//     alert(`Error: ${error.code} | ${error.description}`);
//    }); x
}


export default App;