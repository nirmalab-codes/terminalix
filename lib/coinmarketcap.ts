// CoinMarketCap API integration for cryptocurrency metadata

const CMC_API_KEY = process.env.NEXT_PUBLIC_CMC_API_KEY || '15d0b043-7ffe-423b-914a-567855d9cad8';
const CMC_BASE_URL = 'https://pro-api.coinmarketcap.com/v1';

// Cache for CMC data to avoid excessive API calls
const cmcCache = new Map<string, { logo: string; id: number; name: string; slug: string; updatedAt: number }>();
const CACHE_DURATION = 24 * 60 * 60 * 1000; // 24 hours

// Symbol to CMC ID mapping for common cryptocurrencies
const SYMBOL_TO_CMC_ID: Record<string, number> = {
  'BTC': 1,
  'ETH': 1027,
  'BNB': 1839,
  'SOL': 5426,
  'XRP': 52,
  'USDC': 3408,
  'ADA': 2010,
  'AVAX': 5805,
  'DOGE': 74,
  'DOT': 6636,
  'MATIC': 3890,
  'SHIB': 5994,
  'TRX': 1958,
  'LINK': 1975,
  'UNI': 7083,
  'LTC': 2,
  'TON': 11419,
  'SUI': 20947,
  'PEPE': 24478,
  'WIF': 28752,
  'BONK': 23095,
  'FLOKI': 10804,
  '1000SATS': 28683,
  'ARB': 11841,
  'OP': 11840,
  'INJ': 7226,
  'SEI': 23149,
  'TIA': 22861,
  'JUP': 29210,
  'ORDI': 25028,
  'WLD': 13502,
  'ENA': 30171,
  'PENDLE': 9481,
  'STRK': 22691,
  'PIXEL': 29308,
  'PORTAL': 29555,
  'CYBER': 28298,
  'MEME': 28301,
  'APE': 18876,
  'GALA': 7080,
  'SAND': 6210,
  'MANA': 1966,
  'AXS': 6783,
  'IMX': 10603,
  'BEAM': 28298,
  'PRIME': 23711,
  'LUNC': 4172,
  'USTC': 7129,
  'FTM': 3513,
  'NEAR': 6535,
  'ATOM': 3794,
  'ALGO': 4030,
  'XLM': 512,
  'VET': 3077,
  'HBAR': 4642,
  'FIL': 2280,
  'ICP': 8916,
  'THETA': 2416,
  'GRT': 6719,
  'AAVE': 7278,
  'MKR': 1518,
  'SNX': 2586,
  'COMP': 5692,
  'CRV': 6538,
  'LDO': 8000,
  'RPL': 2943,
  'GMX': 11857,
  'STX': 4847,
  'BLUR': 23121,
  'CFX': 7334,
  'FET': 3773,
  'AGIX': 2424,
  'OCEAN': 3911,
  'RNDR': 5690,
  'WOO': 7501,
  'CHZ': 4066,
  'ENJ': 2130,
  'FLOW': 4558,
  'KAVA': 4846,
  'ROSE': 7653,
  'ONE': 3945,
  'KSM': 5034,
  'ZIL': 2469,
  'WAVES': 1274,
  'QTUM': 1684,
  'BAT': 1697,
  'ZEC': 1437,
  'DASH': 131,
  'EOS': 1765,
  'BCH': 1831,
  'ETC': 1321,
  'NEO': 1376,
  'XMR': 328,
  'BANANA': 31188,
  'DOGS': 30696,
  'TURBO': 30761,
  'BRETT': 29743,
  'POPCAT': 28782,
  'NEIRO': 31888,
  'MEW': 30126,
  'BOME': 29870,
  'PNUT': 32158,
  'ACT': 32219,
  'GOAT': 32061,
  'MOODENG': 32559,
  'PONKE': 30149,
  'FTT': 4195,
  'BGB': 11610,
  'MOVE': 32739,
  'ME': 32696,
  'VIRTUAL': 30163,
  'JASMY': 8425,
  'PEOPLE': 14556,
  'OM': 6536,
  'OG': 30787,
  'SUPER': 8290,
  'CELO': 5567,
  'W': 29551,
  'SAGA': 30372,
  'BAKE': 7064,
  'EDU': 24613,
  'HOOK': 23657,
  'HIGH': 10232,
  'ACE': 32068,
  'ARKM': 25373,
  'GMT': 18069,
  'METIS': 9640,
  'AEVO': 29662,
  'MANTA': 13631,
  'ALT': 32417,
  'PYTH': 28177,
  'DYM': 28932,
  'RONIN': 14101,
  'BLAST': 28480,
  'ZK': 24091,
  'IO': 30843,
  'ZRO': 30958,
  'LISTA': 30736,
  'REZ': 30843,
  'BB': 25909,
  'OMNI': 30767,
  'TAO': 22974,
  'TNSR': 30288,
  'EIGEN': 32652,
  'LUMIA': 21681,
  'SCR': 32465,
  'MORPHO': 32739,
  'KAIA': 32751,
  'ETHFI': 29814,
  'RENZO': 30843,
  'COW': 31917,
  'CATI': 32698,
  'HMSTR': 32376,
  'PROS': 3816,
  'FIDA': 6999,
  'BIFI': 9421,
  'LQTY': 10393,
  'LPT': 3640,
  'FRONT': 9216,
  'API3': 7737,
  'BETA': 8037,
  'ALPINE': 16678,
  'NFP': 29044,
  'DUSK': 4092,
  'ASTRO': 13874,
  'FIO': 5865,
  'SXP': 4279,
  'WAXP': 2300,
  'TROY': 3153,
  'VOXEL': 18081,
  'ORBS': 3835,
  'POLYX': 13271,
  'GAS': 1785,
  'POWERBOMB': 29870,
  'SYS': 541,
  'RARE': 11294,
  'GTC': 10052,
  'ERN': 8615,
  'PYR': 9308,
  'IDEX': 2502,
  'LOKA': 22226,
  'ARPA': 3964,
  'CTXC': 2638,
  'KP3R': 7737,
  'CHESS': 10903,
  'AVA': 2776,
  'DAR': 14588,
  'BNX': 11654,
  'RGT': 3701,
  'CITY': 7907,
  'FOR': 3899,
  'ALCX': 8856,
  'MCONTENT': 29662,
  'DODO': 7224,
  'HERO': 2477,
  'NMR': 1732,
  'DEGO': 7087,
  'EPX': 11292,
  'VIDT': 3994,
  'USDP': 3330,
  'RAY': 8526,
  'FARM': 6859,
  'ALPACA': 8707,
  'QUICK': 8206,
  'MBOX': 9175,
  'VGX': 1817,
  'WBTC': 3717,
  'TRU': 7725,
  'CVX': 9903,
  'SPA': 8324,
  'AUTO': 7224,
  'PERP': 6950,
  'TKO': 9040,
  'PUNDIX': 2603,
  'LIT': 6433,
  'VIC': 3957,
  'BURGER': 9421,
  'WING': 7848,
  'BSCPAD': 9040,
  'SPARTA': 7513,
  'RIF': 3894,
  'AUCTION': 8602,
  'PHA': 6841,
  'TVK': 7455,
  'BADGER': 7859,
  'FIS': 4978,
  'ORN': 5631,
  'UTK': 2320,
  'XVS': 7288,
  'ALPHA': 7232,
  'TORN': 8808,
  'KEEP': 5268,
  'GHST': 7046,
  'DIA': 6138,
  'RUNEBASE': 2840,
  'MBL': 4038,
  'POND': 8602,
  'ALICE': 8766,
  'HIFI': 7682,
  'DEXE': 7326,
  'PUNK': 9421,
  'RAMP': 7463,
  'CFG': 6748,
  'TLM': 9119,
  'MIR': 7857,
  'BAR': 8990,
  'FORTH': 8642,
  'EZ': 9048,
  'SHLD': 7594,
  'POLS': 7208,
  'MDX': 8335,
  'MASK': 8536,
  'LUS': 9421,
  'UNFI': 10794,
  'MLN': 1552,
  'GAL': 11877,
  'JASMYOLD': 8425,
  'HFT': 22368,
  'PHB': 1831,
  'PORTO': 17685,
  'SANTOS': 17760,
  'LAZIO': 17637,
  'STEEM': 1230,
  'SBD': 1312,
  'XNO': 1567,
  'NAV': 377,
  'SNGLS': 1630,
  'BQX': 1817,
  'AGLD': 12093,
  'GYEN': 16640,
  'NEXO': 2694,
};

