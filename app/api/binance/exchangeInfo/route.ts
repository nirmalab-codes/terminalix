import { NextResponse } from 'next/server';

const BINANCE_API_BASE = 'https://fapi.binance.com/fapi/v1';

export async function GET() {
  try {
    const response = await fetch(`${BINANCE_API_BASE}/exchangeInfo`, {
      headers: {
        'Accept': 'application/json',
        'Content-Type': 'application/json',
      },
      next: { revalidate: 3600 } // Cache for 1 hour
    });

    if (!response.ok) {
      throw new Error(`Binance API error: ${response.status}`);
    }

    const data = await response.json();
    
    return NextResponse.json(data, {
      headers: {
        'Cache-Control': 'public, s-maxage=3600, stale-while-revalidate=7200',
      },
    });
  } catch (error) {
    console.error('Error fetching exchange info:', error);
    return NextResponse.json(
      { error: 'Failed to fetch exchange info' },
      { status: 500 }
    );
  }
}