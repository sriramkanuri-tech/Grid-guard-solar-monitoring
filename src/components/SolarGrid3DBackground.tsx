import { useEffect, useRef } from "react";
import * as THREE from "three";

interface SolarGrid3DBackgroundProps {
  className?: string;
}

export default function SolarGrid3DBackground({
  className = "",
}: SolarGrid3DBackgroundProps) {
  const containerRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const container = containerRef.current;
    if (!container) return;

    // Check WebGL availability
    let renderer: THREE.WebGLRenderer;
    try {
      renderer = new THREE.WebGLRenderer({
        antialias: true,
        alpha: true,
        powerPreference: "high-performance",
      });
    } catch {
      // Fallback if WebGL fails on environment
      return;
    }

    const width = container.clientWidth || window.innerWidth;
    const height = container.clientHeight || window.innerHeight;

    renderer.setSize(width, height);
    renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
    renderer.toneMapping = THREE.ACESFilmicToneMapping;
    renderer.toneMappingExposure = 1.1;
    container.appendChild(renderer.domElement);

    // Scene & Deep Navy Fog
    const scene = new THREE.Scene();
    scene.fog = new THREE.FogExp2(0x020617, 0.032);

    // Perspective Camera
    const camera = new THREE.PerspectiveCamera(58, width / height, 0.1, 120);
    camera.position.set(0, 4.5, 16);

    // -----------------------------------------------------------
    // 1. Undulating 3D Solar Power Grid Mesh (Ground Wave)
    // -----------------------------------------------------------
    const gridCols = 54;
    const gridRows = 54;
    const gridGeom = new THREE.PlaneGeometry(65, 65, gridCols, gridRows);
    gridGeom.rotateX(-Math.PI / 2.15);
    gridGeom.translate(0, -3.2, -6);

    // Keep initial vertex positions for wave calculations
    const posAttr = gridGeom.attributes.position;
    const initialY = new Float32Array(posAttr.count);
    for (let i = 0; i < posAttr.count; i++) {
      initialY[i] = posAttr.getY(i);
    }

    const gridMat = new THREE.MeshBasicMaterial({
      color: 0x84cc16, // Lime-500
      wireframe: true,
      transparent: true,
      opacity: 0.18,
    });
    const gridMesh = new THREE.Mesh(gridGeom, gridMat);
    scene.add(gridMesh);

    // -----------------------------------------------------------
    // 2. Solar Photons / Energy Particle Constellation
    // -----------------------------------------------------------
    const particleCount = 650;
    const particleGeom = new THREE.BufferGeometry();
    const particlePositions = new Float32Array(particleCount * 3);
    const particleScales = new Float32Array(particleCount);

    for (let i = 0; i < particleCount; i++) {
      particlePositions[i * 3] = (Math.random() - 0.5) * 48;
      particlePositions[i * 3 + 1] = (Math.random() - 0.2) * 22;
      particlePositions[i * 3 + 2] = (Math.random() - 0.5) * 45;
      particleScales[i] = Math.random() * 0.7 + 0.3;
    }

    particleGeom.setAttribute(
      "position",
      new THREE.BufferAttribute(particlePositions, 3)
    );

    // Canvas particle texture with soft glow
    const canvas = document.createElement("canvas");
    canvas.width = 32;
    canvas.height = 32;
    const ctx = canvas.getContext("2d");
    if (ctx) {
      const gradient = ctx.createRadialGradient(16, 16, 0, 16, 16, 16);
      gradient.addColorStop(0, "rgba(225, 255, 180, 1)");
      gradient.addColorStop(0.35, "rgba(163, 230, 53, 0.85)");
      gradient.addColorStop(0.7, "rgba(16, 185, 129, 0.3)");
      gradient.addColorStop(1, "rgba(0, 0, 0, 0)");
      ctx.fillStyle = gradient;
      ctx.fillRect(0, 0, 32, 32);
    }
    const particleTexture = new THREE.CanvasTexture(canvas);

    const particleMat = new THREE.PointsMaterial({
      color: 0xa3e635,
      size: 1.1,
      map: particleTexture,
      transparent: true,
      opacity: 0.65,
      blending: THREE.AdditiveBlending,
      depthWrite: false,
    });

    const particles = new THREE.Points(particleGeom, particleMat);
    scene.add(particles);

    // -----------------------------------------------------------
    // 3. Floating 3D Geometric Energy Ring (Holographic Gyro)
    // -----------------------------------------------------------
    const ringGroup = new THREE.Group();
    ringGroup.position.set(9.5, 1.8, -4);

    const ringMat1 = new THREE.MeshBasicMaterial({
      color: 0xa3e635,
      wireframe: true,
      transparent: true,
      opacity: 0.22,
    });
    const ringMat2 = new THREE.MeshBasicMaterial({
      color: 0x10b981,
      wireframe: true,
      transparent: true,
      opacity: 0.15,
    });

    const innerCoreGeom = new THREE.IcosahedronGeometry(2.4, 1);
    const innerCore = new THREE.Mesh(innerCoreGeom, ringMat1);
    ringGroup.add(innerCore);

    const ringGeom1 = new THREE.TorusGeometry(3.6, 0.04, 12, 64);
    const ring1 = new THREE.Mesh(ringGeom1, ringMat1);
    ringGroup.add(ring1);

    const ringGeom2 = new THREE.TorusGeometry(4.4, 0.04, 12, 64);
    const ring2 = new THREE.Mesh(ringGeom2, ringMat2);
    ring2.rotation.x = Math.PI / 2.8;
    ringGroup.add(ring2);

    scene.add(ringGroup);

    // -----------------------------------------------------------
    // 4. Mouse Interactive Parallax
    // -----------------------------------------------------------
    let mouseX = 0;
    let mouseY = 0;
    let targetMouseX = 0;
    let targetMouseY = 0;

    const handleMouseMove = (e: MouseEvent) => {
      const halfW = window.innerWidth / 2;
      const halfH = window.innerHeight / 2;
      targetMouseX = (e.clientX - halfW) / halfW;
      targetMouseY = (e.clientY - halfH) / halfH;
    };

    window.addEventListener("mousemove", handleMouseMove, { passive: true });

    // Handle Window Resize
    const handleResize = () => {
      if (!container) return;
      const newWidth = container.clientWidth || window.innerWidth;
      const newHeight = container.clientHeight || window.innerHeight;

      camera.aspect = newWidth / newHeight;
      camera.updateProjectionMatrix();

      renderer.setSize(newWidth, newHeight);
      renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
    };

    window.addEventListener("resize", handleResize);

    // -----------------------------------------------------------
    // 5. Animation Loop
    // -----------------------------------------------------------
    let animationFrameId: number;
    const clock = new THREE.Clock();

    const animate = () => {
      animationFrameId = requestAnimationFrame(animate);

      const elapsedTime = clock.getElapsedTime();

      // Smooth mouse lerp
      mouseX += (targetMouseX - mouseX) * 0.04;
      mouseY += (targetMouseY - mouseY) * 0.04;

      // Parallax camera displacement
      camera.position.x = mouseX * 2.2;
      camera.position.y = 4.5 - mouseY * 1.4;
      camera.lookAt(0, 0.5, 0);

      // Undulate Grid Mesh
      const positions = gridGeom.attributes.position;
      for (let i = 0; i < positions.count; i++) {
        const x = positions.getX(i);
        const z = positions.getZ(i);

        // Sinusoidal energy wave
        const wave =
          Math.sin(x * 0.18 + elapsedTime * 1.3) * 0.6 +
          Math.cos(z * 0.22 + elapsedTime * 1.1) * 0.5;

        positions.setY(i, initialY[i] + wave);
      }
      positions.needsUpdate = true;

      // Rotate & Float Holographic Core
      innerCore.rotation.x = elapsedTime * 0.35;
      innerCore.rotation.y = elapsedTime * 0.45;
      ring1.rotation.z = elapsedTime * 0.25;
      ring2.rotation.y = elapsedTime * -0.3;
      ringGroup.position.y = 1.8 + Math.sin(elapsedTime * 0.8) * 0.4;

      // Drift Particles
      particles.rotation.y = elapsedTime * 0.035;
      particles.rotation.x = Math.sin(elapsedTime * 0.02) * 0.05;

      renderer.render(scene, camera);
    };

    animate();

    // -----------------------------------------------------------
    // 6. Cleanup
    // -----------------------------------------------------------
    return () => {
      cancelAnimationFrame(animationFrameId);
      window.removeEventListener("mousemove", handleMouseMove);
      window.removeEventListener("resize", handleResize);

      // Dispose Geometries and Materials
      gridGeom.dispose();
      gridMat.dispose();
      particleGeom.dispose();
      particleMat.dispose();
      particleTexture.dispose();
      innerCoreGeom.dispose();
      ringGeom1.dispose();
      ringGeom2.dispose();
      ringMat1.dispose();
      ringMat2.dispose();

      renderer.dispose();
      if (container.contains(renderer.domElement)) {
        container.removeChild(renderer.domElement);
      }
    };
  }, []);

  return (
    <div
      ref={containerRef}
      className={`pointer-events-none absolute inset-0 overflow-hidden ${className}`}
      aria-hidden="true"
    />
  );
}
