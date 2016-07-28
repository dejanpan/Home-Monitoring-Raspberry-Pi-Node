var Gpio = require('pi-gpio'), s_pir = 7;// s_led = 26, s_btn = 12;

function exit() {
    Gpio.close(s_pir);
    console.log("closing", s_pir);
//  Gpio.close(s_btn);
//  Gpio.close(s_led);
  
  process.exit();
}

console.log('initialized');

console.log('starting watch');

process.on('SIGINT', exit);
process.on('exit', exit);
process.on('uncaughtException', exit);

//Gpio.open(s_led, "output");

Gpio.open(s_pir, "input");

//Gpio.open(s_btn, "input", function(err){
setInterval(function () {
		// Gpio.read(s_btn, function(err, value){
		// 	if(value == 1)
		// 		Gpio.write(s_led, 1);				
		// 	else
		// 		Gpio.write(s_led, 0);
		// });				
    Gpio.read(s_pir,function(e,v){
    	if(e)
	{
	    console.log("error ", e);
    	    throw e;
	}
    	console.log("value", v);
    });
}, 500);
//})
