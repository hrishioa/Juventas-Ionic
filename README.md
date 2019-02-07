# Juventas

Juventas is a glucose measurement system that can read values from the Freestyle Libre sensor using NfcV. Currently only supports Android, but any iOS developers are welcome to help!


![Screenshot 1](https://github.com/hrishioa/Juventas-Ionic/raw/master/images/screenshot1.jpg) ![Screenshot 2](https://github.com/hrishioa/Juventas-Ionic/raw/master/images/screenshot2.jpg)

### Prerequisites

* NodeJS
* [JDK](https://www.oracle.com/technetwork/java/javase/downloads/index.html) and [Android Studio](https://developer.android.com/studio/)
* [Ionic](https://ionicframework.com/)
* [Cordova](https://cordova.apache.org/) 

### Installing

First, clone the repository

```bash
git clone https://github.com/hrishioa/Juventas-Ionic
```

![git clone](https://github.com/hrishioa/Juventas-Ionic/raw/master/images/git.gif)

Next, install the custom plugin
```bash
ionic cordova plugin add GlucoseFreedom
```

![plugin](https://github.com/hrishioa/Juventas-Ionic/raw/master/images/plugin.gif)

Install the npm packages
```bash
npm install
```

![npm](https://github.com/hrishioa/Juventas-Ionic/raw/master/images/npm.gif)

Build and run the app (connect an android device or have an emulator ready)
```bash
ionic cordova run android --device
```

![build](https://github.com/hrishioa/Juventas-Ionic/raw/master/images/build.gif)

## License

This project is licensed under the MIT License - see the [LICENSE.md](LICENSE.md) file for details

## Acknowledgments

* The requisite projects
* [Hebe Hilhorst](https://github.com/hebehh) for assisting with the reverse engineering and being the first user
* [Parag Bhatnagar](https://github.com/paragbhtngr) for design