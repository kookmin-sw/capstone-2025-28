"use client";
import React, { useEffect, useMemo, useRef } from "react";
import { Canvas } from "@react-three/fiber";
import { OrbitControls, useGLTF } from "@react-three/drei";
import { AirQualityControlSection } from "@/sections/AirQualityControlSection";
import { DigitalTwinStatusSection } from "@/sections/DigitalTwinStatusSection";
import { GlobalLoadingOverlay } from "@/components/ui/GlobalLoadingOverlay";
import Experience from "../Experience/Experience";
import { useSocketStore } from "@/stores/socketStore";
import { useFrame } from "@react-three/fiber";
import * as THREE from "three";

export default function Home() {
  const [isMobile, setIsMobile] = React.useState<boolean>(false);
  const { currentDeviceKey } = useSocketStore();
  // 1. Add useSocketStore for setIsSendingCommand
  const setIsSendingCommand = useSocketStore((state) => state.setIsSendingCommand);

  // UI fade and hover state
  const [showUI, setShowUI] = React.useState(true);
  const [hovered, setHovered] = React.useState(false);

  React.useEffect(() => {
    if (!hovered) {
      const timer = setTimeout(() => setShowUI(false), 10000);
      return () => clearTimeout(timer);
    } else {
      setShowUI(true);
    }
  }, [hovered]);

  // Weather info state
  const [weatherInfo, setWeatherInfo] = React.useState({
    icon: "02d",
    temp: null as number | null,
    description: "",
    humidity: null as number | null,
    pm10Level: null as number | null,
    pm10Description: "",
    pm25Level: null as number | null,
    pm25Description: "",
  });

  // Fetch Seoul weather and AQI
  React.useEffect(() => {
    setIsSendingCommand(true);
    const fetchWeatherAndAQI = async () => {
      try {
        const lat = 37.5683;
        const lon = 126.9778;
        const weatherKey = process.env.NEXT_PUBLIC_OPENWEATHER_API;
        const aqiKey = process.env.NEXT_PUBLIC_AIRVISUAL_API;

        const weatherRes = await fetch(
          `https://api.openweathermap.org/data/2.5/forecast?lat=${lat}&lon=${lon}&appid=${weatherKey}&units=metric`
        );
        const weatherData = await weatherRes.json();
        const icon = weatherData?.list?.[0]?.weather?.[0]?.icon || "01n";
        const temp = weatherData?.list?.[0]?.main?.temp?.toFixed?.(1) ?? null;
        const description = weatherData?.list?.[0]?.weather?.[0]?.description ?? "";
        const humidity = weatherData?.list?.[0]?.main?.humidity ?? null;

        const pollutionRes = await fetch(
          `http://api.openweathermap.org/data/2.5/air_pollution?lat=${lat}&lon=${lon}&appid=${weatherKey}`
        );
        const pollutionJson = await pollutionRes.json();
        const pm10Level = pollutionJson?.list?.[0]?.components?.pm10 ?? null;
        const pm25Level = pollutionJson?.list?.[0]?.components?.pm2_5 ?? null;
        const pm10Description = ["좋음", "보통", "약간 나쁨", "나쁨", "매우 나쁨"][
          pm10Level <= 20 ? 0 :
          pm10Level <= 50 ? 1 :
          pm10Level <= 100 ? 2 :
          pm10Level <= 200 ? 3 : 4
        ];
        const pm25Description = ["좋음", "보통", "약간 나쁨", "나쁨", "매우 나쁨"][
          pm25Level <= 10 ? 0 :
          pm25Level <= 25 ? 1 :
          pm25Level <= 50 ? 2 :
          pm25Level <= 75 ? 3 : 4
        ];

        setWeatherInfo({
          icon,
          temp,
          description,
          humidity,
          pm10Level,
          pm10Description: pm10Level !== null ? `${pm10Description} (${pm10Level})` : "",
          pm25Level,
          pm25Description: pm25Level !== null ? `${pm25Description} (${pm25Level})` : "",
        });
        // 3. Set loading false after setting weather info
        setIsSendingCommand(false);
      } catch (err) {
        // 4. Set loading false on error
        setIsSendingCommand(false);
        console.error("Failed to fetch weather/AQI data", err);
      }
    };

    fetchWeatherAndAQI();
  }, []);

  React.useEffect(() => {
    const handleResize = () => {
      setIsMobile(window.innerWidth <= 768);
    };
    handleResize();
    window.addEventListener("resize", handleResize);
    return () => window.removeEventListener("resize", handleResize);
  }, []);

  return (
    <main
      className={`flex flex-col w-full ${isMobile ? "min-h-screen" : "h-screen overflow-hidden"} items-start justify-between p-4 md:p-8 lg:p-11 relative rounded-[40px] border-[10px] border-solid border-[#ffffff1a] ${isMobile ? "bg-black [background:linear-gradient(180deg,rgba(0,0,0,0)_0%,rgba(0,0,0,0.5)_90%),url('/img/macbook-pro-14-1.png')] bg-cover bg-[50%_50%]" : "bg-black"}`}
    >
      <div className="absolute top-0 left-0 w-full h-full z-0 pointer-events-auto">
        <div
          className="absolute top-0 left-0 w-full h-full z-[-1]"
          style={{
            backgroundImage: `url("/img/weather/${weatherInfo.icon}.jpg")`,
            backgroundSize: "cover",
            backgroundPosition: "center",
            backgroundRepeat: "no-repeat",
            filter: "brightness(0.6) blur(4px)",
          }}
        />
        {!isMobile && currentDeviceKey !== "RPI-002" && (
          <Canvas camera={{ position: [6, 5, 2], fov: 60 }}>
            <ambientLight intensity={0.8} />
            <directionalLight position={[2, 3, 6]} />
            <Model3D />
            <LevoitPurifierModel />
            <OrbitControls target={[0, -2, 0]} />
          </Canvas>
        )}
        {!isMobile && currentDeviceKey === "RPI-002" && <Experience />}
      </div>

      <div className="relative z-10 w-full flex flex-col grow justify-between pointer-events-none">
        <div className="pointer-events-auto ">
          <DigitalTwinStatusSection />
        </div>
        {!isMobile ? (
          <div
            className="pointer-events-auto transition-opacity duration-1000"
            onMouseEnter={() => setHovered(true)}
            onMouseLeave={() => setHovered(false)}
            style={{ opacity: showUI ? 1 : 0.2 }}
          >
            <AirQualityControlSection weatherInfo={weatherInfo} />
          </div>
        ) : (
          <div className="pointer-events-auto">
            <AirQualityControlSection weatherInfo={weatherInfo} />
          </div>
        )}
      </div>
      <GlobalLoadingOverlay />
    </main>
  );
}

