import { Component } from '@angular/core';
import { NavController } from 'ionic-angular';
import * as HighCharts from 'highcharts';
import HighChartsMore from "highcharts/highcharts-more";
import SolidGauge from 'highcharts/modules/solid-gauge';
import { Chart } from 'chart.js';
import { ViewChild } from '@angular/core';

// WEB DISABLE
import { Toast } from '@ionic-native/toast';
import { Vibration } from '@ionic-native/vibration';
import { SQLite, SQLiteObject } from '@ionic-native/sqlite';
import { SQLitePorter } from '@ionic-native/sqlite-porter';
import { NFC, Ndef } from '@ionic-native/nfc';
import { StatusBar } from '@ionic-native/status-bar';


import * as highChartsUtils from "./highchartsUtils";
import { BehaviorSubject } from 'rxjs/Rx';
import { Storage } from '@ionic/storage';
import { Platform } from 'ionic-angular';
import { NavParams } from 'ionic-angular';
import { ToastController } from 'ionic-angular';
import { SettingsPage } from '../settings/settings';
import { global } from '@angular/core/src/util';

// WEB DISABLE
declare var cordova: any;

HighChartsMore(HighCharts);
SolidGauge(HighCharts);

// Custom plugin for rounded edges on the gauge
(highChartsUtils.roundedEdgesPlugin)(HighCharts);

//yeah this is hacky as all hell - probably fix it but fuck you highcharts for now
var globalGraphUnits = "mmol/L";

@Component({
	selector: 'page-home',
	templateUrl: 'home.html'
})
export class HomePage {
	@ViewChild('lineCanvas') lineCanvas;

	barChart: any;

	public graphUpperLimit = 4.0;
	public graphLowerLimit = 7.0;
	public graphUpperLine = 4.0;
	public graphLowerLine = 7.0;
	public timeSinceInsulin: string = "∞";
	public timeSinceFood: string = "∞";
	public lastInsulinTime: number = 0;
	public lastFoodTime: number = 0;
	insulinChart; 
	insulinGauge;
	private chartSetting: string;
	database: SQLiteObject;
	private databaseReady: BehaviorSubject<boolean>;
	public graphUnits = 'mmol/L';

	// WEB DISABLE
	constructor(private toastCtrl: ToastController, public navParams: NavParams, private statusBar: StatusBar, private platform: Platform, private storage: Storage, private sqlite: SQLite, private sqlitePorter: SQLitePorter, public vibration: Vibration, private toast: Toast, public navCtrl: NavController, private nfc: NFC, private ndef: Ndef) {
	// constructor(private toastCtrl: ToastController, public navParams: NavParams, private platform: Platform, private storage: Storage,  public navCtrl: NavController) {
		setInterval(() => {
			this.updateTimeSince();
		}, 1000);

		this.chartSetting = "day";

		// WEB DISABLE
		this.storage.get('chartSetting').then(val => {
			if(val) {
				console.log("Storage has chartSetting - ",val)
				this.chartSetting = val;
			}
			else {
				console.log("No chart set - default is day");
				this.storage.set('chartSetting','day');
			}
		});
		this.platform.ready().then(() => {
			this.loadSettings();
		});

		// WEB DISABLE
		this.databaseReady = new BehaviorSubject(false);
		this.platform.ready().then(() => this.initDatabase())
		.then(() => this.storage.get('chartSetting')).then(val => {
			if(val) 
				this.chartSetting = val;
			else {
				console.log("No chart set - default is day");
				this.storage.set('chartSetting','day');
			}
		}).then(() => this.updateCharts());
	}

	loadSettings() {
		this.storage.get('graphUnits').then(graphUnits => {
			if(graphUnits) {
				this.graphUnits = graphUnits;
				globalGraphUnits = this.graphUnits;
			}
			return this.storage.get('graphUpperLimit');
		}).then(graphUpperLimit => {
			if(graphUpperLimit)
				this.graphUpperLimit = graphUpperLimit;
			return this.storage.get('graphLowerLimit');
		}).then(graphLowerLimit => {
			if(graphLowerLimit == 0 || graphLowerLimit)
				this.graphLowerLimit = graphLowerLimit;
			return this.storage.get('graphUpperLine');
		}).then(graphUpperLine => {
			if(graphUpperLine)
				this.graphUpperLine = graphUpperLine;
			return this.storage.get('graphLowerLine'); 
		}).then(graphLowerLine => {
			if(graphLowerLine)
				this.graphLowerLine = graphLowerLine;
			console.log("Loaded graphValues - ",this.graphUpperLimit,",",this.graphLowerLimit,",",this.graphUpperLine,",",this.graphLowerLine);
			this.initCharts();
		});
	}

