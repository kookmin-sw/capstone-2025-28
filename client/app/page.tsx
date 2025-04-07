"use client";
import React from "react";
import { Canvas } from "@react-three/fiber";
import { OrbitControls, useGLTF } from "@react-three/drei";
import { AirQualityControlSection } from "@/sections/AirQualityControlSection";
import { DigitalTwinStatusSection } from "@/sections/DigitalTwinStatusSection";
import { Card } from "@/components/ui/card";
import Experience from "../Experience/Experience";
import { useSocketStore } from "@/stores/socketStore";

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
      className={`flex flex-col w-full ${
        isMobile ? "min-h-screen" : "h-screen overflow-hidden"
      } items-start justify-between p-4 md:p-8 lg:p-11 relative rounded-[40px] border-[10px] border-solid border-[#ffffff1a] ${
        isMobile
          ? "bg-black [background:linear-gradient(180deg,rgba(0,0,0,0)_0%,rgba(0,0,0,0.5)_90%),url('/img/macbook-pro-14-1.png')] bg-cover bg-[50%_50%]"
          : "bg-black"
      }`}
    >
      {!isMobile && currentDeviceKey !== "RPI-002" && (
        <div className="absolute top-0 left-0 w-full h-full z-0 pointer-events-auto">
          <Canvas camera={{ position: [6, 5, 2], fov: 60 }} 
            style={{
              background: "linear-gradient(135deg, #0f2027, #203a43, #2c5364)",
            }}
          >
            <ambientLight intensity={0.8} />
            <directionalLight position={[2, 3, 6]} />
            <Model3D />
            <OrbitControls target={[0, -2, 0]} />
          </Canvas>
        </div>
      )}

      {!isMobile && currentDeviceKey === "RPI-002" && (
        <div className="absolute top-0 left-0 w-full h-full z-0 pointer-events-auto">
          <Experience />
        </div>
      )}
      
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

useGLTF.preload("/sample_room3.glb");