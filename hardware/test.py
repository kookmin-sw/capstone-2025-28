from sensors.ens import ENSSensor
from sensors.gp2y import GP2YSensor
from sensors.mq135 import MQ135Sensor
from sensors.mq7 import MQ7Sensor
from sensors.mq4 import MQ4Sensor

from actuators.motion_detect import MotionSensor
from actuators.fan import FanController
from actuators.ultrasonic import UltrasonocController

import time
import socketio
import random
import cv2
import subprocess

DEVICE_KEY = "RPI-001"
sio = socketio.Client()
last_motion_time = 0
purifier_mode = 0
purifier_speed = 2
purifier_is_on = False
predictor_process = None

diffuser_is_on = False
diffuser_speed = 1
diffuser_period = 300
diffuser_type = 1
diffuser_mode = 0
diffuser_last_time = 0
diffuser_active = False

def minutes_to_hhmm(minutes: int) -> str:
    hours = minutes // 60
    mins = minutes % 60
    return f"{hours:02d}:{mins:02d}"

def hhmm_to_minutes(hhmm: str) -> int:
    hours, minutes = map(int, hhmm.split(":"))
    return hours * 60 + minutes

purifier_auto_on = hhmm_to_minutes("00:00")
purifier_auto_off = hhmm_to_minutes("23:00")

@sio.event
def connect():
    print("✅ Connected to server")
    sio.emit("register_device", {"device_key": DEVICE_KEY})

@sio.event
def disconnect():
    print("❌ Disconnected from server")

@sio.on("fetch_webcam_image")
def send_webcam_image():
    try:
        image = motion.picam2.capture_array()
        _, buffer = cv2.imencode('.jpg', image)
        image_bytes = buffer.tobytes()
        sio.emit("webcamImage", {"device_key": DEVICE_KEY, "image_data": image_bytes})
    except Exception as e:
        print("❌ 이미지 전송 실패:", e)

@sio.on("control")
def on_control(data):
    print("🛠️ Control signal received:", data)
    device = data.get("device")
    state = data.get("state")
    if device == "isPurifierOn":
        global purifier_speed
        global purifier_is_on
        purifier_is_on = state
        fan1.set_speed(purifier_speed if purifier_is_on else 0)
        fan2.set_speed(purifier_speed if purifier_is_on else 0)
    elif device == "purifierSpeed":
        purifier_speed = state
        fan1.set_speed(purifier_speed)
        fan2.set_speed(purifier_speed)
    elif device == "purifierAutoOn":
        global purifier_auto_on
        purifier_auto_on = state
    elif device == "purifierAutoOff":
        global purifier_auto_off
        purifier_auto_off = state
    elif device == "purifierMode":
        global purifier_mode, predictor_process
        purifier_mode = state
        if purifier_mode == 1:
            if predictor_process is None or predictor_process.poll() is not None:
                predictor_process = subprocess.Popen(["python3", "../ai/air_quality_predict.py"])
                print("공기질 예측 프로세스 실행 시작")
            else:
                print("공기질 예측 프로세스는 이미 실행 중입니다.")
        else:
            if predictor_process and predictor_process.poll() is None:
                predictor_process.terminate()
                print("🛑 공기질 예측 프로세스 종료됨")
            predictor_process = None
    elif device == "getStatus":
        sio.emit("device_status", get_current_status())
    elif device == "isDiffuserOn":
        global diffuser_is_on
        diffuser_is_on = state
    elif device == "diffuserSpeed":
        global diffuser_speed
        diffuser_speed = state
    elif device == "diffuserPeriod":
        global diffuser_period
        diffuser_period = state
    elif device == "diffuserType":
        global diffuser_type
        diffuser_type = state
    elif device == "diffuserMode":
        global diffuser_mode
        diffuser_mode = state
    else:
        print("⚠️ Unknown control device:", device)

def get_current_status():
    return {
        "isPurifierOn": purifier_is_on,
        "purifierSpeed": purifier_speed,
        "purifierAutoOn": purifier_auto_on,
        "purifierAutoOff": purifier_auto_off,
        "purifierMode": purifier_mode,
        "isDiffuserOn": diffuser_is_on,
        "diffuserSpeed": diffuser_speed,
        "diffuserPeriod": diffuser_period,
        "diffuserType": diffuser_type,
        "diffuserMode": diffuser_mode
    }