	ionViewDidEnter() {
		this.loadSettings();
		this.statusBar.overlaysWebView(true);
		this.statusBar.styleBlackTranslucent();
	}

	ionViewDidLoad(){

		// WEB DISABLE
		this.statusBar.overlaysWebView(true);
		this.statusBar.styleBlackTranslucent();

		// this.initCharts();

		// WEB DISABLE
		console.log("cordova.plugin is ",cordova.plugin);

		if(cordova.plugins)
			cordova.plugins.GlucoseFreedom.registerSensorListener((sensor) => {
				console.log("Got sensor Data - writing to chart...");
				this.writeToDatabase(sensor);
			});
	}

	sensorSuccess() {
		this.vibration.vibrate(100);
		console.log("Sensor read success.");
	}

	sensorFailure() {
		this.vibration.vibrate(1000);
		console.log("Sensor read failure.");
	}

	// WEB DISABLE
	initDatabase() {
		return this.sqlite.create({
			name: 'developers.db',
			location: 'default'
		}).then((db: SQLiteObject) => {
			this.database = db;
			this.storage.get('database_created').then(val => {
				if(val) {
					console.log("Table already created.");
					this.databaseReady.next(true);
				} else {
					console.log("Creating table...");
					let create_code = "CREATE TABLE libreLogs (estTimeStamp INT, sensorID VARCHAR(12), gRaw INT, tRaw INT, gVal FLOAT, tVal FLOAT, type INT, readTime INT, sensorTime INT, drift INT DEFAULT 0);";
					create_code += "CREATE TABLE activityLogs (timeStamp INT, action VARCHAR(100), description VARCHAR(255))";
					this.sqlitePorter.importSqlToDb(this.database, create_code).then(() =>  {
						console.log('Created Table.');
						this.storage.set('database_created',true);
					}).catch(e => console.error(e));
				}
			});
		});
	}

	writeToDatabase(sensor) {
		if(sensor.tag == null || sensor.tag.denseGRaw == null || (sensor.tag.denseGRaw.length == 0 && sensor.tag.sparseGRaw.length == 0)) {
			console.log("No sensor read.");
			this.sensorFailure();
			return;
		}

		this.sensorSuccess();

		var timezoneOffset = ((new Date('August 19, 1975 23:15:30 GMT+07:00')).getTimezoneOffset())*60*1000;

		var insertSql = 'INSERT INTO libreLogs(estTimeStamp,sensorID,gRaw,tRaw,tVal,gVal,type,readTime,sensorTime,drift) VALUES (?,?,?,?,?,?,?,?,?,?)'

		console.log("Got sensor data - ",sensor);

		var timeRemaining = Math.floor(((60*60*24*14)-sensor.tag.sensorTime)/(60*60*24));

		let toast = this.toastCtrl.create({
			message: timeRemaining+" days remaining on sensor",
			duration: 3000,
			position: 'bottom'
		});

		toast.present();

		console.log("Writing data..");

		var indices = []
		for(var i=0;i<sensor.tag.denseGRaw.length;i++)
			indices.push(i);

		var denseTimestamp = Date.now()-timezoneOffset;

		var promises = indices.map(index => {
			if(sensor.tag.denseGRaw[index] == null)
				return Promise.resolve();
			var dataArray = [
				   // (sensor.tag.denseTimestamps[index]*1000)-timezoneOffset, 
				    denseTimestamp-(index*60*1000),
					sensor.tag.sensorID, 
					sensor.tag.denseGRaw[index],
					sensor.tag.denseTRaw[index],
					sensor.tag.denseTVals[index],
					sensor.tag.denseGVals[index],
					0, // 0 is dense
					sensor.tag.readTime,
					sensor.tag.sensorTime,
					0
			];
			console.log("Writing dense row - ", index," - ", dataArray);
			return this.database.executeSql(insertSql, dataArray);

		});

		Promise.all(promises).then(() => console.log("Done writing dense rows."));

		// We're possibly duplicating code to be safe; references in promises proved trickyt

		indices = []
		for(var i=0;i<sensor.tag.sparseGRaw.length;i++)
			indices.push(i);

		var sparseTimestamps = Date.now()-timezoneOffset-(1000*60*15);

		promises = indices.map(index => {
			if(sensor.tag.sparseGRaw[index] == null)
				return Promise.resolve();
			var dataArray = [
					sparseTimestamps-(index*1000*60*15),
				   // (sensor.tag.sparseTimestamps[index]*1000)-timezoneOffset, 
					sensor.tag.sensorID, 
					sensor.tag.sparseGRaw[index],
					sensor.tag.sparseTRaw[index],
					sensor.tag.sparseTVals[index],
					sensor.tag.sparseGVals[index],
					0, // 1 is sparse
					sensor.tag.readTime,
					sensor.tag.sensorTime,
					0
			];
			console.log("Writing sparse row - ", index," - ", dataArray);
			return this.database.executeSql(insertSql, dataArray);
		});

		Promise.all(promises).then(() => console.log("Done writing sparse rows."));

		this.updateCharts();

	}

