import { NextRequest, NextResponse } from 'next/server';

type LiveInterval = '1m' | '5m';

type OHLCData = [timestamp: number, open: number, high: number, low: number, close: number];

type ExtendedPriceData = {
  usd: number;
  coin: string;
  price: number;
  change24h: number;
  marketCap: number;
  volume24h: number;
  timestamp: number;
};

type Trade = {
  price: number;
  value: number;
  timestamp: number;
  type: 'b' | 's';
  amount: number;
};

const COINGECKO_BASE_URL = process.env.COINGECKO_BASE_URL;

const COINGECKO_API_KEY = process.env.COINGECKO_API_KEY;

type FetchJsonOptions = {
  allow404?: boolean; // return null when 404
};

function parsePoolId(poolId?: string) {
  if (!poolId) return { network: '', poolAddress: '' };

  const [network, ...rest] = poolId.split('_');
  return {
    network: network || '',
    poolAddress: rest.join('_') || '',
  };
}

function getOhlcvParams(liveInterval: LiveInterval) {
  if (liveInterval === '1m') {
    return { timeframe: 'minute', aggregate: '1', limit: '1' };
  }
  return { timeframe: 'minute', aggregate: '5', limit: '1' };
}

function getHeaders() {
  // Keep your demo header; swap to x-cg-pro-api-key later if you move plans
  return {
    accept: 'application/json',
    'x-cg-demo-api-key': COINGECKO_API_KEY || '',
  };
}

async function fetchJson<T>(url: string, opts?: FetchJsonOptions): Promise<T | null> {
  const res = await fetch(url, {
    method: 'GET',
    headers: getHeaders(),
    cache: 'no-store',
    next: { revalidate: 0 },
  });

  if (res.status === 404 && opts?.allow404) {
    return null;
  }

  if (!res.ok) {
    const text = await res.text();
    throw new Error(`CoinGecko request failed: ${res.status} ${text}`);
  }

  return (await res.json()) as T;
}

function isLikelyBadPool(network: string, poolAddress: string) {
  if (!network || !poolAddress) return true;
  if (network.toLowerCase().includes('deprecated')) return true;

  // basic sanity for address-like pool id (optional but helpful)
  if (!poolAddress.startsWith('0x') || poolAddress.length < 10) return true;

  return false;
}

export async function GET(req: NextRequest) {
  const { searchParams } = new URL(req.url);

  const coinId = searchParams.get('coinId') || '';
  const poolId = searchParams.get('poolId') || '';
  const liveInterval = (searchParams.get('liveInterval') || '1s') as LiveInterval;

  if (!coinId) {
    return NextResponse.json({ error: 'coinId is required' }, { status: 400 });
  }

  const { network, poolAddress } = parsePoolId(poolId);

  // --- PRICE (critical) ---
  const priceUrl =
    `${COINGECKO_BASE_URL}/simple/price` +
    `?ids=${encodeURIComponent(coinId)}` +
    `&vs_currencies=usd` +
    `&include_market_cap=true` +
    `&include_24hr_vol=true` +
    `&include_24hr_change=true` +
    `&include_last_updated_at=true`;

  // --- POOL ENDPOINTS (best-effort) ---
  const canFetchPool = !isLikelyBadPool(network, poolAddress);

  const tradesUrl = canFetchPool
    ? `${COINGECKO_BASE_URL}/onchain/networks/${encodeURIComponent(network)}` +
      `/pools/${encodeURIComponent(poolAddress)}/trades`
    : '';

  const { timeframe, aggregate, limit } = getOhlcvParams(liveInterval);

  const ohlcvUrl = canFetchPool
    ? `${COINGECKO_BASE_URL}/onchain/networks/${encodeURIComponent(network)}` +
      `/pools/${encodeURIComponent(poolAddress)}/ohlcv/${timeframe}` +
      `?aggregate=${aggregate}&limit=${limit}&currency=usd&token=base&include_empty_intervals=true`
    : '';

  try {
    // Fetch price + pool data concurrently; pool requests tolerate 404
    const [priceRes, tradesRes, ohlcvRes] = await Promise.all([
      fetchJson<
        Record<
          string,
          {
            usd?: number;
            usd_market_cap?: number;
            usd_24h_vol?: number;
            usd_24h_change?: number;
            last_updated_at?: number;
          }
        >
      >(priceUrl),

      canFetchPool ? fetchJson<any>(tradesUrl, { allow404: true }) : Promise.resolve(null),
      canFetchPool ? fetchJson<any>(ohlcvUrl, { allow404: true }) : Promise.resolve(null),
    ]);

    const rawPrice = priceRes?.[coinId];

    const price: ExtendedPriceData | null = rawPrice
      ? {
          usd: Number(rawPrice.usd ?? 0),
          coin: coinId,
          price: Number(rawPrice.usd ?? 0),
          change24h: Number(rawPrice.usd_24h_change ?? 0),
          marketCap: Number(rawPrice.usd_market_cap ?? 0),
          volume24h: Number(rawPrice.usd_24h_vol ?? 0),
          timestamp: Number(rawPrice.last_updated_at ?? Math.floor(Date.now() / 1000)),
        }
      : null;

    // trades: best-effort (empty if missing/404)
    const trades: Trade[] = Array.isArray(tradesRes?.data)
      ? tradesRes.data.slice(0, 7).map((item: any) => {
          const attrs = item?.attributes ?? {};

          return {
            price: Number(attrs.price_to_in_usd ?? attrs.price_from_in_usd ?? 0),
            value: Number(attrs.volume_in_usd ?? 0),
            timestamp: attrs.block_timestamp
              ? Math.floor(new Date(attrs.block_timestamp).getTime() / 1000)
              : 0,
            type: attrs.kind === 'buy' ? 'b' : 's',
            amount: Number(attrs.to_token_amount ?? attrs.from_token_amount ?? 0),
          };
        })
      : [];

    // ohlcv: best-effort (null if missing/404)
    const latestOhlcv = ohlcvRes?.data?.attributes?.ohlcv_list?.[0];

    const ohlcv: OHLCData | null = Array.isArray(latestOhlcv)
      ? [
          Number(latestOhlcv[0] ?? 0),
          Number(latestOhlcv[1] ?? 0),
          Number(latestOhlcv[2] ?? 0),
          Number(latestOhlcv[3] ?? 0),
          Number(latestOhlcv[4] ?? 0),
        ]
      : null;

    return NextResponse.json({ price, trades, ohlcv });
  } catch (error) {
    // Only truly critical failures should land here (usually price fetch or non-404 failures)
    console.error('[api/live] error:', error);

    return NextResponse.json(
      {
        price: null,
        trades: [],
        ohlcv: null,
        error: error instanceof Error ? error.message : 'Unknown error',
      },
      { status: 500 },
    );
  }
}
