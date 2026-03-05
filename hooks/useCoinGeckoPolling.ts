'use client';

import { useEffect, useRef, useState } from 'react';

type LiveInterval = '1m' | '5m';

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

type OHLCData = [number, number, number, number, number];

type UseCoinGeckoPollingProps = {
  coinId: string;
  poolId: string;
  liveInterval: LiveInterval;
};

type UseCoinGeckoPollingReturn = {
  price: ExtendedPriceData | null;
  trades: Trade[];
  ohlcv: OHLCData | null;
  isConnected: boolean;
};

function getPollMs(liveInterval: LiveInterval) {
  if (liveInterval === '1m') return 60000;
  return 300000;
}

export const useCoinGeckoPolling = ({
  coinId,
  poolId,
  liveInterval,
}: UseCoinGeckoPollingProps): UseCoinGeckoPollingReturn => {
  const [price, setPrice] = useState<ExtendedPriceData | null>(null);
  const [trades, setTrades] = useState<Trade[]>([]);
  const [ohlcv, setOhlcv] = useState<OHLCData | null>(null);
  const [isConnected, setIsConnected] = useState(true);

  const timerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const abortRef = useRef<AbortController | null>(null);

  useEffect(() => {
    let disposed = false;

    const fetchLiveData = async () => {
      abortRef.current?.abort();
      abortRef.current = new AbortController();

      try {
        const params = new URLSearchParams({
          coinId,
          poolId,
          liveInterval,
        });

        const res = await fetch(`/api/live?${params.toString()}`, {
          method: 'GET',
          cache: 'no-store',
          signal: abortRef.current.signal,
        });

        if (!res.ok) {
          throw new Error(`Polling failed with ${res.status}`);
        }

        const data = await res.json();

        if (disposed) return;

        setPrice(data.price ?? null);
        setTrades(Array.isArray(data.trades) ? data.trades : []);
        setOhlcv(data.ohlcv ?? null);
        setIsConnected(true);
      } catch (error) {
        if (disposed) return;
        if ((error as Error).name === 'AbortError') return;

        console.error('[useCoinGeckoPolling] error:', error);
        setIsConnected(false);
      } finally {
        if (!disposed) {
          timerRef.current = setTimeout(fetchLiveData, getPollMs(liveInterval));
        }
      }
    };

    setPrice(null);
    setTrades([]);
    setOhlcv(null);
    setIsConnected(true);

    fetchLiveData();

    return () => {
      disposed = true;
      abortRef.current?.abort();

      if (timerRef.current) {
        clearTimeout(timerRef.current);
      }
    };
  }, [coinId, poolId, liveInterval]);

  return {
    price,
    trades,
    ohlcv,
    isConnected,
  };
};