	updateTimeSince() {

		console.log("updateTimeSince called - lastInsulinTime = ", this.lastInsulinTime, ", lastFoodTime - ", this.lastFoodTime);

		var infinityChar = "∞";
		var timezoneOffset = ((new Date('August 19, 1975 23:15:30 GMT+07:00')).getTimezoneOffset())*60*1000;

		if(this.lastInsulinTime == 0) {
			this.timeSinceInsulin = infinityChar;
		} else {
			this.timeSinceInsulin = this.getTime(Date.now()-timezoneOffset-this.lastInsulinTime);
		}

		if(this.lastFoodTime == 0) {
			this.timeSinceFood = infinityChar;
		} else {
			this.timeSinceFood = this.getTime(Date.now()-timezoneOffset-this.lastFoodTime);
		}

	}

	getTime(timeDiff) {
		if(timeDiff < (60*1000))
			return ""+(Math.floor((timeDiff%(60*1000))/1000))+"s";
		timeDiff /= (60*1000);
		if(timeDiff < 60)
			return ""+(Math.floor(timeDiff%60)+"m");
		timeDiff /= (60);
		if(timeDiff < 24)
			return ""+(Math.floor(timeDiff%24)+"h");
		timeDiff /= (24);
		if(timeDiff < 7)
			return ""+(Math.floor(timeDiff%7)+"d");
		timeDiff /= 7;
		return ""+(Math.floor(timeDiff)%52)+"w";
	}


