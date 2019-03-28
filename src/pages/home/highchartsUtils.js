import * as HighCharts from 'highcharts';
export var glucoseGraphTheme = {
    colors: ['#2b908f', '#90ee7e', '#f45b5b', '#7798BF', '#aaeeee', '#ff0066',
        '#eeaaee', '#55BF3B', '#DF5353', '#7798BF', '#aaeeee'],
    chart: {
        style: {
            fontFamily: 'Rajdhani, sans-serif',
            color: '#222222'
        },
        plotBorderColor: '#606063'
    },
    title: {
        style: {
            color: '#222222',
            textTransform: 'uppercase',
            fontSize: '20px'
        }
    },
    subtitle: {
        style: {
            color: '#222222',
            textTransform: 'uppercase'
        }
    },
    xAxis: {
        gridLineColor: '#EEEEEE',
        labels: {
            style: {
                color: '#222222'
            }
        },
        lineColor: '#EEEEEE',
        minorGridLineColor: '#505053',
        tickColor: '#EEEEEE',
        title: {
            style: {
                color: '#222222'
            }
        }
    },
    yAxis: {
        gridLineColor: '#EEEEEE',
        labels: {
            style: {
                color: '#222222'
            }
        },
        lineColor: '#EEEEEE',
        minorGridLineColor: '#505053',
        tickColor: '#EEEEEE',
        tickWidth: 1,
        title: {
            style: {
                color: '#222222'
            }
        }
    },
    tooltip: {
        backgroundColor: 'rgba(0, 0, 0, 0.85)',
        style: {
            color: '#F0F0F0'
        }
    },
    plotOptions: {
        series: {
            dataLabels: {
                color: '#B0B0B3'
            },
            marker: {
                lineColor: '#333'
            }
        },
        boxplot: {
            fillColor: '#505053'
        },
        candlestick: {
            lineColor: 'white'
        },
        errorbar: {
            color: 'white'
        }
    },
    legend: {
        itemStyle: {
            color: '#E0E0E3'
        },
        itemHoverStyle: {
            color: '#FFF'
        },
        itemHiddenStyle: {
            color: '#606063'
        }
    },
    credits: {
        style: {
            color: '#666'
        }
    },
    labels: {
        style: {
            color: '#707073'
        }
    },
    drilldown: {
        activeAxisLabelStyle: {
            color: '#F0F0F3'
        },
        activeDataLabelStyle: {
            color: '#F0F0F3'
        }
    },
    navigation: {
        buttonOptions: {
            symbolStroke: '#DDDDDD',
            theme: {
                fill: '#505053'
            }
        }
    },
    // scroll charts
    rangeSelector: {
        buttonTheme: {
            fill: '#505053',
            stroke: '#000000',
            style: {
                color: '#CCC'
            },
            states: {
                hover: {
                    fill: '#707073',
                    stroke: '#000000',
                    style: {
                        color: 'white'
                    }
                },
                select: {
                    fill: '#000003',
                    stroke: '#000000',
                    style: {
                        color: 'white'
                    }
                }
            }
        },
        inputBoxBorderColor: '#505053',
        inputStyle: {
            backgroundColor: '#333',
            color: 'silver'
        },
        labelStyle: {
            color: 'silver'
        }
    },
    navigator: {
        handles: {
            backgroundColor: '#666',
            borderColor: '#AAA'
        },
        outlineColor: '#CCC',
        maskFill: 'rgba(255,255,255,0.1)',
        series: {
            color: '#7798BF',
            lineColor: '#A6C7ED'
        },
        xAxis: {
            gridLineColor: '#505053'
        }
    },
    scrollbar: {
        barBackgroundColor: '#808083',
        barBorderColor: '#808083',
        buttonArrowColor: '#CCC',
        buttonBackgroundColor: '#606063',
        buttonBorderColor: '#606063',
        rifleColor: '#FFF',
        trackBackgroundColor: '#404043',
        trackBorderColor: '#404043'
    },
    // special colors for some of the
    legendBackgroundColor: 'rgba(0, 0, 0, 0.5)',
    background2: '#505053',
    dataLabelsColor: '#B0B0B3',
    textColor: '#C0C0C0',
    contrastTextColor: '#F0F0F3',
    maskColor: 'rgba(255,255,255,0.3)'
};
export var glucoseGaugeTheme = {
    colors: ['#7cb5ec', '#f7a35c', '#90ee7e', '#7798BF', '#aaeeee', '#ff0066',
        '#eeaaee', '#55BF3B', '#DF5353', '#7798BF', '#aaeeee'],
    chart: {
        backgroundColor: null,
        style: {
            fontFamily: 'Rajdhani, sans-serif'
        }
    },
    title: {
        style: {
            fontSize: '20px',
            fontWeight: '400',
            textTransform: 'uppercase'
        }
    },
    tooltip: {
        borderWidth: 0,
        backgroundColor: 'rgba(219,219,216,0.8)',
        shadow: false
    },
    legend: {
        itemStyle: {
            fontWeight: 'bold',
            fontSize: '13px'
        }
    },
    xAxis: {
        gridLineWidth: 1,
        labels: {
            style: {
                fontSize: '12px'
            }
        }
    },
    yAxis: {
        minorTickInterval: 'auto',
        tickColor: (HighCharts.theme && HighCharts.theme.background2) || '#EEE',
        tickWidth: 0,
        title: {
            style: {
                fontSize: '24px',
                fontWeight: 'bold',
                textTransform: 'uppercase'
            }
        },
        labels: {
            style: {
                fontSize: '16px'
            }
        }
    },
    plotOptions: {
        candlestick: {
            lineColor: '#404048'
        }
    },
    // General
    background2: '#F0F0EA'
};
export var gaugeOptions = {
    chart: {
        type: 'solidgauge'
    },
    title: null,
    pane: {
        center: ['50%', '80%'],
        size: '150%',
        startAngle: -90,
        endAngle: 90,
        background: {
            borderWidth: 0,
            borderColor: (HighCharts.theme && HighCharts.theme.background2) || '#EEE',
            innerRadius: '90%',
            outerRadius: '100%',
            shape: 'arc'
        }
    },
    tooltip: {
        enabled: false
    },
    // the value axis
    yAxis: {
        stops: [
            [0.1, '#55BF3B'],
            [0.5, '#DDDF0D'],
            [0.9, '#DF5353'] // red
        ],
        lineWidth: 0,
        minorTickInterval: null,
        tickAmount: 0,
        title: {
            y: -75
        },
        labels: {
            y: 16
        }
    },
    plotOptions: {
        solidgauge: {
            lineCap: 'round',
            rounded: true,
            dataLabels: {
                y: 25,
                borderWidth: 0,
                useHTML: true
            }
        }
    }
};
export function roundedEdgesPlugin(H) {
    H.addEvent(H.Axis, 'afterInit', function () {
        if (!this.isXAxis) {
            H.wrap(this, 'getPlotBandPath', function (p) {
                var originalShape = p.apply(this, Array.prototype.slice.call(arguments, 1)), indexL = originalShape.indexOf('L'), indexZ;
                // Shape END:
                // Replace 'L' with 'A'
                originalShape[indexL] = 'A';
                // Add arc shape:
                originalShape.splice(indexL + 1, 0, 1, 1, 1, 0, 1);
                // Shape START:
                indexZ = originalShape.indexOf('Z');
                originalShape[indexZ] = 'A';
                // Add arc shape:
                originalShape.splice(indexZ + 1, 0, 1, 1, 1, 0, 1, originalShape[1], originalShape[2]);
                return originalShape;
            });
        }
    });
}
//# sourceMappingURL=highchartsUtils.js.map