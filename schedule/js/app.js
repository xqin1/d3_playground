var datapath = "data/";
var operationdata,scheduleProfiledata, organizationdata,resourcedata, scheduledata,data;
var resourceByID, operationByID, organizationByID;
var formateDate = d3.time.format("%m/%d/%Y");
var formateTime = d3.time.format("%I%p");
var commaNumFormat = d3.format(",f0");
var bounds,mapdata=[];
var organizationScale = d3.scale.linear().range([4,10]);
var  staffToolTip = CustomTooltip("station_tooltip", 200);
var stationTableRowSelected=false;
var route = {
      type: "LineString",
      coordinates: []};
var routeFeatureOnMap=null;
var routePath;

var staffMap = L.mapbox.map('staffMap', 'https://a.tiles.mapbox.com/v3/fcc.map-toolde8w.json?secure')
//'examples.map-4l7djmvo')
      .setView([39.5, -98.5], 4);
staffMap.on("viewreset", resetStaffMap);
var svgStaffMap = d3.select(staffMap.getPanes().overlayPane).append("svg").attr("id","d3overlayStaff");
var staffOverlayMap = svgStaffMap.append("g").attr("class", "leaflet-zoom-hide")

function refreshData(){
	queue()
    .defer(d3.csv, datapath + "operation.csv")
    .defer(d3.csv, datapath + "organization.csv")
    .defer(d3.csv, datapath + "scheduleprofile.csv")
    .defer(d3.csv, datapath + "resource.csv")
    .defer(d3.json, datapath + "readme-world-110m.json")
    .await(refreshReady);
}
// data loaded and processing
function refreshReady(error,operation, organization,scheduleprofile, resource,world) {
	if (error) throw error;
	operationdata = operation;
	organizationdata = organization;
	scheduleProfiledata = scheduleprofile;
	resourcedata = resource;

	 operationByID = d3.nest().key(function(d){return d.operationid}).map(operationdata);
	 resourceByID = d3.nest().key(function(d){return d.resourceid}).map(resourcedata);
	 organizationByID = d3.nest().key(function(d){return d.organizationid}).map(organizationdata);

		//populate organization dropdown box
  	d3.select("#sel-operations")
                      .selectAll("option")
                        .data(operationdata)
                        .enter()
                        .append("option")
                          .attr("value", function(d){return d.operationid})
                          .text(function(d){return d.operationdesc});
    $("#sel-operations").prepend('<option value=""></option>');
    $("#sel-operations").chosen({max_selected_options:10});
    $("#sel-operations").chosen().change(function () {
		$("#sel-operations").val() == null ? $("#operations").val('') : $("#operations").val($("#sel-operations").val().join(','));
	  });

	//populate excluded dropdown box
  	d3.select("#sel-excludedOrg")
                      .selectAll("option")
                        .data(organizationdata)
                        .enter()
                        .append("option")
                          .attr("value", function(d){return d.organizationid})
                          .text(function(d){return d.organizationcity});
    $("#sel-excludedOrg").prepend('<option value=""></option>');
    $("#sel-excludedOrg").chosen({max_selected_options:10});
    $("#sel-excludedOrg").chosen().change(function () {
		$("#sel-excludedOrg").val() == null ? $("#excludedOrg").val('') : $("#excludedOrg").val($("#sel-excludedOrg").val().join(','));
	  });

    //populate schedule list dropdown box
      	d3.select("#sel-scheduleList")
                      .selectAll("option")
                        .data(scheduleProfiledata)
                        .enter()
                        .append("option")
                          .attr("value", function(d){return d.scheduleid})
                          .text(function(d){return d.scheduleid});
                          //.text(function(d){return operationByID[d.operationid][0].name});
    // $("#sel-scheduleList").prepend('<option value="0">Select Schedule</option>');
    // $("#sel-scheduleList").chosen({max_selected_options:1});
    // $('#newOperationContent').removeClass("active");
     // $('#newScheduleContent').removeClass("active");
     // $('#scheduleContent').removeClass("active");
     //hack for dialoge box

     bounds = d3.geo.bounds(topojson.feature(world,world.objects.countries));
     routePath = d3.geo.path().projection(projectStaff);
     setTimeout(function(){
     	     $('#newOperationContent').removeClass("active");
     		 $('#newScheduleContent').removeClass("active");
     }, 50);

}


function showSchedule(scheduleid){
	queue()
		.defer(d3.csv, datapath + scheduleid + "_result.csv")
		.await(scheduleReady)
}

