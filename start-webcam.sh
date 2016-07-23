#!/bin/bash
# webcam video stream
# arguments:  [resolution] [port] [fps]

pkill mjpg_streamer

#sudo nohup mjpg_streamer -i "input_raspicam.so -rot 180 -y -r $1 -f $3 -q 75" -o "output_http.so -n -p $2" &
#mjpg_streamer -i "input_raspicam.so -rot 180 -y -x 640 -y 480 -fps 10 -quality 30" -o "output_http.so -n -p 3334"
nohup mjpg_streamer -i "input_raspicam.so -rot 180 -y --width 640 --height 480 --fps 10 --quality 30" -o "output_http.so -n -p 3334" &
