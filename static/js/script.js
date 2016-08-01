/* global $ */
$(document).ready(function() 
		  {
    //disable tooltips for touch-enabled screens
    if(!('ontouchstart' in document.documentElement))
	$('[data-toggle="tooltip"]').tooltip({container: 'body'});
    
    
    //properties & ui objects mappings
    var ui = {
	quality480p : $("#quality-480p"),
	quality720p : $("#quality-720p"),
	quality1080p : $("#quality-1080p"),
	alertMode : $("#alert-mode"),
	light_hallway : $("#light-hallway"),
	light_bedroom : $("#light-bedroom"),
	imgContainer : $("#img-container"),
	img : $("#image-view"),
	imgPreloader : $("#image-preloader"),
	imgTimestamp : $("#timestamp"),
	clientsList : $("#clients"),
	clientsCount : $("#clients-count"),	
    },	
	appConfig = {},
	appClients = [],
	socket = io.connect();  
    
    
    //notify server of connection
    socket.emit('connected'); 

    
    //get new image & update view
    socket.on('refresh view', function(imageData) {
	var arrayBuffer = new Uint8Array(imageData.data);
	var blob = new Blob([arrayBuffer], {type: "image/jpeg"});
	var urlCreator = window.URL || window.webkitURL;
	var imageUrl = urlCreator.createObjectURL(blob);
	
	//add image data to hidden preloader image, to avoid flicker
	//after it is preloaded, it it sent to the visible img
	ui.imgPreloader.attr('src', imageUrl);
	ui.imgTimestamp.html(imageData.timestamp);	
    });	
    ui.imgPreloader.load(function() {
	ui.img.attr('src',ui.imgPreloader.attr('src'));	
    });

    
    //set local settings with values received from server	
    socket.on('update config', function(newConfig) {
	appConfig = newConfig;
	
	//reset ui button inset (selected) effect for quality control buttons
	ui.quality480p.parent().removeClass("active");
	ui.quality720p.parent().removeClass("active");
	ui.quality1080p.parent().removeClass("active");

	
	//update ui based on values from new config
	switch(appConfig.monitoring.height) {
	case "480":
	    ui.quality480p.prop("checked", true);
	    ui.quality480p.parent().addClass("active");
	    break;
	case "720":
	    ui.quality720p.prop("checked", true);
	    ui.quality720p.parent().addClass("active");
	    break;
	case "1080":
	    ui.quality1080p.prop("checked", true);
	    ui.quality1080p.parent().addClass("active");
	    break;
	}
	ui.alertMode.prop("checked", appConfig.monitoring.alert);

	if (appConfig.lights.hallway.state != ui.light_hallway.prop("checked"))
	{
	    ui.light_hallway.bootstrapToggle('toggle');
	}

	if (appConfig.lights.bedroom.state != ui.light_bedroom.prop("checked"))
	{
	    ui.light_bedroom.bootstrapToggle('toggle');
	}

	console.log("from server ui.light_hallway.prop(checked)", ui.light_hallway.prop("checked"));

    });
    
    
    //update app clients list with new items received from server		
    socket.on('update clients', function(serverClients) {
	//update app clients count badge
	appClients = serverClients;
	ui.clientsCount.html(serverClients.length);				
	//update app clients list
	ui.clientsList.empty();
	appClients.forEach(function(item) {
	    ui.clientsList.append('<li><a href="#">' + item + '</a></li>');
	});		
    });
    
    
    //update app clients list with received Alarm state
    socket.on('alarm', function(state) {
	if(state==true)
	    ui.alertMode.parent(".btn").addClass("alarm");
	else
	    ui.alertMode.parent(".btn").removeClass("alarm");
    });
    
    
    //update alert client config object with values from associated ui object
    function ConfigUpdateAlert() {	
	appConfig.monitoring.alert = ui.alertMode.prop('checked');
	socket.emit('update config alert', appConfig);
    }

    function ConfigUpdateLight() {
	appConfig.lights.bedroom.state = ui.light_bedroom.prop('checked');
	appConfig.lights.hallway.state = ui.light_hallway.prop('checked');
	console.log("in ConfigUpdateLight()");
	socket.emit('update config light', appConfig);
    }	
    
    //bind ui objects to function associated with config settings update
    ui.alertMode.click(function(){ ConfigUpdateAlert(); });

    ui.light_hallway.change(function(){
    	ConfigUpdateLight();
    });
    
    ui.light_bedroom.change(function(){
    	ConfigUpdateLight();
    });
    
    ui.quality480p.change(function(){
	appConfig.monitoring.width = "640";
	appConfig.monitoring.height = "480";
	appConfig.monitoring.fps = 10;
	//send to server new config settings
	socket.emit('update config quality', appConfig);

    });
    ui.quality720p.change(function(){
	appConfig.monitoring.width = "1280";
	appConfig.monitoring.height = "720";
	appConfig.monitoring.fps = 2;
	//send to server new config settings
	socket.emit('update config quality', appConfig);

    });
    ui.quality1080p.change(function(){
	appConfig.monitoring.width = "1920";
	appConfig.monitoring.height = "1080";
	appConfig.monitoring.fps = 2;
	//send to server new config settings
	socket.emit('update config quality', appConfig);
    });	
    
});
