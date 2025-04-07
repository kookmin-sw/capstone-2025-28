import pandas as pd
import numpy as np
import math
import time
import joblib
import threading

from sklearn.model_selection import train_test_split
from sklearn.preprocessing import StandardScaler
from tensorflow.keras.models import Sequential
from tensorflow.keras.layers import LSTM, Dense, Input
from tensorflow.keras.callbacks import ModelCheckpoint, EarlyStopping
from tensorflow.keras.models import load_model
from sklearn.metrics import r2_score

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
AIR_QUALITY_MODEL_FILE = "air_quality_model.keras"
AIR_QUALITY_SCALER_FILE = "air_quality_scaler.pkl"
SMELL_MODEL_FILE = "smell_classification_model.pkl"

sensor_data_list = []
real_value_history = []
prediction_history = []
prediction_count = 0
previous_trend_messages = []
collecting = True

# 데이터 수집 및 저장 함수
def collect_data(interval=3):
    global collecting

    if os.path.exists(SMELL_MODEL_FILE):
        class_model, class_scaler = joblib.load(SMELL_MODEL_FILE)
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
    mq7_penalty_score = min(100, ((mq7 - 15000) / 65535) * 100)
    mq135_penalty_score = min(100, ((mq135 - 3000) / 65535) * 100)
    pm25_penalty_score = min(100, pm25 - 30)
    tvoc_penalty_score = min(100, tvoc / 3)
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

# 모델 학습 함수
def train_regression_model():
    df = pd.read_csv(DATA_FILE)
    df = df.dropna()
    
    X_columns = ["tvoc", "eco2", "pm2.5", "mq4", "mq7", "mq135", "air_quality", "smell_level"]
    future_df = df.shift(-2)
    y_columns = ["tvoc", "eco2", "pm2.5", "air_quality"]

    X_list = []
    for i in range(5, len(df)-2):
        merged = []
        for j in range(5, -1, -1):
            merged += df.iloc[i-j][X_columns].tolist()
        X_list.append(merged)

    y = future_df[y_columns].iloc[5:-2].values

    X = np.array(X_list)
    X_train, X_test, y_train, y_test = train_test_split(X, y, test_size=0.2, random_state=42)
    
    X_scaler = StandardScaler()
    X_train = X_scaler.fit_transform(X_train)
    X_test = X_scaler.transform(X_test)

    X_train = X_train.reshape((X_train.shape[0], 6, -1))
    X_test = X_test.reshape((X_test.shape[0], 6, -1))

    y_scaler = StandardScaler()
    y_train = y_scaler.fit_transform(y_train)
    y_test = y_scaler.transform(y_test)
    
    model = Sequential()
    model.add(Input(shape=(X_train.shape[1], X_train.shape[2])))
    model.add(LSTM(64, return_sequences=True, dropout=0.2))
    model.add(LSTM(32))
    model.add(Dense(32, activation='relu'))
    model.add(Dense(y_train.shape[1]))
    model.compile(optimizer='adam', loss='mse')

    early_stop = EarlyStopping(monitor='val_loss', patience=10, restore_best_weights=True)
    checkpoint = ModelCheckpoint(AIR_QUALITY_MODEL_FILE, save_best_only=True)

    epochs = 50
    batchsize = 32
    validation_split = 0.2 if len(X_train) > 10 else 0.0

    model.fit(X_train, y_train, epochs=epochs, batch_size=batchsize, validation_split=validation_split, callbacks=[checkpoint, early_stop])

# 모델 평가
    y_pred = model.predict(X_test)
    r2 = r2_score(y_test, y_pred)
    print(f"✅ 공기질 예측 모델 결정 계수(R^2 Score): {r2:.2f}")
    
    model.save(AIR_QUALITY_MODEL_FILE)
    joblib.dump((X_scaler, y_scaler), AIR_QUALITY_SCALER_FILE)
    print("✅ 공기질 예측 모델 학습 완료 및 저장")

# 추세 분석
def analyze_trend():
    global previous_trend_messages
    if len(prediction_history) < 3:
        return

    latest = prediction_history[-1]
    prev = prediction_history[-2]
    before_prev = prediction_history[-3]

    messages = []

    eco2_now, eco2_prev, eco2_before = latest[1], prev[1], before_prev[1]
    tvoc_now, tvoc_prev, tvoc_before = latest[0], prev[0], before_prev[0]
    air_quality_now, air_quality_prev, air_quality_before = latest[3], prev[3], before_prev[3]

    # eco2 증가/감소
    if eco2_now > eco2_prev > eco2_before:
        messages.append("⬆️ 이산화탄소 농도가 계속 증가하고 있어요. 환기가 필요합니다.")

    # tvoc 급격한 상승/하락
    if tvoc_prev != 0 and tvoc_before != 0:
        tvoc_increase_rate = (tvoc_now - tvoc_before) / tvoc_before

        if tvoc_increase_rate >= 0.3:
            messages.append(f"⚠️ TVOC 농도가 30% 이상 급증했습니다! 현재 수치: {tvoc_now:.2f}")

    # 공기질 점수 추세
    if air_quality_now < air_quality_prev < air_quality_before:
        messages.append("⚠️ 공기질이 점점 나빠지고 있습니다.")

    for msg in messages:
        if msg not in previous_trend_messages:
            print(msg)
            print()
    
    previous_trend_messages = messages

