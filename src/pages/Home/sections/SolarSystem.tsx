// Decorative solar system for the homepage hero. Approved via a live
// preview mockup before integration — see project notes. Each planet
// layers a lighting-highlight gradient over its own base texture
// (bands for gas giants, blotches for rocky ones) in a single CSS
// `background`, so no extra DOM nodes or external image assets are
// needed per planet. Sizes are percentages of the component's own
// square container, so the whole thing scales fluidly at any size —
// matching how the previous SVG-based version scaled via viewBox.

interface OrbitDef {
  sizePct: number; // ring diameter, % of container
  planetPct: number; // planet diameter, % of container
  duration: number; // seconds per full revolution
  background: string;
  dashed?: boolean;
  ring?: { tilt: number; scaleY: number; color: string };
}

const ORBITS: OrbitDef[] = [
  {
    // Mercury
    sizePct: 12.8, planetPct: 0.95, duration: 19,
    background: `
      radial-gradient(circle at 32% 28%, rgba(255,255,255,0.45), transparent 55%),
      radial-gradient(circle at 70% 65%, rgba(0,0,0,0.25), transparent 40%),
      radial-gradient(circle at 60% 20%, rgba(0,0,0,0.2), transparent 30%),
      radial-gradient(circle at 40% 70%, #9b958d, #6f6a63 70%)`,
  },
  {
    // Venus
    sizePct: 20.3, planetPct: 1.49, duration: 31,
    background: `
      radial-gradient(circle at 32% 28%, rgba(255,255,255,0.4), transparent 55%),
      radial-gradient(circle at 55% 55%, rgba(170,130,70,0.35), transparent 50%),
      radial-gradient(circle at 40% 55%, #cdb27e, #9c7c4a 75%)`,
  },
  {
    // Earth
    sizePct: 29.1, planetPct: 1.49, duration: 45, dashed: true,
    background: `
      radial-gradient(circle at 32% 28%, rgba(255,255,255,0.4), transparent 45%),
      radial-gradient(circle at 60% 70%, rgba(90,110,70,0.65) 0 18%, transparent 40%),
      radial-gradient(circle at 30% 60%, rgba(100,115,75,0.55) 0 14%, transparent 35%),
      radial-gradient(circle at 70% 30%, rgba(255,255,255,0.18) 0 10%, transparent 30%),
      radial-gradient(circle at 40% 50%, #3d6f9e, #1f4068 75%)`,
  },
  {
    // Mars
    sizePct: 38.5, planetPct: 1.22, duration: 61,
    background: `
      radial-gradient(circle at 32% 28%, rgba(255,255,255,0.35), transparent 50%),
      radial-gradient(circle at 60% 60%, rgba(90,40,25,0.4), transparent 40%),
      radial-gradient(circle at 35% 65%, #b5633f, #7c3b22 75%)`,
  },
  {
    // Jupiter
    sizePct: 49.3, planetPct: 2.57, duration: 82,
    background: `
      radial-gradient(circle at 32% 28%, rgba(255,255,255,0.3), transparent 55%),
      repeating-linear-gradient(4deg,
        #c99a63 0 8%, #a9763f 8% 15%, #d2ad7c 15% 22%,
        #8f6434 22% 28%, #c99a63 28% 36%, #b8884f 36% 44%,
        #d2ad7c 44% 52%, #a9763f 52% 60%, #c99a63 60% 100%)`,
  },
  {
    // Saturn
    sizePct: 60.8, planetPct: 2.16, duration: 108,
    ring: { tilt: -24, scaleY: 0.36, color: "rgba(216,180,106,0.7)" },
    background: `
      radial-gradient(circle at 32% 28%, rgba(255,255,255,0.35), transparent 50%),
      repeating-linear-gradient(3deg,
        #e8d4a3 0 10%, #cdab6f 10% 20%, #e8d4a3 20% 32%, #d8ba82 32% 100%)`,
  },
  {
    // Uranus — tilted almost vertical, matching its real ~98° axial tilt
    sizePct: 72.3, planetPct: 1.76, duration: 136,
    ring: { tilt: 82, scaleY: 0.4, color: "rgba(163,214,214,0.55)" },
    background: `
      radial-gradient(circle at 32% 28%, rgba(255,255,255,0.4), transparent 55%),
      radial-gradient(circle at 55% 60%, rgba(120,190,190,0.3), transparent 50%),
      radial-gradient(circle at 40% 50%, #9fd4d4, #5a9c9c 75%)`,
  },
  {
    // Neptune
    sizePct: 83.1, planetPct: 1.76, duration: 165,
    background: `
      radial-gradient(circle at 32% 28%, rgba(255,255,255,0.35), transparent 50%),
      radial-gradient(circle at 60% 65%, rgba(30,50,110,0.4), transparent 45%),
      radial-gradient(circle at 40% 50%, #3a5fa8, #223b70 75%)`,
  },
];

