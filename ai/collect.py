import time
import os
import csv
import pandas as pd
from datetime import datetime

import sys
import os
sys.path.append(os.path.abspath(os.path.join(os.path.dirname(__file__), "..", "hardware")))
from sensors.ens import ENSSensor
from sensors.gp2y import GP2YSensor
from sensors.mq135 import MQ135Sensor
from sensors.mq7 import MQ7Sensor
from sensors.mq4 import MQ4Sensor

# 🔹 센서 및 액추에이터 초기화
mq135 = MQ135Sensor()
mq7 = MQ7Sensor()
mq4 = MQ4Sensor()
ens = ENSSensor()
gp2y = GP2YSensor()

# 🔹 장소/상황명 입력
location = input("장소 또는 상황명을 입력하세요: ").strip()
filename = f"{location}.csv"

# 🔹 기존 파일이 있는지 확인 (헤더 존재 여부 판단)
file_exists = os.path.isfile(filename)

# 🔹 1분 동안 센서 데이터 측정
print("측정 시작...\n")
start_time = time.time()
collected_data = []

while time.time() - start_time < 60:
    # ✅ 센서 데이터 읽기
    ens_data = ens.get_data() or {"ens": "N/A"}
    gp2y_data = gp2y.get_data() or {"gp2y": "N/A"}
    mq4_data = mq4.get_data() or {"mq4": "N/A"}
    mq7_data = mq7.get_data() or {"mq7": "N/A"}
    mq135_data = mq135.get_data() or {"mq135": "N/A"}
    
    # ✅ 측정된 데이터 저장
    timestamp = datetime.now().strftime("%Y-%m-%d %H:%M:%S")
    sensor_data = {
        "tvoc": ens_data.get("tvoc"),
        "eco2": ens_data.get("eco2"),
        "pm2.5": gp2y_data.get("pm25_filtered"),
        "mq4": mq4_data.get("mq4_raw"),
        "mq7": mq7_data.get("mq7_raw"),
        "mq135": mq135_data.get("mq135_raw"),
        "air_quality": ens_data.get("air_quality"),
    }
    
    collected_data.append(sensor_data)
    print(sensor_data)  # 디버깅용 출력
    time.sleep(2)  # 2초 간격으로 측정

# 🔹 측정된 데이터 CSV로 저장
df = pd.DataFrame(collected_data)

# ✅ 기존 파일이 있다면 이어서 저장, 없으면 새로 생성
if file_exists:
    df.to_csv(filename, mode='a', header=False, index=False, encoding="utf-8-sig")
else:
    df.to_csv(filename, mode='w', header=True, index=False, encoding="utf-8-sig")

print(f"\n✅ 데이터 저장 완료! {filename} 파일에 저장되었습니다.")