function scheduleReady(error, schedule){
	if (error) throw error;
	schedule.forEach(function(d){
		var dd = new Date(d.shiftstart);
		d.date = formateDate(dd);
		d.operation = operationByID[d.operationid][0].operationdesc;
		d.shifttime = formateTime(dd);
		d.shiftnum = d.shifttime=='08AM' ? "1st" :
						d.shifttime=='04PM' ? "2nd" : "3rd";
		d.costtravel = +d.costtravel;
		d.costlabor = +d.costlabor;
		d.cost_regular = +d.cost_regular;
		d.cost_overtime = +d.cost_overtime;
		d.cost_regular_night = +d.cost_regular_night;
		d.cost_regular_sunday = + d.cost_regular_sunday;
		d.cost_overtime_night = +d.cost_overtime_night;
		d.cost_overtime_sunday_night = +d.cost_overtime_sunday_night;
	});

	data = crossfilter(schedule);
	data.operation = data.dimension(function(d){return d.operation});
	data.groupByOperation = data.operation.group();

	var operationData = data.groupByOperation.top(Infinity).sort(function(a, b){ return d3.ascending(a.key, b.key)});
	d3.select("#sel-filter-operations").selectAll("option").remove();
	d3.select("#sel-filter-operations").on("change", function(e){change();})
                      .selectAll("option")
                        .data(operationData)
                        .enter()
                        .append("option")
                          .attr("value", function(d){return d.key})
                          .text(function(d){return d.key});

    change();
}

function change(){
		 var filterOperation = $("#sel-filter-operations").val();

		 data.operation.filterAll();
		 data.operation.filterExact(filterOperation);

		 getResourceData(); //draw table
}

function getResourceData(){
	var resource = d3.nest()
	           .key(function(d){return d.resourceid})
	           .entries(data.operation.top(Infinity));
	resource.forEach(function(d){
	    d.numOfShifts = d.values.length;
	    d.costtravel = d.values[0].costtravel;
	    d.costlabor = d3.sum(d.values, function(s){return s.costlabor})
	    d.cost_regular = d3.sum(d.values, function(s){return s.cost_regular})
	    d.cost_regular_night = d3.sum(d.values, function(s){return s.cost_regular_night})
	    d.cost_regular_sunday_night = d3.sum(d.values, function(s){return s.cost_regular_sunday_night})
	    d.regularsum = d.cost_regular + d.cost_regular_night + d.cost_regular_sunday_night;
	    d.cost_overtime = d3.sum(d.values, function(s){return s.cost_overtime})
	    d.cost_overtime_night = d3.sum(d.values, function(s){return s.cost_overtime_night})
	    d.cost_overtime_sunday_night = d3.sum(d.values, function(s){return s.cost_overtime_sunday_night})
	    d.overtimesum = d.cost_overtime + d.cost_overtime_night + d.cost_overtime_sunday_night;
	    d.organizationid=resourceByID[d.key][0].resourceorganization;
	  	d.organization_city = organizationByID[resourceByID[d.key][0].resourceorganization][0].organizationcity;
	  	d.latitude = +organizationByID[resourceByID[d.key][0].resourceorganization][0].latitude;
	  	d.longitude = +organizationByID[resourceByID[d.key][0].resourceorganization][0].longitude;
	    d.resourcetype = resourceByID[d.key][0].resourcetypeabbr;
    	d.resourcename = resourceByID[d.key][0].resourcename;
	})
		drawStaffTable(resource);
	mapdata=[];
	 mapdata= d3.nest()
                .key(function(d){return d.organization_city})
                .entries(resource);
    mapdata.forEach(function(d){
        d.type = "organization";
        d.name = d.key;
        d.latitude = d.values[0].latitude;
        d.longitude = d.values[0].longitude;
        d.numOfStaff = d.values.length;
    })
    organizationScale.domain([d3.min(mapdata,function(d){return d.numOfStaff}), d3.max(mapdata,function(d){return d.numOfStaff})]);
    var operationid = data.operation.top(1)[0].operationid;
    var obj={};
    obj.type="operation";
    obj.name = operationByID[operationid][0].operationdesc;
    obj.latitude = +operationByID[operationid][0].operationlatitude;
    obj.longitude = +operationByID[operationid][0].operationlongitude;
    mapdata.push(obj);
    drawStaffMap(mapdata);

      d3.selectAll(".pulse_circle").remove();
  d3.selectAll(".route").remove();


}

