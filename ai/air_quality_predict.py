import pandas as pd
import numpy as np
import time
import joblib
import threading
from sklearn.model_selection import train_test_split
from sklearn.preprocessing import StandardScaler
from sklearn.ensemble import RandomForestRegressor
from sklearn.metrics import mean_absolute_error, r2_score

import sys
import os
sys.path.append(os.path.abspath(os.path.join(os.path.dirname(__file__), "..", "hardware")))
from sensors.mq135 import MQ135Sensor
from sensors.mq7 import MQ7Sensor
from sensors.mq4 import MQ4Sensor
from sensors.ens import ENSSensor
from sensors.gp2y import GP2YSensor
from actuators.fan import FanController
from actuators.ultrasonic import UltrasonocController

# 센서 초기화
mq135 = MQ135Sensor()
mq7 = MQ7Sensor()
mq4 = MQ4Sensor()
ens = ENSSensor()
gp2y = GP2YSensor()
fan1 = FanController(pin=19)
fan2 = FanController(pin=13)
ultrasonic1 = UltrasonocController(pin=6)
ultrasonic2 = UltrasonocController(pin=5)

# 데이터 저장용 파일
DATA_FILE = "air_quality_data.csv"
MODEL_FILE = "air_quality_model.pkl"

sensor_data_list = []
collecting = True

# 데이터 수집 및 저장 함수
def collect_data(interval=5):
    global collecting
    while collecting:
        ens_data = ens.get_data() or {}
        gp2y_data = gp2y.get_data() or {}
        mq135_data = mq135.get_data() or {}
        mq7_data = mq7.get_data() or {}
        mq4_data = mq4.get_data() or {}
        
        record = {
            "temperature": ens_data.get("temp"),
            "humidity": ens_data.get("humidity"),
            "tvoc": ens_data.get("tvoc"),
            "eco2": ens_data.get("eco2"),
            "pm2.5": gp2y_data.get("pm25_filtered"),
            "mq4": mq4_data.get("mq4_raw"),
            "mq7": mq7_data.get("mq7_raw"),
            "mq135": mq135_data.get("mq135_raw"),
            "air_quality": ens_data.get("air_quality"),
        }
        
        sensor_data_list.append(record)
        print("Collected:", record)
        time.sleep(interval)
    
        df = pd.DataFrame([record])
        df.to_csv(DATA_FILE, mode='a', index=False, header=not pd.io.common.file_exists(DATA_FILE))
        time.sleep(interval)

# 모델 학습 함수
def train_model():
    df = pd.read_csv(DATA_FILE)
    df = df.dropna()
    
    X = df.drop(columns=[])
    y = df[["temperature", "humidity", "tvoc", "eco2", "pm2.5", "mq4", "mq7", "mq135", "air_quality"]]
    
    X_train, X_test, y_train, y_test = train_test_split(X, y, test_size=0.2, random_state=42)
    
    scaler = StandardScaler()
    X_train = scaler.fit_transform(X_train)
    X_test = scaler.transform(X_test)
    
    model = RandomForestRegressor(n_estimators=100, random_state=42)
    model.fit(X_train, y_train)

# 모델 평가
    y_pred = model.predict(X_test)
    r2 = r2_score(y_test, y_pred)

    print(f"✅ 결정 계수(R^2 Score): {r2:.2f}")
    
    joblib.dump((model, scaler), MODEL_FILE)
    print("✅ 모델 학습 완료 및 저장")

# 공기질 예측 함수
def predict_air_quality():
    if not os.path.exists(MODEL_FILE):
        print("❌ 모델 파일이 없습니다. 먼저 학습을 실행하세요!")
        return
    model, scaler = joblib.load(MODEL_FILE)

    while True:
        if sensor_data_list:
            latest_data = sensor_data_list[-1]  # 최신 센서 데이터 가져오기
   
        input_data = pd.DataFrame([[
            latest_data.get("temp", 0),
            latest_data.get("humidity", 0),
            latest_data.get("tvoc", 0),
            latest_data.get("eco2", 0),
            latest_data.get("pm2.5", 0),
            latest_data.get("mq4_raw", 0),
            latest_data.get("mq7_raw", 0),
            latest_data.get("mq135_raw", 0),
            latest_data.get("air_quality", 0),
        ]], columns=["temperature", "humidity", "tvoc", "eco2", "pm2.5", "mq4", "mq7", "mq135", "air_quality"])
    
        input_data = scaler.transform(input_data)
        prediction = model.predict(input_data)
    
        print(f"✅ 예측된 Temperature: {prediction[0][0]:.2f}, Humidity: {prediction[0][1]:.2f}, TVOC: {prediction[0][2]:.2f}, eCO2: {prediction[0][3]:.2f}, PM2.5: {prediction[0][4]:.2f}, mq4: {prediction[0][5]:.2f}, mq7: {prediction[0][6]:.2f}, mq135: {prediction[0][7]:.2f}, air_quality: {prediction[0][8]:.2f}")
        set_fan_pump_by_air_quality((prediction[0][8] - 1) / 3 * 4)
    
    time.sleep(5)

# 공기질에 따른 팬 및 펌프 제어 함수
def set_fan_pump_by_air_quality(predicted_air_quality):
    best_speed = max(0, min(4, int(round(predicted_air_quality))))

    if predicted_air_quality > 2.5:
        ultrasonic1.turn_on()
        ultrasonic2.turn_on()
    else:
        ultrasonic1.turn_off()
        ultrasonic2.turn_off()

    fan1.set_speed(best_speed)
    fan2.set_speed(best_speed)

    time.sleep(5)

    fan1.set_speed(0)
    fan2.set_speed(0)

# 실행
if __name__ == "__main__":
    # 센서 데이터 수집 스레드 실행
    sensor_thread = threading.Thread(target=collect_data, daemon=True)
    sensor_thread.start()

    # 일정 시간 후 모델 학습 실행
    time.sleep(60)  # 충분한 데이터가 수집될 시간을 확보
    train_model()

    # 실시간 공기질 예측 실행 (별도 스레드)
    prediction_thread = threading.Thread(target=predict_air_quality, daemon=True)
    prediction_thread.start()

    # 메인 스레드가 종료되지 않도록 유지
    while True:
        time.sleep(1)