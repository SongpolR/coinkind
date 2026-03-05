'use client';

import Link from 'next/link';
import Image from 'next/image';
import { usePathname } from 'next/navigation';
import { cn } from '@/lib/utils';
import { SearchModal } from '@/components/SearchModal';

type HeaderProps = {
  initialTrendingCoins: TrendingCoin[];
};

const Header = ({ initialTrendingCoins }: HeaderProps) => {
  const pathname = usePathname();

  return (
    <header>
      <div className="main-container inner">
        <Link href="/">
          <Image src="/logo.svg" alt="CoinKind Logo" width={132} height={40} />
        </Link>

        <nav>
          <Link
            href="/"
            className={cn('nav-link', {
              'is-active': pathname === '/',
              'is-home': true,
            })}
          >
            Home
          </Link>

          {/* ✅ Search button that opens the CommandDialog modal */}
          <SearchModal initialTrendingCoins={initialTrendingCoins} />

          <Link
            href="/coins"
            className={cn('nav-link', {
              'is-active': pathname === '/coins',
            })}
          >
            All Coins
          </Link>
        </nav>
      </div>
    </header>
  );
};

export default Header;
