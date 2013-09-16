
//http://bl.ocks.org/mbostock/5180185
var width = 570,
    height = 350;
var data, minAvailableChannel,maxAvailableChannel,bounds,lFeature,lPath, bubblesL=null,mxca_stations,bounds1;
var filterNumber = 500;
var stateSelected = false, currentStateFips=null,tableRowSelected=false;
var projection = d3.geo.albersUsa()
    .scale(650)
    .translate([width / 2, height / 2]);
var path = d3.geo.path()
    .projection(projection);


// var projection = d3.geo.mercator()
//     .scale(10050)
//     .translate([width / 2, height / 2]);
// var path = d3.geo.path()
//     .projection(projection);

//use mapbox.js
  var lmap = L.mapbox.map('detailmap', 'fcc.map-toolde8w')
      .setView([39.5, -98.5], 4);
  lmap.on("viewreset", resetMap);

var svgMap = d3.select(lmap.getPanes().overlayPane).append("svg").attr("id","d3overlay");
    gMap = svgMap.append("g").attr("class", "leaflet-zoom-hide")

var canvas = d3.select("#map").insert("canvas")
    .attr("width", width)
    .attr("height", height)
    .style("opacity", 1);
var svg = d3.select("#map").append("svg")
    .attr("width", width)
    .attr("height", height);

var dmaPaths = svg.append("g")
              .attr("id","dmaPath"); 
var lakePaths = svg.append("g")
              .attr("id","lakePath"); 
var bubble = svg.append("g")
              .attr("id", "bubbles");

var context = canvas.node().getContext("2d");
context.fillStyle = "#303030";
context.fillRect(0, 0, width, height);



queue()
  .defer(d3.csv, "../data/fac_excluded_ch_data.csv")
  .defer(d3.csv, "../data/mx_ca_lm_stations.csv")
  .defer(d3.json, "../data/dma.topojson")
   .defer(d3.json, "../data/greatlakes.geojson")
   .defer(d3.json, "../data/state.topojson")
  .await(ready);

