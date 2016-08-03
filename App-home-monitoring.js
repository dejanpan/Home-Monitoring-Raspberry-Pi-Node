var Application = require('./Application');
fs = require('fs');
var util = require('util');
require("buffertools").extend();
var nodemailer = require('nodemailer');

//extends generic Application object - add H. Monitoring specific logic
//-------------------------------------------------------------------------------------
function ApplicationHM(appName, appPort) {

    console.log("before base");
    //call base constructor
    Application.call(this,appName, appPort);
    console.log("after base");
    
    //client connections list
    this.appClients = [];
    
    //authentication
    this.auth = require("http-auth");
    this.digest = {};
    
    //streaming endpoint
    this.httpStream = require('http');
    this.optionsMjpgStreamer = {
	host: 'localhost',
	port: 3334,
	path: '/?action=stream',
	//path: '/?action=snapshot&n',
	method: 'GET',
	protocol: 'http:',
	slashes: true,
	search: '?action=stream',
	query: 'action=stream',
	pathname: '/',
	href: 'http://localhost:3334/?action=stream'
	//headers: {'Transfer-Encoding': 'chunked','Connection':'close', 'Content-Type': 'video/webm'}		
    };

    //Gpio & Hardware
    this.Gpio = require('pi-gpio');
    //this.Hardware = { MotionSensor : 8, Led : 26, Button : 12 };
    this.Hardware = { MotionSensor : 7 };

    //lights
    this.Milight = require('node-milight-promise').MilightController;
    this.commands = require('node-milight-promise').commands;

    //sms service twilio 
    //	this.SmsAPI = require('twilio');
    //	this.SmsService = {};	
    // create reusable transporter object using the default SMTP transport
    
    this.emailService = {};
    this.emailOptions = {};


    //ftp 
    //this.Ftp = require("ftp");
    //this.FtpService = {};

    this.Light = {
	parent : {},
	name : null,
	zone : 1,
	state : 0,
	milight: null,
	On : function(z, state){
	    var parent = this.parent;
	    this.milight.sendCommands(parent.commands.rgbw.on(z), parent.commands.rgbw.whiteMode(z), parent.commands.rgbw.brightness(100));
	},
	
	Off : function(z, state){
	    var parent = this.parent;
	    this.milight.sendCommands(parent.commands.rgbw.off(z));
	}
    };//end Light mode
    
    //alert mode and alarm
    this.AlertMode = {
    	parent : {},
    	Active : false,
    	ActiveMotionSensor : false, //needed for the motion start delay 
    	AlarmTimeSpan : 0.25, //minutes - in this time span, the latest webcam snapshots are uploaded to FTP
    	AlarmTimer : {},		
    	StartupTimeout : {}, //timer for motion sensor start delay	
    	AlarmTriggered : false,
    	AlarmSensitivity : 3, //max counter for reducing false alarms; only trigger real alarm when this limit is reached
    	AlarmCounter : 0, //consecutive alarm triggers
    	MotionStartDelay : 10000, //10 seconds
    
    	Deactivate : function(){
    	    var parent = this.parent;
    	    this.Active = false;
    	    this.ActiveMotionSensor = false;
    	    this.AlarmCounter = 0;
    	    clearTimeout(this.StartupTimeout);
    	    parent.Config.Settings.monitoring.alert = this.Active;
    	 //   parent.Gpio.write(parent.Hardware.Led, 0);				
    	    parent.io.sockets.emit('alarm', false);
    	    console.log(parent.DateTimeNow() + "(!) Alert - Mode - Inactive");			
    	},		
    
    	Activate : function() {
    	    var parent = this.parent;
    	    this.Active = true;			
    	    this.ActiveMotionSensor = false;		
    	    this.AlarmCounter = 0;
    	    parent.Config.Settings.monitoring.alert = this.Active;
    	    //parent.Gpio.write(parent.Hardware.Led, 1); // led	on
    
    	    //10 seconds delay so that the person can exit the sensor range	
    	    console.log(parent.DateTimeNow() + "(i) Alert - motion detection starts in 10 seconds..");
    	    this.StartupTimeout = setTimeout(function(){
    		parent.AlertMode.ActiveMotionSensor = true;				
    		console.log(parent.DateTimeNow() + "(i) Alert - Mode - Active");
    	    }, this.MotionStartDelay, parent);			
	},	
    
	UpdateState : function(alert){
    	    if(alert == true)
    		this.Activate();					
    	    else 
    		this.Deactivate();					
	},
    
    	AlarmNotify : function(){							
    	    var parent = this.parent;
    	    this.AlarmCounter += 1; 							
    	    //clear AlarmCounter if the motion detection was considered fake
    	    setTimeout(function(){
    		if(parent.AlertMode.AlarmTriggered == false && parent.AlertMode.Active == true){
    		    parent.AlertMode.AlarmCounter = 0;
    		    console.log(parent.DateTimeNow() + "(i) Alert - motion detection - reset false+ counter");
    		}
    	    },5000, parent); // 5 seconds - interval in which max motion detection counter needs to be reached or exceeded
    
     	    console.log(parent.DateTimeNow() + "(!) Alert - motion detected (" + parent.AlertMode.AlarmCounter + "/" + parent.AlertMode.AlarmSensitivity + "max)");
    
    	    if(this.AlarmCounter >= this.AlarmSensitivity && this.Active == true) {
    		this.AlarmTriggered = true;									
    		//disable motion detection for predefined AlarmTimeSpan
    		this.ActiveMotionSensor = false;	
    		this.AlarmCounter = 0;
    		//notify connected clients than Alarm is enabled
    		if(parent.appClients.length > 0)
    		    parent.io.sockets.emit('alarm', true);
    
    		//reenable motion detection after the predefined Alarm TimeSpan
    		setTimeout(function(){
    		    parent.AlertMode.AlarmTriggered = false; //suspend alarm
    		    clearInterval(parent.AlertMode.AlarmTimer); //stop snapshot writting
    		    //parent.FtpService.end(); //close ftp connection					
    		    parent.AlertMode.ActiveMotionSensor = true;
    		    parent.AlertMode.AlarmCounter = 0;					

    				//notify connected clients that Alarm is over
    		    if(parent.appClients.length > 0) {
    			parent.io.sockets.emit('alarm', false);
    		    }
    		    else{
    			//stop webcam and hallways light if no client connected & alarm over
    			parent.Webcam.Stop();
    		    }
    		    parent.Light.Off(1, false);
    		    console.log(parent.DateTimeNow() + "(i) Alert - Alarm over");
    		}, this.parent.AlertMode.AlarmTimeSpan * 60000, parent); //timespan is in minutes so we convert to ms
    
    		//turn on webcam streaming if not already started and light in hallway
    		if(this.parent.Webcam.Active == false)
		{
    		    this.parent.Webcam.Start();
		}
		
		this.parent.Light.On(1, true);
		// 			//send sms notification
		// 			//init sms service
		// 			this.parent.SmsService = new this.parent.SmsAPI(this.parent.Config.Settings.sms.sid, this.parent.Config.Settings.sms.token); 
		// 			this.parent.SmsService.messages.create({ 
		// 				to: this.parent.Config.Settings.sms.to, 
		// 				from: this.parent.Config.Settings.sms.from, 
		// 				body: "ALARM - Home Monitoring",   
		// 			});
		// 			console.log(this.parent.DateTimeNow() + "(!) Alert - ALARM - sms notification sent");
    
		// 			// upload data from streaming buffer to FTP
		this.parent.emailService = nodemailer.createTransport('smtps://' + this.parent.Config.Settings.email.user + '%40gmail.com:' + this.parent.Config.Settings.email.password + '@smtp.gmail.com');
		// setup e-mail data with unicode symbols
		this.parent.emailOptions = {
		    from: this.parent.Config.Settings.email.from,
		    to: this.parent.Config.Settings.email.to,
		    subject: this.parent.Config.Settings.email.subject, // Subject line 
		    text: this.parent.Config.Settings.email.text
		};
		
		this.parent.emailService.sendMail(this.parent.emailOptions, function(error, info){
		    if(error)
		    {
			console.log(error);
		    }
		    console.log('Message sent: ' + info.response);
		});
		
		//write snapshots into static folder
		var foldername = parent.DateTimeNow();
		console.log(parent.DateTimeNow() + "Saving data to " + foldername);			
    		    parent.AlertMode.AlarmTimer = setInterval(function(){	
    			if(parent.Webcam.StreamingBuffer.length > 0)
			{
			    if (!parent.fs.existsSync(__dirname + parent.staticDirPath + parent.snapshots + parent.door_snapshots + '/' + foldername)){
				parent.fs.mkdirSync(__dirname + parent.staticDirPath  + parent.snapshots +  parent.door_snapshots + '/' + foldername);
			    }
    			    var frame = parent.Webcam.StreamingBuffer.pop().data;
			    var filename = parent.DateTimeNow() + ".jpg";
			    console.log("frame: ", filename);
			    parent.fs.writeFile(__dirname + parent.staticDirPath  + parent.snapshots +  parent.door_snapshots + '/' + foldername + '/' + filename, frame, function(error){
				if (error) {
				    console.error("write error:  " + error.message);
				} else {
				    console.log("Successful Write to " + __dirname + parent.staticDirPath  + parent.snapshots +  parent.door_snapshots + '/' + foldername + '/' + filename);
				}
			    }
					       );
    			}
    		    },100, parent); //0.1 second for each file write
		
    	// 	this.parent.FtpService = new this.parent.Ftp();	
//     		this.parent.FtpService.connect({
//     		    host: this.parent.Config.Settings.ftp.server,
//     		    port: this.parent.Config.Settings.ftp.port,
//     		    user: this.parent.Config.Settings.ftp.user,
//     		    password: this.parent.Config.Settings.ftp.pass,
//     		    keepalive: 10000
// //		    console.log("ftp ", host, port, user, password);
//     		});
//     		console.log(this.parent.DateTimeNow() + "(!) Alert - ALARM - FTP - connecting...");			
    
//     		this.parent.FtpService.on('ready', function() {
//     		    console.log(parent.DateTimeNow() + "(!) Alert - ALARM - FTP - uploading data..");			
//     		    parent.AlertMode.AlarmTimer = setInterval(function(){	
//     			if(parent.Webcam.StreamingBuffer.length > 0)
// 			{
//     			    var frame = parent.Webcam.StreamingBuffer.pop().data;
// 			    var filename = parent.DateTimeNow() + ".jpg";
// 			    console.log("frame: ", filename);
// 			    parent.FtpService.put(frame, filename, function(err){
//     				if(err) {
//     				    console.log(parent.DateTimeNow() + "Error - Alarm Mode - Alarm Notify - FTP > " + err);  
//     				    parent.FtpService.destroy();							
//     				}
//     			    });	
//     			}
//     		    },200, parent); //0.2 second for each file upload						
//     		}, parent);
		
//     		this.parent.FtpService.on('error', function(err) {
//     		    console.log(parent.DateTimeNow() + "(!) Error > FTP > " + err);			
//     		    parent.FtpService.destroy();
//     		}, parent);
    	    }
    	}
    }; //end AlertMode 

    
    //webcam setup
    this.Webcam = {		
	parent : {},
	StreamingBuffer : [],
	Active: false,	
	hd : {},
	buffer: null,
	reading: false,
	bytesWritten: 0,
	contentLength: null,

	Stop: function() {
	    this.parent.exec("sudo pkill mjpg_streamer");
	    this.Active = false; 
	    this.StreamingBuffer.length = 0;		
	    console.log(this.parent.DateTimeNow() + "Webcam stopped..");			
	},		
	Start: function() {
	    var ref = {root:this.parent, parent:this};	
	    
	    //make sure streaming not already running & cleanup existing frames from buffer
	    this.StreamingBuffer.length = 0;
	    //make sure webcam is not already running
	    if(this.Active == true) {
		return;
		//this.parent.exec("sudo pkill mjpg_streamer");
	    }

	    var lengthRegex = /Content-Length:\s*(\d+)/i;
	    // Start of Image
	    var soi = new Buffer(2);
	    soi.writeUInt16LE(0xd8ff, 0);
	    
	    // End of Image
	    var eoi = new Buffer(2);
	    eoi.writeUInt16LE(0xd9ff, 0);

	    var	oldBufferType = process.version.split('.')[0] === 'v0';
	    
	    //start webcam video
	    var port = this.parent.optionsMjpgStreamer.port;
	    var width = this.parent.Config.Settings.monitoring.width;
	    var height = this.parent.Config.Settings.monitoring.height;
	    var fps = this.parent.Config.Settings.monitoring.fps;
	    var child = this.parent.exec("./start-webcam.sh " + width + " " + height + " " + port + " " + fps);
	    child.stdout.on('data', function(data) {
		console.log('stdout: ' + data);
	    });
	    child.stderr.on('data', function(data) {
		console.log('stdout: ' + data);
	    });
	    this.Active = true;
	    console.log(this.parent.DateTimeNow() + "Webcam view streaming started..");

	    //get streaming data		
	    setTimeout(function(){ 		
		ref.root.httpStream.get(ref.root.optionsMjpgStreamer, function(res) {
		    
		    res.on("data", function(newFrame) {
//			console.log("newFrame len ", newFrame.length);
			var start = newFrame.indexOf(soi);
			var end = newFrame.indexOf(eoi);
			var len = (lengthRegex.exec(newFrame.toString('ascii')) || [])[1];
			
			if (ref.parent.buffer && (ref.parent.reading || start > -1)) {
			    //TODO: factor into below function
			    //			    this._readFrame(chunk, start, end);
			    var bufStart = start > -1 && start < end ? start : 0;
			    var bufEnd = end > -1 ? end + eoi.length : newFrame.length;
			    
			    if (oldBufferType) {
			    	ref.parent.buffer = ref.parent.buffer.concat(newFrame.slice(bufStart, bufEnd));
			    } else {
				newFrame.copy(ref.parent.buffer, ref.parent.bytesWritten, bufStart, bufEnd);
			    }
			    
			    ref.parent.bytesWritten += bufEnd - bufStart;
			    
			    if (end > -1 || ref.parent.bytesWritten === ref.parent.contentLength)
			    {
				//this._sendFrame();
				ref.parent.reading = false;
				//				console.log(util.inspect(ref.parent.buffer, true, 3));
				if (ref.parent.Active == true)
				{
//				    console.log("buffer len ", ref.parent.buffer.length);
				    var frameData = {timestamp: ref.root.DateTimeNow(), data: ref.parent.buffer};
				    if(ref.root.appClients.length > 0)
				    {
					ref.root.io.sockets.emit("refresh view", frameData);
				    }
				    
				    //add new frame to buffer only if AlertMode is enabled
				    if(ref.root.AlertMode.Active == true && ref.root.AlertMode.AlarmTriggered == true)
					ref.parent.StreamingBuffer.push(frameData);
				}
			    }
			    else
			    {
				ref.parent.reading = true;
			    }
			}
			
			if (len) {
			    //   this._initFrame(+len, chunk, start, end);
			    ref.parent.contentLength = +len; //+len converts it to numeric representation
			    ref.parent.buffer = new Buffer(+len);
			    if (oldBufferType)
			    {
			    	ref.parent.buffer = new Buffer(0);
			    }
			    // Fill the buffer so we don't leak random bytes
			    // more info: https://nodejs.org/api/buffer.html#buffer_new_buffer_size
			    ref.parent.buffer.fill(0);
			    ref.parent.bytesWritten = 0;

			    var hasStart = typeof start !== 'undefined' && start > -1;
			    var hasEnd = typeof end !== 'undefined' && end > -1 && end > start;

			    if (hasStart) {
				var bufEnd2 = newFrame.length;

				if (hasEnd) {
				    bufEnd2 = end + eoi.length;
				}
				
				if (oldBufferType) {
				    ref.parent.buffer = ref.parent.buffer.concat(newFrame.slice(start, bufEnd2));
				} else {
				    newFrame.copy(ref.parent.buffer, 0, start, bufEnd2);
				}

				ref.parent.bytesWritten = newFrame.length - start;
				// If we have the eoi bytes, send the frame
				if (hasEnd) {
				    //this._sendFrame();
				    ref.parent.reading = false;

				    if (ref.parent.Active == true)
				    {
//					console.log("buffer len ", ref.parent.buffer.length);
					var frameData = {timestamp: ref.root.DateTimeNow(), data: ref.parent.buffer};
					if(ref.root.appClients.length > 0)
					{
					    ref.root.io.sockets.emit("refresh view", frameData);
					}
					
					//add new frame to buffer only if AlertMode is enabled
					if(ref.root.AlertMode.Active == true && ref.root.AlertMode.AlarmTriggered == true)
					    ref.parent.StreamingBuffer.push(frameData);
				    }

				} else {
				    ref.parent.reading = true;
				}
			    }
			}
		    }); //end on data
		    res.on('end', function()
			   {
			console.log('In end.');
		    }
			  );
		    res.on("end", function(err){
			console.log(ref.root.DateTimeNow() + "Webcam HttpStreaming GET ended..");
		    });
		    res.on("error", function(err){
			console.log(ref.root.DateTimeNow() + "Error > HttpStream 1 > " + err);
		    });
		}).on("error", function(err) { 
		    console.log(ref.root.DateTimeNow() + "Error > HttpStream 2 > " + err);
		});
	    },1000, ref); //delay to make sure webcam had time to init			
	},		
	Restart : function() {
	    this.Stop();
	    this.Start();
	}
    };
    console.log("end of App-home-monitoring constructor");
};


