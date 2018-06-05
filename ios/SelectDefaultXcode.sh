# to make sure that any command that fails in turn return a non zero status and does not continue further

set -e

# get framework path from command line or use the current working directory as the path

if [ $# -eq 0 ] ; then		
FRAMEWORK_PATH=$(pwd)/Razorpay.framework/
echo "Using the current working directory as the framework path which is $FRAMEWORK_PATH"
else
FRAMEWORK_PATH=$1
fi

#navigate to the module map

cd "$FRAMEWORK_PATH/Modules/"

#find xcode path and replace it with the default

DEFAULT_XCODE_PATH="$(xcode-select -p)"
IFS='/'
read -ra ARRAY <<< "$DEFAULT_XCODE_PATH"
XCODE_COMPONENT=${ARRAY[2]}
STRING_TO_BE_REPLACED="Xcode.app"
sed -i '' "s/$STRING_TO_BE_REPLACED/$XCODE_COMPONENT/g" module.modulemap