# 공기질 예측 함수
def predict_air_quality():
    global prediction_count

    if not os.path.exists(AIR_QUALITY_MODEL_FILE):
        print("❌ 모델 파일이 없습니다. 먼저 학습을 실행하세요!")
        return
    
    reg_model = load_model(AIR_QUALITY_MODEL_FILE)
    X_scaler, y_scaler = joblib.load(AIR_QUALITY_SCALER_FILE)

    while True:
        if len(sensor_data_list) >= 6:
            merged_input = []
            for i in range(6):
                latest_data = sensor_data_list[-(6-i)]
                merged_input += [
                    latest_data.get("tvoc", 0),
                    latest_data.get("eco2", 0),
                    latest_data.get("pm2.5", 0),
                    latest_data.get("mq4", 0),
                    latest_data.get("mq7", 0),
                    latest_data.get("mq135", 0),
                    latest_data.get("air_quality", 0),
                    latest_data.get("smell_level", 0),
                ]
            
            input_data = np.array(merged_input).reshape(1, -1)  # (1, 특성수)
            reg_input = X_scaler.transform(input_data)
            reg_input = reg_input.reshape(1, 6, -1)  # (샘플, 시퀀스 길이 6, 특성수)

            air_quality_prediction = reg_model.predict(reg_input)[0]
            air_quality_prediction = y_scaler.inverse_transform([air_quality_prediction])[0]

        predicted_tvoc = air_quality_prediction[0]
        predicted_eco2 = air_quality_prediction[1]
        predicted_pm25 = air_quality_prediction[2]
        predicted_air_quality = air_quality_prediction[3]
    
        print(f"✅ 예측된 TVOC: {predicted_tvoc:.2f}, eCO2: {predicted_eco2:.2f}, PM2.5: {predicted_pm25:.2f}, air_quality: {predicted_air_quality:.2f}")
        
        current_smell = merged_input[-1]
        set_fan_pump_by_air_quality(predicted_air_quality, current_smell)

        # 예측값/실제값 저장
        prediction_history.append(air_quality_prediction)
        real_value_history.append([
            sensor_data_list[-2].get("tvoc", 0),
            sensor_data_list[-2].get("eco2", 0),
            sensor_data_list[-2].get("pm2.5", 0),
            sensor_data_list[-2].get("air_quality", 0),
        ])

        if len(prediction_history) > 10:
            prediction_history.pop(0)
            real_value_history.pop(0)

        prediction_count += 1
    
        if prediction_count >= 10:
            try:
                if len(real_value_history) >= 2 and len(prediction_history) >= 2:
                    y_true = np.array(real_value_history)
                    y_pred = np.array(prediction_history)
                    r2 = r2_score(y_true, y_pred)
                    print(f"🔵 현재 예측 결정계수 (R²): {r2:.2f}")

                    if r2 < 0.7:
                        print("⚠️ 결정계수가 0.7 이하입니다. 모델을 재학습합니다...")
                        train_regression_model()
                        reg_model = load_model(AIR_QUALITY_MODEL_FILE)
                        X_scaler, y_scaler = joblib.load(AIR_QUALITY_SCALER_FILE)
                        print("✅ 모델 재학습 완료 및 적용")
                else:
                    print("⏳ 예측 결과가 아직 부족하여 R² 계산을 건너뜁니다.")
            except Exception as e:
                print(f"⚠️ 결정계수 계산 중 오류 발생: {e}")

            prediction_count = 0  # 리셋

        analyze_trend()

        time.sleep(3)

# 공기질에 따른 팬 및 펌프 제어 함수
def set_fan_pump_by_air_quality(predicted_air_quality, current_smell):
    best_speed = (predicted_air_quality - 1) / 3 * 4
    best_speed = max(0, min(4, int(round(best_speed))))

    fan1.set_speed(best_speed) # 공기청정 팬 작동

    if current_smell > 1:
        ultrasonic1.turn_on()
        ultrasonic2.turn_on()
        fan2.set_speed(2)
    else:
        ultrasonic1.turn_off()
        ultrasonic2.turn_off()
        fan2.set_speed(0)

    print()
    time.sleep(3)

# 실행
if __name__ == "__main__":

    if os.path.exists(DATA_FILE):
        os.remove(DATA_FILE)
        print("🗑️ 이전 공기질 데이터 초기화 완료!")

    if os.path.exists(AIR_QUALITY_MODEL_FILE):
        os.remove(AIR_QUALITY_MODEL_FILE)
        os.remove(AIR_QUALITY_SCALER_FILE)
        print("🗑️ 이전 공기질 예측 모델 초기화 완료!")

    # 센서 데이터 수집 스레드 실행
    sensor_thread = threading.Thread(target=collect_data, args=(3,), daemon=True)
    sensor_thread.start()

    # 일정 시간 후 모델 학습 실행
    time.sleep(60)  # 충분한 데이터가 수집될 시간을 확보
    train_regression_model()

    # 실시간 공기질 예측 실행 (별도 스레드)
    prediction_thread = threading.Thread(target=predict_air_quality, daemon=True)
    prediction_thread.start()

    # 메인 스레드가 종료되지 않도록 유지
    try:
        while True:
            time.sleep(1)
    except KeyboardInterrupt:
        collecting = False
        print("🛑 프로그램 종료")