export type Country = { code: string; name: string; dial: string; flag: string };

export const COUNTRIES: Country[] = [
  // Padrão e Lusófonos principais no topo
  { code: "BR", name: "Brasil", dial: "55", flag: "🇧🇷" },
  { code: "PT", name: "Portugal", dial: "351", flag: "🇵🇹" },
  { code: "AO", name: "Angola", dial: "244", flag: "🇦🇴" },
  { code: "MZ", name: "Moçambique", dial: "258", flag: "🇲🇿" },
  { code: "CV", name: "Cabo Verde", dial: "238", flag: "🇨🇻" },
  { code: "GW", name: "Guiné-Bissau", dial: "245", flag: "🇬🇼" },
  { code: "ST", name: "São Tomé e Príncipe", dial: "239", flag: "🇸🇹" },
  { code: "TL", name: "Timor-Leste", dial: "670", flag: "🇹🇱" },

  // Américas
  { code: "AR", name: "Argentina", dial: "54", flag: "🇦🇷" },
  { code: "BO", name: "Bolívia", dial: "591", flag: "🇧🇴" },
  { code: "CA", name: "Canadá", dial: "1", flag: "🇨🇦" },
  { code: "CL", name: "Chile", dial: "56", flag: "🇨🇱" },
  { code: "CO", name: "Colômbia", dial: "57", flag: "🇨🇴" },
  { code: "EC", name: "Equador", dial: "593", flag: "🇪🇨" },
  { code: "US", name: "Estados Unidos", dial: "1", flag: "🇺🇸" },
  { code: "MX", name: "México", dial: "52", flag: "🇲🇽" },
  { code: "PY", name: "Paraguai", dial: "595", flag: "🇵🇾" },
  { code: "PE", name: "Peru", dial: "51", flag: "🇵🇪" },
  { code: "UY", name: "Uruguai", dial: "598", flag: "🇺🇾" },
  { code: "VE", name: "Venezuela", dial: "58", flag: "🇻🇪" },

  // Europa
  { code: "DE", name: "Alemanha", dial: "49", flag: "🇩🇪" },
  { code: "ES", name: "Espanha", dial: "34", flag: "🇪🇸" },
  { code: "FR", name: "França", dial: "33", flag: "🇫🇷" },
  { code: "IT", name: "Itália", dial: "39", flag: "🇮🇹" },
  { code: "GB", name: "Reino Unido", dial: "44", flag: "🇬🇧" },
  { code: "CH", name: "Suíça", dial: "41", flag: "🇨🇭" },

  // Outros Principais
  { code: "ZA", name: "África do Sul", dial: "27", flag: "🇿🇦" },
  { code: "AU", name: "Austrália", dial: "61", flag: "🇦🇺" },
  { code: "JP", name: "Japão", dial: "81", flag: "🇯🇵" },
];

export const DEFAULT_COUNTRY = "BR";

export function findCountry(code: string): Country {
  return COUNTRIES.find((c) => c.code === code) ?? COUNTRIES[0];
}

/** Combina o DDI com o telefone local em uma única sequência de números para armazenamento. */
export function buildFullPhone(countryCode: string, localPhone: string): string {
  const c = findCountry(countryCode);
  const local = localPhone.replace(/\D/g, "");
  return `${c.dial}${local}`;
}
