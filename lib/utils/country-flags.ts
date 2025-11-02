// Country code to flag emoji mapping
const COUNTRY_FLAGS: Record<string, string> = {
  // Europe
  'Finland': '🇫🇮',
  'Sweden': '🇸🇪',
  'Norway': '🇳🇴',
  'Denmark': '🇩🇰',
  'Iceland': '🇮🇸',
  'England': '🏴󐁧󐁢󐁥󐁮󐁧󐁿',
  'Scotland': '🏴󠁧󠁢󠁳󠁣󠁴󠁿',
  'Wales': '🏴󠁧󠁢󠁷󠁬󠁳󠁿',
  'Ireland': '🇮🇪',
  'Northern Ireland': '🇬🇧',
  'United Kingdom': '🇬🇧',
  'Great Britain': '🇬🇧',
  'UK': '🇬🇧',
  'GB': '🇬🇧',
  'Spain': '🇪🇸',
  'France': '🇫🇷',
  'Germany': '🇩🇪',
  'Italy': '🇮🇹',
  'Portugal': '🇵🇹',
  'Netherlands': '🇳🇱',
  'Belgium': '🇧🇪',
  'Poland': '🇵🇱',
  'Ukraine': '🇺🇦',
  'Russia': '🇷🇺',
  'Turkey': '🇹🇷',
  'Greece': '🇬🇷',
  'Czech Republic': '🇨🇿',
  'Czechia': '🇨🇿',
  'Austria': '🇦🇹',
  'Switzerland': '🇨🇭',
  'Croatia': '🇭🇷',
  'Serbia': '🇷🇸',
  'Romania': '🇷🇴',
  'Bulgaria': '🇧🇬',
  'Hungary': '🇭🇺',
  'Slovakia': '🇸🇰',
  'Slovenia': '🇸🇮',
  'Bosnia and Herzegovina': '🇧🇦',
  'Bosnia-Herzegovina': '🇧🇦',
  'Albania': '🇦🇱',
  'North Macedonia': '🇲🇰',
  'Macedonia': '🇲🇰',
  'FYR Macedonia': '🇲🇰',
  'Macedonia FYR': '🇲🇰',
  'Montenegro': '🇲🇪',
  'Kosovo': '🇽🇰',
  'Estonia': '🇪🇪',
  'Latvia': '🇱🇻',
  'Lithuania': '🇱🇹',
  'Belarus': '🇧🇾',
  'Moldova': '🇲🇩',

  // Africa
  'Nigeria': '🇳🇬',
  'Ghana': '🇬🇭',
  'Senegal': '🇸🇳',
  'Cameroon': '🇨🇲',
  'Ivory Coast': '🇨🇮',
  "Côte d'Ivoire": '🇨🇮',
  'Cote d\'Ivoire': '🇨🇮',
  'Morocco': '🇲🇦',
  'Algeria': '🇩🇿',
  'Tunisia': '🇹🇳',
  'Egypt': '🇪🇬',
  'South Africa': '🇿🇦',
  'Kenya': '🇰🇪',
  'Ethiopia': '🇪🇹',
  'DR Congo': '🇨🇩',
  'Democratic Republic of the Congo': '🇨🇩',
  'Congo DR': '🇨🇩',
  'Congo': '🇨🇬',
  'Republic of the Congo': '🇨🇬',
  'Congo Republic': '🇨🇬',

  // Americas
  'Brazil': '🇧🇷',
  'Argentina': '🇦🇷',
  'Uruguay': '🇺🇾',
  'Colombia': '🇨🇴',
  'Chile': '🇨🇱',
  'Peru': '🇵🇪',
  'Ecuador': '🇪🇨',
  'Venezuela': '🇻🇪',
  'Paraguay': '🇵🇾',
  'Bolivia': '🇧🇴',
  'Mexico': '🇲🇽',
  'USA': '🇺🇸',
  'United States': '🇺🇸',
  'United States of America': '🇺🇸',
  'US': '🇺🇸',
  'America': '🇺🇸',
  'Canada': '🇨🇦',
  'Costa Rica': '🇨🇷',
  'Jamaica': '🇯🇲',

  // Asia
  'Japan': '🇯🇵',
  'South Korea': '🇰🇷',
  'Korea Republic': '🇰🇷',
  'Korea': '🇰🇷',
  'China': '🇨🇳',
  'China PR': '🇨🇳',
  "People's Republic of China": '🇨🇳',
  'Iran': '🇮🇷',
  'Saudi Arabia': '🇸🇦',
  'Australia': '🇦🇺',
  'Qatar': '🇶🇦',
  'UAE': '🇦🇪',
  'Iraq': '🇮🇶',
  'Thailand': '🇹🇭',
  'Vietnam': '🇻🇳',
  'India': '🇮🇳',
  'Indonesia': '🇮🇩',
  'Philippines': '🇵🇭',
  'Israel': '🇮🇱',
  'Uzbekistan': '🇺🇿',
  'Jordan': '🇯🇴',
  'Lebanon': '🇱🇧',
  'Syria': '🇸🇾',
  'Palestine': '🇵🇸',
  'Bahrain': '🇧🇭',
  'Kuwait': '🇰🇼',
  'Oman': '🇴🇲',
  'Yemen': '🇾🇪',

  // More Europe
  'Luxembourg': '🇱🇺',
  'Malta': '🇲🇹',
  'Cyprus': '🇨🇾',
  'Armenia': '🇦🇲',
  'Georgia': '🇬🇪',
  'Azerbaijan': '🇦🇿',
  'Kazakhstan': '🇰🇿',
  'Liechtenstein': '🇱🇮',
  'Monaco': '🇲🇨',
  'San Marino': '🇸🇲',
  'Andorra': '🇦🇩',
  'Vatican City': '🇻🇦',

  // More Africa
  'Angola': '🇦🇴',
  'Benin': '🇧🇯',
  'Botswana': '🇧🇼',
  'Burkina Faso': '🇧🇫',
  'Burundi': '🇧🇮',
  'Cape Verde': '🇨🇻',
  'Central African Republic': '🇨🇫',
  'Chad': '🇹🇩',
  'Comoros': '🇰🇲',
  'Djibouti': '🇩🇯',
  'Equatorial Guinea': '🇬🇶',
  'Eritrea': '🇪🇷',
  'Gabon': '🇬🇦',
  'Gambia': '🇬🇲',
  'The Gambia': '🇬🇲',
  'Guinea': '🇬🇳',
  'Guinea-Bissau': '🇬🇼',
  'Lesotho': '🇱🇸',
  'Liberia': '🇱🇷',
  'Libya': '🇱🇾',
  'Madagascar': '🇲🇬',
  'Malawi': '🇲🇼',
  'Mali': '🇲🇱',
  'Mauritania': '🇲🇷',
  'Mauritius': '🇲🇺',
  'Mozambique': '🇲🇿',
  'Namibia': '🇳🇦',
  'Niger': '🇳🇪',
  'Rwanda': '🇷🇼',
  'Sao Tome and Principe': '🇸🇹',
  'Seychelles': '🇸🇨',
  'Sierra Leone': '🇸🇱',
  'Somalia': '🇸🇴',
  'Sudan': '🇸🇩',
  'South Sudan': '🇸🇸',
  'Swaziland': '🇸🇿',
  'Eswatini': '🇸🇿',
  'Tanzania': '🇹🇿',
  'Togo': '🇹🇬',
  'Uganda': '🇺🇬',
  'Zambia': '🇿🇲',
  'Zimbabwe': '🇿🇼',

  // More Americas
  'Antigua and Barbuda': '🇦🇬',
  'Bahamas': '🇧🇸',
  'Barbados': '🇧🇧',
  'Belize': '🇧🇿',
  'Cuba': '🇨🇺',
  'Dominica': '🇩🇲',
  'Dominican Republic': '🇩🇴',
  'El Salvador': '🇸🇻',
  'Grenada': '🇬🇩',
  'Guatemala': '🇬🇹',
  'Guyana': '🇬🇾',
  'Haiti': '🇭🇹',
  'Honduras': '🇭🇳',
  'Nicaragua': '🇳🇮',
  'Panama': '🇵🇦',
  'Saint Kitts and Nevis': '🇰🇳',
  'Saint Lucia': '🇱🇨',
  'Saint Vincent and the Grenadines': '🇻🇨',
  'Suriname': '🇸🇷',
  'Trinidad and Tobago': '🇹🇹',

  // More Asia/Oceania
  'Afghanistan': '🇦🇫',
  'Bangladesh': '🇧🇩',
  'Bhutan': '🇧🇹',
  'Brunei': '🇧🇳',
  'Cambodia': '🇰🇭',
  'Fiji': '🇫🇯',
  'Hong Kong': '🇭🇰',
  'Kyrgyzstan': '🇰🇬',
  'Laos': '🇱🇦',
  'Macau': '🇲🇴',
  'Malaysia': '🇲🇾',
  'Maldives': '🇲🇻',
  'Mongolia': '🇲🇳',
  'Myanmar': '🇲🇲',
  'Nepal': '🇳🇵',
  'New Zealand': '🇳🇿',
  'North Korea': '🇰🇵',
  'Pakistan': '🇵🇰',
  'Papua New Guinea': '🇵🇬',
  'Samoa': '🇼🇸',
  'Singapore': '🇸🇬',
  'Sri Lanka': '🇱🇰',
  'Taiwan': '🇹🇼',
  'Tajikistan': '🇹🇯',
  'Timor-Leste': '🇹🇱',
  'Tonga': '🇹🇴',
  'Turkmenistan': '🇹🇲',
  'Vanuatu': '🇻🇺',
}

