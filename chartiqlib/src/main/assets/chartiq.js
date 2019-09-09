'use strict';

var mappedTimeframes = {
    'M1': 1,
    'M5': 5,
    'M15': 15,
    'M30': 30,
    'H1': 60,
    'H4': 240,
    'D1': 'day',
    'W1': 'day', //small hack because chartIQ have some problem with displaying Weeks
    'MN1': 'month'
};

var stxx = null,
symbol = null,
selectedTimeframe = null,
selectedChartType = null,
symbolName = null,
takeProfit = null,
stopLoss = null,
slTpDate = null,
quoteFeedCallbacks = {},
initialQuotes = [];


function addLine(price, date, lineColor) {
        
        var parameters={
            pattern: "dashed",
            lineWidth: 1
        };
    
        var panel = stxx.chart.panel;
        var x=stxx.pixelFromDate(date, stxx.chart);
        var y=stxx.pixelFromPrice(price, panel);
        
        var color = "#" + lineColor;
        var type = "horizontal";
        
        stxx.plotLine(x, x+1, y, y, color, type, stxx.chart.context, true, parameters);
    
        var txt=price;
        if(panel.chart.transformFunc) txt=panel.chart.transformFunc(stxx, panel.chart, txt);
        if(panel.yAxis.priceFormatter)
            txt=panel.yAxis.priceFormatter(stxx, panel, txt);
        else
            txt=stxx.formatYAxisPrice(txt, panel);
        stxx.createYAxisLabel(panel, txt, y, color);
        
        stxx.endClip();
}

function addSLTPLine() {
    if (stxx && stxx.chart.dataSet.length) {
        if (takeProfit != null) {
            addLine(takeProfit, slTpDate, "58C339");
        }
        
        if (stopLoss != null) {
            addLine(stopLoss, slTpDate, "ED394D");
        }
    }
}

function injection() {
    STXChart.prototype.append("draw", addSLTPLine);
}

function setStopLossTakeProfit(sl, tp, date) {
    stopLoss = sl;
    takeProfit = tp;
    slTpDate = date;
}

function createQuoteFeed() {
    STX.QuoteFeed.MyFeed=function(){};
    STX.QuoteFeed.MyFeed.stxInheritsFrom(STX.QuoteFeed);
    STX.QuoteFeed.MyFeed.prototype.fetch=function(params, cb){
        // This is an outline for how to implement fetch in your custom feed
        
        if (params.startDate && params.endDate) {
            
        } else if (params.startDate) {
            var id = STX.uniqueID();
            quoteFeedCallbacks[id] = cb;
            if(Android.pullNewDataHandler){
               Android.pullNewDataHandler(id, params.symbol, params.startDate.toISOString(), params.timeUnit, params.period);
               }
            //if (window.webkit.messageHandlers.pullNewDataHandler) {
            //    window.webkit.messageHandlers.pullNewDataHandler.postMessage({"id": id, "symbol": params.symbol, "startDate": params.startDate.toISOString(), "endDate": null, "interval": params.timeUnit, "period": params.period});
            //}
        } else if (params.endDate) {
            var id = STX.uniqueID();
            quoteFeedCallbacks[id] = cb;
            if(Android.pullPaginationDataHandler){
               Android.pullPaginationDataHandler(id, params.symbol, params.endDate.toISOString(), params.timeUnit, params.period);
               }
            //window.webkit.messageHandlers.pullPaginationDataHandler.postMessage({"id": id, "symbol": params.symbol, "startDate": null, "endDate": params.endDate.toISOString(), "interval": params.timeUnit, "period": params.period});
        } else {
            
            cb({quotes: initialQuotes, moreAvailable: true})
        }
    };
}

