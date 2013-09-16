var participateData = [{}]
var margin = {top: 46, left: 165, right: 0,bottom: 16},
    width = 670 - margin.left - margin.right,
    height = 250 - margin.top - margin.bottom,
    tickExtension = 20; // extend grid lines beyond scale range

var formatPercent = d3.format(".0%"),
    formatTenthPercent = d3.format(".1%"),
    formatNumber = d3.format(",.2s"),
    formatValue = d3.format(",.0f"),
    formatDollars = function(d) { return (d < 0 ? "-" : "") + "$" + formatNumber(Math.abs(d)).replace(/G$/, "B"); };

  var data, dataByDMA, dmaData=[],data1;
  var color = d3.scale.category10();
  var dmaColor = {}, stationColor={};
  var currentTab="DMA";

  /*parallal coordinate variables */
  var dimensionStation = ["action", "station_type", "dma_rank", "channel", "result_new_ch","bid_amt_off", "bid_amt_lvhf", "bid_amt_uvhf","result_payment"];
  var dimensionDMA = ["NIELSEN_RANK", "STATIONS", "OFF_AIR","NO_MOVE", "WITHIN_BAND","UVHF_TO_LVHF","UHF_TO_UVHF","UHF_TO_LVHF","DMA_VALUE", "DMA_COST" ]
  //var types = {"ACTION":"string", "CURRENT CHANNEL":"number", "PROPOSED CHANNEL":"number", "STATION VALUE":"number", "OPTIMIZATION COST":"log"};
 var stationColorCategory= ["UVHF_TO_LVHF","DOES_NOT_MOVE","MOVES_WITHIN_BAND","UHF_TO_LVHF","UHF_TO_UVHF","OFF_AIR"];
 var dmaColorCategory = ["1-10", "11-50", "51-100", "101-150", "151-200", ">200"];

 stationColorCategory.forEach(function(d,i){stationColor[d] = color(i)});
 dmaColorCategory.forEach(function(d,i){dmaColor[d] = color(i)});

var parcoordStation = d3.parcoords()("#stationPar")
  .alpha(0.3)
  .mode("queue") // progressive rendering
  //.height(d3.max([document.body.clientHeight-326, 320]))
  .height(300)
  .margin(margin);

var parcoordDMA = d3.parcoords()("#dmaPar")
  .alpha(0.3)
  .mode("queue") // progressive rendering
  //.height(d3.max([document.body.clientHeight-326, 320]))
  .height(300)
  .margin(margin);

  /****chart variables */
  var x = d3.scale.linear();
  var y = d3.scale.linear();

var r = d3.scale.sqrt()
    .domain([0, 1e9])
    .range([2, 5]);

var z = d3.scale.threshold()
    .domain([.1, .2, .3, .4, .5])
    .range(["#b35806", "#f1a340", "#fee0b6", "#d8daeb", "#998ec3", "#542788"].reverse());


  var lmap = L.mapbox.map('mapdma', 'fcc.map-toolde8w')
      .setView([39.5, -98.5], 3);
  // var lmapDMA = L.mapbox.map('mapdma', 'fcc.map-toolde8w')
  //     .setView([39.5, -98.5], 3);
  lmap.on("viewreset", resetMap);

  var svgMap = d3.select(lmap.getPanes().overlayPane).append("svg").attr("id","d3overlay");
    gMap = svgMap.append("g").attr("class", "leaflet-zoom-hide")

getData();

function getData(){
  queue()
    .defer(d3.json, "../data/dma.topojson")
    .defer(d3.csv, "../data/profile_test.csv")
    .await(ready);
}

