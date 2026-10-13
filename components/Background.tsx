export default function Background() {
  return (
    <div className="fixed inset-0 -z-10 overflow-hidden bg-[#05060f]">
      <div className="blob bg-purple-600/30 top-[-10%] left-[-10%]" />
      <div className="blob bg-cyan-500/20 bottom-[-15%] right-[-10%] [animation-delay:-6s]" />
      <div className="blob bg-fuchsia-600/20 top-[40%] left-[45%] [animation-delay:-12s]" />
      <div className="stars" />
    </div>
  );
}   