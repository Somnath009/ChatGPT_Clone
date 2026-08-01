import { tool } from "ai";
import { z } from "zod";

/**
 * Returns current date, time, day of week, and timezone.
 */
export const getCurrentDateTime = tool({
    description:
        "Get the current date, time, day of week, and timezone. Use this whenever the user asks about the current time, today's date, what day it is, or any time-related question.",
    inputSchema: z.object({}),
    execute: async () => {
        const now = new Date();
        return {
            dateTime: now.toISOString(),
            date: now.toLocaleDateString("en-US", {
                weekday: "long",
                year: "numeric",
                month: "long",
                day: "numeric",
            }),
            time: now.toLocaleTimeString("en-US", {
                hour: "2-digit",
                minute: "2-digit",
                second: "2-digit",
                hour12: true,
            }),
            dayOfWeek: now.toLocaleDateString("en-US", { weekday: "long" }),
            timezone: Intl.DateTimeFormat().resolvedOptions().timeZone,
            unixTimestamp: Math.floor(now.getTime() / 1000),
        };
    },
});

/**
 * Gets real-time weather information for any city or location in the world.
 * Uses wttr.in weather service (JSON API).
 */
export const getWeather = tool({
    description:
        "Get live real-time weather data for any location/city in the world (temperature, condition, humidity, wind, forecasts). Use this whenever the user asks about the weather, temperature, or climate of any city.",
    inputSchema: z.object({
        location: z
            .string()
            .describe("The name of the city, region, or location (e.g., Kolkata, London, Tokyo, New York)"),
    }),
    execute: async ({ location }) => {
        try {
            const cleanLocation = encodeURIComponent(location.trim());
            const response = await fetch(`https://wttr.in/${cleanLocation}?format=j1`, {
                headers: {
                    "User-Agent": "curl/7.68.0",
                },
                signal: AbortSignal.timeout(8000),
            });

            if (!response.ok) {
                return {
                    location,
                    error: `Weather service returned status ${response.status}`,
                };
            }

            const data = await response.json();
            const current = data.current_condition?.[0];
            const nearestArea = data.nearest_area?.[0];

            if (!current) {
                return { location, error: "Weather data not available for this location." };
            }

            return {
                location: nearestArea?.areaName?.[0]?.value || location,
                country: nearestArea?.country?.[0]?.value || "",
                region: nearestArea?.region?.[0]?.value || "",
                temperature: `${current.temp_C}°C (${current.temp_F}°F)`,
                feelsLike: `${current.FeelsLikeC}°C (${current.FeelsLikeF}°F)`,
                condition: current.weatherDesc?.[0]?.value || "Unknown",
                humidity: `${current.humidity}%`,
                windSpeed: `${current.windspeedKmph} km/h (${current.winddir16Point})`,
                precipitationMM: `${current.precipMM} mm`,
                uvIndex: current.uvIndex,
                visibilityKM: `${current.visibility} km`,
                observationTime: current.observation_time,
            };
        } catch (error) {
            return {
                location,
                error: `Could not fetch weather: ${error instanceof Error ? error.message : "Unknown error"}`,
            };
        }
    },
});

/**
 * Searches the web for current events, news, or general information.
 * Uses multiple real-time search providers (Google News RSS & Wikipedia APIs).
 */
export const webSearch = tool({
    description:
        "Search the web for current information, news, recent events, articles, facts, or topics that require up-to-date real-time knowledge.",
    inputSchema: z.object({
        query: z.string().describe("The search query to look up"),
    }),
    execute: async ({ query }) => {
        try {
            // Strategy 1: Google News RSS for news/recent events
            const newsResults = await searchGoogleNews(query);
            if (newsResults.length > 0) {
                return {
                    query,
                    source: "Google News",
                    results: newsResults,
                };
            }

            // Strategy 2: Wikipedia Search API
            const wikiResults = await searchWikipedia(query);
            if (wikiResults.length > 0) {
                return {
                    query,
                    source: "Wikipedia",
                    results: wikiResults,
                };
            }

            return {
                query,
                results: [],
                message: "No specific search results found for this query.",
            };
        } catch (error) {
            return {
                query,
                error: `Search failed: ${error instanceof Error ? error.message : "Unknown error"}`,
                results: [],
            };
        }
    },
});

/**
 * Fetches and extracts text content from a given URL.
 */
