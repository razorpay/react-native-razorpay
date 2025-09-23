package com.razorpay.rn

import com.facebook.react.bridge.*
import org.json.JSONArray
import org.json.JSONException
import org.json.JSONObject

object Utils {

    @JvmStatic
    fun readableMapToJson(readableMap: ReadableMap): JSONObject {
        val jsonObject = JSONObject()
        try {
            val iterator = readableMap.keySetIterator()
            while (iterator.hasNextKey()) {
                val key = iterator.nextKey()
                when (readableMap.getType(key)) {
                    ReadableType.Null -> jsonObject.put(key, JSONObject.NULL)
                    ReadableType.Boolean -> jsonObject.put(key, readableMap.getBoolean(key))
                    ReadableType.Number -> jsonObject.put(key, readableMap.getDouble(key))
                    ReadableType.String -> jsonObject.put(key, readableMap.getString(key))
                    ReadableType.Map -> jsonObject.put(key, readableMapToJson(readableMap.getMap(key)!!))
                    ReadableType.Array -> jsonObject.put(key, readableArrayToJson(readableMap.getArray(key)!!))
                }
            }
        } catch (e: JSONException) {
            // Fail silently
        }
        return jsonObject
    }

    @JvmStatic
    @Throws(JSONException::class)
    fun readableArrayToJson(readableArray: ReadableArray): JSONArray {
        val jsonArray = JSONArray()
        for (i in 0 until readableArray.size()) {
            when (readableArray.getType(i)) {
                ReadableType.Null -> { /* Skip null values */ }
                ReadableType.Boolean -> jsonArray.put(readableArray.getBoolean(i))
                ReadableType.Number -> jsonArray.put(readableArray.getDouble(i))
                ReadableType.String -> jsonArray.put(readableArray.getString(i))
                ReadableType.Map -> jsonArray.put(readableMapToJson(readableArray.getMap(i)!!))
                ReadableType.Array -> jsonArray.put(readableArrayToJson(readableArray.getArray(i)!!))
            }
        }
        return jsonArray
    }

    @JvmStatic
    fun jsonToWritableMap(jsonObject: JSONObject): WritableMap {
        val writableMap = WritableNativeMap()
        try {
            val iterator = jsonObject.keys()
            while (iterator.hasNext()) {
                val key = iterator.next() as String
                val value = jsonObject.get(key)
                when (value) {
                    is Float, is Double -> writableMap.putDouble(key, jsonObject.getDouble(key))
                    is Number -> writableMap.putInt(key, jsonObject.getInt(key))
                    is String -> writableMap.putString(key, jsonObject.getString(key))
                    is JSONObject -> writableMap.putMap(key, jsonToWritableMap(jsonObject.getJSONObject(key)))
                    is JSONArray -> writableMap.putArray(key, jsonToWritableArray(jsonObject.getJSONArray(key)))
                    JSONObject.NULL -> writableMap.putNull(key)
                }
            }
        } catch (e: JSONException) {
            // Fail silently
        }
        return writableMap
    }

    @JvmStatic
    fun jsonToWritableArray(jsonArray: JSONArray): WritableArray {
        val writableArray = WritableNativeArray()
        try {
            for (i in 0 until jsonArray.length()) {
                val value = jsonArray.get(i)
                when (value) {
                    is Float, is Double -> writableArray.pushDouble(jsonArray.getDouble(i))
                    is Number -> writableArray.pushInt(jsonArray.getInt(i))
                    is String -> writableArray.pushString(jsonArray.getString(i))
                    is JSONObject -> writableArray.pushMap(jsonToWritableMap(jsonArray.getJSONObject(i)))
                    is JSONArray -> writableArray.pushArray(jsonToWritableArray(jsonArray.getJSONArray(i)))
                    JSONObject.NULL -> writableArray.pushNull()
                }
            }
        } catch (e: JSONException) {
            // Fail silently
        }
        return writableArray
    }
}