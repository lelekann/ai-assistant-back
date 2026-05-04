import axios from "axios";
import { TransitCountry } from "../../types/types";
import dotenv from "dotenv";

dotenv.config();

const COUNTRY_FLAGS: Record<string, string> = {
  DE: "🇩🇪", FR: "🇫🇷", NL: "🇳🇱", BE: "🇧🇪", PL: "🇵🇱",
  IT: "🇮🇹", ES: "🇪🇸", TR: "🇹🇷", BG: "🇧🇬", RO: "🇷🇴",
  GR: "🇬🇷", AT: "🇦🇹", CZ: "🇨🇿", HU: "🇭🇺", SK: "🇸🇰",
  RS: "🇷🇸", SI: "🇸🇮", HR: "🇭🇷", MK: "🇲🇰", AL: "🇦🇱",
  UA: "🇺🇦", GB: "🇬🇧", CH: "🇨🇭", LU: "🇱🇺", DK: "🇩🇰",
  SE: "🇸🇪", NO: "🇳🇴", FI: "🇫🇮", PT: "🇵🇹",
};

const COUNTRY_NAMES: Record<string, string> = {
  DE: "Germany", FR: "France", NL: "Netherlands", BE: "Belgium",
  PL: "Poland", IT: "Italy", ES: "Spain", TR: "Turkey",
  BG: "Bulgaria", RO: "Romania", GR: "Greece", AT: "Austria",
  CZ: "Czech Republic", HU: "Hungary", SK: "Slovakia", RS: "Serbia",
  SI: "Slovenia", HR: "Croatia", MK: "North Macedonia", AL: "Albania",
  UA: "Ukraine", GB: "United Kingdom", CH: "Switzerland", LU: "Luxembourg",
  DK: "Denmark", SE: "Sweden", NO: "Norway", FI: "Finland", PT: "Portugal",
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

const geocodeCountry = async (countryName: string): Promise<GeocodingResult | null> => {
  try {
    const response = await axios.get(
      "https://api.geoapify.com/v1/geocode/search",
      {
        params: {
          text: countryName,
          type: "country",
          apiKey: process.env.GEOAPIFY_API_KEY,
        },
      }
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
  destination: string
): Promise<TransitCountry[]> => {
  try {
    const [originGeo, destGeo] = await Promise.all([
      geocodeCountry(origin),
      geocodeCountry(destination),
    ]);

    if (!originGeo || !destGeo) return [];

    const response = await axios.get(
      "https://api.geoapify.com/v1/routing",
      {
        params: {
          waypoints: `${originGeo.lat},${originGeo.lon}|${destGeo.lat},${destGeo.lon}`,
          mode: "drive",
          apiKey: process.env.GEOAPIFY_API_KEY,
        },
      }
    );

    const features = response.data.features;
    if (!features?.length) return [];

    // Витягуємо унікальні країни з legs
    const countryCodes: string[] = [];
    const legs = features[0]?.properties?.legs ?? [];

    for (const leg of legs) {
      const steps = leg.steps ?? [];
      for (const step of steps) {
        const code = step.country_code?.toUpperCase();
        if (code && !countryCodes.includes(code)) {
          countryCodes.push(code);
        }
      }
    }

    // Якщо routing не повернув country_code — fallback до origin/dest
    if (countryCodes.length === 0) {
      const originCode = originGeo.country_code;
      const destCode = destGeo.country_code;
      if (originCode) countryCodes.push(originCode);
      if (destCode && destCode !== originCode) countryCodes.push(destCode);
    }

    return countryCodes.map((code, index) => {
      const isOrigin = index === 0;
      const isDest = index === countryCodes.length - 1;
      const issueDescription = COUNTRIES_WITH_ISSUES[code];

      return {
        code,
        name: COUNTRY_NAMES[code] ?? code,
        flag: COUNTRY_FLAGS[code] ?? "🏳️",
        status: issueDescription ? "issue" : "ok",
        issueDescription,
        // Позначаємо як assumed якщо це транзитна країна якої не було в геокодингу
        ...((!isOrigin && !isDest && !COUNTRY_NAMES[code]) && { status: "assumed" as const }),
      };
    });
  } catch (error) {
    console.error("Geoapify routing error:", error);
    return [];
  }
};