// LevoitPurifierModel
const LevoitPurifierModel = () => {
  const diffuserSpeed = useSocketStore((state) => state.diffuserSpeed);
  const purifierSpeed = useSocketStore((state) => state.purifierSpeed);
  const isPurifierOn = useSocketStore((state) => state.isPurifierOn);
  const isDiffuserOn = useSocketStore((state) => state.isDiffuserOn);
  const diffuserPeriod = useSocketStore((state) => state.diffuserPeriod);
  const chartData = useSocketStore((state) => state.chartData);
  const effectivePurifierSpeed = isPurifierOn ? purifierSpeed : 0;

  // Refs to track diffuser ON time and cycle start
  const lastDiffuserOnRef = React.useRef<number | null>(null);
  const cycleStartRef = React.useRef<number | null>(null);

  React.useEffect(() => {
    if (isDiffuserOn) {
      lastDiffuserOnRef.current = Date.now();
      if (!cycleStartRef.current) cycleStartRef.current = Date.now();
    } else {
      lastDiffuserOnRef.current = null;
      cycleStartRef.current = null;
    }
  }, [isDiffuserOn]);

  // Calculate effectiveDiffuserSpeed and effectivePurifierSpeed according to diffuser timing pattern
  const now = Date.now();
  let effectiveDiffuserSpeed = 0;
  if (cycleStartRef.current !== null) {
    const elapsed = (now - cycleStartRef.current) / 1000; // seconds
    const cycle =
      diffuserPeriod === 300
        ? 305
        : diffuserPeriod === 600
        ? 605
        : 905;
    const inCycle = elapsed % cycle;
    effectiveDiffuserSpeed = inCycle < 5 ? diffuserSpeed : 0; // diffuser ON first 5s
  }
  
  const gltf = useGLTF("/air_purifier_v1.glb", true);

  const CustomSmoke = () => {
    const particleCount = 200;
    const particlesRef = useRef<THREE.Points>(null);

    const positions = useMemo(() => {
      const arr = new Float32Array(particleCount * 3);
      for (let i = 0; i < particleCount; i++) {
        arr[i * 3] = (Math.random() - 0.5) * 0.5;
        arr[i * 3 + 1] = Math.random() * 1.5;
        arr[i * 3 + 2] = (Math.random() - 0.5) * 0.5;
      }
      return arr;
    }, []);

    const material = useMemo(() => {
      const tex = new THREE.TextureLoader().load("/img/smokeparticle.png");
      return new THREE.PointsMaterial({
        size: 0.3,
        map: tex,
        transparent: true,
        depthWrite: false,
        opacity: 0.2,
        color: "white",
        blending: THREE.AdditiveBlending,
      });
    }, []);

    const geometry = useMemo(() => {
      const geo = new THREE.BufferGeometry();
      geo.setAttribute("position", new THREE.BufferAttribute(positions, 3));
      return geo;
    }, [positions]);

    useFrame(() => {
      if (particlesRef.current) {
        const pos = particlesRef.current.geometry.attributes.position;
        const riseSpeed = 0.005 * effectiveDiffuserSpeed;
        for (let i = 0; i < particleCount; i++) {
          pos.array[i * 3 + 1] += riseSpeed;
          if (pos.array[i * 3 + 1] > 2) {
            pos.array[i * 3 + 1] = 0;
          }
        }
        pos.needsUpdate = true;
      }
    });

    return effectiveDiffuserSpeed > 0 && (
      <points
        ref={particlesRef}
        geometry={geometry}
        material={material}
        position={[0, 0.2, 0]}
      />
    );
  };

  const SuctionParticles = () => {
    const particleCount = 100;
    const particlesRef = useRef<THREE.Points>(null);

    const positions = useMemo(() => {
      const arr = new Float32Array(particleCount * 3);
      for (let i = 0; i < particleCount; i++) {
        arr[i * 3] = (Math.random() - 0.5) * 3.0;
        arr[i * 3 + 1] = Math.random() * 0.4;
        arr[i * 3 + 2] = (Math.random() - 0.5) * 3.0;
      }
      return arr;
    }, []);

    const material = useMemo(() => {
      const tex = new THREE.TextureLoader().load("/img/smokeparticle.png");
      return new THREE.PointsMaterial({
        size: 0.15,
        map: tex,
        transparent: true,
        opacity: 0.9,
        blending: THREE.AdditiveBlending,
        depthWrite: false,
        color: "#00ccff",
      });
    }, []);

    const geometry = useMemo(() => {
      const geo = new THREE.BufferGeometry();
      geo.setAttribute("position", new THREE.BufferAttribute(positions, 3));
      return geo;
    }, [positions]);

    useFrame(() => {
      if (particlesRef.current) {
        const pos = particlesRef.current.geometry.attributes.position;
        const pullStrength = 1 - 0.02 * effectivePurifierSpeed;
        for (let i = 0; i < particleCount; i++) {
          const ix = i * 3;
          const iy = ix + 1;
          const iz = ix + 2;

          pos.array[ix] *= pullStrength;
          pos.array[iy] *= pullStrength;
          pos.array[iz] *= pullStrength;

          if (
            Math.abs(pos.array[ix]) < 0.01 &&
            Math.abs(pos.array[iy]) < 0.01 &&
            Math.abs(pos.array[iz]) < 0.01
          ) {
            pos.array[ix] = (Math.random() - 0.5) * 3.0;
            pos.array[iy] = Math.random() * 0.4;
            pos.array[iz] = (Math.random() - 0.5) * 3.0;
          }
        }
        pos.needsUpdate = true;
      }
    });

    return effectivePurifierSpeed > 0 && (
      <points
        ref={particlesRef}
        geometry={geometry}
        material={material}
        position={[0, -0.6, 0]}
      />
    );
  };

  return (
    <>
      <primitive
        object={gltf.scene}
        scale={0.006}
        position={[0, -0.65, 0]}
      />
      {effectiveDiffuserSpeed > 0 && <CustomSmoke />}
      {effectivePurifierSpeed > 0 && <SuctionParticles />}
      <BalloonLabel isPurifierOn={isPurifierOn} isDiffuserOn={isDiffuserOn} chartData={chartData} />
    </>
  );
};