function ready(error, station,mxca_station,dma,greatlakes,state){
  stations = station;
  stations.forEach(function(d) {
    var p = projection([+d.longitude, +d.latitude]);
    d.x = Math.round(p[0]), d.y = Math.round(p[1]);
    d.fac_channel = +d.fac_channel;
   //d.excluded_channels = +d.excluded_channels;
    d.availableChannels = +d.excluded_channels
    d.facility_id = +d.facility_id;
    d.affiliation = d.affiliation.length>0?d.affiliation:"unknown";
    d.dma_name = d.dma_name.length>0?d.dma_name:"unknown";
});
  
  data = crossfilter(stations);
  data.affiliation = data.dimension(function(d){return d.affiliation});
  data.groupByAffiliation = data.affiliation.group();
  data.availableChannel = data.dimension(function(d){return d.availableChannels});
  data.facChannel = data.dimension(function(d){return d.fac_channel});
  data.dma = data.dimension(function(d){return d.dma_name});
  data.groupByDma = data.dma.group();

  minAvailableChannel = data.availableChannel.bottom(1)[0].availableChannels;
  maxAvailableChannel =  data.availableChannel.top(1)[0].availableChannels;

  minFacChannel = data.facChannel.bottom(1)[0].fac_channel;
  maxFacChannel =  data.facChannel.top(1)[0].fac_channel;

  var affiliationData = data.groupByAffiliation.top(Infinity).sort(function(a, b){ return d3.ascending(a.key, b.key)});
  var dmaData = data.groupByDma.top(Infinity).sort(function(a, b){ return d3.ascending(a.key, b.key)});

  d3.select("#dma").on("change", function(e){change();})
                      .selectAll("option")
                        .data(dmaData)
                        .enter()
                        .append("option")
                          .attr("value", function(d){return d.key})
                          .text(function(d){return d.key})
   $("#dma").prepend('<option value="0">All</option>');

  d3.select("#affiliation").on("change", function(e){change();})
                      .selectAll("option")
                        .data(affiliationData)
                        .enter()
                        .append("option")
                          .attr("value", function(d){return d.key})
                          .text(function(d){return d.key})
   $("#affiliation").prepend('<option value="0">All</option>');


    $( "#availableChannelSlider" ).slider({
            range: true,
            min: minAvailableChannel,
            max: maxAvailableChannel,
            values: [ minAvailableChannel, maxAvailableChannel ],
            step: 1,
            slide: function( event, ui ) {
              $( "#availableChannelNum" ).text(ui.values[ 0 ] + " - " + ui.values[ 1 ] );
            },
            stop:function(event,ui){change()}
          });
     $( "#availableChannelNum" ).text(minAvailableChannel + " - " + maxAvailableChannel);

      $( "#channelSlider" ).slider({
            range: true,
            min: minFacChannel,
            max: maxFacChannel,
            values: [ minFacChannel, maxFacChannel ],
            step: 1,
            slide: function( event, ui ) {
              $( "#channelNum" ).text(ui.values[ 0 ] + " - " + ui.values[ 1 ] );
            },
            stop:function(event,ui){change()}
          });
     $( "#channelNum" ).text(minFacChannel + " - " + maxFacChannel);

    d3.select("#reset").on("click", function(e){reset("all")});

  var l = lakePaths.selectAll("path")
              .data(greatlakes.features)
                .enter()
                .append("path")
                .attr("d",path)
                .attr("class", "lakes");  


  dmaJson = topojson.feature(dma, dma.objects.dma);
     //add boundary to leaflet map too
     bounds = d3.geo.bounds(dmaJson);
     lPath = d3.geo.path().projection(project);
     lFeature = gMap.selectAll("path")
                .data(dmaJson.features)
              .enter().append("path")
              .attr("class","ldma");
      lFeature.append("svg:title").text(function(d){return d.properties.DMA_NAME});

  var d = dmaPaths.selectAll("path")
              .data(dmaJson.features)
                .enter()
                .append("path")
                .attr("d",path)
                .attr("class", "dma");
  d.append("svg:title").text(function(d){return d.properties.DMA_NAME});

  mxca_stations = mxca_station;
  mxca_stations.forEach(function(d){ 
                    var p = projection([+d.lon, +d.lat]);
                    d.x = Math.round(p[0]);
                    d.y = Math.round(p[1]);
                    d.lon = +d.lon;
                    d.lat = +d.lat;
                  });  
 // add mx ca stations to lmap
  mxca_stations.forEach(function(d){
       var circle = new L.circleMarker([d.lat,d.lon],{color:'red',weight:2,fill:'red',fillOpacity:1,clickable:false});
      circle.setRadius(1);
      circle.addTo(lmap);
    });

  bounds1 = d3.geo.bounds(topojson.feature(state,state.objects.state));
  reset("all");
 // resetMap();

}

function reset(resetType){
           context.clearRect(0,0,width,height);
          context.globalAlpha = 0.3;
          context.fillStyle = "white";
          stations.forEach(function(d) {
              context.fillRect(d.x, d.y, 2, 2);
          });
          // context.fillStyle = "red";
          // mxca_stations.forEach(function(d) {
          //     context.fillRect(d.x, d.y, 2, 2);
          // });

        if(resetType == "all"){
             $( "#availableChannelSlider").slider("values", [minAvailableChannel,maxAvailableChannel]);
             $( "#availableChannelNum" ).text(minAvailableChannel + " - " + maxAvailableChannel);
            $( "#channelSlider").slider("values", [minFacChannel,maxFacChannel]);
             $( "#channelNum" ).text(minFacChannel + " - " + maxFacChannel);
             $("#dma").val(0);
             $("#affiliation").val(0);
        }

         d3.selectAll('.lcircle').remove();
        d3.selectAll(".pulse_circle").remove();
        d3.select("#contents").html("");
        d3.select("#recordSection").style("display","none");
        d3.select("#txtSelection").text("0 stations selected out of " + data.size()); 
        lmap.setView([39.5, -98.5], 3);
}