function drawStaffTable(d){
  d3.select("#staffContents").html("");
  var content = "", ids=[];
  if (d.length>0){
  	$("#staffDetailSection").show();
	  content += "<table id='tbl-recordDetails' class='table table-cellBorder table-hover table-striped tablesorter'><thead><tr><th><div class='sort-wrapper'>Name &nbsp;<span class='sort'></span></div></th><th><div class='sort-wrapper'>Organization &nbsp;<span class='sort'></span></div></th><th><div class='sort-wrapper'>Type &nbsp;<span class='sort'></span></div></th><th><div class='sort-wrapper'>Travel &nbsp;<span class='sort'></span></div></th><th><div class='sort-wrapper'>Labor &nbsp;<span class='sort'></span></div></th><th><div class='sort-wrapper'>Regular &nbsp;<span class='sort'></span></div></th><th class='text-right' style='padding-right: 20px'><div class='sort-wrapper'>Overtime &nbsp;<span class='sort'></span></div></th></tr></thead>";

	    content += "<tbody>";
	    for (var i = 0, length = d.length; i<length; i++) {
	    //console.log(d[i].fips + " " + getStateName(d[i].fips).abbrName)
	              content += "<tr data-lat=" + d[i].latitude + " data-lon=" + d[i].longitude + " data-resourceid='" + d[i]["key"] + "'><td>" + d[i]["resourcename"] + "</td>";
	              content += "<td>" + d[i]["organization_city"] + "</td>";
	              content += "<td>" + d[i]["resourcetype"] + "</td>";
	              content += "<td class='text-right'>$" + commaNumFormat(d[i]["costtravel"]) + "</td>";
	              content += "<td class='text-right'>$" + commaNumFormat(d[i]["costlabor"]) + "</td>";
	              content += "<td class='text-right'>$" + commaNumFormat(d[i]["regularsum"]) +  "</td>";
	              content += "<td class='text-right'>$" + commaNumFormat(d[i]["overtimesum"]) + "</td></tr>";
	             // content += "<td>" + d[i].numOfShifts + "</td></tr>";
	        } 
	    content +="</tbody></table>";

	    $("#staffContents").html(content);
	     initTblSort();

	    d3.selectAll("#tbl-recordDetails tbody tr")
        	.on("click", function(){
        		staffTableRowSelected = false;
            	if (d3.select(this).classed('tablerowselected')){
             		staffTableRowSelected = true;
            	}
             	d3.selectAll("#tbl-recordDetails tbody tr").classed('tablerowselected',false);
            	highlight(d3.select(this));
          	})
     //drawLMap(d);
	}
	else{
		$("#staffDetailSection").hide();
	}
}

function initTblSort() {
  if ($('#tbl-recordDetails') && $('#tbl-recordDetails tbody tr').length > 1) {
    $('#tbl-recordDetails').dataTable({
      "aoColumns": [null, null, null, {"sType": "currency"}, null, null, {"sType": "currency"}], //{"sType": "formatted-num", "sWidth": "85px"}
    // "aoColumnDefs": [
    //         { 'bSortable': false, 'aTargets': [ 6 ] }
    //      ],
      "aaSorting": [
        [1, "desc"]
      ],
	  "asStripeClasses":[],	  
      "bDestroy": true,
      "bFilter": false,
      "bInfo": false,
      "bPaginate": false,
      "bLengthChange": false,
    "bScrollCollapse": true,
	
    "sScrollY": ($(window).height() - 200),
    //"sScrollX": "100%",
     // "sScrollXInner": "110%"*/
    });
  }
}

function drawStaffMap(d){

  staffCircleOnStaffMap = staffOverlayMap.selectAll(".staffCircleOnStaffMap")
                      .data(d, function(d){return d.name});

  //enter
  staffCircleOnStaffMap.enter().append("circle")
  			.attr("class", "staffCircleOnStaffMap")
  			.style("fill",function(d){return d.type == "operation" ? "#d6616b" : "yellow"})
           .attr("transform", function(d){
                            var c = projectStaff([d.longitude,d.latitude]);
                            var x = c[0], y = c[1];
                            return "translate(" + x + "," + y + ")";
                          })
            .attr("r",1e-6)
           .on("mouseover", function(d){showStaffDetail(d)})
            .on("mouseout", function(d){hideStaffDetail()});

//update
  staffCircleOnStaffMap
  	  		.attr("class", "staffCircleOnStaffMap")
  			.style("fill",function(d){return d.type == "operation" ? "#d6616b" : "yellow"})
  			.on("mouseover", function(d){showStaffDetail(d)})
  			.on("mouseout", function(d){hideStaffDetail(d)})
        .transition()
          .duration(750)
          .attr("transform", function(d){
                var c = projectStaff([d.longitude,d.latitude]);
                var x = c[0], y = c[1];
                return "translate(" + x + "," + y + ")";
              })
          //.attr("r", 5)
          .attr("r", function(d){return d.type=="organization" ? organizationScale(d.numOfStaff) : 10})
         // .on("mouseover", function(d){showStationDetail(d,this)});

  //exit
  staffCircleOnStaffMap.exit()
  		  	.attr("class", "staffCircleOnStaffMap")
  			.style("fill",function(d){return d.type == "operation" ? "#d6616b" : "yellow"})
          .transition()
          .duration(750)
          .style("fill-opacity",1e-6)
          .remove();

  resetStaffMap();
}

