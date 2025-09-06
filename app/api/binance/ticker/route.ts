import { NextResponse } from 'next/server';

export const runtime = 'edge';

// Use multiple fallback endpoints to ensure reliability
const ENDPOINTS = [
  'https://api.binance.com/api/v3/ticker/24hr',
  'https://api1.binance.com/api/v3/ticker/24hr', 
  'https://api2.binance.com/api/v3/ticker/24hr',
  'https://api3.binance.com/api/v3/ticker/24hr',
  'https://api4.binance.com/api/v3/ticker/24hr',
];

export async function GET() {
  let lastError: any = null;
  
  // Try multiple endpoints
  for (const endpoint of ENDPOINTS) {
    try {
      const response = await fetch(endpoint, {
        method: 'GET',
        headers: {
          'Accept': 'application/json',
          'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36',
        }
      });

      if (response.status === 451 || response.status === 403) {
        // Restricted location, try next endpoint
        lastError = { status: response.status, endpoint };
        continue;
      }

      if (!response.ok) {
        lastError = { status: response.status, endpoint };
        continue;
      }

      const data = await response.json();
      
      return NextResponse.json(data, {
        status: 200,
        headers: {
          'Access-Control-Allow-Origin': '*',
          'Access-Control-Allow-Methods': 'GET, OPTIONS',
          'Access-Control-Allow-Headers': 'Content-Type',
          'Cache-Control': 'public, s-maxage=30, stale-while-revalidate=60',
        },
      });
    } catch (error) {
      lastError = error;
      continue;
    }
  }
  
  // If all endpoints fail, return error with CORS proxy suggestion
  console.error('All Binance endpoints failed:', lastError);
  
  // Return a fallback response with instructions
  return NextResponse.json(
    { 
      error: 'Binance API blocked from this region',
      message: 'The Cloudflare Pages deployment region is restricted by Binance. Consider using Vercel or another hosting platform.',
      details: lastError,
      suggestion: 'You can use a CORS proxy or deploy to a different platform'
    },
    { 
      status: 503,
      headers: {
        'Access-Control-Allow-Origin': '*',
        'Access-Control-Allow-Methods': 'GET, OPTIONS',
        'Access-Control-Allow-Headers': 'Content-Type',
      }
    }
  );
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