	initCharts() {
		HighCharts.setOptions(highChartsUtils.glucoseGraphTheme);
		if(this.insulinChart)
			this.insulinChart.destroy();
		this.insulinChart = HighCharts.chart('container', {
			tooltip: {
				formatter: function () {
					if(globalGraphUnits == "mg/dL") {
						return (this.y*18.018018).toFixed(2)+' '+globalGraphUnits;
					} else {
						return (this.y).toFixed(2)+' '+globalGraphUnits;
					}
				}
			},
			credits: {
				enabled: false
			},
			rangeSelector: {
				floating: true,
				y: -65,
				verticalAlign: 'bottom'
			},
			chart: {
				zoomType: 'x'
			},
			title: {
				text: null,
			},
			xAxis: {
				type: 'datetime',
				dateTimeLabelFormats: {
					day: ""
				},
			},
			yAxis: {
				max:this.graphUpperLimit, //15 
				min:this.graphLowerLimit, //0
				title: {
					style: 'color: "#222222"',
					text: 'Glucose Value'
				},
				gridLineDashStyle:"longdash",
				// gridZIndex: 4,
				plotLines: [{
					width:1,
					color: 'green',
					value: this.graphUpperLine, //6
				},{
					width:1,
					color: 'green',
					value: this.graphLowerLine, //9
				}],
				labels: {
					formatter: function() {
						return (globalGraphUnits == 'mg/dL' ? (this.value*18.018018).toFixed(2) : this.value.toFixed(2));
					}
				}
			},
			legend: {
				enabled: false
			},
			plotOptions: {
				area: {
					fillColor: {
						linearGradient: {
							x1: 0,
							y1: 0,
							x2: 0,
							y2: 1
						},
						stops: [
						[0, HighCharts.getOptions().colors[0]],
						[1, HighCharts.Color(HighCharts.getOptions().colors[0]).setOpacity(0).get('rgba')]
						]
					},
					marker: {
						radius: 2
					},
					lineWidth: 3,
					states: {
						hover: {
							lineWidth: 1
						}
					},
					threshold: null
				}
			},

			series: [{
				type: 'spline',
				name: 'All',
				data: [[1536938640, 9.412], [1536938580, 9.331], [1536938520, 9.301], [1536938460, 9.2], [1536938400, 9.17], [1536938340, 9.1], [1536938280, 9.13], [1536938248, 9.503], [1536938188, 9.452], [1536938128, 9.744], [1536938068, 9.593], [1536938008, 9.623], [1536937948, 9.865], [1536937888, 9.976], [1536937828, 9.825], [1536937768, 9.996], [1536937708, 9.956], [1536937648, 9.835], [1536937588, 9.734], [1536937528, 9.704]],
				lineWidth: 2,
				zones: [{
					value: this.graphLowerLine,
					color: '#f7a35c'
				}, {
					value: this.graphUpperLine,
					color: '#90ed7d'
				}, {
					color: '#7cb5ec'
				}]
			}]
		});  

		HighCharts.setOptions(highChartsUtils.glucoseGaugeTheme);

		this.insulinGauge = HighCharts.chart('container-gauge', HighCharts.merge(highChartsUtils.gaugeOptions, {
			yAxis: {
				min: 0,
				max: this.graphUnits == 'mg/dL' ? 15.0*18.018018 : 15.0,
				title: {
					text: ''
				}
			},

			credits: {
				enabled: false
			},

			series: [{
				name: 'Glucose',
				data: [12.5],
				radius: '100%',
				innerRadius: '90%',
				dataLabels: {
					format: '<div style="text-align:center"><div style="display: flex; align-items: center;"><span style="font-size:60px;font-weight:400;line-height:0.9;color:' +
					((HighCharts.theme && HighCharts.theme.contrastTextColor) || 'black') + '">{y}' +
					'</span><span style="display: inline-block;margin-left: 10px;"><i ' + 
					'style="color:crimson;transform:rotate(-180deg);"' + 
                // 'style="color:darkorange;transform:rotate(-135deg);"' + 
                // 'style="color:green;transform:rotate(-90deg);"' + 
                // 'style="color:darkorange;transform:rotate(-45deg);"' + 
                // 'style="color:crimson;transform:rotate(0deg);"' + 
                ' class="arrowClass fas fa-2x fa-arrow-' + 
                // 'up' +  
                'down' + 
                '"></i></span></div>' +
                '<span style="font-size:18px;color:silver" class="unitClass">'+this.graphUnits+'</span></div>'
            },
            tooltip: {
            	valueSuffix: (' '+this.graphUnits)
            } }]    
        }));

        this.updateCharts();
	}

	showSettings() {
		console.log("Showing settings");
		this.navCtrl.push(SettingsPage);
	}

	setChartSetting(setting) {
		this.storage.set('chartSetting',setting);
		this.chartSetting = setting;
		console.log("called with ",setting, "Chart set to ",this.chartSetting,". Redrawing...");
		this.updateCharts();
	}

	// WEB DISABLE

	setTimeSince() {
		this.database.executeSql("SELECT * FROM activityLogs WHERE action = ? ORDER BY timeStamp DESC LIMIT 1", ["insulin"]).then(data => {
			if(data.rows.length > 0)
				this.lastInsulinTime = data.rows.item(0).timeStamp;
				// this.timeSinceInsulin = this.getTime(Date.now()-timezoneOffset-data.rows.item(0).timeStamp);	
		});
		this.database.executeSql("SELECT * FROM activityLogs WHERE action = ? ORDER BY timeStamp DESC LIMIT 1", ["food"]).then(data => {
			if(data.rows.length > 0)
				this.lastFoodTime = data.rows.item(0).timeStamp;
				// this.timeSinceFood = this.getTime(Date.now()-timezoneOffset-data.rows.item(0).timeStamp);	
		});
	}