def collect_sensor_data():
    global last_motion_time
    ens_data = ens.get_data() or {}
    gp2y_data = gp2y.get_data() or {}
    mq135_data = mq135.get_data() or {}
    mq7_data = mq7.get_data() or {}
    mq4_data = mq4.get_data() or {}

    if motion.detect_motion() or last_motion_time==0:
        last_motion_time = int(time.time())

    return {
        "device_key": DEVICE_KEY,
        "air_quality_score": 100, # 승화코드에서 가져와야 함
        "air_quality": ens_data.get("air_quality", 0),
        "tvoc": ens_data.get("tvoc", 0),
        "eco2": ens_data.get("eco2", 0),
        "temp": ens_data.get("temp", 0.0),
        "humidity": ens_data.get("humidity", 0.0),

        "adc_raw": gp2y_data.get("adc_raw", 0),
        "pm25_raw": gp2y_data.get("pm25_raw", 0.0),
        "pm25_filtered": gp2y_data.get("pm25_filtered", 0.0),
        "pm10_estimate": gp2y_data.get("pm10_estimate", 0.0),

        "mq135_raw": mq135_data.get("mq135_raw", 0),
        "mq135_co2_ppm": mq135_data.get("mq135_co2_ppm", 0.0),

        "mq7_raw": mq7_data.get("mq7_raw", 0),
        "mq7_co_ppm": mq7_data.get("mq7_co_ppm", 0.0),

        "mq4_raw": mq4_data.get("mq4_raw", 0),
        "mq4_methane_ppm": mq4_data.get("mq4_methane_ppm", 0.0),

        "motionDetectedTime": last_motion_time,
        "aiRecommendation": "지금 환기하면 좋습니다! 2시간 후 미세먼지 증가 예상 됩니다.",

        "isPurifierOn": purifier_is_on,
        "purifierSpeed": purifier_speed,
        "purifierAutoOn": purifier_auto_on,
        "purifierAutoOff": purifier_auto_off,
        "purifierMode": purifier_mode,
        
        "isDiffuserOn": diffuser_is_on,
        "diffuserSpeed": diffuser_speed,
        "diffuserPeriod": diffuser_period,
        "diffuserType": diffuser_type,
        "diffuserMode": diffuser_mode
    }

# 🔹 센서 및 액추에이터 초기화
mq135 = MQ135Sensor()
mq7 = MQ7Sensor()
mq4 = MQ4Sensor()
ens = ENSSensor()
gp2y = GP2YSensor()
motion = MotionSensor(sensitivity=800, decay_rate=0.05, cooldown_time=0)
fan1 = FanController(pin=19)
fan2 = FanController(pin=13)
ultrasonic1 = UltrasonocController(pin=6)
ultrasonic2 = UltrasonocController(pin=5)

def send_sensor_loop():
    global diffuser_active, diffuser_last_time, diffuser_is_on, diffuser_period, diffuser_type, diffuser_speed
    while True:
        global purifier_is_on
        current_time = time.time()
        if purifier_mode == 0:
            now = time.localtime()
            now_str = f"{now.tm_hour:02d}:{now.tm_min:02d}"
            current_minutes = hhmm_to_minutes(now_str)

            if purifier_auto_on <= current_minutes < purifier_auto_off:
                if not purifier_is_on:
                    print("🕒 자동모드: 공기청정기 자동 켜짐")
                    # purifier_is_on = True
                    fan1.set_speed(purifier_speed)
                    fan2.set_speed(purifier_speed)
            else:
                if purifier_is_on:
                    print("🕒 자동모드: 공기청정기 자동 꺼짐")
                    # purifier_is_on = False
                    fan1.set_speed(0)
                    fan2.set_speed(0)

        data = collect_sensor_data()

        if diffuser_is_on:
            if not diffuser_active and (current_time - diffuser_last_time >= diffuser_period):
                print("💨 디퓨저 동작 시작")
                diffuser_active = True
                diffuser_last_time = current_time
                fan2.set_speed(diffuser_speed)
                if diffuser_type == 0:
                    ultrasonic1.turn_on()
                else:
                    ultrasonic2.turn_on()
            elif diffuser_active and (current_time - diffuser_last_time >= 10):
                print("💨 디퓨저 정지 및 휴식 시작")
                diffuser_active = False
                fan2.set_speed(0)
                ultrasonic1.turn_off()
                ultrasonic2.turn_off()

        # print("📤 Sending sensor data...")
        sio.emit("sensor_data", data)
        time.sleep(2)

if __name__ == "__main__":
    try:
        sio.connect("http://ec2-13-125-170-246.ap-northeast-2.compute.amazonaws.com:3001")
        # 연결 후 루프 시작
        if sio.connected:
            send_sensor_loop()
        else:
            print("❌ 소켓 연결 실패: 서버에 연결되지 않음")
    except socketio.exceptions.ConnectionError:
        print("❌ 서버에 연결할 수 없습니다.")
    except KeyboardInterrupt:
        print("🛑 종료")