import pandas as pd
import numpy as np
import math
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
CLASS_MODEL_FILE = "smell_classification_model.pkl"
REG_MODEL_FILE = "air_quality_regression_model.pkl"

sensor_data_list = []
collecting = True

# 데이터 수집 및 저장 함수
def collect_data(interval=5):
    global collecting

    if os.path.exists(CLASS_MODEL_FILE):
        class_model, class_scaler = joblib.load(CLASS_MODEL_FILE)
        smell_labels = ["✅ 좋음", "⚠️ 보통", "🚨 나쁨"]
        print("✅ 냄새 분류 모델 로드 완료")
    else:
        class_model = None
        print("⚠️ 냄새 분류 모델이 없어 냄새 예측을 건너뜁니다")

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
            "air_quality": max(1, ens_data.get("air_quality")),
        }

        smell_level = None
        if class_model:
            class_input_data = pd.DataFrame([[
                record.get("tvoc", 0),
                record.get("eco2", 0),
                record.get("pm2.5", 0),
                record.get("mq4", 0),
                record.get("mq7", 0),
                record.get("mq135", 0),
            ]], columns=["tvoc", "eco2", "pm2.5", "mq4", "mq7", "mq135"])

            scaled_input = class_scaler.transform(class_input_data)
            smell_prediction = class_model.predict(scaled_input)[0]
            smell_level = smell_labels[smell_prediction]

            record["smell_level"] = smell_prediction

        else:
            record["smell_level"] = 0

        sensor_data_list.append(record)
        print("Collected:", record)
        if smell_level:
            print(f"👃 smell: {smell_level}")

        calculate_air_quality_score(record)
    
        df = pd.DataFrame([record])
        df.to_csv(DATA_FILE, mode='a', index=False, header=not os.path.exists(DATA_FILE))
        
        time.sleep(interval)

# 종합 공기질 점수 계산 함수
def calculate_air_quality_score(record):

    base_score = 100

    tvoc = record["tvoc"]
    eco2 = record["eco2"]
    pm25 = record["pm2.5"]
    mq4 = record["mq4"]
    mq7 = record["mq7"]
    mq135 = record["mq135"]
    smell = record["smell_level"]

    mq4_penalty_score = min(100, ((mq4 - 30000) / 65535) * 100)
    mq7_penalty_score = min(100, ((mq7 - 10000) / 65535) * 100)
    mq135_penalty_score = min(100, (mq135 - 3000 / 65535) * 100)
    pm25_penalty_score = min(100, pm25 - 20)
    tvoc_penalty_score = min(100, tvoc / 5)
    eco2_penalty_score = min(100, ((eco2 - 400) / 20))
    smell_penalty_score = min(100, smell * 30)

    air_quality_score = base_score - (
        mq4_penalty_score * 0.15 +
        mq7_penalty_score * 0.15 +
        mq135_penalty_score * 0.15 +
        pm25_penalty_score * 0.15 +
        tvoc_penalty_score * 0.15 +
        eco2_penalty_score * 0.15 +
        smell_penalty_score * 0.10
    )

    air_quality_score = int(max(0, min(100, round(air_quality_score))))
    print("🔔 종합공기질 점수: ", air_quality_score)
    print()
    time.sleep(5)

# 모델 학습 함수
def train_regression_model():
    df = pd.read_csv(DATA_FILE)
    df = df.dropna()
    
    feature_columns = ["temperature", "humidity", "tvoc", "eco2", "pm2.5", "mq4", "mq7", "mq135", "air_quality", "smell_level"]
    X = df[feature_columns]
    y = df[feature_columns]
    
    X_train, X_test, y_train, y_test = train_test_split(X, y, test_size=0.2, random_state=42)
    
    scaler = StandardScaler()
    X_train = scaler.fit_transform(X_train)
    X_test = scaler.transform(X_test)
    
    model = RandomForestRegressor(n_estimators=100, random_state=42)
    model.fit(X_train, y_train)

