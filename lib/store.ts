import { create } from 'zustand';
import { persist } from 'zustand/middleware';
import { CryptoData, ConfigSettings, FilterConfig, SortConfig } from './types';

interface AppState {
  cryptoData: CryptoData[];
  config: ConfigSettings;
  filter: FilterConfig;
  sort: SortConfig;
  isLoading: boolean;
  error: string | null;
  selectedSymbols: string[];
  
  setCryptoData: (data: CryptoData[]) => void;
  updateCryptoItem: (symbol: string, data: Partial<CryptoData>) => void;
  setConfig: (config: Partial<ConfigSettings>) => void;
  setFilter: (filter: Partial<FilterConfig>) => void;
  setSort: (sort: SortConfig) => void;
  setLoading: (loading: boolean) => void;
  setError: (error: string | null) => void;
  setSelectedSymbols: (symbols: string[]) => void;
  toggleSymbol: (symbol: string) => void;
}

export const useStore = create<AppState>()(
  persist(
    (set) => ({
      cryptoData: [],
      config: {
        rsiPeriod: 14,
        stochRsiPeriod: 14,
        overboughtLevel: 70,
        oversoldLevel: 30,
        interval: '15m',
        symbols: [],
        refreshInterval: 5000,
        volumeThreshold: 1000000,
      },
      filter: {
        showOverbought: false,
        showOversold: false,
        showReversals: false,
        minVolume: 0,
        minPriceChange: -100,
        searchTerm: '',
      },
      sort: {
        field: 'volume',
        direction: 'desc',
      },
      isLoading: false,
      error: null,
      selectedSymbols: [],

      setCryptoData: (data) => set({ cryptoData: data }),
      
      updateCryptoItem: (symbol, data) =>
        set((state) => ({
          cryptoData: state.cryptoData.map((item) =>
            item.symbol === symbol ? { ...item, ...data } : item
          ),
        })),

      setConfig: (config) =>
        set((state) => ({
          config: { ...state.config, ...config },
        })),

      setFilter: (filter) =>
        set((state) => ({
          filter: { ...state.filter, ...filter },
        })),

      setSort: (sort) => set({ sort }),
      
      setLoading: (loading) => set({ isLoading: loading }),
      
      setError: (error) => set({ error }),
      
      setSelectedSymbols: (symbols) => set({ selectedSymbols: symbols }),
      
      toggleSymbol: (symbol) =>
        set((state) => ({
          selectedSymbols: state.selectedSymbols.includes(symbol)
            ? state.selectedSymbols.filter((s) => s !== symbol)
            : [...state.selectedSymbols, symbol],
        })),
    }),
    {
      name: 'crypto-dashboard-storage',
      partialize: (state) => ({
        config: state.config,
        selectedSymbols: state.selectedSymbols,
      }),
    }
  )
);