	setTrend() {
		var gradientPeriod = (1000*60*5);

		console.log("Calculating trendLine...");

		this.database.executeSql("SELECT * FROM libreLogs ORDER BY estTimeStamp DESC LIMIT 1", []).then(bigList => {
			if(bigList.rows.length == 0)
				return;
			console.log("Top data point - ", bigList.rows.item(0));
			this.database.executeSql("SELECT * FROM libreLogs WHERE estTimeStamp >= ? ORDER BY estTimeStamp ASC", [bigList.rows.item(0).estTimeStamp-gradientPeriod]).then(data => {

				if(data.rows.length == 0)
					return;

				console.log("Found ",data.rows.length, " data points.");
				console.log("Second data point - ",data.rows.item(0))

				var arrowDir = "level";

				if(bigList.rows.item(0).estTimeStamp != data.rows.item(0).estTimeStamp) {
					var gradient = (bigList.rows.item(0).gVal-data.rows.item(0).gVal)/(bigList.rows.item(0).estTimeStamp-data.rows.item(0).estTimeStamp);
					console.log("(",bigList.rows.item(0).gVal,'-',data.rows.item(0).gVal,')/(',bigList.rows.item(0).estTimeStamp,"-",data.rows.item(0).estTimeStamp,")");

					console.log("Found a change of ",((bigList.rows.item(0).gVal-data.rows.item(0).gVal)), " in ", ((bigList.rows.item(0).estTimeStamp-data.rows.item(0).estTimeStamp)/(1000*60)), " minutes.");

					if(Number.isFinite(gradient)) {
						gradient *= 1000*60;
						console.log("Gradient is ",gradient);
						if(gradient >= 0.1)
							arrowDir = "up";
						else if(gradient >= 0.06)
							arrowDir = "climbing";
						else if(gradient < 0.06 && gradient > -0.06)
							arrowDir = "level";
						else if(gradient <= -0.06)
							arrowDir = "falling";
						else if(gradient <= -0.1)
							arrowDir = "down";						
					}
				}

				console.log("Arrow direction is "+arrowDir);

				this.setArrow(arrowDir);

				// console.log("Returned ",data.rows.length," points for the interval of ",(gradientPeriod/(1000*60))," minutes.");


				// var gradientsum = 0, gradientlen = 0;
				// for(var i=0;i<data.rows.length-1;i++) {
				// 	if(data.rows.item(i).estTimeStamp == data.rows.item(i+1).estTimeStamp) continue;
				// 	if(data.rows.item(i).gVal == data.rows.item(i+1).gVal) continue
				// 	var gradient = (data.rows.item(i).gVal-data.rows.item(i+1).gVal)/(data.rows.item(i).estTimeStamp-data.rows.item(i+1).estTimeStamp);
				// 	gradientsum -= gradient;
				// 	console.log("(",data.rows.item(i).gVal,'-',data.rows.item(i+1).gVal,')/(',data.rows.item(i).estTimeStamp,"-",data.rows.item(i+1).estTimeStamp,")");
				// 	console.log("Gradient - ",gradient);
				// 	gradientlen++;
				// }

				// var gradient = gradientsum/gradientlen;

				// console.log("Gradient sum is ",gradientsum);
				// console.log("Gradient average is ",gradient);

				// var arrowDir = "level";

				// if(gradient >= 0.0005)
				// 	arrowDir = "up";
				// else if(gradient >= 0.0001)
				// 	arrowDir = "climbing";
				// else if(gradient < 0.0001 && gradient > -0.0001)
				// 	arrowDir = "level";
				// else if(gradient <= -0.0001)
				// 	arrowDir = "falling";
				// else if(gradient <= -0.0005)
				// 	arrowDir = "down";

				// console.log("Arrow direction is ",arrowDir);

				// this.setArrow(arrowDir);

			});
		});

		// this.database.executeSql("SELECT * FROM libreLogs WHERE estTimeStamp >= ? ORDER BY estTimeStamp DESC", [timeMin]).then(data => {
		// 	if(data.rows.length == 0)
		// 		return;

		// 	var gradientsum = 0, gradientlen = 0;
		// 	for(var i=0;i<data.rows.length-1;i++) {
		// 		if(data.rows.item(i).estTimeStamp == data.rows.item(i+1).estTimeStamp) continue;
		// 		if(data.rows.item(i).gVal == data.rows.item(i+1).gVal) continue
		// 		var gradient = (data.rows.item(i).gVal-data.rows.item(i+1).gVal)/(data.rows.item(i).estTimeStamp-data.rows.item(i+1).estTimeStamp);
		// 		gradientsum -= gradient;
		// 		console.log("(",data.rows.item(i).gVal,'-',data.rows.item(i+1).gVal,')/(',data.rows.item(i).estTimeStamp,"-",data.rows.item(i+1).estTimeStamp,")");
		// 		console.log("Gradient - ",gradient);
		// 		gradientlen++;
		// 	}

		// 	var gradient = gradientsum/gradientlen;

		// 	console.log("Gradient sum is ",gradientsum);
		// 	console.log("Gradient average is ",gradient);

		// 	var arrowDir = "level";

		// 	if(gradient >= 0.0005)
		// 		arrowDir = "up";
		// 	else if(gradient >= 0.0001)
		// 		arrowDir = "climbing";
		// 	else if(gradient < 0.0001 && gradient > -0.0001)
		// 		arrowDir = "level";
		// 	else if(gradient <= -0.0001)
		// 		arrowDir = "falling";
		// 	else if(gradient <= -0.0005)
		// 		arrowDir = "down";

		// 	console.log("Arrow direction is ",arrowDir);

		// 	this.setArrow(arrowDir);
		// });
	}

