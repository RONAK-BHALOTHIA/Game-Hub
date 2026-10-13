import GameGrid from "@/components/GameGrid";
import Logo from "@/components/Logo";

export default function Home() {
  return (
    <main className="flex min-h-screen flex-col items-center px-6 py-16">
      <div className="flex items-center gap-3">
  <Logo size={56} />
  <h1 className="bg-gradient-to-r from-purple-400 to-cyan-400 bg-clip-text text-4xl font-bold text-transparent sm:text-5xl">
    Game Hub
  </h1>
</div>
      <p className="mb-8 mt-2 text-white/60">Pick a game and play instantly</p>
      <GameGrid />
    </main>
  );
}