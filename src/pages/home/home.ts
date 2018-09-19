import { Component } from '@angular/core';
import { NavController } from 'ionic-angular';
import * as HighCharts from 'highcharts';
import HighChartsMore from "highcharts/highcharts-more";
import SolidGauge from 'highcharts/modules/solid-gauge';
import { Toast } from '@ionic-native/toast';
import { Vibration } from '@ionic-native/vibration';
import { SQLite, SQLiteObject } from '@ionic-native/sqlite';
import { SQLitePorter } from '@ionic-native/sqlite-porter';
import { NFC, Ndef } from '@ionic-native/nfc';
import * as highChartsUtils from "./highchartsUtils";
import { BehaviorSubject } from 'rxjs/Rx';
import { Storage } from '@ionic/storage';
import { Platform } from 'ionic-angular';

declare var cordova: any;

HighChartsMore(HighCharts);
SolidGauge(HighCharts);

// Custom plugin for rounded edges on the gauge
(highChartsUtils.roundedEdgesPlugin)(HighCharts);

@Component({
	selector: 'page-home',
	templateUrl: 'home.html'
})
export class HomePage {

	insulinChart; 
	insulinGauge;
	private chartSetting: string;
	database: SQLiteObject;
	private databaseReady: BehaviorSubject<boolean>;

	constructor(private platform: Platform, private storage: Storage, private sqlite: SQLite, private sqlitePorter: SQLitePorter, public vibration: Vibration, private toast: Toast, public navCtrl: NavController, private nfc: NFC, private ndef: Ndef) {
		this.chartSetting = "day";
		this.storage.get('chartSetting').then(val => {
			if(val) 
				this.chartSetting = val;
			else {
				console.log("No chart set - default is day");
				this.storage.set('chartSetting','day');
			}
		});
		this.databaseReady = new BehaviorSubject(false);
		this.platform.ready().then(() => this.initDatabase()).then(() => this.updateCharts());
	}

	ionViewDidLoad(){

		this.initCharts();

		cordova.plugins.GlucoseFreedom.registerSensorListener((sensor) => {
			console.log("Got sensor Data - writing to chart...");
			this.writeToDatabase(sensor);
			this.vibration.vibrate(1000);
		});
	}

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
					let create_code = "CREATE TABLE libreLogs (estTimeStamp INT, sensorID VARCHAR(12), gRaw INT, tRaw INT, gVal FLOAT, tVal FLOAT, type INT, readTime INT, sensorTime INT, drift INT DEFAULT 0)";
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
			return;
		}

		var timezoneOffset = ((new Date('August 19, 1975 23:15:30 GMT+07:00')).getTimezoneOffset())*60*1000;

		var insertSql = 'INSERT INTO libreLogs(estTimeStamp,sensorID,gRaw,tRaw,tVal,gVal,type,readTime,sensorTime,drift) VALUES (?,?,?,?,?,?,?,?,?,?)'

		console.log("Got sensor data - ",sensor);

		console.log("Writing data..");

		var indices = []
		for(var i=0;i<sensor.tag.denseGRaw.length;i++)
			indices.push(i);

		var promises = indices.map(index => {
			if(sensor.tag.denseGRaw[index] == null)
				return Promise.resolve();
			var dataArray = [
				   (sensor.tag.denseTimestamps[index]*1000)-timezoneOffset, 
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

		promises = indices.map(index => {
			if(sensor.tag.sparseGRaw[index] == null)
				return Promise.resolve();
			var dataArray = [
				   (sensor.tag.sparseTimestamps[index]*1000)-timezoneOffset, 
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

	initCharts() {
		HighCharts.setOptions(highChartsUtils.glucoseGraphTheme);

		this.insulinChart = HighCharts.chart('container', {
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
				text: 'Glucose Levels',
			},
			subtitle: {
				text: document.ontouchstart === undefined ?
				'Click and drag in the plot area to zoom in' : 'Pinch the chart to zoom in'
			},
			xAxis: {
				type: 'datetime'
			},
			yAxis: {
				title: {
					text: 'Glucose Value'
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
				type: 'line',
				name: 'All',
				data: [[1536938640, 9.412], [1536938580, 9.331], [1536938520, 9.301], [1536938460, 9.2], [1536938400, 9.17], [1536938340, 9.1], [1536938280, 9.13], [1536938248, 9.503], [1536938188, 9.452], [1536938128, 9.744], [1536938068, 9.593], [1536938008, 9.623], [1536937948, 9.865], [1536937888, 9.976], [1536937828, 9.825], [1536937768, 9.996], [1536937708, 9.956], [1536937648, 9.835], [1536937588, 9.734], [1536937528, 9.704]],
				lineWidth: 3,
				zones: [{
					value: 4,
					color: '#f7a35c'
				}, {
					value: 8,
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
				max: 15,
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
                ' class="fas fa-2x fa-arrow-' + 
                // 'up' +  
                'down' + 
                '"></i></span></div>' +
                '<span style="font-size:18px;color:silver">mmol/L</span></div>'
            },
            tooltip: {
            	valueSuffix: ' mmol/L'
            } }]    
        }));
	}

	setChartSetting(setting) {
		this.storage.set('chartSetting',setting);
		this.chartSetting = setting;
		console.log("called with ",setting, "Chart set to ",this.chartSetting,". Redrawing...");
		this.updateCharts();
	}

	updateCharts() {

		var timezoneOffset = ((new Date('August 19, 1975 23:15:30 GMT+07:00')).getTimezoneOffset())*60*1000;
		var timeMin = Date.now()-timezoneOffset;

		if(this.chartSetting == "2min")
			timeMin -=(1000*60*2);
		else if(this.chartSetting == "5min")
			timeMin -=(1000*60*5);
		else if(this.chartSetting == "hour")
			timeMin -=(1000*60*60);
		else if(this.chartSetting == "day")
			timeMin -=(1000*60*60*24);
		else if(this.chartSetting == "week")
			timeMin -=(1000*60*60*24*7);
		else if(this.chartSetting == "month")
			timeMin -=(1000*60*60*24*30);

		console.log("Chart setting is ",this.chartSetting,", Current time is ",Date.now()-timezoneOffset," looking for anything after ",timeMin);

		this.database.executeSql("SELECT * FROM libreLogs WHERE estTimeStamp >= ? ORDER BY estTimeStamp DESC",[timeMin]).then(data => {
			console.log("Returned ",data.rows.length," rows");
			for(var i=0;i<data.rows.length;i++) {
				console.log(data.rows.item(i));
			}

			console.log("Updating charts...");

			var chartData = []
			for(var i=0;i<data.rows.length;i++) {
				console.log("Row - ",i," - ",data.rows.item(i).estTimeStamp,", ",data.rows.item(i).gVal);
				chartData.push([data.rows.item(i).estTimeStamp, data.rows.item(i).gVal]);
			}
			chartData = chartData.sort((n1, n2) => n1[0]-n2[0]);
			this.insulinChart.series[0].setData(chartData, true);

			var point = this.insulinGauge.series[0].points[0];
			point.update(Number.parseFloat(Number.parseFloat(data.rows.item(0).gVal).toFixed(2)));
		});
	}

	buttonTester() {
		console.log("Logging database...");
			this.sqlitePorter.exportDbToJson(this.database).then(console.log, console.log);

	}

	wipeDb() {
		this.sqlitePorter.wipeDb(this.database).then(() => console.log("Wiped database."));
		this.storage.set('database_created',false);		
	}

}
