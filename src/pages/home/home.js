var __decorate = (this && this.__decorate) || function (decorators, target, key, desc) {
    var c = arguments.length, r = c < 3 ? target : desc === null ? desc = Object.getOwnPropertyDescriptor(target, key) : desc, d;
    if (typeof Reflect === "object" && typeof Reflect.decorate === "function") r = Reflect.decorate(decorators, target, key, desc);
    else for (var i = decorators.length - 1; i >= 0; i--) if (d = decorators[i]) r = (c < 3 ? d(r) : c > 3 ? d(target, key, r) : d(target, key)) || r;
    return c > 3 && r && Object.defineProperty(target, key, r), r;
};
var __metadata = (this && this.__metadata) || function (k, v) {
    if (typeof Reflect === "object" && typeof Reflect.metadata === "function") return Reflect.metadata(k, v);
};
import { Component } from '@angular/core';
import { NavController } from 'ionic-angular';
import * as HighCharts from 'highcharts';
import HighChartsMore from "highcharts/highcharts-more";
import SolidGauge from 'highcharts/modules/solid-gauge';
// WEB DISABLE
// import { Toast } from '@ionic-native/toast';
// import { Vibration } from '@ionic-native/vibration';
// import { SQLite, SQLiteObject } from '@ionic-native/sqlite';
// import { SQLitePorter } from '@ionic-native/sqlite-porter';
// import { NFC, Ndef } from '@ionic-native/nfc';
// import { StatusBar } from '@ionic-native/status-bar';
import * as highChartsUtils from "./highchartsUtils";
import { BehaviorSubject } from 'rxjs/Rx';
import { Storage } from '@ionic/storage';
import { Platform } from 'ionic-angular';
import { NavParams } from 'ionic-angular';
import { ToastController } from 'ionic-angular';
import { SettingsPage } from '../settings/settings';
// WEB DISABLE
// declare var cordova: any;
HighChartsMore(HighCharts);
SolidGauge(HighCharts);
// Custom plugin for rounded edges on the gauge
(highChartsUtils.roundedEdgesPlugin)(HighCharts);
var HomePage = /** @class */ (function () {
    function HomePage(toastCtrl, navParams, statusBar, platform, storage, sqlite, sqlitePorter, vibration, toast, navCtrl, nfc, ndef) {
        var _this = this;
        this.toastCtrl = toastCtrl;
        this.navParams = navParams;
        this.statusBar = statusBar;
        this.platform = platform;
        this.storage = storage;
        this.sqlite = sqlite;
        this.sqlitePorter = sqlitePorter;
        this.vibration = vibration;
        this.toast = toast;
        this.navCtrl = navCtrl;
        this.nfc = nfc;
        this.ndef = ndef;
        this.timeSinceInsulin = "∞";
        this.timeSinceFood = "∞";
        this.lastInsulinTime = 0;
        this.lastFoodTime = 0;
        setInterval(function () {
            _this.updateTimeSince();
        }, 1000);
        this.chartSetting = "day";
        this.storage.get('chartSetting').then(function (val) {
            if (val)
                _this.chartSetting = val;
            else {
                console.log("No chart set - default is day");
                _this.storage.set('chartSetting', 'day');
            }
        });
        this.databaseReady = new BehaviorSubject(false);
        this.platform.ready().then(function () { return _this.initDatabase(); })
            .then(function () { return _this.storage.get('chartSetting'); }).then(function (val) {
            if (val)
                _this.chartSetting = val;
            else {
                console.log("No chart set - default is day");
                _this.storage.set('chartSetting', 'day');
            }
        }).then(function () { return _this.updateCharts(); });
    }
    HomePage.prototype.ionViewDidLoad = function () {
        var _this = this;
        this.statusBar.overlaysWebView(true);
        this.statusBar.styleBlackTranslucent();
        this.initCharts();
        console.log("cordova.plugin is ", cordova.plugin);
        cordova.plugins.GlucoseFreedom.registerSensorListener(function (sensor) {
            console.log("Got sensor Data - writing to chart...");
            _this.writeToDatabase(sensor);
        });
    };
    HomePage.prototype.sensorSuccess = function () {
        this.vibration.vibrate(100);
        console.log("Sensor read success.");
    };
    HomePage.prototype.sensorFailure = function () {
        this.vibration.vibrate(1000);
        console.log("Sensor read failure.");
    };
    HomePage.prototype.initDatabase = function () {
        var _this = this;
        return this.sqlite.create({
            name: 'developers.db',
            location: 'default'
        }).then(function (db) {
            _this.database = db;
            _this.storage.get('database_created').then(function (val) {
                if (val) {
                    console.log("Table already created.");
                    _this.databaseReady.next(true);
                }
                else {
                    console.log("Creating table...");
                    var create_code = "CREATE TABLE libreLogs (estTimeStamp INT, sensorID VARCHAR(12), gRaw INT, tRaw INT, gVal FLOAT, tVal FLOAT, type INT, readTime INT, sensorTime INT, drift INT DEFAULT 0);";
                    create_code += "CREATE TABLE activityLogs (timeStamp INT, action VARCHAR(100), description VARCHAR(255))";
                    _this.sqlitePorter.importSqlToDb(_this.database, create_code).then(function () {
                        console.log('Created Table.');
                        _this.storage.set('database_created', true);
                    }).catch(function (e) { return console.error(e); });
                }
            });
        });
    };
    HomePage.prototype.writeToDatabase = function (sensor) {
        var _this = this;
        if (sensor.tag == null || sensor.tag.denseGRaw == null || (sensor.tag.denseGRaw.length == 0 && sensor.tag.sparseGRaw.length == 0)) {
            console.log("No sensor read.");
            this.sensorFailure();
            return;
        }
        this.sensorSuccess();
        var timezoneOffset = ((new Date('August 19, 1975 23:15:30 GMT+07:00')).getTimezoneOffset()) * 60 * 1000;
        var insertSql = 'INSERT INTO libreLogs(estTimeStamp,sensorID,gRaw,tRaw,tVal,gVal,type,readTime,sensorTime,drift) VALUES (?,?,?,?,?,?,?,?,?,?)';
        console.log("Got sensor data - ", sensor);
        var timeRemaining = Math.floor(((60 * 60 * 24 * 14) - sensor.tag.sensorTime) / (60 * 60 * 24));
        var toast = this.toastCtrl.create({
            message: timeRemaining + " days remaining on sensor",
            duration: 3000,
            position: 'bottom'
        });
        toast.present();
        console.log("Writing data..");
        var indices = [];
        for (var i = 0; i < sensor.tag.denseGRaw.length; i++)
            indices.push(i);
        var denseTimestamp = Date.now() - timezoneOffset;
        var promises = indices.map(function (index) {
            if (sensor.tag.denseGRaw[index] == null)
                return Promise.resolve();
            var dataArray = [
                // (sensor.tag.denseTimestamps[index]*1000)-timezoneOffset, 
                denseTimestamp - (index * 60 * 1000),
                sensor.tag.sensorID,
                sensor.tag.denseGRaw[index],
                sensor.tag.denseTRaw[index],
                sensor.tag.denseTVals[index],
                sensor.tag.denseGVals[index],
                0,
                sensor.tag.readTime,
                sensor.tag.sensorTime,
                0
            ];
            console.log("Writing dense row - ", index, " - ", dataArray);
            return _this.database.executeSql(insertSql, dataArray);
        });
        Promise.all(promises).then(function () { return console.log("Done writing dense rows."); });
        // We're possibly duplicating code to be safe; references in promises proved trickyt
        indices = [];
        for (var i = 0; i < sensor.tag.sparseGRaw.length; i++)
            indices.push(i);
        var sparseTimestamps = Date.now() - timezoneOffset - (1000 * 60 * 15);
        promises = indices.map(function (index) {
            if (sensor.tag.sparseGRaw[index] == null)
                return Promise.resolve();
            var dataArray = [
                sparseTimestamps - (index * 1000 * 60 * 15),
                // (sensor.tag.sparseTimestamps[index]*1000)-timezoneOffset, 
                sensor.tag.sensorID,
                sensor.tag.sparseGRaw[index],
                sensor.tag.sparseTRaw[index],
                sensor.tag.sparseTVals[index],
                sensor.tag.sparseGVals[index],
                0,
                sensor.tag.readTime,
                sensor.tag.sensorTime,
                0
            ];
            console.log("Writing sparse row - ", index, " - ", dataArray);
            return _this.database.executeSql(insertSql, dataArray);
        });
        Promise.all(promises).then(function () { return console.log("Done writing sparse rows."); });
        this.updateCharts();
    };
    HomePage.prototype.updateTimeSince = function () {
        console.log("updateTimeSince called - lastInsulinTime = ", this.lastInsulinTime, ", lastFoodTime - ", this.lastFoodTime);
        var infinityChar = "∞";
        var timezoneOffset = ((new Date('August 19, 1975 23:15:30 GMT+07:00')).getTimezoneOffset()) * 60 * 1000;
        if (this.lastInsulinTime == 0) {
            this.timeSinceInsulin = infinityChar;
        }
        else {
            this.timeSinceInsulin = this.getTime(Date.now() - timezoneOffset - this.lastInsulinTime);
        }
        if (this.lastFoodTime == 0) {
            this.timeSinceFood = infinityChar;
        }
        else {
            this.timeSinceFood = this.getTime(Date.now() - timezoneOffset - this.lastFoodTime);
        }
        // setTimeout(this.updateTimeSince, 1000);
    };
    HomePage.prototype.getTime = function (timeDiff) {
        if (timeDiff < (60 * 1000))
            return "" + (Math.floor((timeDiff % (60 * 1000)) / 1000)) + "s";
        timeDiff /= (60 * 1000);
        if (timeDiff < 60)
            return "" + (Math.floor(timeDiff % 60) + "m");
        timeDiff /= (60);
        if (timeDiff < 24)
            return "" + (Math.floor(timeDiff % 24) + "h");
        timeDiff /= (24);
        if (timeDiff < 7)
            return "" + (Math.floor(timeDiff % 7) + "d");
        timeDiff /= 7;
        return "" + (Math.floor(timeDiff) % 52) + "w";
    };
    HomePage.prototype.initCharts = function () {
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
                text: null,
            },
            xAxis: {
                type: 'datetime',
                dateTimeLabelFormats: {
                    day: ""
                },
            },
            yAxis: {
                max: 15,
                min: 0,
                title: {
                    text: 'Glucose Value'
                },
                plotLines: [{
                        width: 1,
                        color: 'green',
                        value: 6,
                    }, {
                        width: 1,
                        color: 'green',
                        value: 9,
                    }],
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
                    lineWidth: 2,
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
                            ' class="arrowClass fas fa-2x fa-arrow-' +
                            // 'up' +  
                            'down' +
                            '"></i></span></div>' +
                            '<span style="font-size:18px;color:silver">mmol/L</span></div>'
                    },
                    tooltip: {
                        valueSuffix: ' mmol/L'
                    }
                }]
        }));
    };
    HomePage.prototype.showSettings = function () {
        console.log("Showing settings");
        this.navCtrl.push(SettingsPage);
    };
    HomePage.prototype.setChartSetting = function (setting) {
        this.storage.set('chartSetting', setting);
        this.chartSetting = setting;
        console.log("called with ", setting, "Chart set to ", this.chartSetting, ". Redrawing...");
        this.updateCharts();
    };
    HomePage.prototype.setTimeSince = function () {
        var _this = this;
        this.database.executeSql("SELECT * FROM activityLogs WHERE action = ? ORDER BY timeStamp DESC LIMIT 1", ["insulin"]).then(function (data) {
            if (data.rows.length > 0)
                _this.lastInsulinTime = data.rows.item(0).timeStamp;
            // this.timeSinceInsulin = this.getTime(Date.now()-timezoneOffset-data.rows.item(0).timeStamp);	
        });
        this.database.executeSql("SELECT * FROM activityLogs WHERE action = ? ORDER BY timeStamp DESC LIMIT 1", ["food"]).then(function (data) {
            if (data.rows.length > 0)
                _this.lastFoodTime = data.rows.item(0).timeStamp;
            // this.timeSinceFood = this.getTime(Date.now()-timezoneOffset-data.rows.item(0).timeStamp);	
        });
    };
    HomePage.prototype.setTrend = function () {
        var _this = this;
        var gradientPeriod = (1000 * 60 * 5);
        console.log("Calculating trendLine...");
        this.database.executeSql("SELECT * FROM libreLogs ORDER BY estTimeStamp DESC LIMIT 1", []).then(function (bigList) {
            if (bigList.rows.length == 0)
                return;
            console.log("Top data point - ", bigList.rows.item(0));
            _this.database.executeSql("SELECT * FROM libreLogs WHERE estTimeStamp >= ? ORDER BY estTimeStamp ASC", [bigList.rows.item(0).estTimeStamp - gradientPeriod]).then(function (data) {
                if (data.rows.length == 0)
                    return;
                console.log("Found ", data.rows.length, " data points.");
                console.log("Second data point - ", data.rows.item(0));
                var arrowDir = "level";
                if (bigList.rows.item(0).estTimeStamp != data.rows.item(0).estTimeStamp) {
                    var gradient = (bigList.rows.item(0).gVal - data.rows.item(0).gVal) / (bigList.rows.item(0).estTimeStamp - data.rows.item(0).estTimeStamp);
                    console.log("(", bigList.rows.item(0).gVal, '-', data.rows.item(0).gVal, ')/(', bigList.rows.item(0).estTimeStamp, "-", data.rows.item(0).estTimeStamp, ")");
                    console.log("Found a change of ", ((bigList.rows.item(0).gVal - data.rows.item(0).gVal)), " in ", ((bigList.rows.item(0).estTimeStamp - data.rows.item(0).estTimeStamp) / (1000 * 60)), " minutes.");
                    if (Number.isFinite(gradient)) {
                        gradient *= 1000 * 60;
                        console.log("Gradient is ", gradient);
                        if (gradient >= 0.1)
                            arrowDir = "up";
                        else if (gradient >= 0.06)
                            arrowDir = "climbing";
                        else if (gradient < 0.06 && gradient > -0.06)
                            arrowDir = "level";
                        else if (gradient <= -0.06)
                            arrowDir = "falling";
                        else if (gradient <= -0.1)
                            arrowDir = "down";
                    }
                }
                console.log("Arrow direction is " + arrowDir);
                _this.setArrow(arrowDir);
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
    };
    HomePage.prototype.updateCharts = function () {
        var _this = this;
        var timezoneOffset = ((new Date('August 19, 1975 23:15:30 GMT+07:00')).getTimezoneOffset()) * 60 * 1000;
        var timeMin = Date.now() - timezoneOffset;
        if (this.chartSetting == "2min")
            timeMin -= (1000 * 60 * 2);
        else if (this.chartSetting == "5min")
            timeMin -= (1000 * 60 * 5);
        else if (this.chartSetting == "15min")
            timeMin -= (1000 * 60 * 15);
        else if (this.chartSetting == "hour")
            timeMin -= (1000 * 60 * 60);
        else if (this.chartSetting == "day")
            timeMin -= (1000 * 60 * 60 * 24);
        else if (this.chartSetting == "week")
            timeMin -= (1000 * 60 * 60 * 24 * 7);
        else if (this.chartSetting == "month")
            timeMin -= (1000 * 60 * 60 * 24 * 30);
        console.log("Chart setting is ", this.chartSetting, ", Current time is ", Date.now() - timezoneOffset, " looking for anything after ", timeMin);
        console.log("yaxis - ", this.insulinChart.yAxis[0].addPlotLine);
        this.database.executeSql("SELECT * FROM libreLogs WHERE estTimeStamp >= ? ORDER BY estTimeStamp DESC", [timeMin]).then(function (data) {
            console.log("Returned ", data.rows.length, " rows");
            if (data.rows.length == 0)
                return;
            console.log("Updating charts...");
            var chartData = [];
            for (var i = 0; i < data.rows.length; i++) {
                // console.log("Row - ",i," - ",data.rows.item(i).estTimeStamp,", ",data.rows.item(i).gVal);
                if (i < data.rows.length - 1)
                    if (data.rows.item(i).estTimeStamp != data.rows.item(i + 1).estTimeStamp) //Hacky fix, need to find a good solution - once we know the problem
                        chartData.push([data.rows.item(i).estTimeStamp, data.rows.item(i).gVal]);
            }
            chartData = chartData.sort(function (n1, n2) { return n1[0] - n2[0]; });
            _this.insulinChart.series[0].setData(chartData, true);
            var point = _this.insulinGauge.series[0].points[0];
            point.update(Number.parseFloat(Number.parseFloat(data.rows.item(0).gVal).toFixed(2)));
        });
        var insulinLabel = false;
        var foodLabel = false;
        this.database.executeSql("SELECT * FROM activityLogs WHERE timeStamp >= ? ORDER BY timeStamp DESC", [timeMin]).then(function (data) {
            console.log("Returned ", data.rows.length, " activities.");
            for (var i = 0; i < data.rows.length; i++) {
                console.log(data.rows.item(i));
                var plotline = {
                    color: (data.rows.item(i).action == 'insulin' ? 'red' : 'green'),
                    width: 2,
                    value: data.rows.item(i).timeStamp,
                    label: {
                        text: ((!insulinLabel && data.rows.item(i).action == "insulin") ||
                            (!foodLabel && data.rows.item(i).action != "insulin")) ? data.rows.item(i).action : "",
                        align: 'left',
                        x: 10
                    }
                };
                _this.insulinChart.xAxis[0].addPlotLine(plotline);
                console.log("Added plotline - ", plotline);
            }
            console.log("Writing to divs...");
            _this.setTimeSince();
        });
        this.setTrend();
    };
    HomePage.prototype.setArrow = function (direction) {
        var arrow = document.querySelector(".arrowClass");
        console.log("Setting arrow direction to ", direction);
        if (direction == "up") {
            arrow.style.transform = "rotate(-180deg)";
            arrow.style.color = "crimson";
        }
        else if (direction == "climbing") {
            arrow.style.transform = "rotate(-135deg)";
            arrow.style.color = "darkorange";
        }
        else if (direction == "level") {
            console.log("Level found");
            arrow.style.transform = "rotate(-90deg)";
            arrow.style.color = "green";
        }
        else if (direction == "falling") {
            arrow.style.transform = "rotate(-45deg)";
            arrow.style.color = "darkorange";
        }
        else if (direction == "down") {
            arrow.style.transform = "rotate(0deg)";
            arrow.style.color = "crimson";
        }
    };
    HomePage.prototype.buttonTester = function () {
        console.log("Logging database...");
        this.sqlitePorter.exportDbToJson(this.database).then(console.log, console.log);
    };
    HomePage.prototype.takeInsulin = function () {
        var _this = this;
        var timezoneOffset = ((new Date('August 19, 1975 23:15:30 GMT+07:00')).getTimezoneOffset()) * 60 * 1000;
        var insertSql = "INSERT INTO activityLogs(timeStamp, action, description) VALUES (?,?,?)";
        this.database.executeSql(insertSql, [Date.now() - timezoneOffset, "insulin", ""]).then(function (data) {
            _this.toast.show("Logged Insulin", '1000', 'center').subscribe(console.log);
        });
        this.setTimeSince();
    };
    HomePage.prototype.takeFood = function () {
        var _this = this;
        var timezoneOffset = ((new Date('August 19, 1975 23:15:30 GMT+07:00')).getTimezoneOffset()) * 60 * 1000;
        var insertSql = "INSERT INTO activityLogs(timeStamp, action, description) VALUES (?,?,?)";
        this.database.executeSql(insertSql, [Date.now() - timezoneOffset, "food", ""]).then(function (data) {
            _this.toast.show("Logged Food", '1000', 'center').subscribe(console.log);
        }).catch(function (err) { return console.log("Error - ", err); });
        this.setTimeSince();
    };
    HomePage.prototype.wipeDb = function () {
        this.sqlitePorter.wipeDb(this.database).then(function () { return console.log("Wiped database."); });
        this.storage.set('database_created', false);
    };
    var _a, _b, _c, _d, _e, _f, _g;
    HomePage = __decorate([
        Component({
            selector: 'page-home',
            templateUrl: 'home.html'
        }),
        __metadata("design:paramtypes", [ToastController, NavParams, typeof (_a = typeof StatusBar !== "undefined" && StatusBar) === "function" ? _a : Object, Platform, Storage, typeof (_b = typeof SQLite !== "undefined" && SQLite) === "function" ? _b : Object, typeof (_c = typeof SQLitePorter !== "undefined" && SQLitePorter) === "function" ? _c : Object, typeof (_d = typeof Vibration !== "undefined" && Vibration) === "function" ? _d : Object, typeof (_e = typeof Toast !== "undefined" && Toast) === "function" ? _e : Object, NavController, typeof (_f = typeof NFC !== "undefined" && NFC) === "function" ? _f : Object, typeof (_g = typeof Ndef !== "undefined" && Ndef) === "function" ? _g : Object])
    ], HomePage);
    return HomePage;
}());
export { HomePage };
//# sourceMappingURL=home.js.map