import { describe, it, expect } from "vitest";
import { normalizeForSearch } from "@/lib/utils";
import { getCurrentPrayer, findNearestCity } from "@/lib/prayer-api";
import { TURKEY_CITIES, type PrayerTimes } from "@/data/cities";

describe("normalizeForSearch", () => {
  it("should correctly normalize Turkish characters for search", () => {
    expect(normalizeForSearch("İstanbul")).toBe("istanbul");
    expect(normalizeForSearch("İZMİR")).toBe("izmir");
    expect(normalizeForSearch("Diyarbakır")).toBe("diyarbakir");
    expect(normalizeForSearch("AĞRI")).toBe("agri");
    expect(normalizeForSearch("Şanlıurfa")).toBe("sanliurfa");
    expect(normalizeForSearch("Çanakkale")).toBe("canakkale");
    expect(normalizeForSearch("Gümüşhane")).toBe("gumushane");
    expect(normalizeForSearch("Kütahya")).toBe("kutahya");
  });
});

describe("findNearestCity", () => {
  it("should find the nearest city by GPS coordinates", () => {
    const nearest = findNearestCity(41.0370, 28.9850, TURKEY_CITIES);
    expect(nearest.name).toBe("İstanbul");

    const nearestAnkara = findNearestCity(39.9208, 32.8541, TURKEY_CITIES);
    expect(nearestAnkara.name).toBe("Ankara");
  });
});

describe("getCurrentPrayer", () => {
  const sampleTimes: PrayerTimes = {
    Fajr: "05:00",
    Sunrise: "06:30",
    Dhuhr: "13:00",
    Asr: "16:30",
    Maghrib: "19:30",
    Isha: "21:00",
  };

  it("should return valid prayer or null", () => {
    const result = getCurrentPrayer(sampleTimes);
    expect(result === null || ["Fajr", "Sunrise", "Dhuhr", "Asr", "Maghrib", "Isha"].includes(result)).toBe(true);
  });
});
