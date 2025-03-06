#!/usr/bin/python3
# import board
# import busio
# import adafruit_ens160
# import adafruit_ahtx0
# from   time                       import sleep

# # I2C 설정 (센서 및 OLED 디스플레이 용)
# i2c_bus = busio.I2C(board.SCL, board.SDA)

# # ENS160 센서 초기화
# ens160 = adafruit_ens160.ENS160(i2c_bus)

# # AHT21 센서 초기화 (AHT21은 AHT10/AHT20와 동일한 코드로 동작)
# aht21 = adafruit_ahtx0.AHTx0(i2c_bus)


# # 데이터 읽기 루프
# while True:
#     # ENS160 데이터 읽기
#     air_quality = ens160.AQI  # Air Quality Index
#     tvoc = ens160.TVOC  # Total Volatile Organic Compounds
#     eco2 = ens160.eCO2  # Equivalent CO2

#     # AHT21 데이터 읽기
#     temperature = aht21.temperature  # 섭씨 온도
#     humidity    = aht21.relative_humidity  # 상대 습도

#     # 데이터 출력 (콘솔)
#     print(f"ENS160 - Air Quality Index: {air_quality}, TVOC: {tvoc} ppb, eCO2: {eco2} ppm")
#     print(f"AHT21 - Temperature: {temperature:.2f} °C, Humidity: {humidity:.2f} %")

#     # 2초 간격으로 읽기
#     sleep(2)

import board
import busio
import adafruit_ens160
import adafruit_ahtx0
from time import sleep

class ENSSensor:
    def __init__(self):
        try:
            # 🔹 I2C 버스 초기화
            self.i2c_bus = busio.I2C(board.SCL, board.SDA)

            # 🔹 ENS160 센서 (공기질)
            self.ens160 = adafruit_ens160.ENS160(self.i2c_bus)

            # 🔹 AHT21 센서 (온습도)
            self.aht21 = adafruit_ahtx0.AHTx0(self.i2c_bus)

            print("✅ ENS160 + AHT21 센서 초기화 완료!")
        except Exception as e:
            print(f"⚠️ 센서 초기화 오류: {e}")

    def get_data(self):
        try:
            # 🔹 ENS160 데이터 읽기 (공기질)
            air_quality = self.ens160.AQI  # Air Quality Index (1~5)
            tvoc = self.ens160.TVOC  # Total Volatile Organic Compounds (ppb)
            eco2 = self.ens160.eCO2  # Equivalent CO2 (ppm)

            # 🔹 AHT21 데이터 읽기 (온습도)
            temperature = self.aht21.temperature  # 섭씨 온도
            humidity = self.aht21.relative_humidity  # 상대 습도

            return {
                "air_quality": air_quality,
                "tvoc": tvoc,
                "eco2": eco2,
                "temp": round(temperature, 2),
                "humidity": round(humidity, 2),
            }
        except Exception as e:
            print(f"⚠️ 센서 데이터 읽기 오류: {e}")
            return None