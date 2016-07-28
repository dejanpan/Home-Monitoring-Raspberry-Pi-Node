this.fs = require('fs');
this.Ftp = require("ftp");	
this.FtpService = {};

this.FtpService = new this.Ftp();		

this.FtpService.connect({
	host: "localhost",
	port: 21,
	user: "ftpup",
	password: "ftpup"
},function(err){console.log(err);});

console.log("(!) Alert - ALARM - FTP - connecting...");

var parent = this;

this.FtpService.on('ready', function(err) {
    console.log("err ", err);
	
	console.log("(!) Alert - ALARM - FTP - uploading data..");				
	parent.fs.writeFile("./test1.jpg", "test", function(err) {
	    if(err) { return console.log("writeFile ", err); }					
	});
	
	parent.FtpService.put("./test1.jpg", "" + "test1.jpg", function(err) {
		if (!err) console.log("File transferred successfully!");
		else console.log(err);
	});				
	parent.FtpService.end();
}, parent);	
