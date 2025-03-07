import board
import busio
import digitalio
import adafruit_mcp3xxx.mcp3008 as MCP
from adafruit_mcp3xxx.analog_in import AnalogIn

class MQ4Sensor:
    RL = 10  # 부하 저항 (10KΩ)
    VCC = 5.0  # 센서 공급 전압 (5V)
    R0 = 21.6  # 캘리브레이션된 R0 값

    def __init__(self):
        try:
            self.spi = busio.SPI(board.SCK, MOSI=board.MOSI, MISO=board.MISO)
            self.cs = digitalio.DigitalInOut(board.D5)
            self.mcp = MCP.MCP3008(self.spi, self.cs)

            self.mq4 = AnalogIn(self.mcp, MCP.P3)

            print("✅ MQ4 센서 초기화 완료!")
        except Exception as e:
            print(f"⚠️ MQ4 센서 초기화 오류: {e}")

    def get_data(self):
        try:
            raw_value = self.mq4.value
            voltage = self.mq4.voltage

            # Rs 계산
            Rs = ((self.VCC * self.RL) / voltage) - self.RL

            # 메탄 변환 공식
            methane_ppm = 150 * (Rs / self.R0) ** -1.45

            return {
                "mq4_raw": raw_value,
                "mq4_voltage": round(voltage, 3),
                "mq4_methane_ppm": round(methane_ppm, 2),
            }
        except Exception as e:
            print(f"⚠️ MQ4 센서 데이터 읽기 오류: {e}")
            return None