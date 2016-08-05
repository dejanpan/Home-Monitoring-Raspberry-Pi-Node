#!/bin/bash
# webcam video stream
# arguments:  [resolution] [port] [fps]

pkill mjpg_streamer
echo $1 $2 $3
mjpg_streamer -i "input_uvc.so -r $1 -f $2" -o "output_http.so -n -p $3"
#nohup mjpg_streamer -i "input_raspicam.so -rot 180 --width $1 --height $2 --fps $4 --quality 30" -o "output_http.so -n -p $3" &
