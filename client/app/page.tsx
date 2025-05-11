"use client";
import React, { useEffect, useMemo, useRef } from "react";
import { Canvas } from "@react-three/fiber";
import { OrbitControls, useGLTF } from "@react-three/drei";
import { AirQualityControlSection } from "@/sections/AirQualityControlSection";
import { DigitalTwinStatusSection } from "@/sections/DigitalTwinStatusSection";
import Experience from "../Experience/Experience";
import { useSocketStore } from "@/stores/socketStore";
import { useFrame } from "@react-three/fiber";
import * as THREE from "three";

const LevoitPurifierModel = () => {
  const diffuserSpeed = useSocketStore((state) => state.diffuserSpeed);
  const purifierSpeed = useSocketStore((state) => state.purifierSpeed);
  const isPurifierOn = useSocketStore((state) => state.isPurifierOn);
  const isDiffuserOn = useSocketStore((state) => state.isDiffuserOn);
  const effectiveDiffuserSpeed = isDiffuserOn ? diffuserSpeed : 0;
  const effectivePurifierSpeed = isPurifierOn ? purifierSpeed : 0;

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
        arr[i * 3] = (Math.random() - 0.5) * 1.5;
        arr[i * 3 + 1] = Math.random() * 0.2;
        arr[i * 3 + 2] = (Math.random() - 0.5) * 1.5;
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

          if (Math.abs(pos.array[ix]) < 0.01 &&
              Math.abs(pos.array[iy]) < 0.01 &&
              Math.abs(pos.array[iz]) < 0.01) {
            pos.array[ix] = (Math.random() - 0.5) * 1.5;
            pos.array[iy] = Math.random() * 0.2;
            pos.array[iz] = (Math.random() - 0.5) * 1.5;
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

  // BalloonLabel: 공기청정기/디퓨저 상태에 따라 메시지 표시 + 미세먼지 10 도달 예상 시간
  const BalloonLabel = () => {
    const spriteRef = useRef<THREE.Sprite | null>(null);
    const isPurifierOn = useSocketStore((state) => state.isPurifierOn);
    const isDiffuserOn = useSocketStore((state) => state.isDiffuserOn);
    const chartData = useSocketStore((state) => state.chartData);
    const textureRef = useRef<THREE.CanvasTexture | null>(null);

    // pm25_filtered 추이로 단순 선형 예측 (초 단위, 최근 60초 데이터 사용)
    const estimateTimeToReachTarget = (data: any[], target = 10) => {
      if (!data || data.length < 2) return null;
      // 최근 60개 데이터 중 pm25_filtered만 추출
      const filtered = data
        .map((d) => d?.pm25_filtered)
        .filter((v) => typeof v === "number");
      if (filtered.length < 2) return null;
      const recent = filtered[filtered.length - 1];
      const past = filtered[0];
      const deltaValue = recent - past;
      const deltaTime = filtered.length; // 초 단위 (1초 간격 가정)
      const slope = deltaValue / deltaTime;
      if (slope >= 0) return null; // 감소 추세가 아니면 예측 불가
      const secondsToTarget = (recent - target) / -slope;
      if (!isFinite(secondsToTarget) || secondsToTarget < 0) return null;
      return Math.round(secondsToTarget/60);
    };

    const estimatedTime = estimateTimeToReachTarget(chartData);
    let message = isPurifierOn
      ? "공기청정 중입니다."
      : isDiffuserOn
      ? "디퓨저 작동 중입니다."
      : "대기 중입니다.";

    if (isPurifierOn && estimatedTime) {
      message += `\n약 ${estimatedTime}분 후 미세먼지 농도가
      좋음 수준이 됩니다.`;
    }
    // message += `\n\n약 25초후 미세먼지 10µg/m³ 예상`;

    useEffect(() => {
      const canvas = document.createElement("canvas");
      canvas.width = 256;
      canvas.height = 128;
      const context = canvas.getContext("2d")!;
      context.clearRect(0, 0, canvas.width, canvas.height);

      // 말풍선 배경
      context.fillStyle = "rgba(0, 0, 0, 0.5)";
      context.strokeStyle = "rgba(0, 0, 0, 0)";
      context.lineWidth = 4;
      context.roundRect(0, 0, canvas.width, canvas.height, 20);
      context.fill();
      context.stroke();

      // 텍스트 (여러 줄)
      context.fillStyle = "#ffffff";
      context.font = "18px sans-serif";
      context.textAlign = "center";
      const lines = message.split("\n");
      lines.forEach((line, idx) => {
        context.fillText(line, canvas.width / 2, 50 + idx * 24);
      });

      const texture = new THREE.CanvasTexture(canvas);
      textureRef.current = texture;

      if (spriteRef.current) {
        (spriteRef.current.material as THREE.SpriteMaterial).map = texture;
        (spriteRef.current.material as THREE.SpriteMaterial).needsUpdate = true;
      }
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

  return (
    <>
      <primitive
        object={gltf.scene}
        scale={0.006}
        position={[0, -0.65, 0]}
      />
      {effectiveDiffuserSpeed > 0 && <CustomSmoke />}
      {effectivePurifierSpeed > 0 && <SuctionParticles />}
      <BalloonLabel />
    </>
  );
};

export default function Home() {
  const [isMobile, setIsMobile] = React.useState<boolean>(false);
  const { currentDeviceKey } = useSocketStore();

  React.useEffect(() => {
    const handleResize = () => {
      setIsMobile(window.innerWidth <= 768);
    };
    handleResize();
    window.addEventListener("resize", handleResize);
    return () => window.removeEventListener("resize", handleResize);
  }, []);

  const Model3D = () => {
    const gltf = useGLTF("/sample_room3.glb", true);
    return <primitive object={gltf.scene} scale={1.5} />;
  };

  return (
    <main
      className={`flex flex-col w-full ${isMobile ? "min-h-screen" : "h-screen overflow-hidden"} items-start justify-between p-4 md:p-8 lg:p-11 relative rounded-[40px] border-[10px] border-solid border-[#ffffff1a] ${isMobile ? "bg-black [background:linear-gradient(180deg,rgba(0,0,0,0)_0%,rgba(0,0,0,0.5)_90%),url('/img/macbook-pro-14-1.png')] bg-cover bg-[50%_50%]" : "bg-black"}`}
    >
      <div className="absolute top-0 left-0 w-full h-full z-0 pointer-events-auto">
        {!isMobile && currentDeviceKey !== "RPI-002" && (
          <Canvas camera={{ position: [6, 5, 2], fov: 60 }} 
            style={{
              background: "linear-gradient(135deg, #0f2027, #203a43, #2c5364)",
            }}
          >
            <ambientLight intensity={0.8} />
            <directionalLight position={[2, 3, 6]} />
            <Model3D />
            <LevoitPurifierModel />
            <OrbitControls target={[0, -2, 0]} />
          </Canvas>
        )}
        {!isMobile && currentDeviceKey === "RPI-002" && (
           <Experience /> 
        )}
      </div>

      <div className="relative z-10 w-full flex flex-col grow justify-between pointer-events-none">
        <div className="pointer-events-auto ">
          <DigitalTwinStatusSection />
        </div>
        <div className="pointer-events-auto">
          <AirQualityControlSection />
        </div>
      </div>
    </main>
  );
}

[
  "/sample_room3.glb",
  "/levoit_air_purifier.glb",
  "/evanescent_smoke.glb",
].forEach(path => useGLTF.preload(path));