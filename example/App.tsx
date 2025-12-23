import React, {useMemo, useState} from 'react';
import {
  Alert,
  KeyboardAvoidingView,
  Platform,
  Pressable,
  SafeAreaView,
  ScrollView,
  StatusBar,
  StyleSheet,
  Text,
  TextInput,
  View,
} from 'react-native';
import {WebView} from 'react-native-webview';
import RazorpayCheckout from 'react-native-razorpay';
import {shopifyCheckout} from './shopify.ts';
import {NativeModules} from 'react-native';


const defaultJson = JSON.stringify(
  {
    amount: 50000,
    currency: 'INR',
    description: 'Test payment',
    order_id: 'order_DBJOWzybf0sJbb',
    prefill: {email: 'customer@example.com', contact: '+911234567890'},
  },
  null,
  2,
);

function App(): React.JSX.Element {
  const [jsonText, setJsonText] = useState<string>(defaultJson);
  const [parsedJson, setParsedJson] = useState<Record<string, unknown> | null>(
    () => {
      try {
        return JSON.parse(defaultJson);
      } catch (err) {
        return null;
      }
    },
  );
  const [url, setUrl] = useState<string>('https://vivek-test-store-6.myshopify.com/checkouts/cn/hWN6Ui9xRw9qz5PUJPpb4Y3m/en-in?_r=AQABIJhT_lxn3XJqngEY-jtFkcBN1lTI8QOojVTEItgZQKQ&preview_theme_id=142627504230');
  const [showWebView, setShowWebView] = useState(false);

  const isJsonValid = useMemo(() => parsedJson !== null, [parsedJson]);

  const handleJsonChange = (text: string) => {
    setJsonText(text);
    try {
      const parsed = JSON.parse(text);
      setParsedJson(parsed);
    } catch (err) {
      setParsedJson(null);
    }
  };

  

  const handlePayPress = () => {
    if (!isJsonValid || !parsedJson) {
      Alert.alert('Invalid JSON', 'Please enter a valid JSON object.');
      return;
    }

    // The parsed JSON is stored in `parsedJson` for further use with Razorpay.
    Alert.alert(
      'Pay with Razorpay',
      'JSON payload saved. Wire this to RazorpayCheckout.open when ready.',
    );
  };

  const handleOpenWebView = () => {
    // RazorpayCheckout.getAppsWhichSupportUpi();
    
    if (!url.trim()) {
      Alert.alert('Missing URL', 'Please enter a URL to load.');
      return;
    }
    setShowWebView(true);
    setTimeout(() => {
      console.log('RNRazorpayCheckout module', NativeModules.RNRazorpayCheckout);
   console.log('injectJavascriptIntoWebView typeof', typeof NativeModules.RNRazorpayCheckout?.injectJavascriptIntoWebView);
      RazorpayCheckout.injectJavascriptIntoWebview();
    }, 50);
  };

  const handleOpenCheckoutSheet = () => {
    // RazorpayCheckout.getAppsWhichSupportUpi();
    
    if (!url.trim()) {
      Alert.alert('Missing URL', 'Please enter a URL to load.');
      return;
    }
    shopifyCheckout.present(url);
    setTimeout(() => {
      console.log('RNRazorpayCheckout module', NativeModules.RNRazorpayCheckout);
   console.log('injectJavascriptIntoWebView typeof', typeof NativeModules.RNRazorpayCheckout?.injectJavascriptIntoWebView);
      RazorpayCheckout.injectJavascriptIntoWebview(true);
    }, 500);
  };

  return (
    
    <SafeAreaView style={styles.safeArea}>
      <StatusBar barStyle="dark-content" />
      <KeyboardAvoidingView
        style={styles.flex}
        behavior={Platform.OS === 'ios' ? 'padding' : undefined}>
        <ScrollView
          style={styles.flex}
          contentContainerStyle={styles.content}
          keyboardShouldPersistTaps="handled">
          <Text style={styles.title}>Razorpay Demo</Text>

          <View style={styles.card}>
            <Text style={styles.label}>Payment JSON (10 lines)</Text>
            <TextInput
              value={jsonText}
              onChangeText={handleJsonChange}
              multiline
              numberOfLines={10}
              style={styles.jsonInput}
              textAlignVertical="top"
              placeholder="Enter payment options JSON"
              autoCorrect={false}
              autoCapitalize="none"
            />
            <Text
              style={[
                styles.helperText,
                {color: isJsonValid ? '#0a7b34' : '#b00020'},
              ]}>
              {isJsonValid
                ? 'Valid JSON saved for further use.'
                : 'Invalid JSON. Please fix formatting.'}
            </Text>
            <Pressable style={styles.primaryButton} onPress={handlePayPress}>
              <Text style={styles.primaryButtonText}>Pay with Razorpay</Text>
            </Pressable>
          </View>

          <View style={styles.card}>
            <Text style={styles.label}>WebView URL</Text>
            <TextInput
              value={url}
              onChangeText={setUrl}
              placeholder="https://example.com"
              style={styles.urlInput}
              autoCapitalize="none"
              autoCorrect={false}
              keyboardType="url"
            />
            <Pressable style={styles.secondaryButton} onPress={handleOpenWebView}>
              <Text style={styles.secondaryButtonText}>Use WebView</Text>
            </Pressable>

            <Pressable style={styles.secondaryButton} onPress={handleOpenCheckoutSheet}>
              <Text style={styles.secondaryButtonText}>Use Checkout Sheet</Text>
            </Pressable>
          </View>
        </ScrollView>
      </KeyboardAvoidingView>

      {showWebView && (
        <View style={styles.webviewOverlay}>
          <Pressable
            style={styles.closeButton}
            onPress={() => setShowWebView(false)}>
            <Text style={styles.closeButtonText}>Close WebView</Text>
          </Pressable>
          <WebView source={{uri: url}} startInLoadingState style={styles.flex} />
        </View>
      )}
    </SafeAreaView>
    
  );
}

