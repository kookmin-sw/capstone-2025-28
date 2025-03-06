#!/usr/bin/python3
import cv2
import numpy as np
import time
from picamera2 import Picamera2

class MotionSensor:
    def __init__(self, resolution=(640, 480), sensitivity=800, decay_rate=0.05, cooldown_time=3):
        """카메라 기반 모션 감지 센서
        - sensitivity: 감지 임계값 (값이 클수록 둔감)
        - decay_rate: 배경 업데이트 속도 (값이 클수록 빠르게 초기화)
        - cooldown_time: 모션 감지 후 다시 감지할 때까지 대기 시간 (초)
        """
        self.picam2 = Picamera2()
        config = self.picam2.create_preview_configuration(main={"size": resolution})
        self.picam2.configure(config)
        self.picam2.start()

        # 🔹 카메라 워밍업 시간
        time.sleep(2)
        self.first_frame = None
        self.sensitivity = sensitivity  # 윤곽선 크기 임계값
        self.decay_rate = decay_rate  # 배경 업데이트 속도
        self.cooldown_time = cooldown_time  # 감지 후 쿨다운 시간
        self.last_motion_time = 0  # 마지막 모션 감지 시간

    def detect_motion(self):
        """모션 감지 함수: 움직임이 감지되면 True 반환, 없으면 False"""
        current_time = time.time()

        # 🔹 최근 감지 후 cooldown_time 동안 감지 방지
        if current_time - self.last_motion_time < self.cooldown_time:
            return False

        image = self.picam2.capture_array()
        gray = cv2.cvtColor(image, cv2.COLOR_BGR2GRAY)
        gray = cv2.GaussianBlur(gray, (21, 21), 0)

        # 🔹 초기 프레임 설정 (첫 실행 시)
        if self.first_frame is None:
            self.first_frame = gray
            return False  # 첫 번째 실행은 항상 False

        # 🔹 프레임 차이 계산
        frame_delta = cv2.absdiff(self.first_frame, gray)
        thresh = cv2.threshold(frame_delta, 25, 255, cv2.THRESH_BINARY)[1]
        thresh = cv2.dilate(thresh, None, iterations=2)

        # 🔹 윤곽선 찾기
        contours, _ = cv2.findContours(thresh.copy(), cv2.RETR_EXTERNAL, cv2.CHAIN_APPROX_SIMPLE)

        motion_detected = False

        for contour in contours:
            if cv2.contourArea(contour) < self.sensitivity:  # 작은 움직임 무시
                continue
            motion_detected = True
            self.last_motion_time = current_time  # 마지막 감지 시간 업데이트
            break  # 하나라도 감지되면 True 반환

        # 🔹 감지된 경우, 기준 프레임을 즉시 업데이트하여 연속 감지 방지
        if motion_detected:
            self.first_frame = gray  # 배경을 즉시 업데이트
            return True  # 🔥 모션 감지됨

        # 🔹 감지가 없을 경우, 천천히 배경을 업데이트하여 잘못된 감지 방지
        self.first_frame = cv2.addWeighted(self.first_frame, 1 - self.decay_rate, gray, self.decay_rate, 0)

        return False  # 🔹 모션 없음