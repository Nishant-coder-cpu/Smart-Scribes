/**
 * Google Programmable Search (Custom Search JSON API), server-only.
 * Returns formatted results, or "" when search is not configured or fails.
 */

const PLACEHOLDER = /^your[-_]/i;

function searchCredentials() {
  const apiKey = process.env.GOOGLE_SEARCH_API_KEY;
  const engineId = process.env.GOOGLE_SEARCH_ENGINE_ID || process.env.SEARCH_ENGINE_ID;
  if (!apiKey || !engineId || PLACEHOLDER.test(apiKey) || PLACEHOLDER.test(engineId)) {
    return null;
  }
  return { apiKey, engineId };
}

export function isWebSearchConfigured(): boolean {
  return searchCredentials() !== null;
}

export async function googleSearch(query: string, maxResults = 3): Promise<string> {
  const creds = searchCredentials();
  if (!creds) return "";

  try {
    const url =
      `https://www.googleapis.com/customsearch/v1?key=${encodeURIComponent(creds.apiKey)}` +
      `&cx=${encodeURIComponent(creds.engineId)}&q=${encodeURIComponent(query)}`;
    const response = await fetch(url, { signal: AbortSignal.timeout(10_000) });
    if (!response.ok) {
      console.error(`Search failed: HTTP ${response.status}`);
      return "";
    }
    const data = await response.json();
    if (!Array.isArray(data.items) || data.items.length === 0) return "";

    return data.items
      .slice(0, maxResults)
      .map((item: any) => `Title: ${item.title}\nSnippet: ${item.snippet}\nSource: ${item.link}`)
      .join("\n\n---\n\n");
  } catch (error) {
    console.error("Search error:", error);
    return "";
  }
}
