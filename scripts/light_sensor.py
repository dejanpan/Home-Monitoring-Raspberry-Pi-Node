import time
import datetime
import RPi.GPIO as GPIO
import subprocess
import sys, os
import yaml
import shutil

from PIL import Image
import glob

def print_help():
        print("""
        Usage: light_sensor.py config.yaml
        """)

def load_config(file):
        with open(file, 'r') as stream:
                try:
                        config  = yaml.load(stream)
                except yaml.YAMLError as exc:
                        print(exc)
        return config

def configure_sensor(pin):
        GPIO.setmode(GPIO.BCM)
        GPIO.setup(pin,GPIO.IN)

#bright is low, dark is high
def is_light_on():
        if GPIO.input(4) == 0:
                return True
        else:
                return False

def upload_snapshots(config, src):
        key = os.path.expanduser(config['ssh_key'])
        ssh  = 'ssh -i {}'.format(key)
        path = config['remote_path']
        print os.path.join(src,"")
        cmd = [ 'rsync', '-vaP',  '--progress', '-e', ssh,
                src, '{}@{}:{}'.format(config['user'], config['host'], os.path.join(path,"")) ]
        subprocess.check_call(cmd)

def rotate_snapshots(dirname, angle):
        for infile in glob.glob(dirname + "/*.jpg"):
                print("rotating ", infile)
                im = Image.open(infile)
                im.rotate(angle, expand=True).save(infile, 'JPEG')
        
def process(config):
        configure_sensor(config['pinout'])
        new_snapshots = False
        try:
                print("starting mjpg-streamer")
                cmd = [ config['script'], config['resolution'], str(config['fps']), str(config['port']) ]
                proc_mjpg = subprocess.Popen(cmd)
                while True:
                        if is_light_on():
                                #where to save images
                                dirname = time.strftime("%Y%m%d-%H%M%S")
                                if not os.path.exists(dirname):
                                        os.makedirs(dirname)
                                        
                                t_end = time.time() + config['snapshot_duration']

                                #grab snapshots
                                while time.time() < t_end:
                                        image_name = dirname + '/' + datetime.datetime.now().strftime("%Y%m%d-%H%M%S-%f") + '.jpg'
                                        wget_proc = subprocess.call(['wget',  'http://localhost:' + str(config['port']) + '/?action=snapshot', '-O', image_name], shell=False)
                                        time.sleep(1/config['fps'])
                                        new_snapshots = True
                                        
                        #upload them to main server (rsync)
                        if new_snapshots:
                                rotate_snapshots(dirname, config['angle'])
                                upload_snapshots(config, dirname)
                                shutil.rmtree(dirname)
                                new_snapshots = False
                        time.sleep(0.1)
        except KeyboardInterrupt:
                print("Received KeyboardInterrupt, terminating processes.")
        finally:
                if proc_mjpg is not None and proc_mjpg.poll() is None:
                        try:
                                proc_mjpg.terminate() # send terminate signal
                                proc_mjpg.communicate() # wait for the process to terminate
                                subprocess.call(['pkill', 'mjpg_streamer']) #above 2 lines do not kill mjpg-streamer                      
                        except:
                                print("Failed to terminate process with PID %s: %s" % (proc_mjpg.pid, sys.exc_info()[0]))

if __name__ == '__main__':
        if len(sys.argv) != 2:
                print_help()
                exit(-1)
        config = load_config(sys.argv[1])
        process(config)
