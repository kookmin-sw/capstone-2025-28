import time
import board
import busio
import digitalio
from adafruit_mcp3xxx.mcp3008 import MCP3008
from adafruit_mcp3xxx.analog_in import AnalogIn
import adafruit_mcp3xxx.mcp3008 as MCP

# SPI 세팅
spi = busio.SPI(clock=board.SCK, MISO=board.MISO, MOSI=board.MOSI)
cs = digitalio.DigitalInOut(board.D5) 
mcp = MCP3008(spi, cs)

# 채널 세팅
chan_mq135 = AnalogIn(mcp, MCP.P1)
chan_mq7 = AnalogIn(mcp, MCP.P2)
chan_mq4 = AnalogIn(mcp, MCP.P3)

# 설정 값
VREF = 3.3       # MCP3008 기준 전압
RL = 10.0        # MQ 센서 로드 저항 (kOhm)
CLEAN_AIR_FACTORS = {
    "MQ135": 9.83,  # 데이터시트에서 깨끗한 공기 Rs/R0 비율
    "MQ7": 27.0,
    "MQ4": 4.4,
}

def calibrate(channel, sensor_name):
    sensor_voltage = channel.voltage  # 전압 읽기
    if sensor_voltage == 0:
        return None  # 0V면 오류 방지
    
    rs = ((VREF * RL) / sensor_voltage) - RL  # Rs 계산 (kOhm 단위)
    r0 = rs / CLEAN_AIR_FACTORS[sensor_name]  # R0 추정

    print(f"[{sensor_name}] Voltage: {sensor_voltage:.3f} V | Rs: {rs:.3f} kΩ | R0 (계산): {r0:.3f} kΩ")
    return r0

def main():
    print("MQ 센서 캘리브레이션 시작 (깨끗한 공기에서 진행)")
    time.sleep(2)

    while True:
        calibrate(chan_mq135, "MQ135")
        calibrate(chan_mq7, "MQ7")
        calibrate(chan_mq4, "MQ4")

        print("-" * 50)
        time.sleep(1)  # 1초 간격

if __name__ == "__main__":
    main()