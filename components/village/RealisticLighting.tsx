"use client";
/* Three.js renderer and scene are intentionally mutable external objects. */
/* eslint-disable react-hooks/immutability */
import { useEffect } from "react";
import { useThree } from "@react-three/fiber";
import * as THREE from "three";
import { RoomEnvironment } from "three/addons/environments/RoomEnvironment.js";
import { setRealisticMaterials } from "./Primitives";
export default function RealisticLighting() {
  const { gl, scene } = useThree();
  useEffect(() => {
    setRealisticMaterials(true);
    gl.toneMapping = THREE.ACESFilmicToneMapping;
    gl.toneMappingExposure = 1.0;
    const generator = new THREE.PMREMGenerator(gl),
      room = new RoomEnvironment();
    const environment = generator.fromScene(room, 0.04);
    scene.environment = environment.texture;
    scene.environmentIntensity = 0.4;
    // Analytic environment avoids large texture downloads.
    generator.dispose();
    room.dispose();
    return () => {
      scene.environment = null;
      environment.dispose();
      setRealisticMaterials(false);
    };
  }, [gl, scene]);
  return null;
}
