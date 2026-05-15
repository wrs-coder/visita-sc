export type Country = { code: string; name: string; dial: string; flag: string };

export const COUNTRIES: Country[] = [
  { code: "BR", name: "Brasil", dial: "55", flag: "🇧🇷" },
  { code: "AO", name: "Angola", dial: "244", flag: "🇦🇴" },
  { code: "US", name: "EUA", dial: "1", flag: "🇺🇸" },
  { code: "PT", name: "Portugal", dial: "351", flag: "🇵🇹" },
];

export const DEFAULT_COUNTRY = "BR";

export function findCountry(code: string): Country {
  return COUNTRIES.find((c) => c.code === code) ?? COUNTRIES[0];
}

/** Combine dial code + local phone into a single digits string for storage. */
export function buildFullPhone(countryCode: string, localPhone: string): string {
  const c = findCountry(countryCode);
  const local = localPhone.replace(/\D/g, "");
  return `${c.dial}${local}`;
}
