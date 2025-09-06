'use client';

import React, { useState } from 'react';
import { Dashboard } from './dashboard';
import { ConfigPanel } from './config-panel';
import { useStore } from '@/lib/store';
import { Button } from '@/components/ui/button';
import { Sheet, SheetContent, SheetHeader, SheetTitle, SheetTrigger } from '@/components/ui/sheet';
import { Menu, Settings2, X } from 'lucide-react';
import { cn } from '@/lib/utils';

export function DashboardWithSidebar() {
  const [isSidebarOpen, setIsSidebarOpen] = useState(false);
  const {
    config,
    filter,
    selectedSymbols,
    setConfig,
    setFilter,
    toggleSymbol,
  } = useStore();

  const handleConfigChange = (newConfig: any) => {
    setConfig(newConfig);
  };

  const handleFilterChange = (newFilter: any) => {
    setFilter(newFilter);
  };

  const handleSymbolRemove = (symbol: string) => {
    toggleSymbol(symbol);
  };

  const handleRefresh = () => {
    // This will be handled by the Dashboard component
    window.location.reload();
  };

  return (
    <div className="min-h-screen bg-background">
      {/* Header */}
      <header className="sticky top-0 z-50 w-full border-b bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/60">
        <div className="container mx-auto flex h-14 items-center px-4">
          <div className="flex items-center gap-4 flex-1">
            {/* Logo/Title */}
            <h1 className="text-xl font-bold bg-gradient-to-r from-green-500 to-emerald-500 bg-clip-text text-transparent">
              TERMINALUX
            </h1>
            <span className="text-xs text-muted-foreground hidden sm:inline">
              Real-time Crypto Trading Dashboard
            </span>
          </div>
          
          {/* Settings Button */}
          <Sheet open={isSidebarOpen} onOpenChange={setIsSidebarOpen}>
            <SheetTrigger asChild>
              <Button
                variant="ghost"
                size="icon"
                className="ml-auto"
              >
                <Settings2 className="h-5 w-5" />
                <span className="sr-only">Toggle settings</span>
              </Button>
            </SheetTrigger>
            <SheetContent className="w-[400px] sm:w-[540px] overflow-y-auto">
              <SheetHeader className="px-6">
                <SheetTitle>Settings & Filters</SheetTitle>
              </SheetHeader>
              <div className="mt-6 px-6 pb-6">
                <ConfigPanel
                  config={config}
                  filter={filter}
                  selectedSymbols={selectedSymbols}
                  onConfigChange={handleConfigChange}
                  onFilterChange={handleFilterChange}
                  onSymbolRemove={handleSymbolRemove}
                  onRefresh={handleRefresh}
                />
              </div>
            </SheetContent>
          </Sheet>
        </div>
      </header>

      {/* Main Content */}
      <main className="container mx-auto p-4 pb-16">
        <Dashboard />
      </main>

      {/* Footer */}
      <footer className="fixed bottom-0 left-0 right-0 border-t bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/60 z-40">
        <div className="container mx-auto px-4 py-3">
          <div className="flex items-center justify-between text-xs text-muted-foreground">
            <div className="flex items-center gap-2">
              <span>Built with ❤️ by</span>
              <a 
                href="https://twitter.com/josephvoxone" 
                target="_blank" 
                rel="noopener noreferrer"
                className="font-semibold text-primary hover:underline"
              >
                @josephvoxone
              </a>
            </div>
            <div className="flex items-center gap-4">
              <span>Powered by Binance API & CoinMarketCap</span>
              <span className="text-[10px] opacity-50">v1.0.0</span>
            </div>
          </div>
        </div>
      </footer>
    </div>
  );
}