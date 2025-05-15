# 라즈베리 Air

## 1. 프로젝트 개요

**실내 공기질 모니터링과 맞춤형 향 분사를 자동화한 스마트홈 시스템**

<p align="center">
<img  alt="Image" src="https://kookmin-sw.github.io/capstone-2025-28/docs/image1.png" />
<img width="1268" alt="Image2" src="https://kookmin-sw.github.io/capstone-2025-28/docs/image2.png" />
</p>

- 디지털 트윈 기반 실시간 시각화
- AI 기반 공기질 예측과 자동 환기/디퓨저 제어
- IoT 센서 기반 데이터 수집 및 제어 기능

> 디지털 트윈 기술과 AI 기반 자동화 시스템을 활용하여 실내 공기질을 최적화하고 맞춤형 향 분사 기능을 제공하는 스마트 환경 제어 시스템을 개발합니다. 이를 통해 실내 공기질을 실시간으로 분석하고, 사용자에게 적합한 최적의 향기와 공기정화 솔루션을 자동으로 제공하는 것을 목표로 합니다.


---

## 2. 소개 영상


[영상 링크](https://example.com)

---

## 3. 팀원 소개

| 이름   | 학번     | 역할           |
|--------|----------|----------------|
| 이승화 | 20191642 | 공기질 분석 AI개발, 환경데이터 수집 및 정화 알고리즘개발 |
| 권순호 | 20191553 | 실내 환경 제어 시스템개발, 하드웨어 회로 설계 |

---

## 4. 기술 스택

### 📦 임베디드 하드웨어

- Raspberry Pi 4
- MCP3008(ADC), MOSFET, GP2Y1010AU0F, MQ135, MQ4, MQ7, ENS160+AHT21, DHT22, 5V Fan, Humidifier
- EasyEDA 기반 커스텀 HAT 보드 설계

### 🌐 소프트웨어

| 분야     | 기술 |
|----------|------|
| Firmware | Python, GPIO, SPI, Socket IO |
| Server   | Node.js, Express.js |
| Frontend | Next.js, TailwingCSS, Three.js, Radix-ui, Recharts |
| AI       | TensorFlow, Scikit-learn, Keras |

---

## 5. 하드웨어 제작 및 구성

### 🧾 회로도 및 PCB

- EasyEDA로 설계된 HAT 보드이며, Raspberry Pi 4에 장착 가능한 사이즈(65mm x 56mm)
- 프로젝트의 Gerber 파일을 통해 직접 PCB를 발주하고, 부품을 납땜하여 조립할 수 있습니다.

<p align="center">
<img width="1210" alt="Image3" src="https://kookmin-sw.github.io/capstone-2025-28/docs/image3.png" />

<img width="880" alt="Image4" src="https://kookmin-sw.github.io/capstone-2025-28/docs/image4.png" />
</p>

### 🔧 필요 부품 목록 (BOM)

| 분류     | 부품명         | 설명                          |
|----------|----------------|-------------------------------|
| MCU 보드 | Raspberry Pi 4B | 40핀 GPIO, Raspbian 기반         |
| 센서     | MQ135, MQ4, MQ7 | 가스 센서 (CO₂, 메탄, CO 등)  |
| 센서     | ENS160 + AHT21 | eCO₂, TVOC 센서  |
| 센서     | DHT22   | 온도 센서        |
| 센서     | GP2Y1010AU0F   | 미세먼지 센서 (외장형)        |
| ADC      | MCP3008        | 8채널 10-bit SPI ADC          |
| 스위칭   | IRF540 MOSFET  | 5V 작동 장치 제어용 (4채널)   |
| 보조부품 | 저항, 커패시터, 핀헤더 등 | 150Ω, 220uF      |

### 🔥 납땜 및 조립 가이드

1. **PCB 제작**
   - Gerber 파일을 [JLCPCB](https://jlcpcb.com) 또는 [PCBWay](https://www.pcbway.com)에서 발주
   - 보드 규격: 2층, 1.6mm 두께, HASL 처리

2. **부품 배치 및 납땜**
   - 수동 납땜
   - 센서 소켓 사용 권장 (핀헤더로 교체 가능성 고려)

3. **외장 모듈 연결**
   - GP2Y1010AU0F, IRF540 모듈은 보드 외부 고정 후 점퍼선으로 연결

4. **Raspberry Pi 연결**
   - GPIO 40핀 핀헤더로 직접 연결 가능

<p align="center">
<img width="656" alt="Image5" src="https://kookmin-sw.github.io/capstone-2025-28/docs/image5.png" />
</p>

---

## 6. 주요 기능

| 기능                   | 설명                          |
|------------------------|-------------------------------|
| 🌫 실내 공기질 모니터링 | PM2.5, VOCs, CO2 등 실시간 측정 |
| 🌪 자동 환기 제어       | 기준 초과 시 팬 작동         |
| 🌸 향기 분사 제어       | 사용자 설정 기반 향기 분사    |
| 📊 AI 예측             | 공기질 예측 및 자동 제어      |
| 🌍 디지털 트윈 시각화   | 공기 흐름 및 오염 확산 시뮬레이션 |

---

## 7. 시스템 구성도

### 💻 서비스 아키텍처

<p align="center">
<img width="1123" alt="Image6" src="https://kookmin-sw.github.io/capstone-2025-28/docs/image6.png" />
</p>

### 📂 디렉토리 구조

```
├── 📂hardware     # 하드웨어 제어 클라이언트
├── 📂ai           # AI 모델 및 예측 하드웨어 클라이언트
├── 📂server       # 하드웨어 - 대시보드 서버
├── 📂dashboard    # Next.js 기반 디지털 트윈 대시보드 클라이언트
└── 📜 README.md
```

---

## 8. 실행 방법

### 📟 Raspberry Pi (하드웨어) + ㅁ

```bash
cd hardware
pip install -r requirements.txt
python3 main.py
```

### 🖥 서버

```bash
cd server
npm install
node server.js
```

### 📊 대시보드

```bash
cd client
npm install --legacy-peer-deps
npm run build
npm run start
```

---

## 9. 참고자료 및 문서

- [최종 발표자료 및 보고서](https://drive.google.com)
- [디지털 트윈 시연 영상](https://youtube.com)
- [공기질 센서 기술문서](https://example.com/mq135)

---