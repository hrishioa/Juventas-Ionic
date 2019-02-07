# Juventas

Juventas is a glucose measurement system that can read values from the Freestyle Libre sensor using NfcV. Currently only supports Android, but any iOS developers are welcome to help!


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

![git clone](https://raw.githubusercontent.com/hrishioa/Juventas-Ionic/commits/master/images/git.gif)

Next, install the custom plugin
```bash
ionic cordova plugin add GlucoseFreedom
```

Install the npm packages
```bash
npm i
```

Build and run the app (connect an android device or have an emulator ready)
```bash
ionic cordova run android --device
```

## License

This project is licensed under the MIT License - see the [LICENSE.md](LICENSE.md) file for details

## Acknowledgments

* The requisite projects
* [Hebe Hilhorst](https://github.com/hebehh) for assisting with the reverse engineering and being the first user
* [Parag Bhatnagar](https://github.com/paragbhtngr) for design