function parseData(quotes, callbackId) {
    var newQuotes = [];
    
    for (var i = 0; i < quotes.length; i++) {
        newQuotes[i] = {};
        newQuotes[i].Date = quotes[i][0];
        newQuotes[i].Open = parseFloat(quotes[i][1]);
        newQuotes[i].High = parseFloat(quotes[i][2]);
        newQuotes[i].Low = parseFloat(quotes[i][3]);
        newQuotes[i].Close = parseFloat(quotes[i][4]);
        newQuotes[i].Volume = parseFloat(quotes[i][5]);
    }
    
    if (callbackId) {
        // pull method
        var quoteFeedCb = quoteFeedCallbacks[callbackId];
        
        if (quoteFeedCb) {
            quoteFeedCb({quotes:newQuotes, moreAvailable: newQuotes.length > 0 });
            delete quoteFeedCallbacks[callbackId];
        }
    } else {
        // push method
        stxx.appendMasterData(newQuotes);
    }
    
    return;
}

function createStudy(){
    STX.Studies.go($$("studyDialog"), stxx);
}

function studyDialog(study){
    if(!stxx || !stxx.chart.dataSet) return;
    //$$("studyDialog").querySelectorAll(".title")[0].innerHTML=obj.innerHTML;
    STX.Studies.studyDialog(stxx, study, $$("studyDialog"));
    STX.DialogManager.displayDialog("studyDialog");
}

function selectDrawing(tool) {
    stxx.changeVectorType(tool);
}

function initSymbol(setSymbol) {
    symbolName = setSymbol
}

function initTimeFrame(timeFrame) {
    selectedTimeframe = timeFrame;
}

function initChartFromOrderDetails(sym, quotes) {
    hideXAxis()
    
    var newQuotes = [];
    for (var i = 0; i < quotes.length; i++) {
        newQuotes[i] = {};
        newQuotes[i].Date = quotes[i][0];
        newQuotes[i].Open = parseFloat(quotes[i][1]);
        newQuotes[i].High = parseFloat(quotes[i][2]);
        newQuotes[i].Low = parseFloat(quotes[i][3]);
        newQuotes[i].Close = parseFloat(quotes[i][4]);
        newQuotes[i].Volume = parseFloat(quotes[i][5]);
    }
    
    
    selectedTimeframe = 'M1'
    selectedChartType = "mountain"
    
    // Declare a STXChart object. This is the main object for drawing charts
    stxx = new STXChart({container: $$$(".chartContainer"), axisBorders: false});
    
    stxx.chart.yAxis.noDraw = true;
    stxx.chart.xAxis.displayBorder = false;
    stxx.chart.xAxis.displayGridLines = false;
    
    STX.ThemeManager.loadBuiltInTheme(stxx, "Dark");
    stxx.preferences.whitespace = 10; // less default whitespace on right margin for phones
    
    stxx.layout = {"chartType": "line"}
    stxx.setPeriodicityV2(1, mappedTimeframes[selectedTimeframe]);
    stxx.newChart(sym, newQuotes, null, resizeScreen);
    
    STX.MenuManager.registerChart(stxx);
    
    STX.DrawingToolbar.prototype.setLineColor=function(stx){
        var lineColorPicker=$$$(".stxLineColorPicker", this.htmlElement);
        if(this.stx.currentVectorParameters.currentColor=="transparent"){
            if (stx.defaultColor == '#FFFFFF') {
                lineColorPicker.style.backgroundColor='yellow';
                this.stx.currentVectorParameters.currentColor='yellow';
            } else
                lineColorPicker.style.backgroundColor=stx.defaultColor;
        }else{
            lineColorPicker.style.backgroundColor=this.stx.currentVectorParameters.currentColor;
        }
    };
}


function disableInteraction () {
    stxx.allowScroll = false;
    stxx.allowSideswipe = false;
    stxx.allowZoom = false;
}

