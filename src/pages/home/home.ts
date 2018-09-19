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
	database: SQLiteObject;
	private databaseReady: BehaviorSubject<boolean>;

	constructor(private storage: Storage, private sqlite: SQLite, private sqlitePorter: SQLitePorter, public vibration: Vibration, private toast: Toast, public navCtrl: NavController, private nfc: NFC, private ndef: Ndef) {
		this.databaseReady = new BehaviorSubject(false);
		// this.platform.ready().then(() => this.createDatabase());
	}

	ionViewDidLoad(){

		this.initCharts();

		cordova.plugins.GlucoseFreedom.registerSensorListener((sensor) => {
			console.log("Got sensor Data - writing to chart...");
			this.updateCharts(sensor);
			this.vibration.vibrate(1000);
		});
	}

	// initDatabase() {
	// 	this.sqlite.create({
	// 		name: 'developers.db',
	// 		location: 'default'
	// 	}).then((db: SQLiteObject) => {
	// 		this.database = db;
	// 		this.storage.get('database_created').then(val => {
	// 			if(val) {
	// 				console.log("Table already created.");
	// 				this.databaseReady.next(true);
	// 			} else {
	// 				let create_code = "CREATE TABLE libreLogs (estTimeStamp INT, sensorID VARCHAR(12), gRaw INT, tRaw INT, gVal FLOAT, tVal FLOAT, type INT, readTime INT, sensorTime INT, drift INT DEFAULT 0)";
	// 				this.sqlitePorter.importSqlToDb(this.database, create_code)
	// 					.then(() =>  {
	// 						console.log('Created Table.');
	// 						console.log("Logging database...");
	// 						this.sqlitePorter.exportDbToJson(this.database).then(console.log, console.log);
	// 					}).catch(e => console.error(e));
	// 			}
	// 		});
	// 	});
	// }

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

	updateCharts(sensor) {
		var data = [];

		var timezoneOffset = ((new Date('August 19, 1975 23:15:30 GMT+07:00')).getTimezoneOffset())*60*1000;

		var i=0;
		for(i=0;i<sensor.tag.dense.length;i++)
			data.push([(sensor.tag.denseTimestamps[i]*1000)-timezoneOffset, sensor.tag.dense[i]]);
		for(i=0;i<sensor.tag.sparse.length;i++)
			data.push([(sensor.tag.sparseTimestamps[i]*1000)-timezoneOffset, sensor.tag.sparse[i]]);

		data = data.sort((n1, n2) => n1[0]-n2[0]);

		this.insulinChart.series[0].setData(data, true);
		console.log("Updating gauge to ",Number.parseFloat(data[0][1]).toFixed(2));
		var point = this.insulinGauge.series[0].points[0];
		point.update(Number.parseFloat(Number.parseFloat(data[0][1]).toFixed(2)));
	}

}
