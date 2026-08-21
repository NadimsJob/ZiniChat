export interface CountryInfo {
  code: string;       // ISO 2-letter code
  name: string;       // English Name
  nameBn: string;     // Bengali Name
  dialCode: string;   // Phone dial code e.g. +880
  flag: string;       // Emoji flag
}

export const COUNTRIES: CountryInfo[] = [
  { code: 'BD', name: 'Bangladesh', nameBn: 'বাংলাদেশ', dialCode: '+880', flag: '🇧🇩' },
  { code: 'IN', name: 'India', nameBn: 'ভারত', dialCode: '+91', flag: '🇮🇳' },
  { code: 'AE', name: 'United Arab Emirates', nameBn: 'সংযুক্ত আরব আমিরাত', dialCode: '+971', flag: '🇦🇪' },
  { code: 'SA', name: 'Saudi Arabia', nameBn: 'সৌদি আরব', dialCode: '+966', flag: '🇸🇦' },
  { code: 'US', name: 'United States', nameBn: 'যুক্তরাষ্ট্র', dialCode: '+1', flag: '🇺🇸' },
  { code: 'GB', name: 'United Kingdom', nameBn: 'যুক্তরাজ্য', dialCode: '+44', flag: '🇬🇧' },
  { code: 'MY', name: 'Malaysia', nameBn: 'মালয়েশিয়া', dialCode: '+60', flag: '🇲🇾' },
  { code: 'SG', name: 'Singapore', nameBn: 'সিঙ্গাপুর', dialCode: '+65', flag: '🇸🇬' },
  { code: 'CA', name: 'Canada', nameBn: 'কানাডা', dialCode: '+1', flag: '🇨🇦' },
  { code: 'AU', name: 'Australia', nameBn: 'অস্ট্রেলিয়া', dialCode: '+61', flag: '🇦🇺' },
  { code: 'PK', name: 'Pakistan', nameBn: 'পাকিস্তান', dialCode: '+92', flag: '🇵🇰' },
  { code: 'QA', name: 'Qatar', nameBn: 'কাতার', dialCode: '+974', flag: '🇶🇦' },
  { code: 'OM', name: 'Oman', nameBn: 'ওমান', dialCode: '+968', flag: '🇴🇲' },
  { code: 'KW', name: 'Kuwait', nameBn: 'কুয়েত', dialCode: '+965', flag: '🇰🇼' },
  { code: 'BH', name: 'Bahrain', nameBn: 'বাহরাইন', dialCode: '+973', flag: '🇧🇭' },
  { code: 'IT', name: 'Italy', nameBn: 'ইতালি', dialCode: '+39', flag: '🇮🇹' },
  { code: 'FR', name: 'France', nameBn: 'ফ্রান্স', dialCode: '+33', flag: '🇫🇷' },
  { code: 'DE', name: 'Germany', nameBn: 'জার্মানি', dialCode: '+49', flag: '🇩🇪' },
  { code: 'JP', name: 'Japan', nameBn: 'জাপান', dialCode: '+81', flag: '🇯🇵' },
  { code: 'KR', name: 'South Korea', nameBn: 'দক্ষিণ কোরিয়া', dialCode: '+82', flag: '🇰🇷' },
  { code: 'ZA', name: 'South Africa', nameBn: 'দক্ষিণ আফ্রিকা', dialCode: '+27', flag: '🇿🇦' },
  { code: 'TR', name: 'Turkey', nameBn: 'তুরস্ক', dialCode: '+90', flag: '🇹🇷' },
  { code: 'EG', name: 'Egypt', nameBn: 'মিশর', dialCode: '+20', flag: '🇪🇬' },
];

export const DEFAULT_COUNTRY = COUNTRIES[0]; // Bangladesh (+880)

export function findCountryByNameOrCode(countryNameOrCode?: string): CountryInfo {
  if (!countryNameOrCode) return DEFAULT_COUNTRY;
  const lower = countryNameOrCode.toLowerCase().trim();
  const match = COUNTRIES.find(
    c => c.name.toLowerCase() === lower || c.code.toLowerCase() === lower || c.nameBn === countryNameOrCode
  );
  return match || DEFAULT_COUNTRY;
}

export function findCountryByDialCode(dialCode?: string): CountryInfo {
  if (!dialCode) return DEFAULT_COUNTRY;
  const match = COUNTRIES.find(c => dialCode.startsWith(c.dialCode));
  return match || DEFAULT_COUNTRY;
}
