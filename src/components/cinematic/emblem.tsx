type EmblemProps = {
  className?: string;
  glow?: boolean;
};

/**
 * Full in-game N — both stems, transparent ground, nearest-neighbor.
 * NEVER put this in a tall sliver (h >> w). The letter is ~1:1.
 * NEVER swap for a 3D sculpture or /brand/emblem.jpg.
 */
export function Emblem({ className = "size-10", glow = false }: EmblemProps) {
  return (
    <img
      src="/brand/n-pixel.png"
      alt="NumbahWan"
      width={68}
      height={69}
      data-emblem="pixel-n"
      className={`pixel object-contain ${glow ? "drop-shadow-[0_0_10px_rgb(255_106_0_/_0.55)]" : ""} ${className}`}
      draggable={false}
    />
  );
}
