"use client";

import { useEffect, useState } from "react";
import { motion } from "motion/react";
import { Button } from "@/components/ui/button";
import { MoveRight } from "lucide-react";

export const PremiumHero = ({ onRegister, onDemo }: { onRegister: () => void, onDemo: () => void }) => {
  const [titleNumber, setTitleNumber] = useState(0);
  const aiTitles = ["intelligent", "fast", "innovative", "adaptive", "reliable"];

  useEffect(() => {
    const interval = setInterval(() => {
      setTitleNumber((prev) => (prev + 1) % aiTitles.length);
    }, 2500);
    return () => clearInterval(interval);
  }, []);

  return (
    <div className="relative w-full h-screen overflow-hidden">
      <div className="relative z-20 flex h-screen w-full items-center justify-center px-6 text-center">
        <div className="container mx-auto flex flex-col items-center gap-12 text-center">
          <Button variant="secondary" size="sm" className="gap-4" onClick={onRegister}>
            Support for AI Models <MoveRight className="w-4 h-4" />
          </Button>

          <h1 className="text-5xl md:text-7xl max-w-2xl tracking-tighter font-regular">
            <span className="text-foreground">This is AI Power</span>
            <span className="relative flex w-full justify-center overflow-hidden md:pb-4 md:pt-1">
              &nbsp;
              {aiTitles.map((title, index) => (
                <motion.span
                  key={index}
                  className="absolute font-semibold text-primary"
                  initial={{ opacity: 0, y: "-100" }}
                  transition={{ type: "spring", stiffness: 50 }}
                  animate={
                    titleNumber === index
                      ? { y: 0, opacity: 1 }
                      : { y: titleNumber > index ? -150 : 150, opacity: 0 }
                  }
                >
                  {title}
                </motion.span>
              ))}
            </span>
          </h1>

          <p className="text-lg md:text-xl leading-relaxed tracking-tight text-muted-foreground max-w-2xl text-center">
           Highly customizable components for building modern websites and applications that look and feel the way you mean it.
          </p>

          <div className="flex flex-row gap-3 flex-wrap justify-center">
            <Button size="sm" className="gap-4" variant="outline" onClick={onDemo}>
              Explore UI CAT <MoveRight className="w-4 h-4" />
            </Button>
          </div>
        </div>
      </div>
    </div>
  );
};