export const webScrape = tool({
    description:
        "Fetch and extract readable text content from a specific webpage URL.",
    inputSchema: z.object({
        url: z.string().url().describe("The URL of the webpage to scrape"),
    }),
    execute: async ({ url }) => {
        try {
            const response = await fetch(url, {
                headers: {
                    "User-Agent":
                        "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36",
                    Accept: "text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8",
                },
                signal: AbortSignal.timeout(10_000),
            });

            if (!response.ok) {
                return {
                    error: `Failed to fetch URL: ${response.status} ${response.statusText}`,
                    content: null,
                };
            }

            const html = await response.text();
            const text = extractTextFromHtml(html);
            const maxLength = 8000;
            const truncated = text.length > maxLength;

            return {
                url,
                title: extractTitle(html),
                content: truncated ? text.slice(0, maxLength) + "..." : text,
                truncated,
                contentLength: text.length,
            };
        } catch (error) {
            return {
                error: `Scrape failed: ${error instanceof Error ? error.message : "Unknown error"}`,
                content: null,
            };
        }
    },
});

// ─── Helpers ──────────────────────────────────────────────────────────────────

async function searchGoogleNews(query: string): Promise<{ title: string; link: string; snippet: string; date: string }[]> {
    try {
        const url = `https://news.google.com/rss/search?q=${encodeURIComponent(query)}&hl=en-US&gl=US&ceid=US:en`;
        const response = await fetch(url, {
            headers: { "User-Agent": "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7)" },
            signal: AbortSignal.timeout(6000),
        });

        if (!response.ok) return [];
        const xml = await response.text();

        const items: { title: string; link: string; snippet: string; date: string }[] = [];
        const itemMatches = xml.split("<item>");

        for (const itemXml of itemMatches.slice(1, 7)) {
            const titleMatch = itemXml.match(/<title>(.*?)<\/title>/s);
            const linkMatch = itemXml.match(/<link>(.*?)<\/link>/s);
            const pubDateMatch = itemXml.match(/<pubDate>(.*?)<\/pubDate>/s);
            const descMatch = itemXml.match(/<description>(.*?)<\/description>/s);

            if (titleMatch && linkMatch) {
                items.push({
                    title: stripHtmlTags(titleMatch[1]),
                    link: linkMatch[1].trim(),
                    snippet: descMatch ? stripHtmlTags(descMatch[1]).slice(0, 200) : "",
                    date: pubDateMatch ? pubDateMatch[1].trim() : "",
                });
            }
        }
        return items;
    } catch {
        return [];
    }
}

async function searchWikipedia(query: string): Promise<{ title: string; link: string; snippet: string }[]> {
    try {
        const url = `https://en.wikipedia.org/w/api.php?action=opensearch&search=${encodeURIComponent(query)}&limit=5&namespace=0&format=json`;
        const response = await fetch(url, { signal: AbortSignal.timeout(6000) });
        if (!response.ok) return [];
        const data = await response.json();

        const [, titles, snippets, links] = data;
        if (!Array.isArray(titles)) return [];

        return titles.map((title: string, index: number) => ({
            title,
            snippet: snippets?.[index] || "",
            link: links?.[index] || "",
        }));
    } catch {
        return [];
    }
}

function extractTitle(html: string): string {
    const match = html.match(/<title[^>]*>([\s\S]*?)<\/title>/i);
    return match ? stripHtmlTags(match[1]).trim() : "Untitled";
}

function stripHtmlTags(html: string): string {
    return html
        .replace(/<!\[CDATA\[([\s\S]*?)\]\]>/g, "$1")
        .replace(/<[^>]*>/g, "")
        .replace(/&amp;/g, "&")
        .replace(/&lt;/g, "<")
        .replace(/&gt;/g, ">")
        .replace(/&quot;/g, '"')
        .replace(/&#39;/g, "'")
        .replace(/&nbsp;/g, " ")
        .replace(/\s+/g, " ")
        .trim();
}

function extractTextFromHtml(html: string): string {
    let text = html;
    text = text.replace(/<script[\s\S]*?<\/script>/gi, "");
    text = text.replace(/<style[\s\S]*?<\/style>/gi, "");
    text = text.replace(/<noscript[\s\S]*?<\/noscript>/gi, "");
    text = text.replace(/<nav[\s\S]*?<\/nav>/gi, "");
    text = text.replace(/<footer[\s\S]*?<\/footer>/gi, "");
    text = text.replace(/<\/?(p|div|br|h[1-6]|li|tr|blockquote|pre)[^>]*>/gi, "\n");
    text = stripHtmlTags(text);
    return text
        .split("\n")
        .map((line) => line.trim())
        .filter((line) => line.length > 0)
        .join("\n");
}

export const chatTools = {
    getCurrentDateTime,
    getWeather,
    webSearch,
    webScrape,
};