function drawTable(){
  d3.select("#contents").html("");

  var content = "", d=null, ids=[];
  content += "<table id='tbl-recordDetails' class='table table-hover tablesorter'><thead><tr><th><div class='sort-wrapper'>Facility ID &nbsp;<span class='sort'></span></div></th><th><div class='sort-wrapper'>Callsign &nbsp;<span class='sort'></span></div></th><th><div class='sort-wrapper'>Facility Channel &nbsp;<span class='sort'></span></div></th><th><div class='sort-wrapper'>City &nbsp;<span class='sort'></span></div></th><th><div class='sort-wrapper'>State &nbsp;<span class='sort'></span></div></th><th><div class='sort-wrapper'>DMA &nbsp;<span class='sort'></span></div></th><th><div class='sort-wrapper'>Affiliation &nbsp;<span class='sort'></span></div></th><th><div class='sort-wrapper'>Number of Available Channels &nbsp;<span class='sort'></span></div></tr></thead>";
  d = data.availableChannel.bottom(filterNumber);

    content += "<tbody>";
    for (var i = 0, length = d.length; i<length; i++) {
    //console.log(d[i].fips + " " + getStateName(d[i].fips).abbrName)
              content += "<tr data-lat=" + d[i].latitude + " data-lon=" + d[i].longitude + " data-dma='" + d[i].dma_name + "'><td>" + d[i].facility_id + "</td>";
              content += "<td>" + d[i].fac_callsign + "</td>";
              content += "<td>" + d[i].fac_channel + "</td>";
              content += "<td>" + d[i].city + "</td>";
              content += "<td>" + d[i].stateabbr +  "</td>";
              content += "<td>" + d[i].dma_name + "</td>";
              content += "<td>" + d[i].affiliation + "</td>";
              content += "<td>" + d[i].availableChannels + "</td></tr>";
        } 
    content +="</tbody></table>";

    $("#contents").html(content);
    initTblSort();

    d3.selectAll("#tbl-recordDetails tbody tr").on("click", function(){
            tableRowSelected = false;
            if (d3.select(this).classed('tablerowselected')){
              tableRowSelected = true;
            }
             d3.selectAll("#tbl-recordDetails tbody tr").classed('tablerowselected',false);
            highlight(d3.select(this));
          });
     drawLMap(d);
}

function drawLMap(pts){
  var coords = [];
  var latlon=[];
  pts.forEach(function(d){
    var a = [+d.longitude, +d.latitude];
    coords.push(a);
    var b = new L.LatLng(+d.latitude,+d.longitude);
    latlon.push(b);
  })

  lBounds= new L.LatLngBounds(latlon);
  //console.log(bounds);
  if (pts.length > 1){
      lmap.fitBounds(lBounds);
  }
  else{
    zoomToDma(pts[0].dma_name, coords[0]);
  }


  bubblesL = gMap.selectAll(".lcircle")
                      .data(coords, function(d){return d});

  //enter
  bubblesL.enter().append("circle").attr("class","lcircle")
           .attr("transform", function(d){
                            var c = project(d);
                            var x = c[0], y = c[1];
                            return "translate(" + x + "," + y + ")";
                          })
            .attr("r", 2)
            //.on("click", function(d){showState(d,this)});

//update
  bubblesL.attr("class","lcircle")
        .transition()
          .duration(750)
          .attr("transform", function(d){
                var c = project(d);
                var x = c[0], y = c[1];
                return "translate(" + x + "," + y + ")";
              })
          .attr("r", 2)

  //exit
  bubblesL.exit().attr("class","lcircle")
          .transition()
          .duration(750)
          .style("fill-opacity",1e-6)
          .remove();

  resetMap();
}

function resetMap(){
  // var bottomLeft = project([bounds.getSouthWest().lng-0.5, bounds.getSouthWest().lat-0.5]),
    //    topRight = project([bounds.getNorthEast().lng+0.5, bounds.getNorthEast().lat+0.5]);

    var bottomLeft = project(bounds[0]),
        topRight = project(bounds[1]);

    svgMap .attr("width", topRight[0] - bottomLeft[0])
        .attr("height", bottomLeft[1] - topRight[1])
        .style("margin-left", bottomLeft[0] + "px")
        .style("margin-top", topRight[1] + "px");

    gMap.attr("transform", "translate(" + -bottomLeft[0] + "," + -topRight[1] + ")");

    if(bubblesL != null){
        d3.transition(bubblesL)
                        .attr("class", "lcircle")
                        .attr("transform", function(d) {
                              var c = project(d)
                              x = c[0];
                              y = c[1];
                              return "translate(" + x + "," + y + ")";
                        })
        }
   
    gMap.selectAll(".pulse_circle")
                    .attr("class", "pulse_circle")
                    .attr("transform", function(d) {
                          var centroid = project(d)
                          x = centroid[0];
                          y = centroid[1];
                          return "translate(" + x + "," + y + ")";
                    })
    lFeature.attr("d", lPath);
}

