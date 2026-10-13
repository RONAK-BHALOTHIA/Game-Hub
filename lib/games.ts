export type Category = "Puzzle" | "Car" | "Bike" | "Arcade" | "Action" | "Shooting";

export interface Game {
  slug: string;
  title: string;
  category: Category;
  description: string;
  emoji: string;
}

export const games: Game[] = [
  {
    slug: "memory-match",
    title: "Memory Match",
    category: "Puzzle",
    description: "Flip cards and find all the pairs.",
    emoji: "🧩",
  },
    {
    slug: "tic-tac-toe",
    title: "Tic Tac Toe",
    category: "Puzzle",
    description: "Beat the computer in a classic 3x3 duel.",
    emoji: "❌",
  },
    {
    slug: "snake",
    title: "Snake",
    category: "Arcade",
    description: "Eat, grow, and don't hit the walls.",
    emoji: "🐍",
  },
    {
    slug: "2048",
    title: "2048",
    category: "Puzzle",
    description: "Slide and merge tiles to reach 2048.",
    emoji: "🔢",
  },
    {
    slug: "car-racing",
    title: "Car Racing",
    category: "Car",
    description: "Dodge traffic on an endless highway.",
    emoji: "🏎️",
  },
    {
    slug: "bike-runner",
    title: "Bike Stunt Runner",
    category: "Bike",
    description: "Jump rocks and crates on a neon night ride.",
    emoji: "🏍️",
  },
    {
    slug: "flappy-bird",
    title: "Flappy Bird",
    category: "Arcade",
    description: "Flap through the gaps without touching a pipe.",
    emoji: "🐤",
  },
    {
    slug: "sliding-puzzle",
    title: "Sliding Puzzle",
    category: "Puzzle",
    description: "Slide the tiles into order, from 3×3 to 5×5.",
    emoji: "🔀",
  },
    {
    slug: "whack-a-mole",
    title: "Whack-a-Mole",
    category: "Action",
    description: "Smash the moles, but avoid the bombs.",
    emoji: "🔨",
  },
    {
    slug: "space-shooter",
    title: "Space Shooter",
    category: "Action",
    description: "Blast alien saucers and survive the waves.",
    emoji: "🚀",
  },
    {
    slug: "brick-breaker",
    title: "Brick Breaker",
    category: "Arcade",
    description: "Bounce the ball and smash every brick.",
    emoji: "🧱",
  },
    {
    slug: "sudoku",
    title: "Sudoku",
    category: "Puzzle",
    description: "Fill the grid so every row, column and box has 1 to 9.",
    emoji: "🔢",
  },
    {
    slug: "target-shooter",
    title: "Target Shooter",
    category: "Shooting",
    description: "Aim, fire and hit the bullseye before time runs out.",
    emoji: "🎯",
  },
    {
    slug: "tractor-racing",
    title: "Tractor Racing",
    category: "Car",
    description: "Race a rival tractor across hilly farm fields.",
    emoji: "🚜",
  },
    {
    slug: "alien-invaders",
    title: "Alien Invaders",
    category: "Shooting",
    description: "Blast waves of alien ships before they land.",
    emoji: "👾",
  },
    {
    slug: "asteroid-blaster",
    title: "Asteroid Blaster",
    category: "Shooting",
    description: "Rotate, thrust and blast drifting asteroids.",
    emoji: "☄️",
  },
    {
    slug: "sky-hunter",
    title: "Sky Hunter",
    category: "Shooting",
    description: "Shoot the flying birds with only three shots a round.",
    emoji: "🦆",
  },
    {
    slug: "tank-battle",
    title: "Tank Battle",
    category: "Shooting",
    description: "Drive, aim and destroy waves of enemy tanks.",
    emoji: "🪖",
  },
];