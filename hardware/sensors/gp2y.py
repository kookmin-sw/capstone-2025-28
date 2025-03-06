#!/usr/bin/python3
# import RPi.GPIO as GPIO
# import spidev
# import time

# # SPI 설정
# spi = spidev.SpiDev()
# spi.open(0, 0)
# spi.max_speed_hz = 500000

# # LED 설정
# LED = 26
# GPIO.setmode(GPIO.BCM)
# GPIO.setup(LED, GPIO.OUT)

# # 이동 평균을 위한 리스트
# dust_values = []
# NUM_SAMPLES = 5

# # ADC 값을 읽는 함수
# def read_spi_adc(adcChannel):
#     buff = spi.xfer2([1, (8 + adcChannel) << 4, 0])
#     adcValue = ((buff[1] & 3) << 8) + buff[2]
#     return adcValue

# try:
#     while True:
#         GPIO.output(LED, GPIO.LOW)
#         time.sleep(0.00028)  # LED ON (샘플링)
        
#         adcChannel = 0  # ADC 채널 0번 사용
#         adcValue = read_spi_adc(adcChannel)
        
#         time.sleep(0.00004)
#         GPIO.output(LED, GPIO.HIGH)
#         time.sleep(0.00968)  # LED OFF
        
#         # 전압 변환
#         calVoltage = adcValue * (5.0 / 1024.0)
        
#         # 미세먼지 농도 변환 (음수 방지)
#         dust_data = max(0, (0.172 * calVoltage - 0.01) * 1000)

#         # 이동 평균 필터 적용
#         dust_values.append(dust_data)
#         if len(dust_values) > NUM_SAMPLES:
#             dust_values.pop(0)

#         filtered_dust = sum(dust_values) / len(dust_values)
        
#         print(f"Dust Level: {dust_data:.2f} µg/m³ (Raw)")
#         print(f"Dust Level (Filtered): {filtered_dust:.2f} µg/m³ (Avg over {NUM_SAMPLES})")

#         time.sleep(2)  # 2초 간격으로 측정

# except KeyboardInterrupt:
#     print("\n측정 종료")

# finally:
#     spi.close()
#     GPIO.cleanup()


import RPi.GPIO as GPIO
import spidev
import time

class GP2YSensor:
    def __init__(self, spi_channel=0, led_pin=26, num_samples=5):
        # 🔹 SPI 설정
        self.spi = spidev.SpiDev()
        self.spi.open(0, spi_channel)
        self.spi.max_speed_hz = 500000

        # 🔹 LED 핀 설정
        self.led_pin = led_pin
        GPIO.setmode(GPIO.BCM)
        GPIO.setup(led_pin, GPIO.OUT)

        # 🔹 이동 평균 필터 설정
        self.dust_values = []
        self.num_samples = num_samples

    def read_adc(self, adc_channel):
        """SPI를 사용하여 ADC 값 읽기"""
        buff = self.spi.xfer2([1, (8 + adc_channel) << 4, 0])
        adc_value = ((buff[1] & 3) << 8) + buff[2]
        return adc_value

    def get_data(self):
        """미세먼지 농도 측정 및 이동 평균 필터 적용"""
        try:
            # 🔹 LED ON (샘플링)
            GPIO.output(self.led_pin, GPIO.LOW)
            time.sleep(0.00028)

            # 🔹 ADC 데이터 읽기 (채널 0 사용)
            adc_value = self.read_adc(0)

            # 🔹 LED OFF (대기)
            time.sleep(0.00004)
            GPIO.output(self.led_pin, GPIO.HIGH)
            time.sleep(0.00968)

            # 🔹 전압 변환 (ADC 값 → 전압)
            cal_voltage = adc_value * (5.0 / 1024.0)

            # 🔹 미세먼지 농도 변환 (µg/m³)
            dust_data = max(0, (0.172 * cal_voltage - 0.01) * 1000)

            # 🔹 이동 평균 필터 적용
            self.dust_values.append(dust_data)
            if len(self.dust_values) > self.num_samples:
                self.dust_values.pop(0)
            
            filtered_dust = sum(self.dust_values) / len(self.dust_values)

            return {
                "pm25_raw": round(dust_data, 2),  # 원본 데이터
                "pm25_filtered": round(filtered_dust, 2),  # 이동 평균 필터 적용 데이터
            }

        except Exception as e:
            print(f"⚠️ GP2Y1010AU0F 센서 오류: {e}")
            return None

    def cleanup(self):
        """SPI 및 GPIO 정리"""
        self.spi.close()
        GPIO.cleanup()