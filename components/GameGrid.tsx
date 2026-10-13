"use client";
import { useState } from "react";
import Link from "next/link";
import { games, type Category } from "@/lib/games";

const categories: ("All" | Category)[] = ["All", "Car", "Bike", "Puzzle", "Arcade", "Action", "Shooting"];

export default function GameGrid() {
  const [query, setQuery] = useState("");
  const [cat, setCat] = useState<"All" | Category>("All");

  const filtered = games.filter(
    (g) =>
      (cat === "All" || g.category === cat) &&
      g.title.toLowerCase().includes(query.toLowerCase())
  );

  return (
    <>
      <input
        value={query}
        onChange={(e) => setQuery(e.target.value)}
        placeholder="Search games..."
        className="w-full max-w-md rounded-xl border border-white/10 bg-white/5 px-4 py-3 outline-none backdrop-blur focus:border-purple-400"
      />
      <div className="mt-4 flex flex-wrap justify-center gap-2">
        {categories.map((c) => (
          <button
            key={c}
            onClick={() => setCat(c)}
            className={`rounded-full px-4 py-1.5 text-sm transition ${
              cat === c ? "bg-purple-600" : "bg-white/10 hover:bg-white/20"
            }`}
          >
            {c}
          </button>
        ))}
      </div>
            <div className="mt-10 grid w-full max-w-6xl grid-cols-1 gap-6 sm:grid-cols-2 lg:grid-cols-3">
        {filtered.map((g) => (
          <Link
            key={g.slug}
            href={`/play/${g.slug}`}
            target="_blank"
            className="rounded-3xl border border-white/10 bg-white/5 p-8 backdrop-blur transition hover:-translate-y-2 hover:border-purple-400"
          >
            <div className="text-6xl">{g.emoji}</div>
            <h3 className="mt-5 text-2xl font-semibold">{g.title}</h3>
            <p className="mt-1 text-sm text-purple-300">{g.category}</p>
            <p className="mt-3 text-sm text-white/50">{g.description}</p>
          </Link>
        ))}
        {filtered.length === 0 && (
          <p className="col-span-full text-center text-white/50">No games found.</p>
        )}
      </div>
    </>
  );
}