//extend generic Application object
ApplicationHM.prototype = Object.create(Application.prototype);


//init
ApplicationHM.prototype.Init = function() {	
    //call base init function
    Application.prototype.Init.call(this);
    
    var parent = this;		
    this.AlertMode.parent = this;
    this.Webcam.parent = this;
    this.Light.parent = this;
    this.Light.milight = new this.Milight({
	ip: parent.Config.Settings.lights.ip,	
	delayBetweenCommands:  parent.Config.Settings.lights.delayBetweenCommands,
	commandRepeat:  parent.Config.Settings.lights.commandRepeat
    });
    //var alert = parent.Config.Settings.monitoring.alert;	
    
    //Hardware
    //init
    // console.log(parent.DateTimeNow() + "(init) hardware");
    // this.Gpio.open(this.Hardware.Led, "output", function(){		
    // 	var ledStatus = (alert == true) ? 1:0;	//alert mode	
    // 	parent.Gpio.write(parent.Hardware.Led, ledStatus);
    // });
    
    this.Gpio.open(this.Hardware.MotionSensor, "input", function(err){
    	setInterval(function(){ 
    	    parent.Gpio.read(parent.Hardware.MotionSensor, function(error,value){
//		console.log("value: ", value);
    		if(parent.AlertMode.Active == true && parent.AlertMode.ActiveMotionSensor == true && value == 1){					
    		    console.log(parent.DateTimeNow() + "(!) Alert - PIR - motion detected");
    		    //send sms notification & upload video frames
    		    parent.AlertMode.AlarmNotify(); 
    		}				
    	    });
    	}, 500); //pir motion sensor check frequency
    });
    
    // 	//toggle enable or disable Alert Mode with the physical button
    // 	this.Gpio.open(this.Hardware.Button, "input", function(err){
    // 		setInterval(function () {
    // 			//check button pressed status
    // 			parent.Gpio.read(parent.Hardware.Button, function(err, value){
    // 				//if button pressed
    // 				if(value == 1) {
    // 					console.log(parent.DateTimeNow() + "(i) Button pressed");
    // 					parent.Config.Settings.monitoring.alert = !parent.Config.Settings.monitoring.alert;
    // 					parent.Config.Write();
    // 					parent.AlertMode.UpdateState(parent.Config.Settings.monitoring.alert);					
    // 				}							
    // 			});	
    // 		}, 200);
    // 	});
    
    //init Alert if setting is active
    console.log(parent.DateTimeNow() + "(init) alert mode status check");
    parent.AlertMode.UpdateState(parent.Config.Settings.monitoring.alert);
};


