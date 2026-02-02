export const API_BASE =
  import.meta.env.VITE_API_BASE ?? "http://127.0.0.1:5000";

export type MetadataRow = {
  university: string;
  degree: string;
};

export type YearsRange = {
  min: number;
  max: number;
};

export async function fetchMetadataFull(): Promise<MetadataRow[]> {
  const res = await fetch(`${API_BASE}/metadata/full`);
  if (!res.ok) throw new Error(`metadata/full failed: ${res.status}`);
  return res.json();
}

export async function fetchYears(): Promise<YearsRange> {
  const res = await fetch(`${API_BASE}/metadata/years`);
  if (!res.ok) throw new Error(`metadata/years failed: ${res.status}`);
  return res.json();
}