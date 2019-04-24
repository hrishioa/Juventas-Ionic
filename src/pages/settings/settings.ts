import { Component } from '@angular/core';
import { IonicPage, NavController, NavParams } from 'ionic-angular';
import { Storage } from '@ionic/storage';
import { StatusBar } from '@ionic-native/status-bar';
import { Toast } from '@ionic-native/toast';
import { ToastController } from 'ionic-angular';

@IonicPage()
@Component({
	selector: 'page-settings',
	templateUrl: 'settings.html',
})
export class SettingsPage {

	public graphUpperLimit = 10.0;
	public graphLowerLimit = 1.0;
	public graphUpperLine = 7.0;
	public graphLowerLine = 4.0;
	public leftButtonSetting = "1 Day";
	public middleButtonSetting = "30 Min";
	public rightButtonSetting = "15 Min";
	public graphUnits = "mmol/L";
	public loadedSettings = false;

	constructor(public navCtrl: NavController, public toastCtrl: ToastController, public toast: Toast, public navParams: NavParams, private storage: Storage, private statusBar: StatusBar) {
		// this.loadSettings();
	}

	ionViewDidEnter() {
		this.loadSettings();
	}

	loadSettings() {
		this.loadedSettings = false;		
		this.storage.get('graphUnits').then(graphUnits => {
			if(graphUnits) {
				this.graphUnits = graphUnits;
			} else {
				this.storage.set('graphUnits', this.graphUnits);
			}
			return this.storage.get('graphUpperLimit');
		}).then(graphUpperLimit => {
			if(graphUpperLimit) {
				this.graphUpperLimit = graphUpperLimit;
				if(this.graphUnits == 'mg/dL')
					this.graphUpperLimit *= 18.018018;
				this.graphUpperLimit = Math.round( this.graphUpperLimit * 10) / 10;
			}
			return this.storage.get('graphLowerLimit');
		}).then(graphLowerLimit => {
			if(graphLowerLimit == 0 || graphLowerLimit) {
				this.graphLowerLimit = graphLowerLimit;
				if(this.graphUnits == 'mg/dL')
					this.graphLowerLimit *= 18.018018;
				this.graphLowerLimit = Math.round( this.graphLowerLimit * 10) / 10;
			}
			return this.storage.get('graphUpperLine');
		}).then(graphUpperLine => {
			if(graphUpperLine) {
				this.graphUpperLine = graphUpperLine;
				if(this.graphUnits == 'mg/dL')
					this.graphUpperLine *= 18.018018;
				this.graphUpperLine = Math.round( this.graphUpperLine * 10) / 10;
			}
			return this.storage.get('graphLowerLine');
		}).then(graphLowerLine => {
			if(graphLowerLine) {
				this.graphLowerLine = graphLowerLine;
				if(this.graphUnits == 'mg/dL')
					this.graphLowerLine *= 18.018018;
				this.graphLowerLine = Math.round( this.graphLowerLine * 10) / 10;
			}
			console.log("Loaded settings.");
			this.loadedSettings = true;
		});
	}

	unitsChanged() {
		console.log("Units changed");
		let toast = this.toastCtrl.create({
			message: "Graph units updated",
			duration: 1000,
			position: 'bottom'
		});
		toast.present();

		this.storage.get('graphUnits').then(graphUnits => {
			if(graphUnits && (graphUnits != this.graphUnits)) {
				if(this.graphUnits == 'mg/dL') {
					this.graphUpperLimit = Math.floor(this.graphUpperLimit*18.018018*100)/100;
					this.graphLowerLimit = Math.floor(this.graphLowerLimit*18.018018*100)/100;
					this.graphUpperLine = Math.floor(this.graphUpperLine*18.018018*100)/100;
					this.graphLowerLine = Math.floor(this.graphLowerLine*18.018018*100)/100;
				} else {
					this.graphUpperLimit = Math.floor(this.graphUpperLimit*0.0555*100)/100;
					this.graphLowerLimit = Math.floor(this.graphLowerLimit*0.0555*100)/100;
					this.graphUpperLine = Math.floor(this.graphUpperLine*0.0555*100)/100;
					this.graphLowerLine = Math.floor(this.graphLowerLine*0.0555*100)/100;
				}
			} else if(!graphUnits && this.graphUnits == 'mg/dL') {
				this.graphUpperLimit = Math.floor(this.graphUpperLimit*18.018018*100)/100;
				this.graphLowerLimit = Math.floor(this.graphLowerLimit*18.018018*100)/100;
				this.graphUpperLine = Math.floor(this.graphUpperLine*18.018018*100)/100;
				this.graphLowerLine = Math.floor(this.graphLowerLine*18.018018*100)/100;
			}
			this.storage.set('graphUnits', this.graphUnits);
			console.log("Unit has been changed to value ",this.graphUnits);
			this.graphValuesChanged();
		});
	}

	graphValuesChanged() {

		if(!this.loadedSettings) {
			console.log("Not writing because settings are still loading...");
			return;
		}

		if(this.graphUnits == 'mg/dL') {
			console.log("Writing mgdl - ",this.graphUpperLimit*0.0555,",",(this.graphLowerLimit*0.0555),",",(this.graphUpperLine*0.0555),",",this.graphLowerLine*0.0555);
			if(!isNaN(this.graphUpperLimit)) 
				this.storage.set('graphUpperLimit', this.graphUpperLimit*0.0555);
			if(!isNaN(this.graphLowerLimit))
				this.storage.set('graphLowerLimit', this.graphLowerLimit*0.0555);
			if(!isNaN(this.graphUpperLine))
				this.storage.set('graphUpperLine', this.graphUpperLine*0.0555);
			if(!isNaN(this.graphLowerLine))
				this.storage.set('graphLowerLine', this.graphLowerLine*0.0555);
		} else {
			console.log("Writing Graph values - ",this.graphUpperLimit,",",this.graphLowerLimit,",",this.graphUpperLine,",",this.graphLowerLine);
			console.log("this.graphLowerLimit is ",this.graphLowerLimit, " and isNan is ", isNaN(this.graphLowerLimit));
			if(!isNaN(this.graphUpperLimit))
				this.storage.set('graphUpperLimit', this.graphUpperLimit);
			if(!isNaN(this.graphLowerLimit))
				this.storage.set('graphLowerLimit', this.graphLowerLimit);
			if(!isNaN(this.graphUpperLine))
				this.storage.set('graphUpperLine', this.graphUpperLine);
			if(!isNaN(this.graphLowerLine))
				this.storage.set('graphLowerLine', this.graphLowerLine);
		}

		console.log("Graph values - ",this.graphUpperLimit,",",this.graphLowerLimit,",",this.graphUpperLine,",",this.graphLowerLine);
	}

	ionViewDidLoad() {
		console.log('ionViewDidLoad SettingsPage');
		this.statusBar.overlaysWebView(false);
		// this.statusBar.styleBlackTranslucent();
	}

}
