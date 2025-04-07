#!/usr/bin/python3
import RPi.GPIO as GPIO
import time

class UltrasonocController:
    def __init__(self, pin=6):
        """IRF520 MOSFET을 사용한 모듈 컨트롤러 (ON/OFF만 지원)"""
        self.pin = pin

        GPIO.setwarnings(False)
        GPIO.setmode(GPIO.BCM)
        GPIO.setup(self.pin, GPIO.OUT)
        GPIO.output(self.pin, GPIO.LOW)  # Ensure initial state is off

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
        GPIO.output(self.pin, GPIO.LOW)
        GPIO.cleanup(self.pin)
        print("✅ 종료 완료")