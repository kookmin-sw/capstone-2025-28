import pandas as pd
import numpy as np
import time
import joblib
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

# 센서 초기화
mq135 = MQ135Sensor()
mq7 = MQ7Sensor()
mq4 = MQ4Sensor()
ens = ENSSensor()
gp2y = GP2YSensor()

# 데이터 저장용 파일
DATA_FILE = "air_quality_data.csv"
MODEL_FILE = "air_quality_model.pkl"

# 데이터 수집 및 저장 함수
def collect_data(duration=60, interval=2):
    data_list = []
    start_time = time.time()
    
    while time.time() - start_time < duration:
        ens_data = ens.get_data() or {}
        gp2y_data = gp2y.get_data() or {}
        mq135_data = mq135.get_data() or {}
        mq7_data = mq7.get_data() or {}
        mq4_data = mq4.get_data() or {}
        
        record = {
            "tvoc": ens_data.get("tvoc"),
            "eco2": ens_data.get("eco2"),
            "pm2.5": gp2y_data.get("pm25_filtered"),
            "mq4": mq4_data.get("mq4_raw"),
            "mq7": mq7_data.get("mq7_raw"),
            "mq135": mq135_data.get("mq135_raw"),
            "air_quality": ens_data.get("air_quality"),
        }
        
        data_list.append(record)
        print("Collected:", record)
        time.sleep(interval)
    
    df = pd.DataFrame(data_list)
    df.to_csv(DATA_FILE, mode='a', index=False, header=not pd.io.common.file_exists(DATA_FILE))
    print("✅ 데이터 저장 완료")

# 모델 학습 함수
def train_model():
    df = pd.read_csv(DATA_FILE)
    df = df.dropna()
    
    X = df.drop(columns=[])
    y = df[["tvoc", "eco2", "pm2.5", "mq4", "mq7", "mq135", "air_quality"]]
    
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
    model, scaler = joblib.load(MODEL_FILE)
    
    ens_data = ens.get_data() or {}
    gp2y_data = gp2y.get_data() or {}
    mq135_data = mq135.get_data() or {}
    mq7_data = mq7.get_data() or {}
    mq4_data = mq4.get_data() or {}
   
    input_data = pd.DataFrame([[
        ens_data.get("tvoc", 0),
        ens_data.get("eco2", 0),
        gp2y_data.get("pm2.5", 0),
        mq4_data.get("mq4_raw", 0),
        mq7_data.get("mq7_raw", 0),
        mq135_data.get("mq135_raw", 0),
        ens_data.get("air_quality", 0),
    ]], columns=["tvoc", "eco2", "pm2.5", "mq4", "mq7", "mq135", "air_quality"])
    
    input_data = scaler.transform(input_data)
    prediction = model.predict(input_data)
    
    print(f"✅ 예측된 TVOC: {prediction[0][0]:.2f}, eCO2: {prediction[0][1]:.2f}, PM2.5: {prediction[0][2]:.2f}, mq4: {prediction[0][3]:.2f}, mq7: {prediction[0][4]:.2f}, mq135: {prediction[0][5]:.2f}, air_quality: {prediction[0][6]:.2f}")

# 실행
if __name__ == "__main__":
    collect_data()
    train_model()
    predict_air_quality()