#!/usr/bin/python3
# import RPi.GPIO as GPIO
# import time

# # IRF520의 SIG 핀을 연결한 라즈베리파이 GPIO 핀 번호
# FAN_PIN = 18  # GPIO 18번 사용

# # GPIO 설정
# GPIO.setmode(GPIO.BCM)  # BCM 모드 사용
# GPIO.setup(FAN_PIN, GPIO.OUT)  # GPIO 18번을 출력 모드로 설정

# # 팬을 3초 동안 켜고, 3초 동안 끄는 테스트 코드
# try:
#     while True:
#         GPIO.output(FAN_PIN, GPIO.HIGH)  # 팬 켜기
#         time.sleep(3)  # 3초 동안 작동

#         GPIO.output(FAN_PIN, GPIO.LOW)  # 팬 끄기
#         time.sleep(3)  # 3초 동안 정지

# except KeyboardInterrupt:
#     print("프로그램 종료")
#     GPIO.cleanup()  # GPIO 핀 정리

import RPi.GPIO as GPIO
import time

class UltrasonocController:
    def __init__(self, pin=6):
        """IRF520 MOSFET을 사용한 모듈 컨트롤러 (ON/OFF만 지원)"""
        self.pin = pin

        GPIO.setwarnings(False)
        GPIO.setmode(GPIO.BCM)
        GPIO.setup(self.pin, GPIO.OUT)

    def turn_on(self):
        """모듈을 켬 (HIGH)"""
        print("🚀 모듈 ON")
        GPIO.output(self.pin, GPIO.HIGH)

    def turn_off(self):
        """팬을 끔 (LOW)"""
        print("🔻 모듈 OFF")
        GPIO.output(self.pin, GPIO.LOW)

    def cleanup(self):
        """GPIO 리소스 해제"""
        print("🛑 모듈 컨트롤러 종료...")
        GPIO.cleanup()
        print("✅ 종료 완료")