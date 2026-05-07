import axios from "axios";
import { TransitCountry } from "../../types/types";
import dotenv from "dotenv";

dotenv.config();

const COUNTRY_FLAGS: Record<string, string> = {
  DE: "🇩🇪",
  FR: "🇫🇷",
  NL: "🇳🇱",
  BE: "🇧🇪",
  PL: "🇵🇱",
  IT: "🇮🇹",
  ES: "🇪🇸",
  TR: "🇹🇷",
  BG: "🇧🇬",
  RO: "🇷🇴",
  GR: "🇬🇷",
  AT: "🇦🇹",
  CZ: "🇨🇿",
  HU: "🇭🇺",
  SK: "🇸🇰",
  RS: "🇷🇸",
  SI: "🇸🇮",
  HR: "🇭🇷",
  MK: "🇲🇰",
  AL: "🇦🇱",
  UA: "🇺🇦",
  GB: "🇬🇧",
  CH: "🇨🇭",
  LU: "🇱🇺",
  DK: "🇩🇰",
  SE: "🇸🇪",
  NO: "🇳🇴",
  FI: "🇫🇮",
  PT: "🇵🇹",
};

const COUNTRY_NAMES: Record<string, string> = {
  DE: "Germany",
  FR: "France",
  NL: "Netherlands",
  BE: "Belgium",
  PL: "Poland",
  IT: "Italy",
  ES: "Spain",
  TR: "Turkey",
  BG: "Bulgaria",
  RO: "Romania",
  GR: "Greece",
  AT: "Austria",
  CZ: "Czech Republic",
  HU: "Hungary",
  SK: "Slovakia",
  RS: "Serbia",
  SI: "Slovenia",
  HR: "Croatia",
  MK: "North Macedonia",
  AL: "Albania",
  UA: "Ukraine",
  GB: "United Kingdom",
  CH: "Switzerland",
  LU: "Luxembourg",
  DK: "Denmark",
  SE: "Sweden",
  NO: "Norway",
  FI: "Finland",
  PT: "Portugal",
};

// Countries with known operational issues for trucks
const COUNTRIES_WITH_ISSUES: Record<string, string> = {
  HU: "Weekend truck ban applies (Sat 22:00 – Sun 22:00)",
  RS: "Extended border wait times (2–4 hours average)",
  TR: "Additional customs inspection required",
  UA: "War zone — special permits required",
  MK: "Limited border crossing hours",
};

type GeocodingResult = {
  lat: number;
  lon: number;
  country_code: string;
};

const geocodeCountry = async (
  countryName: string,
): Promise<GeocodingResult | null> => {
  try {
    const response = await axios.get(
      "https://api.geoapify.com/v1/geocode/search",
      {
        params: {
          text: countryName,
          type: "country",
          apiKey: process.env.GEOAPIFY_API_KEY,
        },
      },
    );

    const feature = response.data.features?.[0];
    if (!feature) return null;

    return {
      lat: feature.geometry.coordinates[1],
      lon: feature.geometry.coordinates[0],
      country_code: feature.properties.country_code?.toUpperCase(),
    };
  } catch {
    return null;
  }
};

export const getTransitCountries = async (
  origin: string,
  destination: string,
): Promise<TransitCountry[]> => {
  try {
    console.log("🌍 getTransitCountries called:", { origin, destination });

    const [originGeo, destGeo] = await Promise.all([
      geocodeCountry(origin),
      geocodeCountry(destination),
    ]);

    console.log("📍 Geocoding results:", { originGeo, destGeo });

    if (!originGeo || !destGeo) return [];

    // Запит маршруту з деталями
    const response = await axios.get("https://api.geoapify.com/v1/routing", {
      params: {
        waypoints: `${originGeo.lat},${originGeo.lon}|${destGeo.lat},${destGeo.lon}`,
        mode: "drive",
        details: "country_code", // ← запитуємо country_code явно
        apiKey: process.env.GEOAPIFY_API_KEY,
      },
    });

    const features = response.data.features;
    if (!features?.length) return [];

    // Збираємо country_code з legs→steps
    const allCodes: string[] = [];
    const legs = features[0]?.properties?.legs ?? [];

    for (const leg of legs) {
      for (const step of leg.steps ?? []) {
        const code = (step.country_code ?? step.country ?? "").toUpperCase();
        if (code && !allCodes.includes(code)) {
          allCodes.push(code);
        }
      }
    }

    console.log("🏳️ Raw country codes from route:", allCodes);

    // Якщо API не повернув коди — робимо reverse geocoding точок маршруту
    if (allCodes.length === 0) {
      const geometry = features[0]?.geometry;
      let coords: [number, number][] = [];

      if (geometry?.type === "MultiLineString") {
        // MultiLineString: coordinates = array of lines, кожна лінія = array of [lon, lat]
        for (const line of geometry.coordinates) {
          coords = coords.concat(line);
        }
      } else if (geometry?.type === "LineString") {
        coords = geometry.coordinates;
      }

      console.log("📐 Total coords:", coords.length);
      console.log("📐 Sample coord:", coords[Math.floor(coords.length / 2)]);

      if (coords.length > 0) {
        const SAMPLE_COUNT = 30;
const sampleIndices = Array.from({ length: SAMPLE_COUNT }, (_, i) =>
  Math.floor((coords.length / (SAMPLE_COUNT + 1)) * (i + 1))
);

// Групуємо по 5 щоб не flood-ити API
const chunks: number[][] = [];
for (let i = 0; i < sampleIndices.length; i += 5) {
  chunks.push(sampleIndices.slice(i, i + 5));
}

const allResults: (string | null)[] = [];
for (const chunk of chunks) {
  const chunkResults = await Promise.all(
    chunk.map(async (i) => {
      const [lon, lat] = coords[i];
      try {
        const reverseResults = await axios.get(
          "https://api.geoapify.com/v1/geocode/reverse",
          { params: { lat, lon, apiKey: process.env.GEOAPIFY_API_KEY } }
        );
        const props = reverseResults.data.features?.[0]?.properties;
        console.log(`🔍 [${lat},${lon}] →`, props?.country, props?.country_code);
        return props?.country_code?.toUpperCase() ?? null;
      } catch {
        return null;
      }
    })
  );
  allResults.push(...chunkResults);
}

        console.log("🔍 Reverse geocoding results:", allResults);

        for (const code of allResults) {
          if (code && !allCodes.includes(code)) {
            allCodes.push(code);
          }
        }
      }
    }

    console.log("🏳️ Final country codes:", allCodes);

    // Фільтруємо — прибираємо origin і destination, лишаємо тільки транзит
    const originCode = originGeo.country_code?.toUpperCase();
    const destCode = destGeo.country_code?.toUpperCase();

    const transitCodes = allCodes.filter(
      (code) => code !== originCode && code !== destCode,
    );

    // Якщо транзиту немає — країни межують напряму
    if (transitCodes.length === 0) {
      console.log("✅ Direct border — no transit countries");
      return [];
    }

    return transitCodes.map((code) => {
      const issueDescription = COUNTRIES_WITH_ISSUES[code];
      return {
        code,
        name: COUNTRY_NAMES[code] ?? code,
        flag: COUNTRY_FLAGS[code] ?? "🏳️",
        status: issueDescription ? "issue" : "ok",
        issueDescription,
      };
    });
  } catch (error) {
    console.error("Geoapify routing error:", error);
    return [];
  }
};
