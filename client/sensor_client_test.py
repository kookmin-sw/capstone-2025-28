import socketio
import time
import random
from datetime import datetime, timedelta

def minutes_to_hhmm(minutes: int) -> str:
    hours = minutes // 60
    mins = minutes % 60
    return f"{hours:02d}:{mins:02d}"

def hhmm_to_minutes(hhmm: str) -> int:
    hours, minutes = map(int, hhmm.split(":"))
    return hours * 60 + minutes

# 고유 디바이스 식별자
DEVICE_KEY = "RPI-001"

# 소켓 클라이언트 초기화
sio = socketio.Client()

@sio.event
def connect():
    print("✅ Connected to server")
    sio.emit("register_device", {"device_key": DEVICE_KEY})

@sio.event
def disconnect():
    print("❌ Disconnected from server")

@sio.on("control")
def on_control(data):
    print("🛠️ Control signal received:", data)
    # 예시 데이터: {"device": "isPurifierOn", "state": True}
    # 실제 하드웨어 제어 코드를 여기에 삽입
    device = data.get("device")
    state = data.get("state")
    if device in ["purifierAutoOn", "purifierAutoOff"]:
        time_str = minutes_to_hhmm(state)
        print(f"🕒 {device} 설정 → {state}분 = {time_str}")
        # 예: 900분 = 15:00

        # 여기서 실제로 scheduled task를 걸거나 로직에 반영
        # 예: 특정 시간에 전원을 켜기 위한 예약 로직
    else:
        print(f"🛠️ 제어: {device} → {state}")


# current_state = {
#     "isPurifierOn": False,
#     "isDiffuserOn": False,
#     "purifierSpeed": 1,
#     "purifierAutoOn": 0,
#     "purifierAutoOff": 0,
#     "purifierMode": 0,
#     "diffuserSpeed": 1,
#     "diffuserPeriod": 300,
#     "diffuserType": 1,
#     "diffuserMode": 0,
# }

# @sio.on("control")
# def on_control(data):
#     device = data.get("device")
#     state = data.get("state")
#     print(f"🛠️ Control signal received: {device} → {state}")

#     # 값 저장 (실제로는 여기서 하드웨어 제어도 실행)
#     if device in current_state:
#         current_state[device] = state
#         print(f"✅ {device} updated to {state}")
#     else:
#         print(f"⚠️ Unknown device: {device}")

@sio.on("fetch_webcam_image")
def send_webcam_image():
    print("📸 서버로부터 웹캠 이미지 요청 수신")
    try:
        # 실제로는 카메라에서 이미지 캡처하거나 파일 읽기
        with open("sample.jpg", "rb") as f:
            image_bytes = f.read()
            sio.emit("webcamImage", {"device_key": DEVICE_KEY, "image_data": image_bytes})
            print("✅ 이미지 전송 완료")
    except Exception as e:
        print("❌ 이미지 전송 실패:", e)

def generate_dummy_data():
    return {
        "device_key": DEVICE_KEY,
        "air_quality_score": random.randint(70, 100),
        "air_quality": random.randint(0, 500),
        "tvoc": random.randint(100, 300),
        "eco2": random.randint(400, 800),
        "temp": round(random.uniform(20.0, 25.0), 2),
        "humidity": round(random.uniform(40.0, 60.0), 2),
        "adc_raw": random.randint(0, 1023),
        "pm25_raw": random.randint(5, 40),
        "pm25_filtered": random.randint(5, 30),
        "pm10_estimate": random.randint(10, 50),
        "mq135_raw": random.randint(100, 400),
        "mq135_co2_ppm": random.randint(400, 1000),
        "mq7_raw": random.randint(100, 500),
        "mq7_co_ppm": random.randint(5, 50),
        "mq4_raw": random.randint(100, 400),
        "mq4_methane_ppm": random.randint(1000, 10000),
        "motionDetectedTime": int(time.time()),
        "aiRecommendation": "현재 공기질 양호. 환기 권장",
        "isPurifierOn": True,
        "purifierSpeed": 2,
        "purifierAutoOn": hhmm_to_minutes("03:00"),
        "purifierAutoOff": hhmm_to_minutes("03:00"),
        "purifierMode": 1,
        "isDiffuserOn": True,
        "diffuserSpeed": 1,
        "diffuserPeriod": 300,
        "diffuserType": 1,
        "diffuserMode": 0
    }

def send_sensor_loop():
    while True:
        data = generate_dummy_data()
        print("📤 Sending sensor data...")
        sio.emit("sensor_data", data)
        time.sleep(2)

if __name__ == "__main__":
    try:
        sio.connect("http://localhost:3001")
        # 연결 후 루프 시작
        if sio.connected:
            send_sensor_loop()
        else:
            print("❌ 소켓 연결 실패: 서버에 연결되지 않음")
    except socketio.exceptions.ConnectionError:
        print("❌ 서버에 연결할 수 없습니다.")