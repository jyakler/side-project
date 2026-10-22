export type SearchResult = { name: string; lat: number; lng: number };

type NominatimPlace = { name?: string; display_name: string; lat: string; lon: string };

/**
 * Finds an address or place with OpenStreetMap Nominatim (no API key).
 * Only the search text leaves the device.
 * Public server policy: about one request per second, so search runs on submit only.
 */
export async function searchPlace(query: string): Promise<SearchResult | null> {
  const params = new URLSearchParams({
    q: query,
    format: "jsonv2",
    limit: "1",
    countrycodes: "kr",
    "accept-language": "ko",
  });
  const response = await fetch(`https://nominatim.openstreetmap.org/search?${params}`);
  if (!response.ok) throw new Error(`Search failed: ${response.status}`);

  const [top] = (await response.json()) as NominatimPlace[];
  if (!top) return null;
  return { name: top.name || top.display_name, lat: Number(top.lat), lng: Number(top.lon) };
}