function projectStaff(x) {
    var point = staffMap.latLngToLayerPoint(new L.LatLng(x[1], x[0]));
    return [point.x, point.y];
}

function resetStaffMap(){
    var bottomLeft = projectStaff(bounds[0]),
        topRight = projectStaff(bounds[1]);

    svgStaffMap .attr("width", topRight[0] - bottomLeft[0])
        .attr("height", bottomLeft[1] - topRight[1])
        .style("margin-left", bottomLeft[0] + "px")
        .style("margin-top", topRight[1] + "px");

    staffOverlayMap.attr("transform", "translate(" + -bottomLeft[0] + "," + -topRight[1] + ")");



    if(staffCircleOnStaffMap != null){
        d3.transition(staffCircleOnStaffMap)
                        .attr("transform", function(d) {
                              var c = projectStaff([d.longitude,d.latitude])
                              x = c[0];
                              y = c[1];
                              return "translate(" + x + "," + y + ")";
                        })
    }

    staffOverlayMap.selectAll(".pulse_circle")
                    .attr("class", "pulse_circle")
                    .attr("transform", function(d) {
                          var centroid = projectStaff(d)
                          x = centroid[0];
                          y = centroid[1];
                          return "translate(" + x + "," + y + ")";
                    })
    if (routeFeatureOnMap != null){
          routeFeatureOnMap.attr("d", routePath);
        }

   
}

function showStaffDetail(d){
  var content = "";
  if (d.type == "organization"){
    content += "<span class='name'>Organization: </span><span class='value'>" + d.name + "</span></br>";
    content += "<span class='name'>Number of Staff: </span><span class='value'>" + d.numOfStaff + "</span><br/>";
  }else{
        content += "<span class='name'>Operation: </span><span class='value'>" + d.name + "</span></br>";

  }
  

  // content += "<span class='name'>Action: </span><span class='value'>" + d.action + "</span>";
  // content += "<span class='separator'>&nbsp;|&nbsp;</span>";
  // content += "<span class='name'>Cost: </span><span class='value'>" + formatMoney(d.result_payment) + "</span>";
  staffToolTip.showTooltip(content,d3.event);
}

function hideStaffDetail(){
  staffToolTip.hideTooltip();
}

//highligh selected station
function highlight(selectedRow){
  var lat = +selectedRow.attr("data-lat"), lon = +selectedRow.attr("data-lon");
  var coord=[lon,lat];
  var endcoord =[];
  endcoord.push(mapdata[mapdata.length-1].longitude);
  endcoord.push(mapdata[mapdata.length-1].latitude);
  route.coordinates=[];
  route.coordinates.push(coord), route.coordinates.push(endcoord);

  d3.selectAll(".pulse_circle").remove();
  d3.selectAll(".route").remove();
  if (staffTableRowSelected){
    staffMap.setView([39.5, -98.5], 4);
  }
  else{
      selectedRow.classed('tablerowselected', true);
      staffOverlayMap.selectAll(".pulse_circle").data([coord])
                .enter().append("circle")
                    .attr("class", "pulse_circle")
                    .attr("transform", function(d) {
                          var centroid = projectStaff(d)
                          x = centroid[0];
                          y = centroid[1];
                          return "translate(" + x + "," + y + ")";
                    })
                    .each(pulse()); 
      // routeFeatureOnMap = staffOverlayMap.selectAll(".route").datum(route)
      //         .enter().append("path")
      //         .attr("class", "route")
      //         .attr("d", routePath);
            routeFeatureOnMap = staffOverlayMap.append("path").datum(route)
              //.enter().append("path")
              .attr("class", "route")
              //.attr("d", routePath);
    //staffMap.setView([lat, lon], 10);
    resetStaffMap();
  }

}

function unhighlight(){
  d3.selectAll(".pulse_circle").remove();
  d3.selectAll(".route").remove();
}

function pulse() {
  return function(d, i, j) {
      //the stuff before transition() resets the
      //attributes of the pulser when this function is
      //called again
      d3.select(this).attr("r", 15).style("stroke-opacity", 1.0)
      .transition()
      .ease("linear") //appears a lot more smoother
      .duration(1000)
      .attr("r",25)
      .style("stroke-opacity", 0.0)
      .each("end", pulse()); //lather rinse repeat
  };
}


refreshData();