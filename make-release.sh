cordova clean
ionic cordova build android --release
rm Juventus.apk
jarsigner -verbose -sigalg SHA1withRSA -digestalg SHA1 -keystore my-release-key.keystore platforms/android/app/build/outputs/apk/release/app-release-unsigned.apk juventus
/Users/hrishioa/Library/Android/sdk/build-tools/27.0.3/zipalign -v 4 platforms/android/app/build/outputs/apk/release/app-release-unsigned.apk Juventus.apk
/Users/hrishioa/Library/Android/sdk/build-tools/27.0.3/aapt dump badging Juventus.apk