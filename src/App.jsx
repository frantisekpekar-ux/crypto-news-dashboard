import React, { useEffect, useState } from "react";
import CryptoPricesPanel from "./components/CryptoPricesPanel";

const FEEDS = [
  {
    id: "coindesk",
    title: "CoinDesk",
    url: "https://www.coindesk.com/arc/outboundfeeds/rss/",
    tag: "news",
  },
  {
    id: "cointelegraph",
    title: "CoinTelegraph",
    url: "https://cointelegraph.com/rss",
    tag: "news",
  },
  {
    id: "glassnode",
    title: "Glassnode Insights",
    url: "https://insights.glassnode.com/feed/",
    tag: "on-chain",
  },
];

async function fetchFeedAsJson(feed) {
  const { url } = feed;
  try {
    const proxy = `https://crypto-news-proxy.vercel.app/api/rss-proxy?url=${encodeURIComponent(
      url
    )}`;
    const response = await fetch(proxy);
    if (!response.ok) throw new Error("Bad response");

    const text = await response.text();
    const parser = new DOMParser();
    const xml = parser.parseFromString(text, "application/xml");

    const items = Array.from(xml.querySelectorAll("item")).map((item) => {
      const title =
        item.querySelector("title")?.textContent?.trim() || "Untitled";
      const link = item.querySelector("link")?.textContent?.trim() || "";
      const description = item.querySelector("description")?.textContent || "";
      const pubDate = item.querySelector("pubDate")?.textContent || "";
      const sourceTitle =
        xml.querySelector("title")?.textContent || feed.title;
      const content =
        item.querySelector("content\\:encoded")?.textContent || "";

      let imageUrl = null;
      const match =
        description.match(/<img[^>]+src=["']([^"'>]+)["']/i) ||
        content.match(/<img[^>]+src=["']([^"'>]+)["']/i);

      if (match) imageUrl = match[1];

      if (imageUrl?.startsWith("//")) imageUrl = "https:" + imageUrl;
      if (imageUrl?.startsWith("/")) {
        try {
          const domain = new URL(url).origin;
          imageUrl = domain + imageUrl;
        } catch (e) {}
      }

      if (!imageUrl)
        imageUrl =
          feed.tag === "on-chain"
            ? "/placeholders_3/onchain_3.png"
            : "/placeholders_3/news_3.png";

      return {
        title,
        link,
        description,
        pubDate,
        sourceTitle,
        imageUrl,
        tag: feed.tag,
      };
    });

    return items;
  } catch (e) {
    console.error("Feed error:", url, e);
    return [];
  }
}