function initChart(sym, quotes, sTimeFrame, chartType, language, backgroundColor, isDarkMode) {
    if (stxx) {
        stxx.destroy()
    }
    
    $$$(".chartContainer").classList.remove('noAxis')
    $$$(".chartContainer").innerHTML = ""
    
    initialQuotes = [];
    
    for (var i = 0; i < quotes.length; i++) {
        initialQuotes[i] = {};
        initialQuotes[i].Date = quotes[i][0];
        initialQuotes[i].Open = parseFloat(quotes[i][1]);
        initialQuotes[i].High = parseFloat(quotes[i][2]);
        initialQuotes[i].Low = parseFloat(quotes[i][3]);
        initialQuotes[i].Close = parseFloat(quotes[i][4]);
        initialQuotes[i].Volume = parseFloat(quotes[i][5]);
    }
    
    
    selectedTimeframe = sTimeFrame || 'D1'
    
    // Declare a STXChart object. This is the main object for drawing charts
    stxx = new STXChart({container: $$$(".chartContainer"), axisBorders: false});
    stxx.chart.yAxis.currentColor = "#66cac4"
    
    // Define the behavior of your feed
    var quoteBehavior = {
    refreshInterval: 1            // how often to go back to check for new data and refresh the chart
        //callback: function () {}    // for performing more tasks after data was fetched, like Comparison Charts
    };
    
    // Attach your quotefeed to the chart.
    createQuoteFeed()
    stxx.attachQuoteFeed(new STX.QuoteFeed.MyFeed(), quoteBehavior);
    
    STX.I18N.setLanguage(stxx, language);
    STX.I18N.setLocale(stxx, language);
    if (isDarkMode) {
        STX.ThemeManager.loadBuiltInTheme(stxx, "Dark");
    }
    stxx.preferences.whitespace = 10; // less default whitespace on right margin for phones
    
    selectedChartType = chartType || "mountain"
    stxx.layout = {"chartType": selectedChartType}
    stxx.backgroundColor = {"bgcolor" : backgroundColor}
    
    stxx.setPeriodicityV2(1, mappedTimeframes[selectedTimeframe]);
    
    
    // your code for getting a new symbol
    
    //    stxx.newChart(sym, initialQuotes, null, resizeScreen);
    stxx.newChart(sym, null, null, resizeScreen);
    
    STX.MenuManager.registerChart(stxx);
}

function appendChartData(quotes) {
    var newQuotes = [];
    
    newQuotes[0] = {};
    newQuotes[0].Date = quotes[0];
    newQuotes[0].Open = parseFloat(quotes[1]);
    newQuotes[0].High = parseFloat(quotes[2]);
    newQuotes[0].Low = parseFloat(quotes[3]);
    newQuotes[0].Close = parseFloat(quotes[4]);
    newQuotes[0].Volume = parseFloat(quotes[5]);
    
    stxx.appendMasterData(newQuotes);
}

function setTimeframe(timeFrame) {
    stxx.setPeriodicityV2(1, mappedTimeframes[timeFrame], function (err) {});
}

function setChartType(chartType) {
    stxx.setChartType(chartType);
}

window.addEventListener("resize", resizeScreen);


function resizeScreen(){
    setTimeout(resizeContainers,250); // use a timeout so ios and native android has time to hide DOM elements
}

function resizeContainers(){
    var chartContainer=$$$(".chartContainer");
    chartContainer.style.height=(window.innerHeight) + "px";
    
    if(stxx && stxx.chart && stxx.chart.canvas){
        stxx.resizeChart();
        // stxx.home();
    }
    
}

function hideXAxis() {
    var css = '.Dark .stx_xaxis {color: #2A2D38 !important;} .Dark .stx_xaxis_dark {color: #2A2D38 !important;}',
    head = document.head || document.getElementsByTagName('head')[0],
    style = document.createElement('style');
    
    style.type = 'text/css';
    if (style.styleSheet){
        style.styleSheet.cssText = css;
    } else {
        style.appendChild(document.createTextNode(css));
    }
    
    head.appendChild(style);
}
