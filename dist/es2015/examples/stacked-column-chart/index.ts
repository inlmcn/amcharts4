import * as amcharts4 from "@amcharts/amcharts4/core";
import * as charts from "@amcharts/amcharts4/charts";
import AnimatedTheme from "@amcharts/amcharts4/themes/animated";

amcharts4.useTheme(AnimatedTheme);

let chart = amcharts4.create("chartdiv", charts.XYChart);

chart.data = [{
	"category": "One",
	"value1": 1,
	"value2": 5,
	"value3": 3,
	"value4": 3
}, {
	"category": "Two",
	"value1": 2,
	"value2": 5,
	"value3": 3,
	"value4": 4
}, {
	"category": "Three",
	"value1": 3,
	"value2": 5,
	"value3": 4,
	"value4": 4
}, {
	"category": "Four",
	"value1": 4,
	"value2": 5,
	"value3": 6,
	"value4": 4
}, {
	"category": "Five",
	"value1": 3,
	"value2": 5,
	"value3": 4,
	"value4": 4
}, {
	"category": "Six",
	"value1": 8,
	"value2": 7,
	"value3": 10,
	"value4": 4
}, {
	"category": "Seven",
	"value1": 10,
	"value2": 8,
	"value3": 6,
	"value4": 4
}]

chart.padding(30, 30, 10, 30);
chart.legend = new charts.Legend();

chart.colors.step = 2;

let categoryAxis = chart.xAxes.push(new charts.CategoryAxis());
categoryAxis.dataFields.category = "category";
categoryAxis.renderer.minGridDistance = 60;
categoryAxis.renderer.grid.template.location = 0;
categoryAxis.mouseEnabled = false;

let valueAxis = chart.yAxes.push(new charts.ValueAxis());
valueAxis.tooltip.disabled = true;
valueAxis.renderer.grid.template.strokeOpacity = 0.05;
valueAxis.renderer.minGridDistance = 20;
valueAxis.mouseEnabled = false;
valueAxis.min = 0;
valueAxis.renderer.minWidth = 35;

let series1 = chart.series.push(new charts.ColumnSeries());
series1.columns.template.width = amcharts4.percent(80);
series1.columns.template.tooltipText = "{name}: {valueY.value}";
series1.name = "Series 1";
series1.dataFields.categoryX = "category";
series1.dataFields.valueY = "value1";
series1.stacked = true;

let series2 = chart.series.push(new charts.ColumnSeries());
series2.columns.template.width = amcharts4.percent(80);
series2.columns.template.tooltipText = "{name}: {valueY.value}";
series2.name = "Series 2";
series2.dataFields.categoryX = "category";
series2.dataFields.valueY = "value2";
series2.stacked = true;

let series3 = chart.series.push(new charts.ColumnSeries());
series3.columns.template.width = amcharts4.percent(80);
series3.columns.template.tooltipText = "{name}: {valueY.value}";
series3.name = "Series 3";
series3.dataFields.categoryX = "category";
series3.dataFields.valueY = "value3";
series3.stacked = true;

let series4 = chart.series.push(new charts.ColumnSeries());
series4.columns.template.width = amcharts4.percent(80);
series4.columns.template.tooltipText = "{name}: {valueY.value}";
series4.name = "Series 4";
series4.dataFields.categoryX = "category";
series4.dataFields.valueY = "value4";
series4.stacked = true;

chart.scrollbarX = new amcharts4.Scrollbar();