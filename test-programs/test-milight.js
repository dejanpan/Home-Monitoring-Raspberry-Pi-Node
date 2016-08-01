var Milight = require('node-milight-promise').MilightController;
var commands = require('node-milight-promise').commands;

// Important Notes:
//    Instead of providing the global broadcast address which is the default, you should provide the IP address
//    of the Milight Controller for unicast mode. Don't use the global broadcast address on Windows as this may give
//    unexpected results. On Windows, global broadcast packets will only be routed via the first network adapter. If
//    you want to use a broadcast address though, use a network-specific address, e.g. for `192.168.0.1/24` use
//    `192.168.0.255`.

var light = new Milight({
    ip: "192.168.178.54",
    delayBetweenCommands: 75,
    commandRepeat: 2
}),
    zone = 2;

light.sendCommands(commands.rgbw.on(zone), commands.rgbw.whiteMode(zone), commands.rgbw.brightness(50));

light.pause(10000);

light.sendCommands(commands.rgbw.off(zone));

light.close().then(function () {
    console.log("All command have been executed - closing Milight");
});
console.log("Invocation of asynchronous Milight commands done");
