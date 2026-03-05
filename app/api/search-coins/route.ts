import { NextRequest, NextResponse } from 'next/server';
import { searchCoins } from '@/lib/coingecko.actions';

export async function GET(req: NextRequest) {
  const q = req.nextUrl.searchParams.get('q') ?? '';

  try {
    const results = await searchCoins(q);
    return NextResponse.json(results);
  } catch (error) {
    console.error('[api/search-coins] error:', error);
    return NextResponse.json([], { status: 200 });
  }
}
