"use client";

import React, { useEffect, useRef, useState } from "react";
import * as THREE from "three";

interface Hero3DCanvasProps {
  className?: string;
}

export function Hero3DCanvas({ className = "" }: Hero3DCanvasProps) {
  const containerRef = useRef<HTMLDivElement | null>(null);
  const isInteractingRef = useRef(false);
  const previousMousePositionRef = useRef({ x: 0, y: 0 });
  const [webGlSupported, setWebGlSupported] = useState(true);

  useEffect(() => {
    const container = containerRef.current;
    if (!container) return;

    // Check WebGL support
    try {
      const canvasTest = document.createElement("canvas");
      const gl =
        canvasTest.getContext("webgl") ||
        canvasTest.getContext("experimental-webgl");
      if (!gl) {
        setWebGlSupported(false);
        return;
      }
    } catch {
      setWebGlSupported(false);
      return;
    }

    let isVisible = true;
    let animationFrameId: number;

    // 1. Scene, Camera, Renderer
    const scene = new THREE.Scene();
    const width = container.clientWidth || window.innerWidth;
    const height = container.clientHeight || 750;

    const camera = new THREE.PerspectiveCamera(40, width / height, 0.1, 1000);
    camera.position.set(0, 0, 20);

    const renderer = new THREE.WebGLRenderer({
      alpha: true,
      antialias: true,
      powerPreference: "high-performance",
    });
    renderer.setSize(width, height);
    renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
    renderer.toneMapping = THREE.ACESFilmicToneMapping;
    renderer.toneMappingExposure = 1.25;

    container.appendChild(renderer.domElement);

    // 2. Cinematic Dual Lighting
    const ambientLight = new THREE.AmbientLight(0x0a0f1d, 2.2);
    scene.add(ambientLight);

    // Dynamic Key Light tracking cursor (Cyan / Aqua glint)
    const cursorLight = new THREE.PointLight(0x2dd4bf, 4.5, 35);
    cursorLight.position.set(0, 4, 10);
    scene.add(cursorLight);

    // Rim Accent Light (Electric Violet / Indigo)
    const rimLight = new THREE.PointLight(0x818cf8, 4.0, 30);
    rimLight.position.set(10, -5, 8);
    scene.add(rimLight);

    // Secondary Accent Light (Deep Purple)
    const purpleLight = new THREE.PointLight(0xc084fc, 3.2, 28);
    purpleLight.position.set(-10, 6, 6);
    scene.add(purpleLight);

    // 3. Central Falcon 360 Gyroscopic Core
    const gyroGroup = new THREE.Group();
    scene.add(gyroGroup);

    // Ring 1: Outer Aerospace Titanium Bezel
    const ring1Geo = new THREE.TorusGeometry(5.4, 0.07, 24, 120);
    const ring1Mat = new THREE.MeshStandardMaterial({
      color: 0x334155,
      metalness: 0.95,
      roughness: 0.15,
      emissive: 0x0f172a,
      emissiveIntensity: 0.2,
    });
    const ring1Mesh = new THREE.Mesh(ring1Geo, ring1Mat);
    gyroGroup.add(ring1Mesh);

    // Ring 2: Precision Cyan Energy Gimbal
    const ring2Geo = new THREE.TorusGeometry(4.4, 0.05, 20, 100);
    const ring2Mat = new THREE.MeshStandardMaterial({
      color: 0x38bdf8,
      metalness: 0.9,
      roughness: 0.2,
      emissive: 0x0284c7,
      emissiveIntensity: 0.55,
    });
    const ring2Mesh = new THREE.Mesh(ring2Geo, ring2Mat);
    ring2Mesh.rotation.x = Math.PI / 3;
    gyroGroup.add(ring2Mesh);

    // Ring 3: Inner Electric Indigo Gimbal
    const ring3Geo = new THREE.TorusGeometry(3.5, 0.045, 18, 90);
    const ring3Mat = new THREE.MeshStandardMaterial({
      color: 0xa78bfa,
      metalness: 0.85,
      roughness: 0.25,
      emissive: 0x6d28d9,
      emissiveIntensity: 0.45,
    });
    const ring3Mesh = new THREE.Mesh(ring3Geo, ring3Mat);
    ring3Mesh.rotation.y = Math.PI / 4;
    gyroGroup.add(ring3Mesh);

    // Central Floating Obsidian Jewel (Faceted Icosahedron)
    const jewelGeo = new THREE.IcosahedronGeometry(2.1, 0);
    const jewelMat = new THREE.MeshStandardMaterial({
      color: 0x1e1b4b,
      metalness: 0.9,
      roughness: 0.12,
      emissive: 0x312e81,
      emissiveIntensity: 0.4,
      flatShading: true,
    });
    const jewelMesh = new THREE.Mesh(jewelGeo, jewelMat);
    gyroGroup.add(jewelMesh);

    // Holographic Wireframe Cage over Jewel
    const cageGeo = new THREE.IcosahedronGeometry(2.35, 1);
    const cageMat = new THREE.MeshBasicMaterial({
      color: 0x38bdf8,
      wireframe: true,
      transparent: true,
      opacity: 0.35,
    });
    const cageMesh = new THREE.Mesh(cageGeo, cageMat);
    gyroGroup.add(cageMesh);

    // Pulsing Luminous Core Nucleus
    const nucleusGeo = new THREE.SphereGeometry(0.85, 24, 24);
    const nucleusMat = new THREE.MeshBasicMaterial({
      color: 0x5eead4,
    });
    const nucleusMesh = new THREE.Mesh(nucleusGeo, nucleusMat);
    gyroGroup.add(nucleusMesh);

    // 4. Orbiting Technology Satellites (ERP, POS, WEB, CLOUD, AI, PAY)
    const satellites: {
      mesh: THREE.Mesh;
      trailMesh?: THREE.Line;
      radius: number;
      speed: number;
      angle: number;
      yOffset: number;
    }[] = [];

    const nodeColors = [0x2dd4bf, 0x818cf8, 0xc084fc, 0x38bdf8, 0x34d399, 0xf59e0b];

    for (let i = 0; i < 6; i++) {
      const nodeGeo = new THREE.SphereGeometry(0.24, 16, 16);
      const nodeMat = new THREE.MeshStandardMaterial({
        color: nodeColors[i],
        emissive: nodeColors[i],
        emissiveIntensity: 0.9,
        metalness: 0.8,
        roughness: 0.2,
      });
      const nodeMesh = new THREE.Mesh(nodeGeo, nodeMat);
      scene.add(nodeMesh);

      satellites.push({
        mesh: nodeMesh,
        radius: 6.0 + (i % 2) * 1.5,
        speed: 0.007 * (i % 2 === 0 ? 1 : -1) * (0.8 + (i % 3) * 0.2),
        angle: (i * Math.PI) / 3,
        yOffset: Math.sin(i * 1.2) * 1.5,
      });
    }

    // 5. Cinematic Space Particles
    const particleCount = 800;
    const particlePositions = new Float32Array(particleCount * 3);
    const particleColors = new Float32Array(particleCount * 3);

    for (let i = 0; i < particleCount * 3; i += 3) {
      const radius = 10 + Math.random() * 26;
      const theta = Math.random() * Math.PI * 2;
      const phi = Math.acos(Math.random() * 2 - 1);

      particlePositions[i] = radius * Math.sin(phi) * Math.cos(theta);
      particlePositions[i + 1] = radius * Math.sin(phi) * Math.sin(theta);
      particlePositions[i + 2] = radius * Math.cos(phi);

      // Harmonious luxury tech palette (Teal + Soft Indigo)
      if (Math.random() > 0.45) {
        particleColors[i] = 0.18;
        particleColors[i + 1] = 0.83;
        particleColors[i + 2] = 0.75;
      } else {
        particleColors[i] = 0.51;
        particleColors[i + 1] = 0.55;
        particleColors[i + 2] = 0.97;
      }
    }

    const particlesGeo = new THREE.BufferGeometry();
    particlesGeo.setAttribute(
      "position",
      new THREE.BufferAttribute(particlePositions, 3)
    );
    particlesGeo.setAttribute(
      "color",
      new THREE.BufferAttribute(particleColors, 3)
    );

    const particlesMat = new THREE.PointsMaterial({
      size: 0.09,
      vertexColors: true,
      transparent: true,
      opacity: 0.5,
      blending: THREE.AdditiveBlending,
    });

    const particleSystem = new THREE.Points(particlesGeo, particlesMat);
    scene.add(particleSystem);

    // Mouse Tracking Coordinates
    let targetMouseX = 0;
    let targetMouseY = 0;
    let currentMouseX = 0;
    let currentMouseY = 0;

    const handleMouseMove = (e: MouseEvent) => {
      const rect = container.getBoundingClientRect();
      const clientX = e.clientX - rect.left;
      const clientY = e.clientY - rect.top;

      targetMouseX = (clientX / rect.width) * 2 - 1;
      targetMouseY = -(clientY / rect.height) * 2 + 1;

      // Update Cursor Light
      cursorLight.position.x = targetMouseX * 12;
      cursorLight.position.y = targetMouseY * 8;
    };

    const handleTouchMove = (e: TouchEvent) => {
      if (e.touches.length > 0) {
        const touch = e.touches[0];
        const rect = container.getBoundingClientRect();
        targetMouseX = ((touch.clientX - rect.left) / rect.width) * 2 - 1;
        targetMouseY = -((touch.clientY - rect.top) / rect.height) * 2 + 1;
      }
    };

    const handleMouseDown = (e: MouseEvent) => {
      isInteractingRef.current = true;
      previousMousePositionRef.current = { x: e.clientX, y: e.clientY };
    };

    const handleMouseUp = () => {
      isInteractingRef.current = false;
    };

    const handleDragMove = (e: MouseEvent) => {
      if (!isInteractingRef.current) return;
      const deltaX = e.clientX - previousMousePositionRef.current.x;
      const deltaY = e.clientY - previousMousePositionRef.current.y;

      gyroGroup.rotation.y += deltaX * 0.007;
      gyroGroup.rotation.x += deltaY * 0.007;

      previousMousePositionRef.current = { x: e.clientX, y: e.clientY };
    };

    window.addEventListener("mousemove", handleMouseMove);
    window.addEventListener("touchmove", handleTouchMove, { passive: true });
    window.addEventListener("mousedown", handleMouseDown);
    window.addEventListener("mouseup", handleMouseUp);
    window.addEventListener("mousemove", handleDragMove);

    const handleResize = () => {
      if (!container) return;
      const w = container.clientWidth || window.innerWidth;
      const h = container.clientHeight || 750;
      camera.aspect = w / h;
      camera.updateProjectionMatrix();
      renderer.setSize(w, h);
    };
    window.addEventListener("resize", handleResize);

    const observer = new IntersectionObserver(
      ([entry]) => {
        isVisible = entry.isIntersecting;
      },
      { threshold: 0.05 }
    );
    observer.observe(container);

    const clock = new THREE.Clock();

    const animate = () => {
      animationFrameId = requestAnimationFrame(animate);

      if (!isVisible) return;

      const delta = clock.getDelta();
      const elapsed = clock.getElapsedTime();

      // Smooth mouse lerp
      currentMouseX += (targetMouseX - currentMouseX) * 0.04;
      currentMouseY += (targetMouseY - currentMouseY) * 0.04;

      // Refined Camera Motion
      camera.position.x = currentMouseX * 1.4;
      camera.position.y = currentMouseY * 0.9;
      camera.lookAt(0, 0, 0);

      // Gyroscope Ring Rotations
      if (!isInteractingRef.current) {
        gyroGroup.rotation.y += delta * 0.18;
        gyroGroup.rotation.x = Math.sin(elapsed * 0.3) * 0.15 + currentMouseY * 0.2;
      }

      ring1Mesh.rotation.z += delta * 0.15;
      ring2Mesh.rotation.x += delta * 0.22;
      ring3Mesh.rotation.y -= delta * 0.28;

      // Faceted Jewel Rotation
      jewelMesh.rotation.y -= delta * 0.35;
      jewelMesh.rotation.x += delta * 0.2;
      cageMesh.rotation.y += delta * 0.15;

      // Core Nucleus Pulse
      const pulseScale = 1 + Math.sin(elapsed * 2.8) * 0.12;
      nucleusMesh.scale.set(pulseScale, pulseScale, pulseScale);

      // Orbiting Satellites
      satellites.forEach((sat) => {
        sat.angle += sat.speed;
        const x = Math.cos(sat.angle) * sat.radius;
        const z = Math.sin(sat.angle) * sat.radius;
        const y = Math.sin(sat.angle * 1.5) * (sat.radius * 0.35) + sat.yOffset;

        sat.mesh.position.set(x, y, z);
      });

      // Background particle rotation
      particleSystem.rotation.y = elapsed * 0.015;
      particleSystem.rotation.x = currentMouseY * 0.05;

      renderer.render(scene, camera);
    };

    animate();

    return () => {
      cancelAnimationFrame(animationFrameId);
      observer.disconnect();
      window.removeEventListener("mousemove", handleMouseMove);
      window.removeEventListener("touchmove", handleTouchMove);
      window.removeEventListener("mousedown", handleMouseDown);
      window.removeEventListener("mouseup", handleMouseUp);
      window.removeEventListener("mousemove", handleDragMove);
      window.removeEventListener("resize", handleResize);

      ring1Geo.dispose();
      ring1Mat.dispose();
      ring2Geo.dispose();
      ring2Mat.dispose();
      ring3Geo.dispose();
      ring3Mat.dispose();
      jewelGeo.dispose();
      jewelMat.dispose();
      cageGeo.dispose();
      cageMat.dispose();
      nucleusGeo.dispose();
      nucleusMat.dispose();
      particlesGeo.dispose();
      particlesMat.dispose();

      satellites.forEach((s) => {
        s.mesh.geometry.dispose();
        if (Array.isArray(s.mesh.material)) {
          s.mesh.material.forEach((m) => m.dispose());
        } else {
          s.mesh.material.dispose();
        }
      });

      renderer.dispose();
      if (container.contains(renderer.domElement)) {
        container.removeChild(renderer.domElement);
      }
    };
  }, []);

  if (!webGlSupported) {
    return (
      <div className={`absolute inset-0 pointer-events-none flex items-center justify-center ${className}`}>
        <div className="w-[550px] h-[550px] rounded-full bg-gradient-to-tr from-teal-500/20 via-indigo-500/15 to-purple-500/20 blur-[110px]" />
      </div>
    );
  }

  return (
    <div
      ref={containerRef}
      className={`absolute inset-0 pointer-events-auto cursor-grab active:cursor-grabbing overflow-hidden ${className}`}
      style={{ touchAction: "none" }}
      aria-hidden="true"
    />
  );
}