export default function App() {
  const [items, setItems] = useState([]);
  const [loading, setLoading] = useState(false);
  const [query, setQuery] = useState("");
  const [lastUpdated, setLastUpdated] = useState(null);
  const [sidebarOpen, setSidebarOpen] = useState(false);

  // Lock body scroll when mobile sidebar is open
  useEffect(() => {
    document.body.style.overflow = sidebarOpen ? "hidden" : "";
    return () => {
      document.body.style.overflow = "";
    };
  }, [sidebarOpen]);

  useEffect(() => {
    loadAllFeeds();
    const interval = setInterval(() => {
      loadAllFeeds();
      setLastUpdated(new Date());
    }, 5 * 60 * 1000);
    return () => clearInterval(interval);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  async function loadAllFeeds() {
    setLoading(true);
    const results = await Promise.all(FEEDS.map((f) => fetchFeedAsJson(f)));
    const merged = results
      .flat()
      .sort((a, b) => new Date(b.pubDate) - new Date(a.pubDate));
    setItems(merged);
    setLastUpdated(new Date());
    setLoading(false);
  }

  const filtered = items.filter((i) => {
    const q = query.toLowerCase();
    return (
      !query ||
      i.title.toLowerCase().includes(q) ||
      i.description.toLowerCase().includes(q) ||
      i.sourceTitle.toLowerCase().includes(q)
    );
  });

  return (
    <div className="min-h-screen bg-[#0f172a] text-gray-100 font-sans p-6 flex justify-center">
      {/* wrapper with max width */}
      <div className="max-w-4xl w-full">
        {/* HEADER (outside of grid so gap doesn't affect it) */}
        <header className="w-full flex flex-wrap md:flex-nowrap items-start justify-between sticky top-0 bg-[#0f172a] z-50 py-4 rounded-lg shadow-md">
          {/* LEFT */}
          <div>
            <h1 className="text-3xl font-bold text-gray-100">
              Crypto News Dashboard
            </h1>
            <p className="text-sm text-gray-400">
              Aggregated crypto headlines from top sources.
            </p>
          </div>

          {/* RIGHT */}
          <div className="flex flex-col items-end gap-2 w-full md:w-auto">
            {/* HAMBURGER (mobile only) */}
            <button
              onClick={() => setSidebarOpen(true)}
              className="md:hidden self-end px-3 py-2 rounded bg-slate-800 border border-slate-700 text-gray-200"
              aria-label="Open menu"
            >
              ☰
            </button>

            <div className="flex items-center gap-4 w-full md:w-auto">
              <input
                type="text"
                placeholder="🔍 Hledat články..."
                value={query}
                onChange={(e) => setQuery(e.target.value)}
                className="flex-1 md:w-64 border border-slate-700 bg-slate-800 text-gray-100 rounded px-3 py-2 placeholder-gray-500"
              />
              <button
                onClick={loadAllFeeds}
                className="px-4 py-2 bg-sky-600 hover:bg-sky-500 text-white rounded transition"
              >
                Refresh
              </button>
            </div>

            <div className="text-xs text-gray-500">
              Last refresh: {lastUpdated ? lastUpdated.toLocaleTimeString() : "--"}
            </div>
          </div>
        </header>

        {/* GRID (main + sidebar) */}
        <div className="grid grid-cols-1 md:grid-cols-4 gap-6 min-h-[calc(100vh-96px)] relative mt-2">
          {/* BACKDROP (mobile) */}
          {sidebarOpen && (
            <div
              onClick={() => setSidebarOpen(false)}
              className="fixed inset-0 bg-black/40 backdrop-blur-sm z-50 md:hidden"
            />
          )}

          {/* MAIN FEED */}
          <div className="md:col-span-3 px-0 md:px-2 flex flex-col md:max-h-[calc(100vh-128px)] mt-0 md:mt-2">
            <div className="overflow-y-auto no-scrollbar flex-1">
              {loading ? (
                <p className="text-center text-gray-400 mt-10 animate-pulse">
                  Načítám články...
                </p>
              ) : filtered.length === 0 ? (
                <p className="text-center text-gray-400 mt-10">Žádné výsledky.</p>
              ) : (
                filtered.map((it, i) => (
                  <article
                    key={i}
                    className="relative flex bg-[#1e293b] rounded-lg shadow-md hover:shadow-sky-800/40 transition mb-4 overflow-hidden border border-slate-700"
                  >
                    <div className="w-1/4 bg-slate-800 flex-shrink-0">
                      <img
                        src={it.imageUrl}
                        alt={it.title}
                        className="w-full h-38 object-cover"
                        loading="lazy"
                        onError={(e) =>
                          (e.target.src =
                            it.tag === "on-chain"
                              ? "/placeholders_3/onchain_3.png"
                              : "/placeholders_3/news_3.png")
                        }
                      />
                    </div>

                    <div className="w-3/4 p-4 flex flex-col justify-between">
                      <div>
                        <h2 className="text-base font-semibold mb-1 text-sky-400 hover:text-sky-300 transition">
                          <a href={it.link} target="_blank" rel="noopener noreferrer">
                            {it.title}
                          </a>
                        </h2>
                        <div className="text-xs text-gray-400 mb-1">
                          {it.sourceTitle} •{" "}
                          {it.pubDate ? new Date(it.pubDate).toLocaleDateString("cs-CZ") : ""}
                        </div>
                        <p
                          className="text-sm text-gray-300 leading-snug line-clamp-3 [&_img]:hidden"
                          dangerouslySetInnerHTML={{ __html: it.description }}
                        />
                      </div>
                    </div>
                  </article>
                ))
              )}
            </div>
          </div>

          {/* SIDEBAR */}
         <aside
  className={`
    bg-[#1e293b] rounded-lg p-4 shadow-md no-scrollbar md:mr-0
    md:sticky md:top-[104px] md:max-h-[calc(100vh-104px)] md:overflow-y-auto md:mt-2

    fixed md:static
    top-0 right-0 h-screen w-72 md:h-auto md:w-auto
    transition-transform duration-300
    z-60 md:z-40
    ${sidebarOpen ? "translate-x-0" : "translate-x-full md:translate-x-0"}
  `}
>
            <h2 className="text-lg font-semibold mb-3 text-gray-100 flex justify-between items-center">
              Zdroje

              {/* CLOSE */}
              <button
                onClick={() => setSidebarOpen(false)}
                className="md:hidden text-gray-400 hover:text-gray-200"
                aria-label="Close menu"
              >
                ✕
              </button>
            </h2>

            <ul className="space-y-2 text-sm text-gray-300">
              <li>
                <a className="text-sky-400 hover:text-sky-300" href="https://www.coindesk.com">CoinDesk</a>
              </li>
              <li>
                <a className="text-sky-400 hover:text-sky-300" href="https://cointelegraph.com">CoinTelegraph</a>
              </li>
              <li>
                <a className="text-sky-400 hover:text-sky-300" href="https://insights.glassnode.com">Glassnode Insights</a>
              </li>
              <li>
                <a className="text-sky-400 hover:text-sky-300" href="https://messari.io">Messari</a>
              </li>
              <li>
                <a className="text-sky-400 hover:text-sky-300" href="https://bitcoinist.com">Bitcoinist</a>
              </li>
              <li>
                <a className="text-sky-400 hover:text-sky-300" href="https://cryptoquant.com">CryptoQuant</a>
              </li>
              <li>
                <a className="text-sky-400 hover:text-sky-300" href="https://coinmarketcap.com">CoinMarketCap</a>
              </li>
            </ul>

            <div className="mt-6">
              <CryptoPricesPanel />
            </div>
          </aside>
        </div>
      </div>
    </div>
  );
}
