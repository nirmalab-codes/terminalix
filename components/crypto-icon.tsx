'use client';

import React, { useState } from 'react';
import { Icon } from '@iconify/react';
import { cn } from '@/lib/utils';
import { getCMCLogoUrl } from '@/lib/coinmarketcap';

interface CryptoIconProps {
  symbol: string;
  size?: number;
  className?: string;
}

// Iconify cryptocurrency icon mappings
const ICONIFY_ICONS: Record<string, string> = {
  'BTC': 'cryptocurrency:btc',
  'ETH': 'cryptocurrency:eth',
  'BNB': 'cryptocurrency:bnb',
  'SOL': 'cryptocurrency:sol',
  'XRP': 'cryptocurrency:xrp',
  'USDT': 'cryptocurrency:usdt',
  'USDC': 'cryptocurrency:usdc',
  'ADA': 'cryptocurrency:ada',
  'AVAX': 'cryptocurrency:avax',
  'DOGE': 'cryptocurrency:doge',
  'DOT': 'cryptocurrency:dot',
  'MATIC': 'cryptocurrency:matic',
  'TRX': 'cryptocurrency:trx',
  'LINK': 'cryptocurrency:link',
  'UNI': 'cryptocurrency:uni',
  'LTC': 'cryptocurrency:ltc',
  'ATOM': 'cryptocurrency:atom',
  'XLM': 'cryptocurrency:xlm',
  'NEAR': 'cryptocurrency:near',
  'FIL': 'cryptocurrency:fil',
  'AAVE': 'cryptocurrency:aave',
  'MKR': 'cryptocurrency:mkr',
  'CRV': 'cryptocurrency:crv',
  'SAND': 'cryptocurrency:sand',
  'MANA': 'cryptocurrency:mana',
  'FTM': 'cryptocurrency:ftm',
  'ALGO': 'cryptocurrency:algo',
  'VET': 'cryptocurrency:vet',
  'THETA': 'cryptocurrency:theta',
  'EOS': 'cryptocurrency:eos',
  'XMR': 'cryptocurrency:xmr',
  'CAKE': 'cryptocurrency:cake',
  'QNT': 'cryptocurrency:qnt',
  'CHZ': 'cryptocurrency:chz',
  'ENJ': 'cryptocurrency:enj',
  'COMP': 'cryptocurrency:comp',
  'SUSHI': 'cryptocurrency:sushi',
  'SNX': 'cryptocurrency:snx',
  'YFI': 'cryptocurrency:yfi',
  'BAT': 'cryptocurrency:bat',
  'ZEC': 'cryptocurrency:zec',
  'DASH': 'cryptocurrency:dash',
  'WAVES': 'cryptocurrency:waves',
  'ONE': 'cryptocurrency:one',
  'QTUM': 'cryptocurrency:qtum',
  'OMG': 'cryptocurrency:omg',
  'ICX': 'cryptocurrency:icx',
  'ZRX': 'cryptocurrency:zrx',
  'KSM': 'cryptocurrency:ksm',
  'ANKR': 'cryptocurrency:ankr',
  'KAVA': 'cryptocurrency:kava',
  'BAND': 'cryptocurrency:band',
  'REN': 'cryptocurrency:ren',
  'BAL': 'cryptocurrency:bal',
  'CVC': 'cryptocurrency:cvc',
  'KNC': 'cryptocurrency:knc',
  'STORJ': 'cryptocurrency:storj',
  'SXP': 'cryptocurrency:sxp',
  'ZEN': 'cryptocurrency:zen',
  'BNT': 'cryptocurrency:bnt',
  'SC': 'cryptocurrency:sc',
  'ZIL': 'cryptocurrency:zil',
  'ONT': 'cryptocurrency:ont',
  'IOST': 'cryptocurrency:iost',
  'XTZ': 'cryptocurrency:xtz',
  'LUNA': 'cryptocurrency:luna',
  'LUNC': 'cryptocurrency:lunc',
  'NEO': 'cryptocurrency:neo',
  'IOTA': 'cryptocurrency:miota',
  'XEM': 'cryptocurrency:xem',
  'CELO': 'cryptocurrency:celo',
  'AR': 'cryptocurrency:ar',
  'RUNE': 'cryptocurrency:rune',
  'HBAR': 'cryptocurrency:hbar',
  'SKL': 'cryptocurrency:skl',
  'MTL': 'cryptocurrency:mtl',
  'LRC': 'cryptocurrency:lrc',
  'OCEAN': 'cryptocurrency:ocean',
  '1INCH': 'cryptocurrency:1inch',
};

export function CryptoIcon({ symbol, size = 20, className }: CryptoIconProps) {
  const [cmcError, setCmcError] = useState(false);
  const [iconifyError, setIconifyError] = useState(false);
  
  const displaySymbol = symbol.replace(/USDT|BUSD|BNB|ETH|BTC$/g, '');
  const upperSymbol = displaySymbol.toUpperCase();
  
  // Try Iconify first
  const iconifyIcon = ICONIFY_ICONS[upperSymbol];
  if (iconifyIcon && !iconifyError) {
    return (
      <div className={cn('flex items-center justify-center', className)} 
           style={{ width: size, height: size }}>
        <Icon 
          icon={iconifyIcon} 
          width={size} 
          height={size}
          onError={() => setIconifyError(true)}
        />
      </div>
    );
  }
  
  // Then try CoinMarketCap
  if (!cmcError) {
    return (
      <img
        src={getCMCLogoUrl(symbol, size > 32 ? 64 : 32)}
        alt={displaySymbol}
        className={cn('rounded-full object-cover bg-white', className)}
        style={{ width: size, height: size }}
        onError={() => setCmcError(true)}
        loading="lazy"
      />
    );
  }
  
  // Fallback - Use cryptocurrency-color icon set from Iconify or USDT logo
  return (
    <div className={cn('flex items-center justify-center', className)} 
         style={{ width: size, height: size }}>
      <Icon 
        icon="cryptocurrency-color:usdt" 
        width={size} 
        height={size}
      />
    </div>
  );
}