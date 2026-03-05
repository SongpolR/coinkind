import { NextRequest, NextResponse } from 'next/server';

type LiveInterval = '1s' | '1m';
type OHLCData = [number, number, number, number, number];

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

const COINGECKO_BASE_URL = process.env.COINGECKO_API_BASE_URL || 'https://api.coingecko.com/api/v3';

const COINGECKO_API_KEY = process.env.COINGECKO_API_KEY;

// poolId format example: "eth_0x123abc..."
function parsePoolId(poolId?: string) {
  if (!poolId) return { network: '', poolAddress: '' };

  const [network, ...rest] = poolId.split('_');
  return {
    network: network || '',
    poolAddress: rest.join('_') || '',
  };
}

function getOhlcvParams(liveInterval: LiveInterval) {
  if (liveInterval === '1s') {
    return {
      timeframe: 'second',
      aggregate: '1',
      limit: '1',
    };
  }

  return {
    timeframe: 'minute',
    aggregate: '1',
    limit: '1',
  };
}

function getHeaders() {
  return {
    accept: 'application/json',
    'x-cg-demo-api-key': COINGECKO_API_KEY || '',
  };
}

async function fetchJson<T>(url: string): Promise<T> {
  const res = await fetch(url, {
    method: 'GET',
    headers: getHeaders(),
    cache: 'no-store',
    next: { revalidate: 0 },
  });

  if (!res.ok) {
    const text = await res.text();
    throw new Error(`CoinGecko request failed: ${res.status} ${text}`);
  }

  return res.json() as Promise<T>;
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

  try {
    const priceUrl =
      `${COINGECKO_BASE_URL}/simple/price` +
      `?ids=${encodeURIComponent(coinId)}` +
      `&vs_currencies=usd` +
      `&include_market_cap=true` +
      `&include_24hr_vol=true` +
      `&include_24hr_change=true` +
      `&include_last_updated_at=true`;

    const pricePromise = fetchJson<
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
    >(priceUrl);

    let tradesPromise: Promise<any> | null = null;
    let ohlcvPromise: Promise<any> | null = null;

    if (network && poolAddress) {
      const tradesUrl =
        `${COINGECKO_BASE_URL}/onchain/networks/${encodeURIComponent(network)}` +
        `/pools/${encodeURIComponent(poolAddress)}/trades`;

      const { timeframe, aggregate, limit } = getOhlcvParams(liveInterval);

      const ohlcvUrl =
        `${COINGECKO_BASE_URL}/onchain/networks/${encodeURIComponent(network)}` +
        `/pools/${encodeURIComponent(poolAddress)}/ohlcv/${timeframe}` +
        `?aggregate=${aggregate}&limit=${limit}&currency=usd&token=base&include_empty_intervals=true`;

      tradesPromise = fetchJson<any>(tradesUrl);
      ohlcvPromise = fetchJson<any>(ohlcvUrl);
    }

    const [priceRes, tradesRes, ohlcvRes] = await Promise.all([
      pricePromise,
      tradesPromise ?? Promise.resolve(null),
      ohlcvPromise ?? Promise.resolve(null),
    ]);

    const rawPrice = priceRes[coinId];

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

    return NextResponse.json({
      price,
      trades,
      ohlcv,
    });
  } catch (error) {
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
