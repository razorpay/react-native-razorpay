set -e

read -p "Enter the path of the react-native checkout directory : " REACT_CHECKOUT_DIRECTORY_PATH

if [ "$REACT_CHECKOUT_DIRECTORY_PATH" == "" ]
 then 
 cd ..	
 echo "current dir is $(pwd)"
 REACT_CHECKOUT_DIRECTORY_PATH="$(pwd)/"
fi 

read -p "Enter the latest version of the framework : " NEW_IOS_RELEASE_VERSION

read -p "Enter the latest version of the react native checkout package :" NEW_REACT_NATIVE_RELEASE_VERSION

#read -p "Enter the latest version of the example package :" EXAMPLE_RELEASE_VERSION
#
#if [ "$NEW_IOS_RELEASE_VERSION" == "" ] || [ "$NEW_REACT_NATIVE_RELEASE_VERSION" == "" ] || [ "$EXAMPLE_RELEASE_VERSION" == "" ]
#  then
#  exit 1
#fi

# split version into components

function decrementedVersion() {

	IFS='.' read -a ARR_VERSION_COMPONENTS <<< "$1"
	ARRAY_COUNT=${#ARR_VERSION_COMPONENTS[@]}
	REVISION_VERSION=${ARR_VERSION_COMPONENTS[ARRAY_COUNT - 1]}
	DECREMENTED_REVISION_VERSION=$(($REVISION_VERSION - 1))
	echo "${ARR_VERSION_COMPONENTS[0]}.${ARR_VERSION_COMPONENTS[1]}.$DECREMENTED_REVISION_VERSION"

}

OLD_REACT_NATIVE_RELEASE_VERSION=$( decrementedVersion "$NEW_REACT_NATIVE_RELEASE_VERSION" )

#OLD_EXAMPLE_RELEASE_VERSION=$( decrementedVersion "$EXAMPLE_RELEASE_VERSION" )

echo "\nnew release version :$NEW_IOS_RELEASE_VERSION, \n new react native version: $NEW_REACT_NATIVE_RELEASE_VERSION,\n old react native release version : $OLD_REACT_NATIVE_RELEASE_VERSION"

# create a new branch and make the changes

git checkout master
git pull origin master
git checkout -b r/v"$NEW_REACT_NATIVE_RELEASE_VERSION"

# download and replace framework

cd "$REACT_CHECKOUT_DIRECTORY_PATH"
echo "\nDownloading file from URL:https://rzp-mobile.s3.amazonaws.com/ios/checkout/$NEW_IOS_RELEASE_VERSION/RazorpayBitcodeX10.framework.zip"
wget https://rzp-mobile.s3.amazonaws.com/ios/checkout/"$NEW_IOS_RELEASE_VERSION"/RazorpayBitcodeX10.framework.zip
unzip RazorpayBitcodeX10.framework.zip
cp -R Razorpay.framework ./ios/
#cp -R Razorpay.framework ./example/ios/
   # r for recursive i.e for directories , f makes rm consider a success if the file it is trying to delete is not found , as in the
   # of __MACOSX - a macos dependant file which is generated only when unzipped from iOS 11 zips and not from iOS 8
rm -rf RazorpayBitcode*.framework.zip Razorpay.framework/ __MACOSX/

echo "current path is $(pwd)"

# replace version in package.json

sed -i '' "s/$OLD_REACT_NATIVE_RELEASE_VERSION/$NEW_REACT_NATIVE_RELEASE_VERSION/g" package.json

#cd example/
#
#sed -i '' "s/$OLD_EXAMPLE_RELEASE_VERSION/$EXAMPLE_RELEASE_VERSION/g" package.json

# go back to the original directory

cd "$REACT_CHECKOUT_DIRECTORY_PATH" 

# push code, create tag and create a PR

git add .
git commit -m "iOS Release $NEW_REACT_NATIVE_RELEASE_VERSION"
git push origin r/v"$NEW_REACT_NATIVE_RELEASE_VERSION"
hub pull-request -F- <<< "iOS Release $NEW_REACT_NATIVE_RELEASE_VERSION
updated framework for version $NEW_REACT_NATIVE_RELEASE_VERSION"
git tag -a "v$NEW_REACT_NATIVE_RELEASE_VERSION" -m "tagging version $NEW_REACT_NATIVE_RELEASE_VERSION"
git push origin "v$NEW_REACT_NATIVE_RELEASE_VERSION"