	updateCharts() {
		var timezoneOffset = ((new Date('August 19, 1975 23:15:30 GMT+07:00')).getTimezoneOffset())*60*1000;
		var timeMin = Date.now()-timezoneOffset;

		if(this.chartSetting == "2min")
			timeMin -=(1000*60*2);
		else if(this.chartSetting == "5min")
			timeMin -=(1000*60*5);
		else if(this.chartSetting == "15min")
			timeMin -=(1000*60*15);
		else if(this.chartSetting == "hour")
			timeMin -=(1000*60*60);
		else if(this.chartSetting == "day")
			timeMin -=(1000*60*60*24);
		else if(this.chartSetting == "week")
			timeMin -=(1000*60*60*24*7);
		else if(this.chartSetting == "month")
			timeMin -=(1000*60*60*24*30);

		console.log("Chart setting is ",this.chartSetting,", Current time is ",Date.now()-timezoneOffset," looking for anything after ",timeMin);

		// console.log("yaxis - ",this.insulinChart.yAxis[0].addPlotLine);

		this.database.executeSql("SELECT * FROM libreLogs ORDER BY estTimeStamp DESC LIMIT 1", []).then(pointRow => {

			if(pointRow.rows.length==0){
				console.log("Couldn't get any points, exiting.");
				return;
			}
			var point = this.insulinGauge.series[0].points[0];
			var pointVal = parseFloat(this.graphUnits == 'mg/dL' ? 
				(parseFloat((pointRow.rows.item(0).gVal))*18.018018).toFixed(0) : 
				(parseFloat(pointRow.rows.item(0).gVal)).toFixed(1));

			console.log("Updating point. Last value is ",pointRow.rows.item(0)," and unit is ",this.graphUnits,". Updating to ",pointVal);
			point.update(pointVal);
		});


		this.database.executeSql("SELECT * FROM libreLogs WHERE estTimeStamp >= ? ORDER BY estTimeStamp DESC",[timeMin]).then(data => {
			console.log("Returned ",data.rows.length," rows");

			if(data.rows.length == 0)
				return;

			console.log("Updating charts...");

			var chartData = []

			for(var i=0;i<data.rows.length;i++) {
				// console.log("Row - ",i," - ",data.rows.item(i).estTimeStamp,", ",data.rows.item(i).gVal);
				if(i < data.rows.length-1) {
					if (data.rows.item(i).estTimeStamp != data.rows.item(i+1).estTimeStamp) {//Hacky fix, need to find a good solution - once we know the problem
						// SETTINGS change
						chartData.push([data.rows.item(i).estTimeStamp, data.rows.item(i).gVal]);
						// chartData.push([data.rows.item(i).estTimeStamp, 
							// (this.graphUnits == 'mg/dL' ? data.rows.item(i).gVal*18.018018 : data.rows.item(i).gVal)]);
						// console.log("Writing value - ",(this.graphUnits == 'mg/dL' ? data.rows.item(i).gVal*18.018018 : data.rows.item(i).gVal))
					}
				}
			}
			chartData = chartData.sort((n1, n2) => n1[0]-n2[0]);
			this.insulinChart.series[0].setData(chartData, true);
		});

		var insulinLabel = false;
		var foodLabel = false;

		this.database.executeSql("SELECT * FROM activityLogs WHERE timeStamp >= ? ORDER BY timeStamp DESC", [timeMin]).then(data => {
			console.log("Returned ",data.rows.length," activities.");

			for(var i=0;i<data.rows.length;i++) {
				console.log(data.rows.item(i));

				var plotline = {
					color: (data.rows.item(i).action == 'insulin' ? 'red':'green'),
					width:2,
					value:data.rows.item(i).timeStamp,
					label: {
						text: (
								(!insulinLabel && data.rows.item(i).action == "insulin") || 
								(!foodLabel && data.rows.item(i).action != "insulin")
							) ? data.rows.item(i).action : "",
						align: 'left',
						x:10
					}
				};

				this.insulinChart.xAxis[0].addPlotLine(plotline);

				console.log("Added plotline - ",plotline);
			}

			console.log("Writing to divs...");
			this.setTimeSince();
		})

		this.setTrend();

	}

