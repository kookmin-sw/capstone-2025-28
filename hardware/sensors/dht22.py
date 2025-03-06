#!/usr/bin/python3
import adafruit_dht
import board

class DHT22Sensor:
    def __init__(self, pin=board.D18):
        self.sensor = adafruit_dht.DHT22(pin)

    def get_data(self):
        try:
            temperature = self.sensor.temperature
            humidity = self.sensor.humidity
            if temperature is not None and humidity is not None:
                return {"temp": round(temperature, 1), "humidity": round(humidity, 1)}
            else:
                return None
        except RuntimeError as e:
            print(f"⚠️ DHT22 센서 오류: {e}")
            return None