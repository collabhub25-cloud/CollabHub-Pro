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
    const isDarkRef = useRef(false);
    const frameCountRef = useRef(0);
  
    const LAYERS = 3;

    useEffect(() => {
      const canvas = canvasRef.current;
      const noiseCanvas = noiseRef.current;
      if (!canvas || !noiseCanvas) return;
      const ctx = canvas.getContext("2d");
      const nCtx = noiseCanvas.getContext("2d");
      if (!ctx || !nCtx) return;

      // Detect dark mode from <html> class
      const checkDark = () => {
        isDarkRef.current = document.documentElement.classList.contains('dark');
      };
      checkDark();

      // Watch for theme changes
      const observer = new MutationObserver(checkDark);
      observer.observe(document.documentElement, { attributes: true, attributeFilter: ['class'] });

      // Responsive beam count: fewer on mobile for performance
      const getBeamsPerLayer = () => window.innerWidth < 768 ? 4 : 8;
  
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
  
        const beamsPerLayer = getBeamsPerLayer();
        beamsRef.current = [];
        for (let layer = 1; layer <= LAYERS; layer++) {
          for (let i = 0; i < beamsPerLayer; i++) {
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
          imgData.data[i + 3] = isDarkRef.current ? 8 : 12;
        }
        nCtx.putImageData(imgData, 0, 0);
      };
  
      const drawBeam = (beam: Beam) => {
        ctx.save();
        ctx.translate(beam.x, beam.y);
        ctx.rotate((beam.angle * Math.PI) / 180);
  
        const dark = isDarkRef.current;
        const opacityMult = dark ? 0.6 : 1;
        const pulsingOpacity = Math.min(1, beam.opacity * (0.8 + Math.sin(beam.pulse) * 0.4) * opacityMult);
        
        const gradient = ctx.createLinearGradient(0, 0, 0, beam.length);
        if (dark) {
          // Dark mode: softer, more visible beams with adjusted colors
          gradient.addColorStop(0, `rgba(74,222,128,0)`);
          gradient.addColorStop(0.2, `rgba(74,222,128,${pulsingOpacity * 0.2})`);
          gradient.addColorStop(0.5, `rgba(96,165,250,${pulsingOpacity * 0.4})`);
          gradient.addColorStop(0.8, `rgba(96,165,250,${pulsingOpacity * 0.2})`);
          gradient.addColorStop(1, `rgba(96,165,250,0)`);
        } else {
          // Light mode: original colors
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
        frameCountRef.current++;
        const dark = isDarkRef.current;
  
        const gradient = ctx.createLinearGradient(0, 0, 0, canvas.height);
        if (dark) {
          gradient.addColorStop(0, "#09090B");
          gradient.addColorStop(1, "#0c0c0e");
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
  
        // Throttle noise: regenerate every 3rd frame for performance
        if (frameCountRef.current % 3 === 0) {
          generateNoise();
        }
        animationFrameRef.current = requestAnimationFrame(animate);
      };
      animate();
  
      return () => {
        observer.disconnect();
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