	setArrow(direction) {
		let arrow = <HTMLElement>document.querySelector(".arrowClass");

		console.log("Setting arrow direction to ",direction);

		if(direction == "up") {
			arrow.style.transform = "rotate(-180deg)";
			arrow.style.color = "crimson";
		} else if(direction == "climbing") {
			arrow.style.transform = "rotate(-135deg)";
			arrow.style.color = "darkorange";
		} else if(direction == "level") {
			console.log("Level found");
			arrow.style.transform = "rotate(-90deg)";
			arrow.style.color = "green";
		} else if(direction == "falling") {
			arrow.style.transform = "rotate(-45deg)";
			arrow.style.color = "darkorange";
		} else if(direction == "down") {
			arrow.style.transform = "rotate(0deg)";
			arrow.style.color = "crimson";
		}
	}

	buttonTester() {
		console.log("Logging database...");
			this.sqlitePorter.exportDbToJson(this.database).then(console.log, console.log);
	}

	takeInsulin() {
		var timezoneOffset = ((new Date('August 19, 1975 23:15:30 GMT+07:00')).getTimezoneOffset())*60*1000;
		var insertSql = "INSERT INTO activityLogs(timeStamp, action, description) VALUES (?,?,?)";

		this.database.executeSql(insertSql, [Date.now()-timezoneOffset, "insulin", ""]).then(data => {
			this.toast.show("Logged Insulin",'1000','center').subscribe(console.log);
		});

		this.setTimeSince();
	}

	takeFood() {
		var timezoneOffset = ((new Date('August 19, 1975 23:15:30 GMT+07:00')).getTimezoneOffset())*60*1000;
		var insertSql = "INSERT INTO activityLogs(timeStamp, action, description) VALUES (?,?,?)";

		this.database.executeSql(insertSql, [Date.now()-timezoneOffset, "food", ""]).then(data => {
			this.toast.show("Logged Food",'1000','center').subscribe(console.log);
		}).catch(err => console.log("Error - ",err));

		this.setTimeSince();
	}

	wipeDb() {
		this.sqlitePorter.wipeDb(this.database).then(() => console.log("Wiped database."));
		this.storage.set('database_created',false);		
	}

}
