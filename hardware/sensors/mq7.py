import board
import busio
import digitalio
import adafruit_mcp3xxx.mcp3008 as MCP
from adafruit_mcp3xxx.analog_in import AnalogIn

class MQ7Sensor:
    def __init__(self):
        try:
            # 🔹 SPI 버스 및 MCP3008 설정
            self.spi = busio.SPI(board.SCK, MOSI=board.MOSI, MISO=board.MISO)
            self.cs = digitalio.DigitalInOut(board.D5)  # Chip Select 핀 설정
            self.mcp = MCP.MCP3008(self.spi, self.cs)

            # 🔹 MQ7 센서 (MP3008 A2)
            self.mq7 = AnalogIn(self.mcp, MCP.P2)

            print("✅ MQ7 센서 초기화 완료!")
        except Exception as e:
            print(f"⚠️ MQ7 센서 초기화 오류: {e}")

    def get_data(self):
        try:
            # 🔹 MQ7 센서 데이터 읽기
            raw_value = self.mq7.value  # 16비트 값 (0~65535)
            voltage = self.mq7.voltage  # 변환된 전압 값

            return {
                "mq7_raw": raw_value,
                "mq7_voltage": round(voltage, 3),
            }
        except Exception as e:
            print(f"⚠️ MQ7 센서 데이터 읽기 오류: {e}")
            return None