// Model3D
const Model3D = () => {
  const gltf = useGLTF("/sample_room3.glb", true);

  // HeatMapOverlay component
  const HeatMapOverlay = () => {
    const air_quality_score = useSocketStore((state) => state.air_quality_score);
    const geometry = useMemo(() => {
      const geo = new THREE.PlaneGeometry(3.8, 4.2, 60, 60);
      return geo;
    }, []);

    const prevScoreRef = useRef(air_quality_score);

    useFrame(() => {
      const lerpFactor = 0.05; // smoothing speed
      prevScoreRef.current += (air_quality_score - prevScoreRef.current) * lerpFactor;
      const smoothedScore = prevScoreRef.current;

      const center = new THREE.Vector2(0, 0);
      const maxDist = 1.5;

      const colors = [];
      for (let i = 0; i < geometry.attributes.position.count; i++) {
        const x = geometry.attributes.position.getX(i);
        const z = geometry.attributes.position.getY(i);
        const dist = new THREE.Vector2(x, z).distanceTo(center);
        const t = Math.min(dist / maxDist, 1);
        const easedT = 1 - Math.pow(1 - t, 2);
        const interpolatedScore = 100 * (1 - easedT) + smoothedScore * easedT;

        const scoreMin = 60;
        const scoreMax = 100;
        const clampedScore = Math.max(scoreMin, Math.min(scoreMax, interpolatedScore));
        const hue = ((clampedScore - scoreMin) / (scoreMax - scoreMin)) * 0.33;
        const color = new THREE.Color();
        color.setHSL(hue, 1, 0.5);
        colors.push(color.r, color.g, color.b);
      }

      const attr = geometry.getAttribute("color") as THREE.BufferAttribute;
      if (attr) {
        attr.copyArray(new Float32Array(colors));
        attr.needsUpdate = true;
      } else {
        geometry.setAttribute("color", new THREE.Float32BufferAttribute(colors, 3));
      }
    });

    const material = new THREE.MeshBasicMaterial({
      vertexColors: true,
      transparent: true,
      opacity: 0.6,
      side: THREE.DoubleSide,
      depthWrite: false,
    });

    return (
      <mesh
        geometry={geometry}
        material={material}
        rotation={[-Math.PI / 2, 0, 0]}
        position={[0, -1.9, 0]}
        renderOrder={1}
      />
    );
  };

  return (
    <>
      <primitive object={gltf.scene} scale={1.5} />
      <HeatMapOverlay />
    </>
  );
};

