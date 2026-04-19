import type { Dot } from "../../../data/DotType";
import { toSpotifyEmbed } from "./dataParsing";

type FetchDataParams = {
  dataPointsCsvUrl: string;
  perBuildingCsvUrl: string;
}

function parseCSVRow(row: string): string[] {
  const cols: string[] = [];
  let current = '';
  let inQuotes = false;

  for (let i = 0; i < row.length; i++) {
    const char = row[i];
    if (char === '"') {
      inQuotes = !inQuotes;
    } else if (char === ',' && !inQuotes) {
      cols.push(current.trim());
      current = '';
    } else {
      current += char;
    }
  }
  cols.push(current.trim());
  return cols;
}

export async function fetchData({ dataPointsCsvUrl, perBuildingCsvUrl }: FetchDataParams): Promise<Dot[]> {
  const [dataPointsRes, perBuildingRes] = await Promise.all([
    fetch(dataPointsCsvUrl),
    fetch(perBuildingCsvUrl),
  ]);

  const [dataPointsText, perBuildingText] = await Promise.all([
    dataPointsRes.text(),
    perBuildingRes.text(),
  ]);

  // Parse perBuilding CSV into a lookup map keyed by building_name
  const [pbHeaderRow, ...pbRows] = perBuildingText.trim().split("\n");
  const pbHeaders = pbHeaderRow.split(",").map(h => h.trim());

  const perBuildingMap = new Map<string, Record<string, string>>();
  for (const row of pbRows) {
    const cols = parseCSVRow(row);
    const get = (key: string) => cols[pbHeaders.indexOf(key)] ?? "";
    const buildingName = get("building_name");
    if (buildingName) {
      perBuildingMap.set(buildingName, Object.fromEntries(pbHeaders.map((h, i) => [h, cols[i] ?? ""])));
    }
  }

  // Parse dataPoints CSV
  const [dpHeaderRow, ...dpRows] = dataPointsText.trim().split("\n");
  const dpHeaders = dpHeaderRow.split(",").map(h => h.trim());

  return dpRows.flatMap((row, i) => {
    const cols = parseCSVRow(row);
    const get = (key: string) => cols[dpHeaders.indexOf(key)] ?? "";

    const buildingName = get("Where do you listen to this playlist on campus?");
    const emotion = get("How do you feel while listening to this music?");

    const pbRow = perBuildingMap.get(buildingName);
    if (!pbRow) {
      return [];
    }

    const x = parseFloat(pbRow["x_norm"]);
    const y = parseFloat(pbRow["y_norm"]);
    if (isNaN(x) || isNaN(y)) {
      return [];
    }

    const dot = {
      coords: [x, y],
      locationName: pbRow["building_name"],
      spotifyEmbed: toSpotifyEmbed(pbRow["playlist"]),
      bpm: Number(pbRow["avg_bpm"]),
      emotion,
    };
    console.log(`[fetchData] row ${i}: mapped dot`, dot);
    return [dot];
  });
}