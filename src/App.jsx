import React, { useEffect, useState } from "react";

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
      const title = item.querySelector("title")?.textContent?.trim() || "Untitled";
      const link = item.querySelector("link")?.textContent?.trim() || "";
      const description = item.querySelector("description")?.textContent || "";
      const pubDate = item.querySelector("pubDate")?.textContent || "";
      const sourceTitle = xml.querySelector("title")?.textContent || feed.title;
      const content = item.querySelector("content\\:encoded")?.textContent || "";

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


      return { title, link, description, pubDate, sourceTitle, imageUrl, tag: feed.tag };
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

  useEffect(() => {
    loadAllFeeds();
    const interval = setInterval(() => {
      loadAllFeeds();
      setLastUpdated(new Date());
    }, 5 * 60 * 1000);
    return () => clearInterval(interval);
  }, []);

  async function loadAllFeeds() {
    setLoading(true);
    const results = await Promise.all(FEEDS.map((f) => fetchFeedAsJson(f)));
    const merged = results.flat().sort(
      (a, b) => new Date(b.pubDate) - new Date(a.pubDate)
    );
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
      <div className="max-w-4xl w-full grid grid-cols-1 md:grid-cols-4 gap-6">
        {/* MAIN FEED */}
        <div className="md:col-span-3">
          <header className="flex items-center justify-between mb-6">
            <div>
              <h1 className="text-3xl font-bold text-gray-100">Crypto News Dashboard</h1>
              <p className="text-sm text-gray-400">
                Aggregated crypto headlines from top sources.
              </p>
            </div>
            <div className="text-right text-sm text-gray-400">
              Last refresh: {lastUpdated ? lastUpdated.toLocaleTimeString() : "--"}
            </div>
          </header>

          <div className="flex items-center gap-3 mb-4">
            <input
              type="text"
              placeholder="🔍 Hledat články..."
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              className="flex-1 border border-slate-700 bg-slate-800 text-gray-100 rounded px-3 py-2 placeholder-gray-500"
            />
            <button
              onClick={loadAllFeeds}
              className="px-4 py-2 bg-sky-600 hover:bg-sky-500 text-white rounded transition"
            >
              Refresh
            </button>
          </div>

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
                {/* Obrázek vlevo */}
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

                {/* Text vpravo */}
                <div className="w-3/4 p-4 flex flex-col justify-between">
                  <div>
                    <h2 className="text-base font-semibold mb-1 text-sky-400 hover:text-sky-300 transition">
                      <a href={it.link} target="_blank" rel="noopener noreferrer">
                        {it.title}
                      </a>
                    </h2>
                    <div className="text-xs text-gray-400 mb-1">
                      {it.sourceTitle} •{" "}
                      {it.pubDate
                        ? new Date(it.pubDate).toLocaleDateString("cs-CZ")
                        : ""}
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

        {/* SIDEBAR */}
        <aside className="bg-[#1e293b] rounded-lg p-4 shadow-md h-fit md:mt-[138px]">
          <h2 className="text-lg font-semibold mb-3 text-gray-100">Zdroje</h2>
          <ul className="space-y-2 text-sm text-gray-300">
            <li>
              <a
                href="https://www.coindesk.com"
                target="_blank"
                rel="noreferrer"
                className="text-sky-400 hover:text-sky-300"
              >
                CoinDesk
              </a>
            </li>
            <li>
              <a
                href="https://cointelegraph.com"
                target="_blank"
                rel="noreferrer"
                className="text-sky-400 hover:text-sky-300"
              >
                CoinTelegraph
              </a>
            </li>
            <li>
              <a
                href="https://insights.glassnode.com"
                target="_blank"
                rel="noreferrer"
                className="text-sky-400 hover:text-sky-300"
              >
                Glassnode Insights
              </a>
            </li>
            <li>
              <a
                href="https://messari.io"
                target="_blank"
                rel="noreferrer"
                className="text-sky-400 hover:text-sky-300"
              >
                Messari
              </a>
            </li>
            <li>
              <a
                href="https://bitcoinist.com"
                target="_blank"
                rel="noreferrer"
                className="text-sky-400 hover:text-sky-300"
              >
                Bitcoinist
              </a>
            </li>
          </ul>
        </aside>
      </div>
    </div>
  );
}
