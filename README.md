<div align="center">
  <div>
    <img src="https://img.shields.io/badge/-Next.js-black?style=for-the-badge&logo=Next.js&logoColor=white" />
    <img src="https://img.shields.io/badge/-Typescript-3178C6?style=for-the-badge&logo=Typescript&logoColor=white" />
    <img src="https://img.shields.io/badge/-Tailwind-06B6D4?style=for-the-badge&logo=tailwindcss&logoColor=white" />
    <img src="https://img.shields.io/badge/-shadcn%2Fui-000000?style=for-the-badge&logo=shadcnui&logoColor=white" />
    <img src="https://img.shields.io/badge/-CoinGecko-06D6A0?style=for-the-badge&logo=coingecko&logoColor=white" />
    <img src="https://img.shields.io/badge/-SWR-000000?style=for-the-badge&logo=vercel&logoColor=white" />
  </div>

<h3 align="center">CoinKind — Crypto Listing & Analytics Platform</h3>

  <div align="center">
    A modern cryptocurrency listing and detail platform built with <b>Next.js</b>, <b>CoinGecko API</b>, and a practical <b>REST polling</b> approach for live updates.
  </div>
</div>

## 📋 <a name="table">Table of Contents</a>

1. ✨ [Introduction](#introduction)
2. ⚙️ [Tech Stack](#tech-stack)
3. 🔋 [Features](#features)
4. 🤸 [Quick Start](#quick-start)
5. 🧠 [Architecture Notes](#architecture-notes)
6. 🔗 [Assets](#links)

## <a name="introduction">✨ Introduction</a>

**CoinKind** is a crypto market web application that allows users to explore coins, inspect detailed market data, search assets quickly, and monitor selected token activity in a responsive, modern interface.

This project is based on the JavaScript Mastery course structure (https://jsmastery.com/video-kit/d1bcad71-45c0-477c-82c8-e71ae39ae6f4), but with one important architectural change: instead of relying on CoinGecko WebSocket access from a paid subscription, this implementation uses a **REST polling strategy** to retrieve live price, recent trades, and OHLCV updates. This makes the project easier to run on lower-cost API plans while preserving a near-real-time experience for users.

The app includes a homepage experience, coin discovery flows, detailed coin pages, trending assets, and a search modal powered by a two-step CoinGecko query merge so users can see search results with pricing data included.

## <a name="tech-stack">⚙️ Tech Stack</a>

- **[Next.js](https://nextjs.org)** – React framework for building full-stack web applications with App Router, server components, and API routes.

- **[TypeScript](https://www.typescriptlang.org/)** – Strongly typed JavaScript for safer and more maintainable code.

- **[Tailwind CSS](https://tailwindcss.com/)** – Utility-first CSS framework for building modern responsive interfaces quickly.

- **[shadcn/ui](https://ui.shadcn.com/docs)** – Reusable, accessible UI building blocks with full code ownership.

- **[CoinGecko API](https://www.coingecko.com/en/api)** – Source of cryptocurrency market, search, trending, and on-chain data.

- **[SWR](https://swr.vercel.app/)** – Lightweight React data fetching library used for client-side search queries and stale-while-revalidate patterns.

## <a name="features">🔋 Features</a>

👉 **Homepage Market Experience**: Browse important crypto information through a clean interface designed for exploration and navigation.

👉 **Coin Detail Pages**: View detailed information for each asset, including live price, price changes, and supporting market context.

👉 **Trending Coins Integration**: Display trending assets using CoinGecko’s trending search endpoint and surface them directly inside the search experience.

👉 **Global Search Modal**: Search coins by name or symbol from anywhere in the app with a command-style modal interface.

👉 **Two-Step Search Merge**: Search results are enhanced with price data by combining:
1. CoinGecko `/search`
2. CoinGecko `/coins/markets`

👉 **REST Polling for Live Data**: Replaces WebSocket-based live updates with a practical polling-based implementation using Next.js API routes.

👉 **Recent Trades & OHLCV Updates**: Live detail pages can show updated pool trade activity and candle data where supported.

👉 **Graceful Fallback Handling**: Invalid or deprecated pool IDs do not crash the UI — the server route safely returns fallback values instead of repeated 500 errors.

👉 **Reusable Server Fetch Layer**: CoinGecko requests are centralized inside `coingecko.actions.ts` for cleaner maintenance and reuse.

👉 **Modern Command Palette UX**: Search can be triggered from the header and opened with keyboard shortcut support.

And more, including modular code organization, reusable components, and server/client separation for safer API key handling.

## <a name="quick-start">🤸 Quick Start</a>

Follow these steps to set up the project locally on your machine.

### **Prerequisites**

Make sure you have the following installed:

- [Git](https://git-scm.com/)
- [Node.js](https://nodejs.org/en)
- [npm](https://www.npmjs.com/)

### **Clone the Repository**

```bash
git clone https://github.com/SongpolR/coinkind.git
cd coinkind
```

### **Installation**

Install the project dependencies using npm:

```bash
npm install
```

### **Set Up Environment Variables**

Create a new file named `.env` in the root of your project and add the following content:

```env
COINGECKO_BASE_URL=https://api.coingecko.com/api/v3
COINGECKO_API_KEY=
```

Replace the placeholder values with your real credentials. You can get these by signing up at: [**CoinGecko API**](https://jsm.dev/crypto-gecko).

### **Running the Project**

```bash
npm run dev
```

Open [http://localhost:3000](http://localhost:3000) in your browser to view the project.