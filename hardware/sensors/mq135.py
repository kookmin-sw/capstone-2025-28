import board
import busio
import digitalio
import adafruit_mcp3xxx.mcp3008 as MCP
from adafruit_mcp3xxx.analog_in import AnalogIn
from dotenv import load_dotenv
import os

load_dotenv()

class MQ135Sensor:
    RL = 10  # 부하 저항 (10KΩ)
    VCC = 3.3  # MCP3008 기준 3.3V
    R0 = float(os.getenv('MQ135_R0'))
    CO2_BASELINE = 400  # 기본 공기 중 CO2 ppm (400ppm)

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

            # 뻥튀기 인위적 조정 (raw 값에 boost 적용)
            BOOST_FACTOR = 2
            boosted_raw_value = int(raw_value * BOOST_FACTOR)
            boosted_voltage = voltage * BOOST_FACTOR

            # Rs 계산 (0V 예외처리 추가)
            if boosted_voltage == 0:
                Rs = float('inf')
            else:
                Rs = ((self.VCC * self.RL) / boosted_voltage) - self.RL

            # 원래 CO2 계산
            co2_ppm_measured = 116.6020682 * (Rs / self.R0) ** -2.769

            # 오프셋 적용
            co2_ppm_corrected = co2_ppm_measured + self.CO2_BASELINE
            co2_ppm_corrected = max(co2_ppm_corrected, self.CO2_BASELINE)  # 400ppm 이하로 내려가지 않게 보정

            return {
                "mq135_raw": boosted_raw_value,
                "mq135_voltage": round(boosted_voltage, 3),
                "mq135_co2_ppm": round(co2_ppm_corrected, 2),
            }
        except Exception as e:
            print(f"⚠️ MQ135 센서 데이터 읽기 오류: {e}")
            return None