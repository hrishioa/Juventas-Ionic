import { Component } from '@angular/core';
import { IonicPage, NavController, NavParams } from 'ionic-angular';
import { Storage } from '@ionic/storage';

@IonicPage()
@Component({
	selector: 'page-settings',
	templateUrl: 'settings.html',
})
export class SettingsPage {

	public graphUpperLimit = 4.0;
	public graphLowerLimit = 7.0;
	public graphUpperLine = 4.0;
	public graphLowerLine = 7.0;
	public leftButtonSetting = "1 Day";
	public middleButtonSetting = "30 Min";
	public rightButtonSetting = "15 Min";
	public graphUnits = "mg/dL";

	constructor(public navCtrl: NavController, public navParams: NavParams, private storage: Storage) {

		this.loadSettings();

	}

	loadSettings() {
		this.storage.get('graphUnits').then(graphUnits => {
			if(graphUnits) {
				this.graphUnits = graphUnits;
			} else {
				this.storage.set('graphUnits', this.graphUnits);
			}

			this.storage.get('graphUpperLimit').then(graphUpperLimit => {
				if(graphUpperLimit) {
					this.graphUpperLimit = graphUpperLimit;
				if(this.graphUnits == 'mg/dL')
					this.graphUpperLimit *= 18.018018;
				} else {
					this.storage.set('graphUpperLimit', this.graphUpperLimit);
				}
			});
			this.storage.get('graphLowerLimit').then(graphLowerLimit => {
				if(graphLowerLimit) {
					this.graphLowerLimit = graphLowerLimit;
				if(this.graphUnits == 'mg/dL')
					this.graphLowerLimit *= 18.018018;
				} else {
					this.storage.set('graphLowerLimit', this.graphLowerLimit);
				}
			});
			this.storage.get('graphUpperLine').then(graphUpperLine => {
				if(graphUpperLine) {
					this.graphUpperLine = graphUpperLine;
				if(this.graphUnits == 'mg/dL')
					this.graphUpperLine *= 18.018018;
				} else {
					this.storage.set('graphUpperLine', this.graphUpperLine);
				}
			});
			this.storage.get('graphLowerLine').then(graphLowerLine => {
				if(graphLowerLine) {
					this.graphLowerLine = graphLowerLine;
				if(this.graphUnits == 'mg/dL')
					this.graphLowerLine *= 18.018018;
				} else {
					this.storage.set('graphLowerLine', this.graphLowerLine);
				}
			});
		});

	}

	unitsChanged() {
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
			} else if(this.graphUnits == 'mg/dL') {
				this.graphUpperLimit = Math.floor(this.graphUpperLimit*18.018018*100)/100;
				this.graphLowerLimit = Math.floor(this.graphLowerLimit*18.018018*100)/100;
				this.graphUpperLine = Math.floor(this.graphUpperLine*18.018018*100)/100;
				this.graphLowerLine = Math.floor(this.graphLowerLine*18.018018*100)/100;
			}
		});


		this.storage.set('graphUnits', this.graphUnits);
		console.log("Unit has been changed to value ",this.graphUnits);

	}

	graphValuesChanged() {
		if(this.graphUnits == 'mg/dL') {
			this.storage.set('graphUpperLimit', this.graphUpperLimit*0.0555);
			this.storage.set('graphLowerLimit', this.graphLowerLimit*0.0555);
			this.storage.set('graphUpperLine', this.graphUpperLine*0.0555);
			this.storage.set('graphLowerLine', this.graphLowerLine*0.0555);
		} else {
			this.storage.set('graphUpperLimit', this.graphUpperLimit);
			this.storage.set('graphLowerLimit', this.graphLowerLimit);
			this.storage.set('graphUpperLine', this.graphUpperLine);
			this.storage.set('graphLowerLine', this.graphLowerLine);			
		}
	}

	ionViewDidLoad() {
		console.log('ionViewDidLoad SettingsPage');
	}

}