// load csv file and create the chart
function ready(erro,dma, stationData) {
  data = stationData;
  data.forEach(function(d,i){
    d.channel = +d.channel;
    d.dma_rank = +d.dma_rank;
    d.result_new_ch = +d.result_new_ch;

    d.channel<=6 ? d.station_type="LVHF": d.channel>=14 ? d.station_type="UHF" : d.station_type="UVHF"; 
    d.dma_rank<=10 ? d.nielsen_rank = "1-10" : d.dma_rank<=50 ? d.nielsen_rank = "11-50": d.dma_rank <= 100 ? d.nielsen_rank = "51-100" :
                    d.dma_rank <= 150? d.nielsen_rank = "101-150": d.dma_rank<=200? d.nielsen_rank = "151-200":d.nielsen_rank=">200";
    d.result_new_ch == 0 ? d.action = "OFF_AIR" :
      d.channel == d.result_new_ch ? d.action = "DOES_NOT_MOVE" :
      d.channel >= 14 && d.result_new_ch <= 6 ? d.action = "UHF_TO_LVHF" :
      d.channel >= 14 && d.result_new_ch <= 13 ? d.action = "UHF_TO_UVHF" :
      d.channel <= 13 && d.channel >=7 && d.result_new_ch <=6 ? d.action = "UVHF_TO_LVHF" :
      d.action = "MOVES_WITHIN_BAND";
    d.color = stationColor[d.action];
    d["result_payment"] != "0" ? d["result_payment"] = +d["result_payment"] : d["result_payment"] =1;
     d["bid_amt_off"] != "0" ? d["bid_amt_off"] = +d["bid_amt_off"] : d["bid_amt_off"] =1;
     d["bid_amt_lvhf"] != "0" ? d["bid_amt_lvhf"] = +d["bid_amt_lvhf"] : d["bid_amt_lvhf"] =1;
      d["bid_amt_uvhf"] != "0" ? d["bid_amt_uvhf"] = +d["bid_amt_uvhf"] : d["bid_amt_uvhf"] =1;

  })

/*****process data for DMA ******/
    dataByDMA = d3.nest()
      .key(function(d){return d["dma_name"]})
      //.key(function(d){return d.actiontype})
      .rollup(function(values){
         // console.log(values)
        return {
            "NIELSEN_RANK": d3.min(values, function(d){return d["nielsen_rank"]}),
            "DMA_RANK": d3.min(values, function(d){return d["dma_rank"]}),
            "DMA_COST": d3.sum(values, function(d){return +d["result_payment"]}),
            "DMA_VALUE": d3.sum(values, function(d){return +d["station_value"]}),
            "STATIONS": d3.sum(values, function(d){return 1}),
            "NO_MOVE": d3.sum(values, function(d){return d["action"] == "DOES_NOT_MOVE" ? 1:0}),
           "WITHIN_BAND": d3.sum(values,function(d){return d["action"] == "MOVES_WITHIN_BAND"?1:0}),
           "UVHF_TO_LVHF": d3.sum(values,function(d){return d["action"] == "UVHF_TO_LVHF"?1:0}),
           "UHF_TO_UVHF": d3.sum(values,function(d){return d["action"] == "UHF_TO_UVHF"?1:0}),
           "UHF_TO_LVHF": d3.sum(values,function(d){return d["action"] == "UHF_TO_LVHF"?1:0}),
           "OFF_AIR": d3.sum(values,function(d){return d["action"] == "OFF_AIR"?1:0}),
        }; 
      })
      .map(data);
      d3.entries(dataByDMA).forEach(function(d){d.value.DMA_NAME = d.key;dmaData.push(d.value)});
      dmaData.forEach(function(d,id){d.color = dmaColor[d["NIELSEN_RANK"]]});

   

  //map stuff
  dmaJson = topojson.feature(dma, dma.objects.dma);
     //add boundary to leaflet map too
     bounds = d3.geo.bounds(dmaJson);
     lPath = d3.geo.path().projection(project);
     lFeature = gMap.selectAll("path")
                .data(dmaJson.features)
              .enter().append("path")
              .attr("class","ldma")
             // .attr("class", function(d){d.properties.DMA_NAME})
              //.on("mouseover", function());
      lFeature.append("svg:title").text(function(d){return d.properties.DMA_NAME});
      resetMap();
      drawParcoords(data, dimensionStation, parcoordStation);
      drawParcoords(dmaData, dimensionDMA, parcoordDMA);
      drawStationTable(data);
      drawDMATable(dmaData);

      //add place holder for brush extent
      d3.selectAll('.axis').append('svg:text')
        .attr("id", function(d){return "column-" + d})
        .attr("text-anchor", "middle")
        .attr("y", -4)
        .attr("x", 3)
        .attr("transform", "rotate(0) translate(-6,-8)")
        .attr("class", "label-average")
     //.text("mytext");
}

