import React, { useEffect, useRef } from 'react';
import * as THREE from 'three';
import { useStore } from '../store/store';

export function DataNexus() {
  const containerRef = useRef<HTMLDivElement>(null);
  const mode = useStore(state => state.mode);
  const targetLerp = useRef(0);

  useEffect(() => {
    targetLerp.current = mode === 'SWARM' ? 0 : 1;
  }, [mode]);

  useEffect(() => {
    const container = containerRef.current;
    if (!container) return;

    const scene = new THREE.Scene();
    scene.fog = new THREE.FogExp2(0x0a0a0a, 0.015);

    const camera = new THREE.PerspectiveCamera(50, window.innerWidth / window.innerHeight, 0.1, 1000);
    camera.position.set(0, 10, 45);

    const renderer = new THREE.WebGLRenderer({ antialias: true, alpha: true, powerPreference: 'high-performance' });
    renderer.setSize(window.innerWidth, window.innerHeight);
    renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
    container.appendChild(renderer.domElement);

    const AGENT_COUNT = 96000;
    const geometry = new THREE.BufferGeometry();

    const pSwarm = new Float32Array(AGENT_COUNT * 3);
    const pMatrix = new Float32Array(AGENT_COUNT * 3);
    const cSwarm = new Float32Array(AGENT_COUNT * 3);
    const cMatrix = new Float32Array(AGENT_COUNT * 3);

    const gridSize = Math.ceil(Math.pow(AGENT_COUNT, 1 / 3));
    const spacing = 0.55;
    const offset = (gridSize * spacing) / 2;

    for (let i = 0; i < AGENT_COUNT; i++) {
      const i3 = i * 3;

      // Swarm (Golden ratio spherical distribution for elegance)
      const r = Math.pow(Math.random(), 0.5) * 28;
      const theta = i * Math.PI * (1 + Math.sqrt(5)); // Golden angle
      const phi = Math.acos(1 - (2 * (i + 0.5)) / AGENT_COUNT);

      pSwarm[i3] = r * Math.sin(phi) * Math.cos(theta);
      pSwarm[i3 + 1] = r * Math.sin(phi) * Math.sin(theta) * 0.4; // Flatter disk
      pSwarm[i3 + 2] = r * Math.cos(phi);

      // Matrix (Crystalline flawless grid)
      const x = i % gridSize;
      const y = Math.floor((i / gridSize) % gridSize);
      const z = Math.floor(i / (gridSize * gridSize));

      pMatrix[i3] = x * spacing - offset;
      pMatrix[i3 + 1] = y * spacing - offset;
      pMatrix[i3 + 2] = z * spacing - offset;

      // Colors
      // Swarm: gentle cyan to deep cerulean
      cSwarm[i3] = 0.4 + Math.random() * 0.1; // R
      cSwarm[i3 + 1] = 0.7 + Math.random() * 0.3; // G
      cSwarm[i3 + 2] = 0.9 + Math.random() * 0.1; // B

      // Matrix: pure crystalline frost
      cMatrix[i3] = 0.9;
      cMatrix[i3 + 1] = 0.92;
      cMatrix[i3 + 2] = 1.0;
    }

    geometry.setAttribute('position', new THREE.BufferAttribute(pSwarm, 3));
    geometry.setAttribute('position2', new THREE.BufferAttribute(pMatrix, 3));
    geometry.setAttribute('color', new THREE.BufferAttribute(cSwarm, 3));
    geometry.setAttribute('color2', new THREE.BufferAttribute(cMatrix, 3));

    const material = new THREE.ShaderMaterial({
      uniforms: {
        uLerp: { value: 0 },
        uTime: { value: 0 },
        uDPixelRatio: { value: Math.min(window.devicePixelRatio, 2) },
      },
      vertexShader: `
        uniform float uLerp;
        uniform float uTime;
        uniform float uDPixelRatio;

        attribute vec3 position2;
        attribute vec3 color2;

        varying vec3 vColor;

        void main() {
          vec3 pos = mix(position, position2, uLerp);
          vColor = mix(color, color2, uLerp);

          // Gentle oceanic breathing in swarm mode
          float drift = sin(uTime * 0.5 + pos.x) * 0.5 * (1.0 - uLerp);
          pos.y += drift;

          vec4 mvPosition = modelViewMatrix * vec4(pos, 1.0);

          // Keep points small and elegant
          gl_PointSize = (4.0 / -mvPosition.z) * (uDPixelRatio * 6.0);
          if (gl_PointSize < 1.0) gl_PointSize = 1.0;

          gl_Position = projectionMatrix * mvPosition;
        }
      `,
      fragmentShader: `
        varying vec3 vColor;
        void main() {
          // Render a smooth, anti-aliased circle
          float d = distance(gl_PointCoord, vec2(0.5));
          if (d > 0.45) discard;

          float alpha = smoothstep(0.45, 0.2, d);
          gl_FragColor = vec4(vColor, alpha * 0.85); // Gentle transparency
        }
      `,
      transparent: true,
      depthWrite: false, // Prevents depth-sorting artifacts for particles
      blending: THREE.AdditiveBlending, // Makes clusters glow nicely
    });

    const points = new THREE.Points(geometry, material);
    scene.add(points);

    let animationId: number;
    let lastTime = performance.now();
    let elapsedTime = 0;

    const animate = () => {
      animationId = requestAnimationFrame(animate);
      const now = performance.now();
      const delta = (now - lastTime) / 1000; // seconds
      lastTime = now;
      elapsedTime += delta;

      material.uniforms.uTime.value = elapsedTime;

      // Smooth interpolation for the structure transition
      material.uniforms.uLerp.value += (targetLerp.current - material.uniforms.uLerp.value) * 0.04;

      // Rotation differs between the two states
      const swarmRotationSpeed = 0.05;
      const matrixRotationSpeed = 0.005;
      const effectiveRotationSpeed = THREE.MathUtils.lerp(
        swarmRotationSpeed,
        matrixRotationSpeed,
        material.uniforms.uLerp.value,
      );

      points.rotation.y += delta * effectiveRotationSpeed;

      renderer.render(scene, camera);
    };
    animate();

    const handleResize = () => {
      camera.aspect = window.innerWidth / window.innerHeight;
      camera.updateProjectionMatrix();
      renderer.setSize(window.innerWidth, window.innerHeight);
      material.uniforms.uDPixelRatio.value = Math.min(window.devicePixelRatio, 2);
    };
    window.addEventListener('resize', handleResize);

    return () => {
      cancelAnimationFrame(animationId);
      window.removeEventListener('resize', handleResize);
      if (container.contains(renderer.domElement)) {
        container.removeChild(renderer.domElement);
      }
      geometry.dispose();
      material.dispose();
      renderer.dispose();
    };
  }, []);

  return (
    <div
      ref={containerRef}
      style={{
        position: 'absolute',
        inset: 0,
        zIndex: 1,
        background: 'radial-gradient(circle at 50% 50%, #0c0c0e 0%, #030303 100%)',
      }}
    />
  );
}