/**
 * Get flag emoji for a country name
 * Handles dual citizenship by splitting on " / " separator
 * @param country Country name (e.g., "Finland", "Brazil", "Bosnia-Herzegovina / Finland")
 * @returns Flag emoji(s) or empty string if not found
 */
export function getCountryFlag(country: string | null | undefined): string {
  if (!country) return ''

  // Handle dual citizenship (split by " / ")
  if (country.includes(' / ')) {
    const countries = country.split(' / ')
    const flags = countries.map(c => COUNTRY_FLAGS[c.trim()]).filter(Boolean)
    return flags.join(' ')
  }

  return COUNTRY_FLAGS[country] || ''
}

/**
 * Get flag emoji and country name formatted
 * @param country Country name
 * @returns Formatted string like "🇫🇮 Finland" or just country name if no flag
 */
export function getCountryWithFlag(country: string | null | undefined): string {
  if (!country) return ''
  const flag = getCountryFlag(country)
  return flag ? `${flag} ${country}` : country
}

/**
 * Get tier badge color based on tier number
 * @param tier League tier (1-6)
 * @returns Tailwind color class
 */
export function getTierBadgeColor(tier: number | null | undefined): string {
  if (!tier) return 'bg-gray-500'

  switch (tier) {
    case 1:
      return 'bg-yellow-500' // Champions League tier
    case 2:
      return 'bg-orange-500' // Top 5 leagues
    case 3:
      return 'bg-blue-500'   // Mid-tier European
    case 4:
      return 'bg-green-500'  // Nordic top leagues
    case 5:
      return 'bg-teal-500'   // Nordic lower leagues
    case 6:
      return 'bg-gray-500'   // Amateur
    default:
      return 'bg-gray-500'
  }
}

/**
 * Get tier label text
 * @param tier League tier
 * @returns Human-readable tier label
 */
export function getTierLabel(tier: number | null | undefined): string {
  if (!tier) return 'Unknown Tier'

  switch (tier) {
    case 1:
      return 'Tier 1 - Elite'
    case 2:
      return 'Tier 2 - Top League'
    case 3:
      return 'Tier 3 - Professional'
    case 4:
      return 'Tier 4 - Professional'
    case 5:
      return 'Tier 5 - Semi-Pro'
    case 6:
      return 'Tier 6 - Amateur'
    default:
      return `Tier ${tier}`
  }
}