function hightlightMap(dmaName){

}

function drawParcoords(pcData,dimensionStation, parcoords){
  parcoords
    .data(pcData)
    .render()

      parcoords.dimensions(dimensionStation);
       parcoords.updateAxes();
       parcoords.brushable();
       parcoords.reorderable();
       parcoords.color(function(d){return d.color});
       parcoords.render();

  // parcoordsDMA
  //   .data(pcData)
  //   .render()
  //   // .reorderable()
  //   // .brushable();

  //     parcoordsDMA.dimensions(dimensions);
  //      parcoordsDMA.updateAxes();
  //      parcoordsDMA.brushable();
  //      parcoordsDMA.reorderable();
  //      parcoordsDMA.color(function(d){return d.color});
  //      parcoordsDMA.render();
  // highlight row in chart
 // <!--  grid.onMouseEnter.subscribe(function(e,args) {
 //    var i = grid.getCellFromEvent(e).row;
 //    var d = parcoords.brushed() || data;
 //    parcoords.highlight([d[i]]);
 //  });
 //  grid.onMouseLeave.subscribe(function(e,args) {
 //    parcoords.unhighlight();
 //  });

 //  // update grid on brush
 //  parcoords.on("brush", function(d) {
 //    gridUpdate(d);
 //  });

 //  function gridUpdate(data) {
 //    dataView.beginUpdate();
 //    dataView.setItems(data);
 //    dataView.endUpdate();
 //  }; -->

}

function drawStationTable(d){
  d3.select("#stationContents").html("");

  var content = "", ids=[];
  content += "<table id='tbl-recordDetails' class='table table-hover tablesorter'><thead><tr><th><div class='sort-wrapper'>Facility ID &nbsp;<span class='sort'></span></div></th><th><div class='sort-wrapper'>Current Channle &nbsp;<span class='sort'></span></div></th><th><div class='sort-wrapper'>Proposed Channel &nbsp;<span class='sort'></span></div></th><th><div class='sort-wrapper'>DMA &nbsp;<span class='sort'></span></div></th><th><div class='sort-wrapper'>Action &nbsp;<span class='sort'></span></div></th><th><div class='sort-wrapper'>Cost &nbsp;<span class='sort'></span></div></tr></thead>";

    content += "<tbody>";
    for (var i = 0, length = d.length; i<length; i++) {
    //console.log(d[i].fips + " " + getStateName(d[i].fips).abbrName)
              content += "<tr data-lat=" + d[i].latitude + " data-lon=" + d[i].longitude + " data-facility_id='" + d[i]["facility_id"] + "'><td>" + d[i]["facility_id"] + "</td>";
              content += "<td>" + d[i]["channel"] + "</td>";
              content += "<td>" + d[i]["result_new_ch"] + "</td>";
              content += "<td>" + d[i]["dma_name"] + "</td>";
              content += "<td>" + d[i]["action"] +  "</td>";
              content += "<td>" + formatValue(d[i]["result_payment"]) + "</td></tr>";
              // content += "<td>" + d[i].affiliation + "</td>";
              // content += "<td>" + d[i].availableChannels + "</td></tr>";
        } 
    content +="</tbody></table>";

    $("#stationContents").html(content);
    initTblSort();


    d3.selectAll("#tbl-recordDetails tbody tr")
        .on("mouseover", function(){
            highlight(d3.select(this));
          })
        .on("mouseout", function(){
            unhighlight();
        });
}

