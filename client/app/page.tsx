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

  const gltf = useGLTF("/levoit_air_purifier.glb", true);

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

  const BalloonLabel = () => {
    const spriteRef = useRef<THREE.Sprite>(null);

    const texture = useMemo(() => {
      const canvas = document.createElement("canvas");
      canvas.width = 256;
      canvas.height = 128;
      const context = canvas.getContext("2d")!;
      context.fillStyle = "rgba(0, 0, 0, 0.5)";
      context.strokeStyle = "rgba(0, 0, 0, 0)";
      context.lineWidth = 4;
      context.roundRect(0, 0, canvas.width, canvas.height, 20);
      context.fill();
      context.stroke();
      context.fillStyle = "#ffffff";
      context.font = "22px sans-serif";
      context.textAlign = "center";
      context.fillText("공기 정화중입니다.", canvas.width / 2, 72);
      return new THREE.CanvasTexture(canvas);
    }, []);

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
          map: texture,
          transparent: true,
        })}
      />
    );
  };

  return (
    <>
      <primitive
        object={gltf.scene}
        scale={2}
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