const styles = StyleSheet.create({
  safeArea: {
    flex: 1,
    backgroundColor: '#f5f6fa',
  },
  flex: {
    flex: 1,
  },
  content: {
    padding: 16,
    gap: 16,
  },
  title: {
    fontSize: 22,
    fontWeight: '700',
    color: '#111827',
    textAlign: 'center',
  },
  card: {
    backgroundColor: '#ffffff',
    borderRadius: 12,
    padding: 16,
    shadowColor: '#000',
    shadowOpacity: 0.05,
    shadowRadius: 8,
    shadowOffset: {width: 0, height: 2},
    elevation: 2,
    gap: 12,
  },
  label: {
    fontSize: 16,
    fontWeight: '600',
    color: '#111827',
  },
  jsonInput: {
    borderWidth: 1,
    borderColor: '#d1d5db',
    borderRadius: 10,
    padding: 12,
    minHeight: 200,
    fontFamily: Platform.select({ios: 'Menlo', android: 'monospace'}),
    backgroundColor: '#f9fafb',
  },
  helperText: {
    fontSize: 13,
  },
  primaryButton: {
    backgroundColor: '#0b8cf0',
    paddingVertical: 14,
    borderRadius: 10,
    alignItems: 'center',
  },
  primaryButtonText: {
    color: '#ffffff',
    fontWeight: '700',
    fontSize: 16,
  },
  urlInput: {
    borderWidth: 1,
    borderColor: '#d1d5db',
    borderRadius: 10,
    padding: 12,
    backgroundColor: '#f9fafb',
  },
  secondaryButton: {
    borderWidth: 1,
    borderColor: '#0b8cf0',
    paddingVertical: 12,
    borderRadius: 10,
    alignItems: 'center',
  },
  secondaryButtonText: {
    color: '#0b8cf0',
    fontWeight: '700',
    fontSize: 16,
  },
  webviewOverlay: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: '#ffffff',
    zIndex: 10,
  },
  closeButton: {
    width: '100%',
    paddingVertical: 14,
    backgroundColor: '#111827',
    alignItems: 'center',
  },
  closeButtonText: {
    color: '#ffffff',
    fontWeight: '700',
    fontSize: 16,
  },
});

export default App;