function drawDMATable(d){
  d3.select("#dmaContents").html("");

  var content = "", ids=[];
  content += "<table id='tbl-recordDetails-DMA' class='table table-hover tablesorter'><thead><tr><th><div class='sort-wrapper'>Nielsen Rank &nbsp;<span class='sort'></span></div></th><th><div class='sort-wrapper'>DMA Name &nbsp;<span class='sort'></span></div></th><th><div class='sort-wrapper'>Stations &nbsp;<span class='sort'></span></div></th><th><div class='sort-wrapper'>Off-Air Stations &nbsp;<span class='sort'></span></div></th><th><div class='sort-wrapper'>DMA Value &nbsp;<span class='sort'></span></div></th><th><div class='sort-wrapper'>Cost &nbsp;<span class='sort'></span></div></tr></thead>";

    content += "<tbody>";
    for (var i = 0, length = d.length; i<length; i++) {
    //console.log(d[i].fips + " " + getStateName(d[i].fips).abbrName)
              content += "<tr data-lat=" + d[i].latitude + " data-lon=" + d[i].longitude + " data-dma_name='" + d[i]["DMA_NAME"] + "'><td>" + d[i]["DMA_RANK"] + "</td>";
              content += "<td>" + d[i]["DMA_NAME"] + "</td>";
              content += "<td>" + d[i]["STATIONS"] + "</td>";
              content += "<td>" + d[i]["OFF_AIR"] + "</td>";
              content += "<td>" + formatValue(d[i]["DMA_VALUE"]) +  "</td>";
              content += "<td>" + formatValue(d[i]["DMA_COST"]) + "</td></tr>";
              // content += "<td>" + d[i].affiliation + "</td>";
              // content += "<td>" + d[i].availableChannels + "</td></tr>";
        } 
    content +="</tbody></table>";

    $("#dmaContents").html(content);
    initTblSortDMA();


    d3.selectAll("#tbl-recordDetails-DMA tbody tr")
        .on("mouseover", function(){
            highlight(d3.select(this));
          })
        .on("mouseout", function(){
            unhighlight();
        });
}

function highlight(selectedRow){

  if (currentTab == "DMA"){

      var selectedDMA = dmaData.filter(function(d){return d["DMA_NAME"] == selectedRow.attr("data-dma_name")})
      //console.log(selectedDMA)
      parcoordDMA.highlight([selectedDMA[0]])
  }else{
      var selectedStation = data.filter(function(d){return d["facility_id"] == parseInt(selectedRow.attr("data-facility_id"))})
      parcoordStation.highlight([selectedStation[0]])
  }

}

function unhighlight(){
  if (currentTab == "DMA"){
    parcoordDMA.unhighlight();
  }else{
    parcoordStation.unhighlight();
  }
  
}

function initTblSort() {
  if ($('#tbl-recordDetails') && $('#tbl-recordDetails tbody tr').length > 1) {
    $('#tbl-recordDetails').dataTable({
      "aoColumns": [null, null,null,null,null,null],
    // "aoColumnDefs": [
    //         { 'bSortable': false, 'aTargets': [ 6 ] }
    //      ],
      "aaSorting": [
        [1, "desc"]
      ],
      "bDestroy": true,
      "bFilter": false,
      "bInfo": false,
      "bPaginate": false,
      "bLengthChange": false,
    "bScrollCollapse": true,
    "sScrollY": 400/*,
    "sScrollX": "100%",
      "sScrollXInner": "110%"*/
    });
  }
}

function initTblSortDMA() {
  if ($('#tbl-recordDetails-DMA') && $('#tbl-recordDetails-DMA tbody tr').length > 1) {
    $('#tbl-recordDetails-DMA').dataTable({
      "aoColumns": [null, null,null,null,null,null],
    // "aoColumnDefs": [
    //         { 'bSortable': false, 'aTargets': [ 6 ] }
    //      ],
      "aaSorting": [
        [1, "desc"]
      ],
      "bDestroy": true,
      "bFilter": false,
      "bInfo": false,
      "bPaginate": false,
      "bLengthChange": false,
    "bScrollCollapse": true,
    "sScrollY": 400/*,
    "sScrollX": "100%",
      "sScrollXInner": "110%"*/
    });
  }
}