export function getCMCLogoUrl(symbol: string, size: number = 64): string {
  // Clean the symbol (remove USDT suffix)
  const cleanSymbol = symbol.replace(/USDT|BUSD|BNB|ETH|BTC$/g, '').toUpperCase();
  
  // Get CMC ID from mapping
  const cmcId = SYMBOL_TO_CMC_ID[cleanSymbol];
  
  if (cmcId) {
    // Use CoinMarketCap's logo URL format
    return `https://s2.coinmarketcap.com/static/img/coins/${size}x${size}/${cmcId}.png`;
  }
  
  // Fallback to a default icon service
  return `https://cdn.jsdelivr.net/gh/atomiclabs/cryptocurrency-icons@1fc5c6410972d5f2ad6a923e0f11f7e968e94099/128/color/${cleanSymbol.toLowerCase()}.png`;
}

// Fetch cryptocurrency metadata from CoinMarketCap (for future use with API calls)
export async function fetchCMCMetadata(symbols: string[]): Promise<Map<string, any>> {
  const result = new Map();
  const uncachedSymbols: string[] = [];
  
  // Check cache first
  for (const symbol of symbols) {
    const cleanSymbol = symbol.replace(/USDT|BUSD|BNB|ETH|BTC$/g, '').toUpperCase();
    const cached = cmcCache.get(cleanSymbol);
    
    if (cached && Date.now() - cached.updatedAt < CACHE_DURATION) {
      result.set(cleanSymbol, cached);
    } else {
      uncachedSymbols.push(cleanSymbol);
    }
  }
  
  // For now, we'll use static mapping instead of API calls to avoid CORS issues
  // In production, you'd want to proxy these requests through your backend
  for (const symbol of uncachedSymbols) {
    const cmcId = SYMBOL_TO_CMC_ID[symbol];
    if (cmcId) {
      const data = {
        id: cmcId,
        name: symbol,
        slug: symbol.toLowerCase(),
        logo: getCMCLogoUrl(symbol),
        updatedAt: Date.now()
      };
      cmcCache.set(symbol, data);
      result.set(symbol, data);
    }
  }
  
  return result;
}

// Get a single cryptocurrency logo
export function getCryptoLogo(symbol: string, size: 'small' | 'medium' | 'large' = 'medium'): string {
  const sizes = {
    small: 32,
    medium: 64,
    large: 128
  };
  
  return getCMCLogoUrl(symbol, sizes[size]);
}