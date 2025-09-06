'use client';

import React, { useEffect, useRef, memo } from 'react';

interface TradingViewChartProps {
  symbol: string;
  height?: number;
  theme?: 'light' | 'dark';
}

export const TradingViewChart = memo(function TradingViewChart({ 
  symbol, 
  height = 350,
  theme = 'dark' 
}: TradingViewChartProps) {
  const containerRef = useRef<HTMLDivElement>(null);
  const scriptRef = useRef<HTMLScriptElement | null>(null);

  useEffect(() => {
    if (!containerRef.current) return;

    // Clean symbol for TradingView (remove USDT, add exchange prefix)
    const cleanSymbol = symbol.replace('USDT', '');
    const tvSymbol = `BINANCE:${cleanSymbol}USDT`;

    // Create unique container ID
    const containerId = `tradingview_${symbol}_${Date.now()}`;
    containerRef.current.id = containerId;

    // Clear previous content
    containerRef.current.innerHTML = '';

    // Create and append script
    const script = document.createElement('script');
    script.src = 'https://s3.tradingview.com/tv.js';
    script.async = true;
    script.onload = () => {
      if (typeof (window as any).TradingView !== 'undefined') {
        new (window as any).TradingView.widget({
          width: '100%',
          height: height,
          symbol: tvSymbol,
          interval: '15', // 15 minutes default
          timezone: 'Etc/UTC',
          theme: theme,
          style: '1', // Candlestick chart
          locale: 'en',
          toolbar_bg: '#f1f3f6',
          enable_publishing: false,
          allow_symbol_change: false,
          container_id: containerId,
          hide_top_toolbar: false,
          hide_legend: false,
          save_image: false,
          studies: [
            {
              id: 'RSI@tv-basicstudies',
              inputs: {
                length: 7  // RSI period set to 7
              }
            },
            {
              id: 'StochasticRSI@tv-basicstudies', 
              inputs: {
                lengthRSI: 7,      // RSI period set to 7
                lengthStoch: 7,    // Stochastic period set to 7
                smoothingK: 3,     // K smoothing
                smoothingD: 3      // D smoothing
              }
            }
          ],
          disabled_features: [
            'use_localstorage_for_settings',
            'header_symbol_search',
            'header_compare'
          ],
          enabled_features: [
            'study_templates'
          ],
          overrides: {
            'mainSeriesProperties.showCountdown': false,
            'paneProperties.background': theme === 'dark' ? '#0a0a0a' : '#ffffff',
            'paneProperties.vertGridProperties.color': theme === 'dark' ? '#1f1f1f' : '#e1e1e1',
            'paneProperties.horzGridProperties.color': theme === 'dark' ? '#1f1f1f' : '#e1e1e1',
            'symbolWatermarkProperties.transparency': 90,
            'scalesProperties.textColor': theme === 'dark' ? '#AAA' : '#000',
            'mainSeriesProperties.candleStyle.wickUpColor': '#26a69a',
            'mainSeriesProperties.candleStyle.wickDownColor': '#ef5350',
          }
        });
      }
    };

    scriptRef.current = script;
    document.head.appendChild(script);

    // Cleanup
    return () => {
      if (scriptRef.current) {
        document.head.removeChild(scriptRef.current);
      }
      if (containerRef.current) {
        containerRef.current.innerHTML = '';
      }
    };
  }, [symbol, height, theme]);

  return (
    <div className="tradingview-widget-container">
      <div ref={containerRef} />
      <div className="tradingview-widget-copyright">
        <a href={`https://www.tradingview.com/symbols/${symbol}/`} rel="noopener noreferrer" target="_blank">
          <span className="text-xs text-muted-foreground">Chart by TradingView</span>
        </a>
      </div>
    </div>
  );
});