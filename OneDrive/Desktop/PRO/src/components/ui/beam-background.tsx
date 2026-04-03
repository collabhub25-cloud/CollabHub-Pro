"use client";

import { useEffect, useRef } from "react";

interface Beam {
  x: number;
  y: number;
  width: number;
  length: number;
  angle: number;
  speed: number;
  opacity: number;
  pulse: number;
  pulseSpeed: number;
  layer: number;
}

function createBeam(width: number, height: number, layer: number): Beam {
  const angle = -35 + Math.random() * 10;
  const baseSpeed = 0.2 + layer * 0.2;
  const baseOpacity = 0.08 + layer * 0.05;
  const baseWidth = 10 + layer * 5;
  return {
    x: Math.random() * width,
    y: Math.random() * height,
    width: baseWidth,
    length: height * 2.5,
    angle,
    speed: baseSpeed + Math.random() * 0.2,
    opacity: baseOpacity + Math.random() * 0.1,
    pulse: Math.random() * Math.PI * 2,
    pulseSpeed: 0.01 + Math.random() * 0.015,
    layer,
  };
}

export const BeamBackground = () => {
    const canvasRef = useRef<HTMLCanvasElement>(null);
    const noiseRef = useRef<HTMLCanvasElement>(null);
    const beamsRef = useRef<Beam[]>([]);
    const animationFrameRef = useRef<number>(0);
    const noiseGenerated = useRef(false);
  
    const LAYERS = 3;
    const BEAMS_PER_LAYER = 4;
  
    useEffect(() => {
      const canvas = canvasRef.current;
      const noiseCanvas = noiseRef.current;
      if (!canvas || !noiseCanvas) return;
      const ctx = canvas.getContext("2d");
      const nCtx = noiseCanvas.getContext("2d");
      if (!ctx || !nCtx) return;
  
      const resizeCanvas = () => {
        const dpr = window.devicePixelRatio || 1;
        canvas.width = window.innerWidth * dpr;
        canvas.height = window.innerHeight * dpr;
        canvas.style.width = `${window.innerWidth}px`;
        canvas.style.height = `${window.innerHeight}px`;
        ctx.setTransform(1, 0, 0, 1, 0, 0);
        ctx.scale(dpr, dpr);
  
        noiseCanvas.width = window.innerWidth * dpr;
        noiseCanvas.height = window.innerHeight * dpr;
        noiseCanvas.style.width = `${window.innerWidth}px`;
        noiseCanvas.style.height = `${window.innerHeight}px`;
        nCtx.setTransform(1, 0, 0, 1, 0, 0);
        nCtx.scale(dpr, dpr);
  
        noiseGenerated.current = false;
        beamsRef.current = [];
        for (let layer = 1; layer <= LAYERS; layer++) {
          for (let i = 0; i < BEAMS_PER_LAYER; i++) {
            beamsRef.current.push(createBeam(window.innerWidth, window.innerHeight, layer));
          }
        }
      };
  
      resizeCanvas();
      window.addEventListener("resize", resizeCanvas);
  
      const generateNoise = () => {
        const imgData = nCtx.createImageData(noiseCanvas.width, noiseCanvas.height);
        for (let i = 0; i < imgData.data.length; i += 4) {
          const v = Math.random() * 255;
          imgData.data[i] = v;
          imgData.data[i + 1] = v;
          imgData.data[i + 2] = v;
          imgData.data[i + 3] = 12;
        }
        nCtx.putImageData(imgData, 0, 0);
      };
  
      const drawBeam = (beam: Beam) => {
        const isDarkMode = document.documentElement.classList.contains('dark');
        const opacityMultiplier = isDarkMode ? 1.5 : 1;

        ctx.save();
        ctx.translate(beam.x, beam.y);
        ctx.rotate((beam.angle * Math.PI) / 180);
  
        const pulsingOpacity = Math.min(1, beam.opacity * (0.8 + Math.sin(beam.pulse) * 0.4)) * opacityMultiplier;
        const gradient = ctx.createLinearGradient(0, 0, 0, beam.length);

        if (isDarkMode) {
          gradient.addColorStop(0, `rgba(250,250,250,0)`);
          gradient.addColorStop(0.2, `rgba(250,250,250,${pulsingOpacity * 0.2})`);
          gradient.addColorStop(0.5, `rgba(161,161,170,${pulsingOpacity * 0.4})`);
          gradient.addColorStop(0.8, `rgba(161,161,170,${pulsingOpacity * 0.2})`);
          gradient.addColorStop(1, `rgba(161,161,170,0)`);
        } else {
          gradient.addColorStop(0, `rgba(46,139,87,0)`);
          gradient.addColorStop(0.2, `rgba(46,139,87,${pulsingOpacity * 0.3})`);
          gradient.addColorStop(0.5, `rgba(0,71,171,${pulsingOpacity * 0.6})`);
          gradient.addColorStop(0.8, `rgba(0,71,171,${pulsingOpacity * 0.3})`);
          gradient.addColorStop(1, `rgba(0,71,171,0)`);
        }
  
        ctx.fillStyle = gradient;
        ctx.filter = `blur(${2 + beam.layer * 2}px)`;
        ctx.fillRect(-beam.width / 2, 0, beam.width, beam.length);
        ctx.restore();
      };
  
      const animate = () => {
        if (!canvas || !ctx) return;

        const isDarkMode = document.documentElement.classList.contains('dark');
  
        const gradient = ctx.createLinearGradient(0, 0, 0, canvas.height);
        if (isDarkMode) {
          gradient.addColorStop(0, "#09090B");
          gradient.addColorStop(1, "#0C0C0E");
        } else {
          gradient.addColorStop(0, "#ffffff");
          gradient.addColorStop(1, "#f8fafc");
        }
        ctx.fillStyle = gradient;
        ctx.fillRect(0, 0, canvas.width, canvas.height);
  
        beamsRef.current.forEach((beam) => {
          beam.y -= beam.speed * (beam.layer / LAYERS + 0.5);
          beam.pulse += beam.pulseSpeed;
          if (beam.y + beam.length < -50) {
            beam.y = window.innerHeight + 50;
            beam.x = Math.random() * window.innerWidth;
          }
          drawBeam(beam);
        });
  
        if (!noiseGenerated.current) {
          generateNoise();
          noiseGenerated.current = true;
        }
        animationFrameRef.current = requestAnimationFrame(animate);
      };
      animate();
  
      return () => {
        window.removeEventListener("resize", resizeCanvas);
        cancelAnimationFrame(animationFrameRef.current);
      };
    }, []);
  
    return (
        <div className="fixed inset-0 w-full h-full overflow-hidden pointer-events-none" style={{ zIndex: -1 }}>
            <canvas ref={noiseRef} className="absolute inset-0 z-0 pointer-events-none" />
            <canvas ref={canvasRef} className="absolute inset-0 z-10" />
        </div>
    );
};
