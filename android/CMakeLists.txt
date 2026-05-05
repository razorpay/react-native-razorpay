# CMakeLists.txt for react-native-razorpay
# This enables C++ compilation for React Native New Architecture

cmake_minimum_required(VERSION 3.9.2)

set(CMAKE_VERBOSE_MAKEFILE ON)
set(CMAKE_CXX_STANDARD 17)

project(rnrazorpaycheckout)

# Add the library for the native module
add_library(
    rnrazorpaycheckout
    SHARED
    # Native implementation files for New Architecture
    src/newarch/cpp/OnLoad.cpp
    src/newarch/cpp/native-lib.cpp
)

# Include directories
target_include_directories(
    rnrazorpaycheckout
    PRIVATE
    "${CMAKE_CURRENT_SOURCE_DIR}/src/newarch/cpp"
    "${CMAKE_CURRENT_SOURCE_DIR}/src/newarch/cpp/include"
)

# Find and link required libraries
find_library(LOG_LIB log)

target_link_libraries(
    rnrazorpaycheckout
    ${LOG_LIB}
    android
)

# Optimization and debugging flags
if(CMAKE_BUILD_TYPE STREQUAL "Release")
    set(CMAKE_CXX_FLAGS "${CMAKE_CXX_FLAGS} -DNDEBUG -Ofast")
else()
    set(CMAKE_CXX_FLAGS "${CMAKE_CXX_FLAGS} -g")
endif()