const estimateTimeToReachTarget = (data: any[], target = 30) => {
  if (!data || data.length < 6) return null;
  const filtered = data
    .map((d) => d?.pm25_filtered)
    .filter((v) => typeof v === "number");
  if (filtered.length < 6) return null;

  // Smoothing the slope calculation and clamping for stability
  const recentValues = filtered.slice(-12);
  const diffs = recentValues.slice(1).map((v, i) => v - recentValues[i]);

  const rawSlope = diffs.reduce((a, b) => a + b, 0) / diffs.length;

  if (estimateTimeToReachTarget.slopeRef == null) {
    estimateTimeToReachTarget.slopeRef = rawSlope;
  } else {
    estimateTimeToReachTarget.slopeRef = estimateTimeToReachTarget.slopeRef + (rawSlope - estimateTimeToReachTarget.slopeRef) * 0.1;
  }

  const slope = Math.max(-1, Math.min(-0.005, estimateTimeToReachTarget.slopeRef));
  if (slope >= 0) return null;

  const recent = filtered[filtered.length - 1];
  const secondsToTarget = (recent - target) / -slope;
  if (!isFinite(secondsToTarget) || secondsToTarget < 0) return null;
  return Math.round(secondsToTarget / 60);
};
estimateTimeToReachTarget.slopeRef = null as number | null;

