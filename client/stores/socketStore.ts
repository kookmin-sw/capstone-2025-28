import { create } from "zustand";
import io from "socket.io-client";

// 서버 주소 (라즈베리파이)
const SOCKET_SERVER_URL = process.env.NEXT_PUBLIC_SOCKET_SERVER_URL!;

// WebSocket 연결
const socket = io(SOCKET_SERVER_URL, {
  transports: ["websocket"],
  reconnection: true,          // 자동 재연결 활성화
  reconnectionAttempts: 5,     // 최대 재시도 횟수
  reconnectionDelay: 1000,     // 최초 재시도까지 대기 시간 (ms)
  reconnectionDelayMax: 5000,  // 최대 재시도 간격 (ms)
});

interface SocketState {
    air_quality_score: number; //공기질 종합 점수
    air_quality: number;
    tvoc: number; // 유기화합물
    eco2: number; // 이상화탄소
    temp: number; // 온도
    humidity: number; // 습도
    adc_raw: number; 
    pm25_raw: number;
    pm25_filtered: number;
    pm10_estimate: number;
    mq135_raw: number;
    mq135_co2_ppm: number;
    mq7_raw: number;
    mq7_co_ppm: number;
    mq4_raw: number;
    mq4_methane_ppm: number;
    motionDetectedTime: number;
    aiRecommendation: string;
    isPurifierOn: boolean;
    purifierSpeed: number;
    purifierAutoOn: number;
    purifierAutoOff: number;
    purifierMode: number;
    isDiffuserOn: boolean;
    diffuserSpeed: number;
    diffuserPeriod: number;
    diffuserType: number;
    diffuserMode: number;
    webcamImage: string | null;
    currentDeviceKey: string;
    smell_status: string;
    setWebcamImage: (image: string | null) => void;
    fetchWebcamImage: () => Promise<void>;
    updateData: (data: Partial<SocketState>) => void;
    sendControlSignal: (device: string, state: boolean | number) => void;
    registerDashboard: (device_key: string) => void;
    resetSensorData: () => void;
    chartData: any[];
    setChartData: (data: any[]) => void;
}

// Zustand 상태 관리
export const useSocketStore = create<SocketState>((set) => ({
  air_quality_score: 0,
  air_quality: 0,
  tvoc: 0, // 유기화합물
  eco2: 0, // 이상화탄소
  temp: 0, // 온도
  humidity: 0, // 습도
  adc_raw: 0,
  pm25_raw: 0,
  pm25_filtered: 0,
  pm10_estimate: 0,
  mq135_raw: 0,
  mq135_co2_ppm: 0,
  mq7_raw: 0,
  mq7_co_ppm: 0,
  mq4_raw: 0,
  mq4_methane_ppm: 0,
  motionDetectedTime: 0,
  aiRecommendation: "",

  isPurifierOn: false,
  purifierSpeed: 0,
  purifierAutoOn: 0,
  purifierAutoOff: 0,
  purifierMode: 0,
  isDiffuserOn: false,
  diffuserSpeed: 0,
  diffuserPeriod: 0,
  diffuserType: 0,
  diffuserMode: 0,

  currentDeviceKey: "",
  smell_status: "",
  resetSensorData: () =>
    set(() => ({
      air_quality_score: 0,
      air_quality: 0,
      tvoc: 0,
      eco2: 0,
      temp: 0,
      humidity: 0,
      adc_raw: 0,
      pm25_raw: 0,
      pm25_filtered: 0,
      pm10_estimate: 0,
      mq135_raw: 0,
      mq135_co2_ppm: 0,
      mq7_raw: 0,
      mq7_co_ppm: 0,
      mq4_raw: 0,
      mq4_methane_ppm: 0,
      isPurifierOn: false,
      isDiffuserOn: false,
      purifierSpeed: 0,
      purifierAutoOn: 0,
      purifierAutoOff: 0,
      purifierMode: 0,
      diffuserSpeed: 0,
      diffuserPeriod: 0,
      diffuserType: 0,
      diffuserMode: 0,
      aiRecommendation: "",
      webcamImage: null,
      smell_status: "측정중",
    })),

  updateData: (data) => set((state) => ({ ...state, ...data })),

  sendControlSignal: (device: string, state: boolean | number) => {
    socket.emit("control", { device, state });
    set((prevState) => ({
      ...prevState,
      [device]: state, // UI에 즉시 반영
    }));
  },
  registerDashboard: (device_key: string) => {
    useSocketStore.getState().resetSensorData();
    socket.emit("register_dashboard", { device_key });
    set(() => ({ currentDeviceKey: device_key }));
  },
  webcamImage: null,

  setWebcamImage: (image: string | null) => set(() => ({ webcamImage: image })),

  chartData: [],
  setChartData: (data) => set(() => ({ chartData: data })),

  fetchWebcamImage: async () => {
    try {
      socket.emit("request_webcam");
    } catch (error) {
      console.error("웹캠 요청 실패:", error);
    }
  }
}));

function setupSocketListeners() {
  socket.on("sensorData", (data) => {
    useSocketStore.getState().updateData(data);
  });

  socket.on("aiRecommendation", (message) => {
    useSocketStore.getState().updateData({ aiRecommendation: message });
  });

  socket.on("connect_error", (err) => {
    console.error("소켓 연결 오류:", err.message);
  });

  socket.on("disconnect", () => {
    console.warn("서버와의 연결이 끊겼습니다.");
  });

  socket.on("webcamImage", (data) => {
    const { image_data } = data;
    const imageBlob = new Blob([image_data], { type: "image/jpeg" });
    const imageUrl = URL.createObjectURL(imageBlob);
    useSocketStore.getState().setWebcamImage(imageUrl);
  });
}
setupSocketListeners();

export default useSocketStore;