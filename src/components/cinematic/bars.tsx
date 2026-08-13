type BarsProps = {
  hp: number;
  mp: number;
  hpMax: number;
  mpMax: number;
  compact?: boolean;
};

function MapleBar({
  kind,
  label,
  value,
  max,
  compact,
}: {
  kind: "hp" | "mp";
  label: string;
  value: number;
  max: number;
  compact: boolean;
}) {
  const pct = Math.max(0, Math.min(100, (value / Math.max(1, max)) * 100));
  return (
    <div className={`vital-row ${compact ? "vital-row-sm" : ""}`}>
      <span className="vital-label">{label}</span>
      <div className="vital-track">
        <div
          className={kind === "hp" ? "vital-fill-hp bg-hp" : "vital-fill-mp bg-mp"}
          style={{ width: `${pct}%` }}
        />
      </div>
      <span className="vital-nums">
        {value.toLocaleString()}
        <span className="vital-slash">/{max.toLocaleString()}</span>
      </span>
    </div>
  );
}

export function VitalBars({
  hp,
  mp,
  hpMax,
  mpMax,
  compact = false,
}: BarsProps) {
  return (
    <div className="vital-stack" data-vitals="hpmp">
      <MapleBar
        kind="hp"
        label="HP"
        value={hp}
        max={hpMax}
        compact={compact}
      />
      <MapleBar
        kind="mp"
        label="MP"
        value={mp}
        max={mpMax}
        compact={compact}
      />
    </div>
  );
}
