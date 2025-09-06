'use client';

import React, { useEffect, useRef, memo, useState } from 'react';
import { Maximize2, Minimize2 } from 'lucide-react';
import { Button } from '@/components/ui/button';

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
  const wrapperRef = useRef<HTMLDivElement>(null);
  const [isFullscreen, setIsFullscreen] = useState(false);

  const toggleFullscreen = async () => {
    if (!wrapperRef.current) return;

    if (!isFullscreen) {
      if (wrapperRef.current.requestFullscreen) {
        await wrapperRef.current.requestFullscreen();
      } else if ((wrapperRef.current as any).webkitRequestFullscreen) {
        await (wrapperRef.current as any).webkitRequestFullscreen();
      } else if ((wrapperRef.current as any).mozRequestFullScreen) {
        await (wrapperRef.current as any).mozRequestFullScreen();
      }
      setIsFullscreen(true);
    } else {
      if (document.exitFullscreen) {
        await document.exitFullscreen();
      } else if ((document as any).webkitExitFullscreen) {
        await (document as any).webkitExitFullscreen();
      } else if ((document as any).mozCancelFullScreen) {
        await (document as any).mozCancelFullScreen();
      }
      setIsFullscreen(false);
    }
  };

  // Listen for fullscreen changes
  useEffect(() => {
    const handleFullscreenChange = () => {
      setIsFullscreen(!!document.fullscreenElement);
    };

    document.addEventListener('fullscreenchange', handleFullscreenChange);
    document.addEventListener('webkitfullscreenchange', handleFullscreenChange);
    document.addEventListener('mozfullscreenchange', handleFullscreenChange);

    return () => {
      document.removeEventListener('fullscreenchange', handleFullscreenChange);
      document.removeEventListener('webkitfullscreenchange', handleFullscreenChange);
      document.removeEventListener('mozfullscreenchange', handleFullscreenChange);
    };
  }, []);

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
          height: isFullscreen ? window.innerHeight - 60 : height,
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
  }, [symbol, height, theme, isFullscreen]);

  return (
    <div ref={wrapperRef} className="tradingview-widget-container relative">
      <Button
        variant="ghost"
        size="sm"
        onClick={toggleFullscreen}
        className="absolute top-2 right-2 z-10 h-8 w-8 p-0"
        title={isFullscreen ? "Exit fullscreen" : "Enter fullscreen"}
      >
        {isFullscreen ? (
          <Minimize2 className="h-4 w-4" />
        ) : (
          <Maximize2 className="h-4 w-4" />
        )}
      </Button>
      <div ref={containerRef} />
      <div className="tradingview-widget-copyright">
        <a href={`https://www.tradingview.com/symbols/${symbol}/`} rel="noopener noreferrer" target="_blank">
          <span className="text-xs text-muted-foreground">Chart by TradingView</span>
        </a>
      </div>
    </div>
  );
});