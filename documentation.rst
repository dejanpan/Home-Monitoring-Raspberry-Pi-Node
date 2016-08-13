Software part of this project is based on the excellent project of `Andrei <https://github.com/orosandrei/Home-Monitoring-Raspberry-Pi-Node>`_. That was a great jump start.

Below is a list of things that I need to thoroughly document when I get some more time (return from vacations).

-----------
Install PI
-----------
- https://www.raspberrypi.org/documentation/installation/noobs.md
- change hostname in /etc/hosts and /etc/hostname
- apt-get dist-upgrade
- apt-get install emacs
- apt-get install tmux
- git clone https://github.com/jacksonliam/mjpg-streamer.git
- sudo apt-get install cmake
- sudo apt-get install libjpeg9-dev
- sudo apt-get install python-yaml

-----------
Unsorted
-----------
- Light sensor: http://www.uugear.com/portfolio/using-light-sensor-module-with-raspberry-pi/
- Domain name and no-ip
- gpio-admin:

  - https://www.npmjs.com/package/pi-gpio
  - fix for the path: https://github.com/quick2wire/quick2wire-gpio-admin/pull/6
  - Needed to install pi-gpio version 0.0.8 because of this line: https://github.com/rakeshpai/pi-gpio/commit/c6495b0b4f3756a0ec55a6e3d98b7f71b2cb5822

- pinout: https://pinout.xyz/
- setting up vsftp: http://www.liquidweb.com/kb/how-to-install-and-configure-vsftpd-on-ubuntu-14-04-lts/
- mjpeg-streamer:  https://github.com/dejanpan/Home-Monitoring-Raspberry-Pi-Node/commit/08873e3a4a110bb7183767243f2630ab9c6e41fb
- Test programs:

  - ftp
  - test pin out
  - pir.py
  - See https://github.com/dejanpan/Home-Monitoring-Raspberry-Pi-Node/tree/master/test-programs

- Motion detection is recognised as 1
- Milight: http://iqjar.com/jar/home-automation-using-the-raspberry-pi-to-control-the-lights-in-your-home-over-wi-fi/

----------
Framework
----------
- short architecture explanation
- what is express, node-gallery, http, nodemailer, socket.ip, pi-gpio, node-milight-promise
- configuration file

-----------------------------
Home Server and Accessibility
-----------------------------
- register domain
- install client on your raspberry
- crontab job


- image streaming (mjpg-streamer)
- for computer and mobile (bootstrap)
- motion detection
- email notification about intrusion
- snapshots during intrusion (node-gallery)


- milight bulb
- milight controller
- bootstrap-toggle


- image streaming (mjpg-streamer)
- light detection
- moving awvrage window
- python and subprocess
- rsync image upload
- snapshots while the fridge was open (node-gallery)
- wideangle camera and case

-----------------------------
Are my Windows/Doors Closed?
-----------------------------
- zwave magnetic switch
- zwave stick