// cqw/cqh (container query units) resolve against this outer container
// at ANY nesting depth, unlike plain %, which resolves against each
// element's own immediate parent — the planet here sits inside two
// unsized wrapper divs (the rotating orbit layer, then the orbit-radius
// offset), so plain percentages would need those wrappers to carry an
// explicit size too. Container units sidestep that entirely.
function pct(p: number) {
  return `${p}cqw`;
}

export default function SolarSystem({ className = "" }: { className?: string }) {
  return (
    <div className={className} style={{ containerType: "size" }} aria-hidden="true">
      {/* Sun */}
      <div
        className="absolute left-1/2 top-1/2 z-10 rounded-full"
        style={{
          width: pct(4.5),
          height: pct(4.5),
          marginLeft: pct(-2.25),
          marginTop: pct(-2.25),
          background: "radial-gradient(circle at 35% 30%, #fff6d8, var(--color-accent-bright) 45%, var(--color-accent) 80%)",
          boxShadow: "0 0 22px 6px rgba(231,191,90,0.5), 0 0 55px 18px rgba(200,150,47,0.22)",
        }}
      />

      {ORBITS.map((o, i) => (
        <div key={i}>
          {/* Static ring outline */}
          <div
            className="absolute left-1/2 top-1/2 rounded-full border"
            style={{
              width: pct(o.sizePct),
              height: pct(o.sizePct),
              marginLeft: pct(-o.sizePct / 2),
              marginTop: pct(-o.sizePct / 2),
              borderColor: o.dashed ? "rgba(231,191,90,0.28)" : "var(--color-line-dark)",
              borderStyle: o.dashed ? "dashed" : "solid",
              borderWidth: 1,
            }}
          />
          {/* Rotating layer carrying the planet — each on its own
              independent, continuous timer (reusing the existing
              spin-slow keyframe with a per-planet duration), rather than
              the whole group rotating together tied to scroll position. */}
          <div
            className="absolute left-1/2 top-1/2"
            style={{
              width: pct(o.sizePct),
              height: pct(o.sizePct),
              marginLeft: pct(-o.sizePct / 2),
              marginTop: pct(-o.sizePct / 2),
              animation: `spin-slow ${o.duration}s linear infinite`,
            }}
          >
            <div className="absolute left-full top-1/2">
              {o.ring && (
                <div
                  className="absolute rounded-full"
                  style={{
                    width: pct(o.planetPct * 2.5),
                    height: pct(o.planetPct * 2.5),
                    top: pct(-o.planetPct * 1.25),
                    left: pct(-o.planetPct * 1.25),
                    border: `2px solid ${o.ring.color}`,
                    transform: `rotate(${o.ring.tilt}deg) scaleY(${o.ring.scaleY})`,
                  }}
                />
              )}
              <div
                className="absolute rounded-full"
                style={{
                  width: pct(o.planetPct),
                  height: pct(o.planetPct),
                  marginTop: pct(-o.planetPct / 2),
                  marginLeft: pct(-o.planetPct / 2),
                  background: o.background,
                  boxShadow: "0 0 7px 1px rgba(0,0,0,0.3)",
                }}
              />
            </div>
          </div>
        </div>
      ))}
    </div>
  );
}
