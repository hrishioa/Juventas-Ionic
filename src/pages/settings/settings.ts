import { Component } from '@angular/core';
import { IonicPage, NavController, NavParams } from 'ionic-angular';
import { Storage } from '@ionic/storage';

@IonicPage()
@Component({
  selector: 'page-settings',
  templateUrl: 'settings.html',
})
export class SettingsPage {

  public graphUpperLimit = 4;
  public graphLowerLimit = 7;
  public graphUpperLine = 4;
  public graphLowerLine = 7;
  public leftButtonSetting = "1 Day";
  public middleButtonSetting = "30 Min";
  public rightButtonSetting = "15 Min";
  public units = "mg/dL";

  constructor(public navCtrl: NavController, public navParams: NavParams, private storage: Storage) {

  	this.loadSettings();

  }

  loadSettings() {
  	this.storage.get('graphUnits').then(graphUnits => {
  		if(graphUnits) {
  			this.units = graphUnits;
  		} else {
  			this.storage.set('graphUnits', this.units);
  		}
  	})

  }

  unitsChanged() {
  	this.storage.set('graphUnits', this.units);
  	console.log("Unit has been changed to value ",this.units);
  }

  ionViewDidLoad() {
    console.log('ionViewDidLoad SettingsPage');
  }

}
