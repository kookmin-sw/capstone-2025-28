#!/usr/bin/python3
import RPi.GPIO as GPIO
import time

class FanController:
    def __init__(self, pin=19, pwm_freq=50):
        """5V 팬 컨트롤러 초기화"""
        self.pin = pin
        self.pwm_freq = pwm_freq
        self.speed_levels = [0, 25, 50, 75, 100]  # 속도 프리셋

        GPIO.setwarnings(False)  # GPIO 경고 비활성화
        GPIO.setmode(GPIO.BCM)
        GPIO.setup(self.pin, GPIO.OUT)

        self.fan = GPIO.PWM(self.pin, self.pwm_freq)
        self.fan.start(0)  # 초기 속도 0%
        self.current_speed = 0

    def set_speed(self, level):
        """팬 속도를 변경 (0~4 레벨, 0%~100%)"""
        if 0 <= level < len(self.speed_levels):
            speed = self.speed_levels[level]
            print(f"🚀 팬 속도 설정: {speed}%")
            self.current_speed = level
            self.fan.ChangeDutyCycle(speed)
        else:
            print("⚠️ 잘못된 입력: 0~4 사이의 값을 입력하세요.")

    def cleanup(self):
        """GPIO 리소스 해제"""
        print("🔻 팬 컨트롤러 종료...")
        self.fan.stop()
        GPIO.cleanup()
        print("✅ 종료 완료")