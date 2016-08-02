//generic Application object
//------------------------------------------------------------

function Application(appName, appPort)
{	
    this.name = appName; 

    //server setup
    this.port = appPort;
    this.express = require('express');
    this.http = require('http');
    this.path = require('path');
    this.app = this.express();
    this.io = {};
    this.staticDirPath = '/static';
    //route for viewing snapshots
    this.snapshots = '/snapshots';

    //system processes actions
    this.sys = require('sys');
    this.exec = require('child_process').exec;

    //file 
    this.fs = require('fs');
    this.ini = require('ini');

    console.log("before config in base");
    //config ini file operations
    this.Config = {
	parent: {},
	FilePath : './config.ini',
	Settings : {},
	UpdateClientsSettings : function(){			
	    //keep config in sync accross all connected clients	
	    if(this.parent.appClients.length > 0) {
		this.parent.io.sockets.emit('update config', this.Settings);
		console.log(this.parent.DateTimeNow() + "Configuration updated settings sent to all clients..");
	    }
	},
	Write : function() {
	    this.parent.fs.writeFileSync(this.FilePath, this.parent.ini.stringify(this.Settings));
	    console.log(this.parent.DateTimeNow() + 'Configuration changes written to file..');
	    this.UpdateClientsSettings();
	},
	Load : function() {
	    this.Settings = this.parent.ini.parse(this.parent.fs.readFileSync(this.FilePath,'utf-8'));
	    console.log(this.parent.DateTimeNow() + 'Configuration file settings imported..');
	}
    }
    console.log("end of base");
}


//initialize application
Application.prototype.Init = function() {
    // get app settings from local config file
    this.Config.parent = this;
    this.Config.Load();
    console.log("config ", this.Config.Settings);

    //create snapshots dir
    if (!this.fs.existsSync(__dirname + this.staticDirPath + this.snapshots)){
	this.fs.mkdirSync(__dirname + this.staticDirPath + this.snapshots);
    }
    // init express app	
    this.digest = this.auth.digest({ realm: "Private", file: __dirname + "/htdigest" });	
    this.app.use(this.auth.connect(this.digest));
    this.app.use(this.express.static(__dirname + this.staticDirPath));
    
    this.app.get("/security", function(req, res){
	res.redirect("security.html");
    });

    this.app.get("/lights", function(req, res){
	res.redirect("lights.html");
    });

    this.app.get("/fridge", function(req, res){
	res.redirect("fridge.html");
    });
    
    this.app.use(this.snapshots, require('node-gallery')({
	staticFiles :  this.staticDirPath + '/' + this.snapshots,
	urlRoot : this.snapshots,
	title : 'D&D Residence - Main Door'
    }));

    this.app.set('port', this.port);

    //init server
    this.http = this.http.createServer(this.app).listen(this.app.get('port'));
    this.io = require('socket.io')(this.http);
    console.log(this.DateTimeNow() + this.name + " server started on port " + this.app.get('port'));

    // capture exit events for cleanup
    //process is a global function and does not require "require"
    process.on('exit', this.Exit.bind("exit", this));
    process.on('SIGINT', this.Exit.bind("SIGINT", this));	 
    process.on('TERM', this.Exit.bind("TERM", this));	 
    process.on('uncaughtException', this.Exit.bind("error", this));
};


//captured exit event
Application.prototype.Exit = function(data) {	
    console.log(Application.prototype.DateTimeNow() + "Closing application Application.js < " + data + " >");
    process.exit(data);
};


// get current DateTime as formatted string
Application.prototype.DateTimeNow = function() {
    return (new Date()).toISOString().replace(/-/g,'_').replace(/:/g,'-') + "_";
};


//execution
Application.prototype.Execute = function() {	
    this.Init();	
};


module.exports = Application;

