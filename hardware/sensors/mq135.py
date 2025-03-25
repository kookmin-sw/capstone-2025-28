import board
import busio
import digitalio
import adafruit_mcp3xxx.mcp3008 as MCP
from adafruit_mcp3xxx.analog_in import AnalogIn

class MQ135Sensor:
    RL = 10  # 부하 저항 (10KΩ)
    VCC = 5.0  # 센서 공급 전압 (5V)
    R0 = 76.63  # 캘리브레이션된 R0 값 (공기 중 보정 필요)

    def __init__(self):
        try:
            self.spi = busio.SPI(board.SCK, MOSI=board.MOSI, MISO=board.MISO)
            self.cs = digitalio.DigitalInOut(board.D5)
            self.mcp = MCP.MCP3008(self.spi, self.cs)

            self.mq135 = AnalogIn(self.mcp, MCP.P1)

            print("✅ MQ135 센서 초기화 완료!")
        except Exception as e:
            print(f"⚠️ MQ135 센서 초기화 오류: {e}")

    def get_data(self):
        try:
            raw_value = self.mq135.value
            voltage = self.mq135.voltage

            # Rs 계산
            Rs = ((self.VCC * self.RL) / voltage) - self.RL

            # CO2 PPM 변환 공식
            co2_ppm = 116.6020682 * (Rs / self.R0) ** -2.769

            return {
                "mq135_raw": raw_value,
                "mq135_voltage": round(voltage, 3),
                "mq135_co2_ppm": round(co2_ppm, 2),
            }
        except Exception as e:
            print(f"⚠️ MQ135 센서 데이터 읽기 오류: {e}")
            return None