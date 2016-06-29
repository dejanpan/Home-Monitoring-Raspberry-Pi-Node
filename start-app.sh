#!/bin/bash
# application start in interactive or background mode
#arguments:  [-background]

cd /home/pi/node_programs/Home-Monitoring-Raspberry-Pi-Node

if [ "$1" = "-background" ]; then
	sudo nohup node ./App-home-monitoring.js &>log.txt &
else
	sudo node ./App-home-monitoring.js 
fi