function resetMap(){
    var bottomLeft = project(bounds[0]),
        topRight = project(bounds[1]);

    svgMap .attr("width", topRight[0] - bottomLeft[0])
        .attr("height", bottomLeft[1] - topRight[1])
        .style("margin-left", bottomLeft[0] + "px")
        .style("margin-top", topRight[1] + "px");

    gMap.attr("transform", "translate(" + -bottomLeft[0] + "," + -topRight[1] + ")");
    lFeature.attr("d", lPath);
}
// Use Leaflet to implement a D3 geographic projection.
function project(x) {
    var point = lmap.latLngToLayerPoint(new L.LatLng(x[1], x[0]));
    return [point.x, point.y];
  }

function highlightDMAMap(){
  if (parcoordDMA.brushed().length == dmaData.length){
    d3.selectAll('.ldma').classed('selected',false);
  }else{
    d3.selectAll('.ldma')
      .classed("selected", false)
      .classed("selected",function(d){
           var sel = false;
          parcoordDMA.brushed().forEach(function(s){
          if (s.DMA_NAME == d.properties.DMA_NAME){ sel=true}
          })
           return sel;
      })
  }
}

function resetBrush(){
  if (currentTab == "DMA"){
    dimensionDMA.forEach(function(d){parcoordDMA.brushReset(d);})
        parcoordDMA.brush();
        drawDMATable(dmaData);
        highlightDMAMap();

  }else{
        dimensionStation.forEach(function(d){parcoordStation.brushReset(d);})
        parcoordStation.brush();
        drawStationTable(data);
  }
  setBrushExtent();

}


function setBrushExtent(){
  var y1,y2;
  if (currentTab == "DMA"){
    dimensionDMA.forEach(function(d){
      if (d != "NIELSEN_RANK"){
        if (!parcoordDMA.yscale[d].brush.empty()){
           y1= parcoordDMA.yscale[d].brush.extent()[0],
            y2= parcoordDMA.yscale[d].brush.extent()[1];
        }else{
            y1= parcoordDMA.yscale[d].domain()[0],
            y2= parcoordDMA.yscale[d].domain()[1];
        }
        if (d=="DMA_VALUE" || d=="DMA_COST"){
          $("#column-" + d).text(formatDollars(y1) + "-" + formatDollars(y2))
        } else{
           $("#column-" + d).text(Math.floor(y1) + "-" + Math.floor(y2))
        }  
      }
    })
  }else{
    dimensionStation.forEach(function(d){
      if (d != "action" && d != "station_type"){
        if (!parcoordStation.yscale[d].brush.empty()){
               y1= parcoordStation.yscale[d].brush.extent()[0],
              y2= parcoordStation.yscale[d].brush.extent()[1];
        }else{
              y1= parcoordStation.yscale[d].domain()[0],
              y2= parcoordStation.yscale[d].domain()[1];
        }
        if (d=="bid_amt_off" || d=="bid_amt_lvhf" || d == "bid_amt_uvhf" || d == "result_payment") {
          $("#column-" + d).text(formatDollars(y1) + "-" + formatDollars(y2))
        } else{
           $("#column-" + d).text(Math.floor(y1) + "-" + Math.floor(y2))
        }  
      }
    })
  }  
}

function brushEnd(){
  if (currentTab == "DMA"){
    drawDMATable(parcoordDMA.brushed());
    highlightDMAMap();
  } else {
    drawStationTable(parcoordStation.brushed());
  }
}

$(document).ready(function() {
  //$('#dmaContent').removeClass("active");
  $('#stationContent').removeClass("active");
  $('#searchContent').removeClass("active");
  
  if (location.hash != null) {
	var activeTab = '#navTab a[href="' + location.hash + '"]';

	$(activeTab).tab('show');  
  }
  
  $('#navTab a').not('.lnk-nonTab').click(function (e) {
    e.preventDefault();
    $(this).tab('show');
    currentTab = $(this).text();
  });

  d3.selectAll('.resetButton').on("click", resetBrush);

});