const drawTextToCanvas = (message: string) => {
  const canvas = document.createElement("canvas");
  canvas.width = 256;
  canvas.height = 128;
  const context = canvas.getContext("2d")!;
  context.clearRect(0, 0, canvas.width, canvas.height);
  context.fillStyle = "rgba(0, 0, 0, 0.5)";
  context.strokeStyle = "rgba(0, 0, 0, 0)";
  context.lineWidth = 4;
  context.roundRect(0, 0, canvas.width, canvas.height, 20);
  context.fill();
  context.stroke();
  context.fillStyle = "#ffffff";
  context.font = "18px sans-serif";
  context.textAlign = "center";
  const lines = message.split("\n");
  lines.forEach((line, idx) => {
    context.fillText(line, canvas.width / 2, 50 + idx * 24);
  });
  return new THREE.CanvasTexture(canvas);
};

const BalloonLabel = ({ isPurifierOn, isDiffuserOn, chartData }: { isPurifierOn: boolean; isDiffuserOn: boolean; chartData: any[] }) => {
  const spriteRef = useRef<THREE.Sprite | null>(null);
  const textureRef = useRef<THREE.CanvasTexture | null>(null);
  const prevEstimatedRef = useRef<number | null>(null);
  const lastUpdateTimeRef = useRef<number>(Date.now());

  useEffect(() => {
    const drawBalloon = () => {
      const newEstimatedTime = estimateTimeToReachTarget(chartData);
      let message = isPurifierOn ? "공기청정 중입니다." : isDiffuserOn ? "디퓨저 작동 중입니다." : "대기 중입니다.";

      const now = Date.now();

      if (
        isPurifierOn &&
        newEstimatedTime &&
        (prevEstimatedRef.current === null ||
          newEstimatedTime <= prevEstimatedRef.current ||
          now - lastUpdateTimeRef.current > 60000)
      ) {
        message += `\n약 ${newEstimatedTime}분 후 미세먼지 농도가\n좋음 수준이 됩니다.`;
        if (prevEstimatedRef.current === null) {
          prevEstimatedRef.current = newEstimatedTime;
        } else {
          prevEstimatedRef.current += (newEstimatedTime - prevEstimatedRef.current) * 0.1;
        }
        lastUpdateTimeRef.current = now;
      } else if (isPurifierOn && prevEstimatedRef.current !== null) {
        const roundedEstimate = Math.round(prevEstimatedRef.current ?? newEstimatedTime);
        message += `\n약 ${roundedEstimate}분 후 미세먼지 농도가\n좋음 수준이 됩니다.`;
      }

      const texture = drawTextToCanvas(message);
      textureRef.current = texture;

      if (spriteRef.current) {
        (spriteRef.current.material as THREE.SpriteMaterial).map = texture;
        (spriteRef.current.material as THREE.SpriteMaterial).needsUpdate = true;
      }
    };

    drawBalloon(); // Initial render

    const interval = setInterval(drawBalloon, 60000);
    return () => clearInterval(interval);
  }, [isPurifierOn, isDiffuserOn, chartData]);

  useEffect(() => {
    if (spriteRef.current) {
      spriteRef.current.position.set(0, 2, 0);
      spriteRef.current.scale.set(2, 1, 1);
    }
  }, []);

  return (
    <sprite
      ref={spriteRef}
      material={new THREE.SpriteMaterial({
        map: textureRef.current,
        transparent: true,
      })}
    />
  );
};

[
  "/sample_room3.glb",
  "/air_purifier_v1.glb",
].forEach(path => useGLTF.preload(path));