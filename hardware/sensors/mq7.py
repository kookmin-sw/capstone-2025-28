import board
import busio
import digitalio
import adafruit_mcp3xxx.mcp3008 as MCP
from adafruit_mcp3xxx.analog_in import AnalogIn
from dotenv import load_dotenv
import os

load_dotenv()

class MQ7Sensor:
    RL = 10  # 부하 저항 (10KΩ)
    VCC = 3.3  # 수정! 센서 공급 전압 (MCP3008 기준 3.3V)
    R0 = float(os.getenv('MQ7_R0'))

    def __init__(self):
        try:
            self.spi = busio.SPI(board.SCK, MOSI=board.MOSI, MISO=board.MISO)
            self.cs = digitalio.DigitalInOut(board.D5)
            self.mcp = MCP.MCP3008(self.spi, self.cs)

            self.mq7 = AnalogIn(self.mcp, MCP.P2)

            print("✅ MQ7 센서 초기화 완료!")
        except Exception as e:
            print(f"⚠️ MQ7 센서 초기화 오류: {e}")

    def get_data(self):
        try:
            raw_value = self.mq7.value
            voltage = self.mq7.voltage

            # Rs 계산 (0V 예외처리 추가)
            if voltage == 0:
                Rs = float('inf')
            else:
                Rs = ((self.VCC * self.RL) / voltage) - self.RL

            # CO PPM 변환 공식
            co_ppm = 99.042 * (Rs / self.R0) ** -1.518

            return {
                "mq7_raw": raw_value,
                "mq7_voltage": round(voltage, 3),
                "mq7_co_ppm": round(co_ppm, 2),
            }
        except Exception as e:
            print(f"⚠️ MQ7 센서 데이터 읽기 오류: {e}")
            return None