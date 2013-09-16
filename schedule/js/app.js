	var mapContainer = $( "#map-body" )[0];
	var gmapMarkers = [];
		
	var gmap = new google.maps.Map(mapContainer, {
		disableDefaultUI: true,
		zoom: 12,
		zoomControl:true,
		mapTypeControl: true,
		//center: new google.maps.LatLng(lat, lon),
		mapTypeId: google.maps.MapTypeId.ROADMAP
	});	
function showEventLocation(lat,lon,label){
	if (gmapMarkers.length>0){
			gmapMarkers[0].setMap(null);
	}
	gmapMarkers = [];
	
	// Add a marker to the map		
	var marker = new google.maps.Marker({
				map: gmap,
				position: new google.maps.LatLng(lat, lon),	
				draggable:false,
				title: (label || "")
			});
	gmapMarkers.push(marker);
	gmap.setCenter(new google.maps.LatLng(lat, lon));
}

///////////////////////////////////////////
var operationdata,scheduleProfiledata, organizationdata;

function refreshData(){
	queue()
    .defer(d3.csv, "data/operation.csv")
    .defer(d3.csv, "data/organization.csv")
    .defer(d3.csv, "data/schedule_profile.csv")
    .await(refreshReady);
}
// data loaded and processing
function refreshReady(error,operation, organization,scheduleprofile) {
	if (error) throw error;
	operationdata = operation;
	organizationdata = organization;
	scheduleProfiledata = scheduleprofile;

	 operationByID = d3.nest().key(function(d){return d.operationid}).map(operationdata);

		//populate organization dropdown box
  	d3.select("#sel-operations")
                      .selectAll("option")
                        .data(operationdata)
                        .enter()
                        .append("option")
                          .attr("value", function(d){return d.operationid})
                          .text(function(d){return d.name});
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
                          .text(function(d){return d.name});
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
                          .attr("value", function(d){return d.profileid})
                          .text(function(d){return operationByID[d.operationid][0].name});
    // $("#sel-scheduleList").prepend('<option value="0">Select Schedule</option>');
    // $("#sel-scheduleList").chosen({max_selected_options:1});

}
refreshData();

function showSchedule(scheduleid){
	console.log(scheduleid);
}