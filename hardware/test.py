from sensors.ens import ENSSensor
from sensors.gp2y import GP2YSensor
from sensors.mq135 import MQ135Sensor
from sensors.mq7 import MQ7Sensor
from sensors.mq4 import MQ4Sensor

from actuators.motion_detect import MotionSensor
from actuators.fan import FanController
from actuators.ultrasonic import UltrasonocController

import time

# 🔹 센서 및 액추에이터 초기화
mq135 = MQ135Sensor()
mq7 = MQ7Sensor()
mq4 = MQ4Sensor()
ens = ENSSensor()
gp2y = GP2YSensor()
motion = MotionSensor(sensitivity=800, decay_rate=0.05, cooldown_time=0)
fan1 = FanController(pin=19)
fan2 = FanController(pin=13)
ultrasonic1 = UltrasonocController(pin=6)
ultrasonic2 = UltrasonocController(pin=5)

# 🔹 메인 루프
try:
    while True:
        # ✅ 센서 데이터 읽기
        ens_data = ens.get_data() or {}
        gp2y_data = gp2y.get_data() or {}
        mq135_data = mq135.get_data() or {}
        mq7_data = mq7.get_data() or {}
        mq4_data = mq4.get_data() or {}

        # ✅ 모션 감지 시 팬 동작
        if motion.detect_motion():
            print("🚀 모션 감지됨! 팬 ON")
            fan1.set_speed(3)
            fan2.set_speed(2)
            ultrasonic1.turn_on()
            ultrasonic2.turn_on()
        else:
            fan1.set_speed(0)
            fan2.set_speed(0)
            ultrasonic1.turn_off()
            ultrasonic2.turn_off()

        # ✅ 데이터 출력 (디버깅용)
        print({**ens_data, **gp2y_data, **mq135_data, **mq7_data, **mq4_data})

        time.sleep(2)

except KeyboardInterrupt:
    print("🛑 종료")