//client communication handling
ApplicationHM.prototype.ClientsListen = function() {	
    console.log(this.DateTimeNow() + "Listening for Client connections");
    var parent = this;

    this.io.sockets.on('connection', function(socket) {	
	//add new client to list
	var client = socket.handshake;
	parent.appClients.push(parent.DateTimeNow() + client.address);
	console.log(parent.DateTimeNow() + "Client Connected < " + client.address + " > ");
	
	//if Alarm is active, show in client UI
	if(parent.AlertMode.AlarmTriggered == true)
	    parent.io.sockets.emit('alarm', true);
	
	//send config settings to new client
	socket.emit('update config', parent.Config.Settings);
	
	//notify all connected clients to update app clients list
	parent.io.sockets.emit('update clients', parent.appClients);
	console.log(parent.DateTimeNow() + "Client Connected - sending clients list > " + parent.appClients.length);		
	
	//start webcam if not already running
	if(parent.Webcam.Active == false) {
	    console.log(parent.DateTimeNow() + "Single client connected.. starting webcam");
	    parent.Webcam.Start();
	}

	socket.on('disconnect', function() {
	    //remove client from list
	    parent.appClients.splice(parent.appClients.indexOf(client),1);		
	    console.log(parent.DateTimeNow() + "Client Disconnected < " + client.address + " > ");		
	    
	    //stop webcam capture if no clients connected & alert mode is inactive
	    if(parent.appClients.length === 0 && parent.AlertMode.AlarmTriggered == false) {
		console.log(parent.DateTimeNow() + "Last client disconnect - killing webcam process..");
		if(parent.Webcam.Active == true)
		{
		    parent.Webcam.Stop();
		}
	    }
	    if(parent.appClients.length > 0){
		//if there are other clients connected, send them the updated clients list
		parent.io.sockets.emit('update clients', parent.appClients);
	    }
	});

	socket.on('update config quality', function(newConfig) {
	    //update .ini file
	    console.log("newConfig ", newConfig);
	    console.log(parent.DateTimeNow() + "Configuration <quality> changed by client..");
	    parent.Config.Settings = newConfig;
	    parent.Config.Write();	
	    
	    //apply new quality settings
	    parent.Webcam.Restart();	
	});

	socket.on('update config alert', function(newConfig) {
	    //update .ini file			
	    console.log(parent.DateTimeNow() + "Configuration <alert mode> changed by client..");
	    parent.Config.Settings = newConfig;
	    parent.Config.Write();	
	    
	    //apply new alarm settings
	    parent.AlertMode.UpdateState(parent.Config.Settings.monitoring.alert);		
	});

	socket.on('update config light', function(newConfig) {
	for (var key in newConfig.lights.rooms)
	{
	    console.log(parent.DateTimeNow() + " " + newConfig.lights.rooms[key].name + " light zone " + newConfig.lights.rooms[key].zone + " light state " + newConfig.lights.rooms[key].state);
	    if (newConfig.lights.rooms[key].state)
	    {
		parent.Light.On(newConfig.lights.rooms[key].zone, newConfig.lights.rooms[key].state);
	    }
	    else
	    {
		parent.Light.Off(newConfig.lights.rooms[key].zone, newConfig.lights.rooms[key].state);
	    }
        }
	    parent.Config.Settings = newConfig;
	    parent.Config.Write();	
	    
	});

	socket.on('error', function(err) {
	    console.log(parent.DateTimeNow() + "Error > Socket > " + err);
	    socket.destroy();
	});
    });
};