function initTblSort() {
  if ($('#tbl-recordDetails') && $('#tbl-recordDetails tbody tr').length > 1) {
    $('#tbl-recordDetails').dataTable({
      "aoColumns": [null, null, null, null,null,null,null,null],
	  "aoColumnDefs": [
	          { 'bSortable': false, 'aTargets': [ 7 ] }
	       ],
      "aaSorting": [
       // [1, "desc"]
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

  function change() {
     var filterDma = $("#dma").val();
     var filterAffiliation = $("#affiliation").val();
     var filterAvailableChannel = $( "#availableChannelSlider" ).slider('values');
     var filterFacChannel = $( "#channelSlider" ).slider('values');


      data.dma.filterAll();
      data.affiliation.filterAll();
      data.availableChannel.filterAll();
      data.facChannel.filterAll();

    filterDma=="0" ? data.dma.filterAll() : data.dma.filterExact(filterDma);
     filterAffiliation=="0" ? data.affiliation.filterAll() : data.affiliation.filterExact(filterAffiliation);

     data.availableChannel.filterRange([filterAvailableChannel[0],filterAvailableChannel[1]+1]);
     data.facChannel.filterRange([filterFacChannel[0],filterFacChannel[1]+1]);


    context.clearRect(0,0,width,height);

    if (data.availableChannel.top(Infinity).length == 0){
        reset("map");
    }
    else{
       // Render the inactive stations.
        context.globalAlpha = 0.3;
        var fillColor;
        context.fillStyle = "white";
        stations.forEach(function(d) {
              context.fillRect(d.x, d.y, 2, 2);
          });

        // Render the active stations.
        context.globalAlpha = 1;
        context.fillStyle = "yellow";
        var renderSize =2;
        data.availableChannel.top(Infinity).length <1000? renderSize=3:renderSize=2;
        data.availableChannel.top(Infinity).forEach(function(d) {
              context.fillRect(d.x, d.y, renderSize, renderSize);
        })
        d3.select("#txtSelection").text(data.availableChannel.top("Infinity").length + " stations selected out of " + data.size());
        drawTable();
        d3.select("#recordSection").style("display", data.availableChannel.top("Infinity").length>filterNumber?"block":"none");
        d3.selectAll(".pulse_circle").remove();
    }
  }

// Use Leaflet to implement a D3 geographic projection.
function project(x) {
    var point = lmap.latLngToLayerPoint(new L.LatLng(x[1], x[0]));
    return [point.x, point.y];
  }

function highlight(selectedRow){
  var lat = +selectedRow.attr("data-lat"), lon = +selectedRow.attr("data-lon");
  var coord=[lon,lat];

  d3.selectAll(".pulse_circle").remove();

  if (tableRowSelected){
    lmap.fitBounds(lBounds);
  }
  else{
      selectedRow.classed('tablerowselected', true);

     bubble.selectAll(".pulse_circle").data([coord])
                .enter().append("circle")
                    .attr("class", "pulse_circle")
                    .attr("transform", function(d) {
                          var centroid = projection(d)
                          x = centroid[0];
                          y = centroid[1];
                          return "translate(" + x + "," + y + ")";
                    })
                    .each(pulse());
      gMap.selectAll(".pulse_circle").data([coord])
                .enter().append("circle")
                    .attr("class", "pulse_circle")
                    .attr("transform", function(d) {
                          var centroid = project(d)
                          x = centroid[0];
                          y = centroid[1];
                          return "translate(" + x + "," + y + ")";
                    })
                    .each(pulse()); 
      var dmaName = selectedRow.attr("data-dma");
      zoomToDma(dmaName,coord);  
  }
}

function zoomToDma(dmaName,coord){
  console.log(coord)
    if (dmaName.toUpperCase() != "UNKNOWN"){
      var dmaFeature = dmaJson.features.filter(function(d){return d.properties.DMA_NAME==dmaName});
      var dmaJsonObj = {type:"FeatureCollection",features:dmaFeature};
      console.log(dmaJsonObj)
      var dmaBound = L.geoJson(dmaJsonObj).getBounds();
      lmap.fitBounds(dmaBound)
    }else{
      lmap.setView([coord[1],coord[0]], 10);
    }

}


function pulse() {
              return function(d, i, j) {
                  //the stuff before transition() resets the
                  //attributes of the pulser when this function is
                  //called again
                  d3.select(this).attr("r", 5).style("stroke-opacity", 1.0)
                  .transition()
                  .ease("linear") //appears a lot more smoother
                  .duration(1000)
                  .attr("r",25)
                  .style("stroke-opacity", 0.0)
                  .each("end", pulse()); //lather rinse repeat
              };
          }


