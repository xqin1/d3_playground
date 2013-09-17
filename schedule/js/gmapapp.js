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
