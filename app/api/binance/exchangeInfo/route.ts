import { NextResponse } from 'next/server';

export const runtime = 'edge';

const BINANCE_FUTURES_API = 'https://fapi.binance.com/fapi/v1';

export async function GET() {
  try {
    // Direct call to Binance Futures API
    const response = await fetch(`${BINANCE_FUTURES_API}/exchangeInfo`, {
      method: 'GET',
      headers: {
        'Accept': 'application/json',
      }
    });

    if (!response.ok) {
      console.error(`Binance Futures API returned status: ${response.status}`);
      const errorText = await response.text();
      console.error('Error response:', errorText);
      
      return NextResponse.json(
        { 
          error: 'Binance Futures API error', 
          status: response.status,
          details: errorText 
        },
        { 
          status: response.status,
          headers: {
            'Access-Control-Allow-Origin': '*',
            'Access-Control-Allow-Methods': 'GET, OPTIONS',
            'Access-Control-Allow-Headers': 'Content-Type',
          }
        }
      );
    }

    const data = await response.json();
    
    return NextResponse.json(data, {
      status: 200,
      headers: {
        'Access-Control-Allow-Origin': '*',
        'Access-Control-Allow-Methods': 'GET, OPTIONS',
        'Access-Control-Allow-Headers': 'Content-Type',
        'Cache-Control': 'public, s-maxage=3600, stale-while-revalidate=7200',
      },
    });
  } catch (error) {
    console.error('Error fetching exchange info:', error);
    return NextResponse.json(
      { 
        error: 'Failed to fetch exchange info',
        message: error instanceof Error ? error.message : 'Unknown error'
      },
      { 
        status: 500,
        headers: {
          'Access-Control-Allow-Origin': '*',
          'Access-Control-Allow-Methods': 'GET, OPTIONS',
          'Access-Control-Allow-Headers': 'Content-Type',
        }
      }
    );
  }
}

export async function OPTIONS() {
  return new Response(null, {
    status: 200,
    headers: {
      'Access-Control-Allow-Origin': '*',
      'Access-Control-Allow-Methods': 'GET, OPTIONS',
      'Access-Control-Allow-Headers': 'Content-Type',
    },
  });
}