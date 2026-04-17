import type { Dot } from "../../../data/geographicData";

export interface LocationData {
  name: string;
  x_norm: number;  // normalized 0–1, mapped to your plane
  y_norm: number;  // normalized 0–1, mapped to your plane
  label?: string;
}

export async function fetchBuildingsFromSheet(csvUrl: string): Promise<Dot[]> {
  const res = await fetch(csvUrl);
  const text = await res.text();

  const [headerRow, ...rows] = text.trim().split("\n");
  const headers = headerRow.split(",").map(h => h.trim());

  return rows.map(row => {
    const cols = row.split(",").map(c => c.trim());
    const get = (key: string) => cols[headers.indexOf(key)] ?? "";

    return {
      coords: [parseFloat(get("x_norm")), parseFloat(get("y_norm"))],
      locationName: get("building_name"),
    };
  }).filter(dot => dot.coords.every(n => !isNaN(n)));
}