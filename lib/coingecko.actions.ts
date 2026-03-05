'use server';

import qs from 'query-string';

const BASE_URL = process.env.COINGECKO_BASE_URL;
const API_KEY = process.env.COINGECKO_API_KEY;

if (!BASE_URL) throw new Error('Could not get base url');
if (!API_KEY) throw new Error('Could not get api key');

export async function fetcher<T>(
  endpoint: string,
  params?: QueryParams,
  revalidate = 60,
): Promise<T> {
  const url = qs.stringifyUrl(
    {
      url: `${BASE_URL}/${endpoint}`,
      query: params,
    },
    { skipEmptyString: true, skipNull: true },
  );

  const response = await fetch(url, {
    headers: {
      'x-cg-demo-api-key': API_KEY,
      'Content-Type': 'application/json',
    } as Record<string, string>,
    next: { revalidate },
  });

  if (!response.ok) {
    const errorBody: CoinGeckoErrorBody = await response.json().catch(() => ({}));

    throw new Error(`API Error: ${response.status}: ${errorBody.error || response.statusText} `);
  }

  return response.json();
}

export async function getPools(
  id: string,
  network?: string | null,
  contractAddress?: string | null,
): Promise<PoolData> {
  const fallback: PoolData = {
    id: '',
    address: '',
    name: '',
    network: '',
  };

  if (network && contractAddress) {
    try {
      const poolData = await fetcher<{ data: PoolData[] }>(
        `/onchain/networks/${network}/tokens/${contractAddress}/pools`,
      );

      return poolData.data?.[0] ?? fallback;
    } catch (error) {
      console.log(error);
      return fallback;
    }
  }

  try {
    const poolData = await fetcher<{ data: PoolData[] }>('/onchain/search/pools', { query: id });

    return poolData.data?.[0] ?? fallback;
  } catch {
    return fallback;
  }
}

export async function searchCoins(query: string): Promise<SearchCoin[]> {
  const trimmedQuery = query.trim();

  if (!trimmedQuery) return [];

  const searchResponse = await fetcher<{
    coins?: Array<{
      id: string;
      name: string;
      symbol: string;
      market_cap_rank: number | null;
      thumb: string;
      large: string;
    }>;
  }>('search', { query: trimmedQuery }, 15);

  const matchedCoins = (searchResponse.coins ?? []).slice(0, 10);

  if (matchedCoins.length === 0) return [];

  const ids = matchedCoins.map((coin) => coin.id).filter(Boolean);

  const marketsResponse = await fetcher<
    Array<{
      id: string;
      current_price?: number;
      price_change_percentage_24h?: number | null;
    }>
  >(
    'coins/markets',
    {
      vs_currency: 'usd',
      ids: ids.join(','),
      sparkline: false,
      price_change_percentage: '24h',
      per_page: ids.length,
      page: 1,
    },
    15,
  );

  const marketMap = new Map(marketsResponse.map((coin) => [coin.id, coin]));

  return matchedCoins.map((coin) => {
    const market = marketMap.get(coin.id);

    return {
      id: coin.id,
      name: coin.name,
      symbol: coin.symbol?.toUpperCase?.() ?? coin.symbol,
      market_cap_rank: coin.market_cap_rank ?? null,
      thumb: coin.thumb,
      large: coin.large,
      data: {
        price: market?.current_price ?? undefined,
        price_change_percentage_24h: market?.price_change_percentage_24h ?? 0,
      },
    };
  });
}

export async function getTrendingCoins(limit = 15): Promise<TrendingCoin[]> {
  try {
    // CoinGecko caches this endpoint ~10 minutes, so revalidate accordingly
    const res = await fetcher<{ coins?: TrendingCoin[] }>('search/trending', undefined, 600);

    const coins = res.coins ?? [];

    // Keep only the top N (CoinGecko returns up to 15 on most plans)
    return coins.slice(0, limit).map((entry) => ({
      ...entry,
      item: {
        ...entry.item,
        // normalize symbol for UI (optional)
        symbol: entry.item.symbol?.toUpperCase?.() ?? entry.item.symbol,
        // make sure data exists for UI reads
        data: entry.item.data ?? {
          price_change_percentage_24h: { usd: 0 },
        },
      },
    }));
  } catch (error) {
    console.error('[getTrendingCoins] error:', error);
    return [];
  }
}