//execution
ApplicationHM.prototype.Execute = function() {	
    //call base Execute function
    Application.prototype.Execute.call(this);
    //listen for incoming client connections & messages
    this.ClientsListen();	
};



//cleanup before exitting app - stop all webcam captures & close gpios
ApplicationHM.prototype.Exit = function(parent, data, err) {
    if(err)
	console.log(parent.DateTimeNow() + "Closing application err < " + err + " >");	
    if(data)
	console.log(parent.DateTimeNow() + "Closing application < " + data + " >");	
    //kill webcam server
    parent.exec("sudo pkill mjpg_streamer");	
    //reset states
    parent.AlertMode.Active = false;
    parent.AlertMode.ActiveMotionSensor = false;
    parent.AlertMode.AlarmCounter = 0;
    parent.AlertMode.AlarmTriggered = false;
    parent.Webcam.Active = false;	
    //disable hardware & exit
    parent.Gpio.close(parent.Hardware.MotionSensor);
    //destroy Milight object
    console.log("Destroying milight");
    parent.Light.milight.close().then(function () {
    	console.log("All command have been executed - closing Milight");
    });
    //parent.Gpio.close(parent.Hardware.Button);		
    //parent.Gpio.write(parent.Hardware.Led, 0, function(){		
    //parent.Gpio.close(parent.Hardware.Led);
    //  exit
    console.log(parent.DateTimeNow() + " Closing application App-home-monitoring.js");	
    process.exit(0);
    // 	});	
};


//init app
var HomeMonitoring = new ApplicationHM('Home Monitoring', 3333);
//start
HomeMonitoring.Execute();
