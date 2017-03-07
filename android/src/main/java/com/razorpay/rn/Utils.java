package com.razorpay.rn;

import com.facebook.react.bridge.ReadableArray;
import com.facebook.react.bridge.ReadableMap;
import com.facebook.react.bridge.ReadableMapKeySetIterator;
import com.facebook.react.bridge.WritableArray;
import com.facebook.react.bridge.WritableMap;
import com.facebook.react.bridge.WritableNativeArray;
import com.facebook.react.bridge.WritableNativeMap;

import org.json.JSONArray;
import org.json.JSONException;
import org.json.JSONObject;

import java.util.Iterator;

public class Utils {

	public static JSONObject readableMapToJson(ReadableMap readableMap) {
		JSONObject object = new JSONObject();
		try {
			ReadableMapKeySetIterator iterator = readableMap.keySetIterator();
			while (iterator.hasNextKey()) {
				String key = iterator.nextKey();
				switch (readableMap.getType(key)) {
					case Null:
					object.put(key, JSONObject.NULL);
					break;
					case Boolean:
					object.put(key, readableMap.getBoolean(key));
					break;
					case Number:
					object.put(key, readableMap.getDouble(key));
					break;
					case String:
					object.put(key, readableMap.getString(key));
					break;
					case Map:
					object.put(key, readableMapToJson(readableMap.getMap(key)));
					break;
					case Array:
					object.put(key, readableArrayToJson(readableMap.getArray(key)));
					break;
				}
			}

		} catch(JSONException e){

		}
		return object;
	}

	public static JSONArray readableArrayToJson(ReadableArray readableArray) throws JSONException {
		JSONArray array = new JSONArray();
		for (int i = 0; i < readableArray.size(); i++) {
			switch (readableArray.getType(i)) {
				case Null:
				break;
				case Boolean:
				array.put(readableArray.getBoolean(i));
				break;
				case Number:
				array.put(readableArray.getDouble(i));
				break;
				case String:
				array.put(readableArray.getString(i));
				break;
				case Map:
				array.put(readableMapToJson(readableArray.getMap(i)));
				break;
				case Array:
				array.put(readableArrayToJson(readableArray.getArray(i)));
				break;
			}
		}
		return array;
	}

	public static WritableMap jsonToWritableMap(JSONObject jsonObject) {
		WritableMap writableMap = new WritableNativeMap();
		try {
			Iterator iterator = jsonObject.keys();
			while(iterator.hasNext()) {
				String key = (String) iterator.next();
				Object value = jsonObject.get(key);
				if (value instanceof Float || value instanceof Double) {
					writableMap.putDouble(key, jsonObject.getDouble(key));
				} else if (value instanceof Number) {
					writableMap.putInt(key, jsonObject.getInt(key));
				} else if (value instanceof String) {
					writableMap.putString(key, jsonObject.getString(key));
				} else if (value instanceof JSONObject) {
					writableMap.putMap(key, jsonToWritableMap(jsonObject.getJSONObject(key)));
				} else if (value instanceof JSONArray){
					writableMap.putArray(key, jsonToWritableArray(jsonObject.getJSONArray(key)));
				} else if (value == JSONObject.NULL){
					writableMap.putNull(key);
				}
			}
		} catch(JSONException e){
        	// Fail silently
		}
		return writableMap;
	}

	public static WritableArray jsonToWritableArray(JSONArray jsonArray) {
		WritableArray writableArray = new WritableNativeArray();
		try {
			for(int i=0; i < jsonArray.length(); i++) {
				Object value = jsonArray.get(i);
				if (value instanceof Float || value instanceof Double) {
					writableArray.pushDouble(jsonArray.getDouble(i));
				} else if (value instanceof Number) {
					writableArray.pushInt(jsonArray.getInt(i));
				} else if (value instanceof String) {
					writableArray.pushString(jsonArray.getString(i));
				} else if (value instanceof JSONObject) {
					writableArray.pushMap(jsonToWritableMap(jsonArray.getJSONObject(i)));
				} else if (value instanceof JSONArray){
					writableArray.pushArray(jsonToWritableArray(jsonArray.getJSONArray(i)));
				} else if (value == JSONObject.NULL){
					writableArray.pushNull();
				}
			}
		} catch(JSONException e){
        	// Fail silently
		}

		return writableArray;
	}   
}