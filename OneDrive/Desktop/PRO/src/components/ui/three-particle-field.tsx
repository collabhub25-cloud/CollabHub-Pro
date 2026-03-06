'use client';

import { useRef, useMemo } from 'react';
import { Canvas, useFrame } from '@react-three/fiber';
import { Float, PointMaterial, Points } from '@react-three/drei';
import * as THREE from 'three';
import { useTheme } from 'next-themes';

function ParticleNetwork({ color }: { color: string }) {
    const pointsRef = useRef<THREE.Points>(null);

    // Generate 250 random particles in a sphere
    const [positions, sizes] = useMemo(() => {
        const particleCount = 250;
        const positions = new Float32Array(particleCount * 3);
        const sizes = new Float32Array(particleCount);

        for (let i = 0; i < particleCount; i++) {
            // Use spherical distribution
            const r = 10 * Math.cbrt(Math.random());
            const theta = Math.random() * 2 * Math.PI;
            const phi = Math.acos(2 * Math.random() - 1);

            positions[i * 3] = r * Math.sin(phi) * Math.cos(theta);
            positions[i * 3 + 1] = r * Math.sin(phi) * Math.sin(theta);
            positions[i * 3 + 2] = r * Math.cos(phi);

            sizes[i] = Math.random() * 0.5 + 0.1;
        }

        return [positions, sizes];
    }, []);

    // Gentle rotation
    useFrame((state, delta) => {
        if (pointsRef.current) {
            pointsRef.current.rotation.y -= delta * 0.05;
            pointsRef.current.rotation.x -= delta * 0.02;
        }
    });

    return (
        <Float speed={1.5} rotationIntensity={0.5} floatIntensity={0.5}>
            <Points ref={pointsRef} positions={positions} stride={3}>
                <PointMaterial
                    transparent
                    color={color}
                    size={0.15}
                    sizeAttenuation={true}
                    depthWrite={false}
                    opacity={0.6}
                />
            </Points>
        </Float>
    );
}

function DynamicCamera() {
    useFrame((state) => {
        // Parallax effect based on mouse movement
        const targetX = (state.pointer.x * 2);
        const targetY = (state.pointer.y * 2);

        state.camera.position.x += (targetX - state.camera.position.x) * 0.05;
        state.camera.position.y += (targetY - state.camera.position.y) * 0.05;
        state.camera.lookAt(0, 0, 0);
    });
    return null;
}

export function ThreeParticleField() {
    const { theme } = useTheme();
    // Use #4ADE80 (Warm Light Green) for dark mode and #2A7D43 (Warm Rich Green) for light mode
    const particleColor = theme === 'dark' ? '#4ADE80' : '#2A7D43';

    return (
        <div className="absolute inset-0 -z-10 pointer-events-none opacity-40">
            <Canvas
                camera={{ position: [0, 0, 15], fov: 45 }}
                gl={{ antialias: true, alpha: true }}
            >
                <DynamicCamera />
                <ambientLight intensity={0.5} />
                <ParticleNetwork color={particleColor} />
            </Canvas>
            {/* Vignette overlay to blend the edges */}
            <div className="absolute inset-0 bg-gradient-to-t from-background via-transparent to-background dark:opacity-80 opacity-60 pointer-events-none" />
            <div className="absolute inset-0 bg-[radial-gradient(circle_at_center,transparent_0%,var(--background)_80%)] dark:opacity-80 opacity-60 pointer-events-none" />
        </div>
    );
}
