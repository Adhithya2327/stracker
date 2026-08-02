"use client";

interface Props {
  sectors: string[];
  value: string | null;
  onChange: (sector: string | null) => void;
}

export function SectorSelect({ sectors, value, onChange }: Props) {
  return (
    <select
      value={value ?? ""}
      onChange={(e) => onChange(e.target.value || null)}
      className="w-full border border-hairline bg-panel px-3 py-2.5 text-sm text-text focus:border-saffron/40"
    >
      <option value="">Select a sector…</option>
      {sectors.map((sector) => (
        <option key={sector} value={sector}>
          {sector}
        </option>
      ))}
    </select>
  );
}
