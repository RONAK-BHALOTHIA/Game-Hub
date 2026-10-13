"use client";
import dynamic from "next/dynamic";
import type { ComponentType } from "react";

const registry: Record<string, ComponentType> = {
  "memory-match": dynamic(() => import("./games/MemoryMatch"), { ssr: false }),
  "tic-tac-toe": dynamic(() => import("./games/TicTacToe"), { ssr: false }),
  snake: dynamic(() => import("./games/Snake"), { ssr: false }),
  "2048": dynamic(() => import("./games/Game2048"), { ssr: false }),
    "car-racing": dynamic(() => import("./games/CarRacing"), { ssr: false }),
    "bike-runner": dynamic(() => import("./games/BikeRunner"), { ssr: false }),
    "flappy-bird": dynamic(() => import("./games/FlappyBird"), { ssr: false }),
    "sliding-puzzle": dynamic(() => import("./games/SlidingPuzzle"), { ssr: false }),
    "whack-a-mole": dynamic(() => import("./games/WhackAMole"), { ssr: false }),
    "space-shooter": dynamic(() => import("./games/SpaceShooter"), { ssr: false }),
    "brick-breaker": dynamic(() => import("./games/BrickBreaker"), { ssr: false }),
    sudoku: dynamic(() => import("./games/Sudoku"), { ssr: false }),
    "target-shooter": dynamic(() => import("./games/TargetShooter"), { ssr: false }),
    "tractor-racing": dynamic(() => import("./games/TractorRacing"), { ssr: false }),
    "alien-invaders": dynamic(() => import("./games/AlienInvaders"), { ssr: false }),
    "asteroid-blaster": dynamic(() => import("./games/AsteroidBlaster"), { ssr: false }),
    "sky-hunter": dynamic(() => import("./games/SkyHunter"), { ssr: false }),
    "tank-battle": dynamic(() => import("./games/TankBattle"), { ssr: false }),
      
};

export default function GameRenderer({ slug }: { slug: string }) {
  const Game = registry[slug];
  return Game  ? <Game /> : null;
  
}