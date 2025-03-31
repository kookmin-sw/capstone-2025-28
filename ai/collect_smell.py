import pandas as pd
import time
import os
import joblib

from sklearn.model_selection import train_test_split
from sklearn.preprocessing import StandardScaler
from sklearn.ensemble import RandomForestClassifier
from sklearn.metrics import classification_report

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

DATA_FILE = "air_quality_data.csv"
MODEL_FILE = "smell_classification_model.pkl"

# 악취 라벨 포함 데이터 수집 함수
def collect_smell_data(interval=5, max_records=20):
    try:
        label = input("🔎 악취 상태 입력 (0: 없음 / 1: 보통 / 2: 강함): ").strip()
        label = int(label)
        if label not in [0, 1, 2]:
            raise ValueError
    except:
        print("❌ 잘못된 입력입니다. 프로그램을 종료합니다.")
        return
    
    records_collected = 0
    while records_collected < max_records:
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
            "smell_level": label
        }

        print(f"📥 수집된 데이터 {records_collected+1}/{max_records}:", record)

        df = pd.DataFrame([record])
        df.to_csv(DATA_FILE, mode='a', index=False, header=not os.path.exists(DATA_FILE))
        records_collected += 1
        time.sleep(interval)

# 악취 분류 모델 학습

def train_smell_classification_model():
    if not os.path.exists(DATA_FILE):
        print("❌ 데이터 파일이 존재하지 않습니다.")
        return

    df = pd.read_csv(DATA_FILE)
    df = df.dropna()

    if "smell_level" not in df.columns:
        print("❌ 'smell_level' 컬럼이 데이터에 없습니다.")
        return

    X = df[["temperature", "humidity", "tvoc", "eco2", "pm2.5", "mq4", "mq7", "mq135"]]
    y = df["smell_level"]

    if len(set(y)) < 10:
        print("⚠️ 다양한 악취 레벨 데이터가 부족해 모델 평가 생략 (현재 클래스 수:", len(set(y)), ")")
        return

    X_train, X_test, y_train, y_test = train_test_split(X, y, test_size=0.2, random_state=42)

    scaler = StandardScaler()
    X_train = scaler.fit_transform(X_train)
    X_test = scaler.transform(X_test)

    model = RandomForestClassifier(n_estimators=100, random_state=42)
    model.fit(X_train, y_train)

    y_pred = model.predict(X_test)
    print("\n✅ 악취 분류 리포트:")
    print(classification_report(y_test, y_pred, target_names=["없음", "보통", "강함"]))

    joblib.dump((model, scaler), MODEL_FILE)
    print(f"✅ 악취 분류 모델 저장 완료 → {MODEL_FILE}")

if __name__ == "__main__":
    print("📡 악취 데이터 수집 시작...\n")
    collect_smell_data()
    print("\n🧠 모델 학습 시작...")
    train_smell_classification_model()