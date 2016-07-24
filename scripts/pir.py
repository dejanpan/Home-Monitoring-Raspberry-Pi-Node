from gpiozero import MotionSensor
import time
from picamera import PiCamera
from datetime import datetime

pir = MotionSensor(4)
camera = PiCamera()
counter = 0

while True:
    # if pir.motion_detected:
    #     counter = counter + 1
    #     print("Motion detected", counter)
    #     time.sleep(0.1)
    pir.wait_for_motion()
    print("Motion detected")
    filename = datetime.now().strftime("%Y-%m-%d_%H.%M.%S.h264")
    camera.start_recording(filename)
    pir.wait_for_no_motion()
    camera.stop_recording()
    print("No Motion stopped")
