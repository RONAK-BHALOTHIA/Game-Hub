import Link from "next/link";
import { notFound } from "next/navigation";
import { games } from "@/lib/games";
import GameRenderer from "@/components/GameRenderer";
import type { Metadata } from "next";

export async function generateMetadata({
  params,
}: {
  params: Promise<{ slug: string }>;
}): Promise<Metadata> {
  const { slug } = await params;
  const game = games.find((g) => g.slug === slug);
  return { title: game ? `${game.title} | Game Hub` : "Game Hub" };
}
export default async function PlayPage({
  params,
}: {
  params: Promise<{ slug: string }>;
}) {
  const { slug } = await params;
  const game = games.find((g) => g.slug === slug);
  if (!game) notFound();

  return (
    <main className="flex min-h-screen flex-col items-center justify-center p-6">
      <Link href="/" className="absolute left-6 top-6 text-sm text-white/60 hover:text-white">
        ← Home
      </Link>
      <h1 className="mb-8 text-5xl font-bold">{game.title}</h1>
      <GameRenderer slug={slug} />
    </main>
  );
}