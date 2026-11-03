import fs from "fs";
import path from "path";

let locauxCache: string[] | null = null;
let locauxSetCache: Set<string> | null = null;

export function normalizeLocal(value: string) {
  return value.trim().toUpperCase();
}

// convertit le fichier locaux.json en un tableau de strings normalisés
export function getLocaux() {
  if (locauxCache) {
    return locauxCache;
  }

  // lit le fichier locaux.json et le convertit en un tableau de strings normalisés
  const filePath = path.join(__dirname, "../config/locaux.json");
  const raw = fs.readFileSync(filePath, "utf8");
  const parsed = JSON.parse(raw);

  // vérifie que le fichier contient une liste de strings
  if (
    !Array.isArray(parsed) ||
    !parsed.every((item) => typeof item === "string")
  ) {
    throw new Error(
      "Le fichier locaux.json doit contenir une liste de locaux.",
    );
  }

  locauxCache = parsed.map(normalizeLocal);
  locauxSetCache = new Set(locauxCache);
  return locauxCache;
}

export function isValidLocal(value: string) {
  const normalized = normalizeLocal(value);
  const locauxSet = locauxSetCache ?? new Set(getLocaux());

  locauxSetCache = locauxSet;
  return locauxSet.has(normalized);
}
