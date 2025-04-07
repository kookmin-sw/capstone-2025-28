const express = require("express");
const http = require("http");
const { Server } = require("socket.io");
const cors = require("cors");

const app = express();
app.use(cors());

require("dotenv").config(); // 꼭 맨 위에 추가

const server = http.createServer(app);
const io = new Server(server, {
  cors: {
    origin: "*",
    methods: ["GET", "POST"]
  }
});

// 디바이스 및 대시보드 상태 저장
const devices = new Map(); // device_key => socket
const dashboards = new Map(); // socket.id => device_key

io.on("connection", (socket) => {
  console.log("🔌 New connection:", socket.id);

  // 1️⃣ 임베디드 디바이스 등록
  socket.on("register_device", ({ device_key }) => {
    console.log("✅ 디바이스 등록:", device_key);
    devices.set(device_key, socket);
    socket.device_key = device_key;
  });

  // 2️⃣ 대시보드 등록
  socket.on("register_dashboard", ({ device_key }) => {
    console.log("📡 대시보드 등록:", device_key);
    dashboards.set(socket.id, device_key);
    // Call resetSensorData before emitting (this line is a placeholder for the actual logic)
    // resetSensorData();
  });

  // 3️⃣ 센서 데이터 수신
  socket.on("sensor_data", (data) => {
    const { device_key } = data;
    for (const [clientId, key] of dashboards.entries()) {
      if (key === device_key) {
        io.to(clientId).emit("sensorData", data);
      }
    }
  });

  // 4️⃣ 대시보드 → 디바이스 제어
  socket.on("control", ({ device, state }) => {
    const device_key = dashboards.get(socket.id);
    const deviceSocket = devices.get(device_key);
    if (deviceSocket) {
      console.log(`🚀 제어 명령 전달: ${device_key} → ${device} = ${state}`);
      deviceSocket.emit("control", { device, state });
    }
  });

  // 웹캠 이미지 요청
  socket.on("request_webcam", () => {
    const device_key = dashboards.get(socket.id);
    const deviceSocket = devices.get(device_key);
    if (deviceSocket) {
      deviceSocket.emit("fetch_webcam_image");
    }
  });

  // 웹캠 이미지 수신
  socket.on("webcamImage", (data) => {
    const { device_key } = data;
    if (!device_key) return;
    for (const [clientId, key] of dashboards.entries()) {
      if (key === device_key) {
        io.to(clientId).emit("webcamImage", data);
      }
    }
  });

  // 🔌 연결 종료 시 처리
  socket.on("disconnect", () => {
    console.log("❌ 연결 종료:", socket.id);
    if (socket.device_key) {
      devices.delete(socket.device_key);
    }
    dashboards.delete(socket.id);
  });
});

const PORT = process.env.PORT || 3001;
server.listen(PORT, () => {
  console.log(`🌐 Socket.IO 서버가 포트 ${PORT}에서 실행 중`);
});