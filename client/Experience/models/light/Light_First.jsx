import React, { useRef, useMemo } from "react";
import { useGLTF } from "@react-three/drei";
import { convertMaterialsToBasic } from "../../utils/convertToBasic";
import * as THREE from "three";
import videos from "../../utils/videoTextures";

export default function Model(props) {
  const { nodes, materials } = useGLTF("/models/Light Room/Light_First.glb");
  const newMaterials = convertMaterialsToBasic(materials);

  const desktopScreenRef = useRef();
  const iPhoneScreenRef = useRef();

  const computerScreenMaterial = useMemo(() => {
    return new THREE.MeshBasicMaterial({
      color: "#f6f6f6",
      map: videos.designWork.texture,
    });
  }, []);

  return (
    <group {...props} dispose={null}>
      <mesh
        ref={iPhoneScreenRef}
        geometry={nodes.iPhone_Screen.geometry}
        material={computerScreenMaterial}
        position={[23.994, 0.734, -1.338]}
        rotation={[0, -1.193, Math.PI / 2]}
      />
      <mesh
        ref={desktopScreenRef}
        geometry={nodes.Desktop_Screen.geometry}
        material={computerScreenMaterial}
        position={[24.377, 0.968, -1.548]}
        rotation={[-Math.PI / 2, 0, 0]}
      />
      <mesh
        geometry={nodes.Light_First_Baked.geometry}
        material={newMaterials.REAL_first_Baked}
        position={[23.66, 1.452, -1.692]}
        rotation={[-Math.PI / 2, 0, 0]}
      />
    </group>
  );
}

useGLTF.preload("/models/Light Room/Light_First.glb");