# 모델 평가
    y_pred = model.predict(X_test)
    r2 = r2_score(y_test, y_pred)

    print(f"✅ 공기질 예측 모델 결정 계수(R^2 Score): {r2:.2f}")
    
    joblib.dump((model, scaler), REG_MODEL_FILE)
    print("✅ 공기질 예측 모델 학습 완료 및 저장")

# 공기질 예측 함수
def predict_air_quality():
    if not os.path.exists(REG_MODEL_FILE):
        print("❌ 모델 파일이 없습니다. 먼저 학습을 실행하세요!")
        return
    
    reg_model, reg_scaler = joblib.load(REG_MODEL_FILE)

    while True:
        if sensor_data_list:
            latest_data = sensor_data_list[-1]  # 최신 센서 데이터 가져오기
   
        input_data = pd.DataFrame([[
            latest_data.get("temperature", 0),
            latest_data.get("humidity", 0),
            latest_data.get("tvoc", 0),
            latest_data.get("eco2", 0),
            latest_data.get("pm2.5", 0),
            latest_data.get("mq4", 0),
            latest_data.get("mq7", 0),
            latest_data.get("mq135", 0),
            latest_data.get("air_quality", 0),
            latest_data.get("smell_level", 0),
        ]], columns=["temperature", "humidity", "tvoc", "eco2", "pm2.5", "mq4", "mq7", "mq135", "air_quality", "smell_level"])

        reg_input = reg_scaler.transform(input_data)
        air_quality_prediction = reg_model.predict(reg_input)[0]

        predicted_temperature = air_quality_prediction[0]
        predicted_humidity = air_quality_prediction[1]
        predicted_tvoc = air_quality_prediction[2]
        predicted_eco2 = air_quality_prediction[3]
        predicted_pm25 = air_quality_prediction[4]
        predicted_mq4 = air_quality_prediction[5]
        predicted_mq7 = air_quality_prediction[6]
        predicted_mq135 = air_quality_prediction[7]
        predicted_air_quality = air_quality_prediction[8]
        predicted_smell = air_quality_prediction[9]
    
        print(f"✅ 예측된 Temperature: {predicted_temperature:.2f}, Humidity: {predicted_humidity:.2f}, TVOC: {predicted_tvoc:.2f}, eCO2: {predicted_eco2:.2f}, PM2.5: {predicted_pm25:.2f}, mq4: {predicted_mq4:.2f}, mq7: {predicted_mq7:.2f}, mq135: {predicted_mq135:.2f}, air_quality: {predicted_air_quality:.2f}, smell: {predicted_smell:.2f}")
        set_fan_pump_by_air_quality(predicted_air_quality, predicted_smell)
    
        time.sleep(5)

# 공기질에 따른 팬 및 펌프 제어 함수
def set_fan_pump_by_air_quality(predicted_air_quality, predicted_smell):
    best_speed = (predicted_air_quality - 1) / 3 * 4
    best_speed = max(0, min(4, int(round(best_speed))))

    fan1.set_speed(best_speed) # 공기청정 팬 작동

    if predicted_smell > 1:
        ultrasonic1.turn_on()
        ultrasonic2.turn_on()
        fan2.set_speed(2)
    else:
        ultrasonic1.turn_off()
        ultrasonic2.turn_off()
        fan2.set_speed(0)

    print()
    time.sleep(5)

# 실행
if __name__ == "__main__":
    # 센서 데이터 수집 스레드 실행
    sensor_thread = threading.Thread(target=collect_data, daemon=True)
    sensor_thread.start()

    # 일정 시간 후 모델 학습 실행
    time.sleep(60)  # 충분한 데이터가 수집될 시간을 확보
    train_regression_model()

    # 실시간 공기질 예측 실행 (별도 스레드)
    prediction_thread = threading.Thread(target=predict_air_quality, daemon=True)
    prediction_thread.start()

    # 메인 스레드가 종료되지 않도록 유지
    while True:
        time.sleep(1)