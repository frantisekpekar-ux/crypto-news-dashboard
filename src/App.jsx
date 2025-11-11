import React, { useEffect, useState } from "react";

const FEEDS = [
  {
    id: "coindesk",
    title: "CoinDesk",
    url: "https://www.coindesk.com/arc/outboundfeeds/rss/",
    tag: "news",
    logo: "https://cryptologos.cc/logos/coindesk-logo.png",
  },
  {
    id: "cointelegraph",
    title: "CoinTelegraph",
    url: "https://cointelegraph.com/rss",
    tag: "news",
    logo: "https://cointelegraph.com/favicon-96x96.png",
  },
  {
    id: "glassnode",
    title: "Glassnode Insights",
    url: "https://insights.glassnode.com/feed/",
    tag: "on-chain",
    logo: "https://insights.glassnode.com/content/images/2020/04/favicon-32x32.png",
  },
];

// 🧠 RSS parser
async function fetchFeedAsJson(feed) {
  const { url } = feed;
  try {
    const proxy = `https://crypto-news-proxy.vercel.app/api/rss-proxy?url=${encodeURIComponent(url)}`;
    const response = await fetch(proxy);
    if (!response.ok) throw new Error("Bad response");

    const text = await response.text();
    const parser = new DOMParser();
    const xml = parser.parseFromString(text, "application/xml");

    const items = Array.from(xml.querySelectorAll("item")).map((item) => ({
      title: item.querySelector("title")?.textContent?.trim() || "Untitled",
      link: item.querySelector("link")?.textContent?.trim() || "",
      description: item.querySelector("description")?.textContent || "",
      pubDate: item.querySelector("pubDate")?.textContent || "",
      sourceTitle: xml.querySelector("title")?.textContent || feed.title,
      tag: feed.tag,
      imageUrl:
        item.querySelector("media\\:content")?.getAttribute("url") ||
        feed.logo,
    }));

    return items;
  } catch (e) {
    console.error("Feed error:", url, e);
    return [];
  }
}

export default function App() {
  const [items, setItems] = useState([]);
  const [loading, setLoading] = useState(false);
  const [filter, setFilter] = useState("all");
  const [query, setQuery] = useState("");
  const [lastUpdated, setLastUpdated] = useState(null);

  // ✅ Auto-refresh každých 5 minut
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
    const tagOK = filter === "all" || i.tag === filter;
    const q = query.toLowerCase();
    const queryOK =
      !query ||
      i.title.toLowerCase().includes(q) ||
      i.description.toLowerCase().includes(q) ||
      i.sourceTitle.toLowerCase().includes(q);
    return tagOK && queryOK;
  });

  return (
    <div className="min-h-screen bg-[#0f172a] text-gray-100 font-sans p-6 grid grid-cols-1 md:grid-cols-4 gap-6">
      {/* MAIN FEED */}
      <div className="md:col-span-3">
        <header className="flex items-center justify-between mb-6">
          <div>
            <h1 className="text-3xl font-bold text-gray-100">
              Crypto News Dashboard
            </h1>
            <p className="text-sm text-gray-400">
              Aggregated crypto headlines from top sources.
            </p>
          </div>
          <div className="text-right text-sm text-gray-400">
            <div>
              Last refresh:{" "}
              {lastUpdated ? lastUpdated.toLocaleTimeString() : "--"}
            </div>
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
              className="relative flex bg-[#1e293b] rounded-xl shadow-md hover:shadow-sky-800/40 transition mb-6 overflow-hidden border border-slate-700"
            >
              {/* Obrázek vlevo */}
              <div className="w-1/3 bg-slate-800 flex-shrink-0">
                <img
                  src={it.imageUrl}
                  alt={it.title}
                  className="w-full h-full object-cover"
                  loading="lazy"
                  onError={(e) =>
                    (e.target.src =
                      it.tag === "on-chain"
                        ? "https://cdn-icons-png.flaticon.com/512/3176/3176290.png"
                        : "https://cdn-icons-png.flaticon.com/512/825/825540.png")
                  }
                />
              </div>

              {/* Text vpravo */}
              <div className="w-2/3 p-5 flex flex-col justify-between">
                <div>
                  <h2 className="text-lg font-semibold mb-1 text-sky-400 hover:text-sky-300 transition">
                    <a href={it.link} target="_blank" rel="noopener noreferrer">
                      {it.title}
                    </a>
                  </h2>
                  <div className="text-sm text-gray-400 mb-2">
                    {it.sourceTitle} •{" "}
                    {it.pubDate
                      ? new Date(it.pubDate).toLocaleDateString("cs-CZ")
                      : ""}
                  </div>
                  <p
                    className="text-sm text-gray-300 leading-relaxed line-clamp-3 [&_img]:hidden"
                    dangerouslySetInnerHTML={{ __html: it.description }}
                  />
                </div>

                <div className="flex justify-end mt-3">
                  <span
                    className={`px-3 py-1 rounded-full text-xs font-semibold uppercase ${
                      it.tag === "on-chain"
                        ? "bg-sky-600 text-white"
                        : "bg-emerald-600 text-white"
                    }`}
                    style={{
                      whiteSpace: "nowrap",
                      letterSpacing: "0.05em",
                    }}
                  >
                    {it.tag}
                  </span>
                </div>
              </div>
            </article>
          ))
        )}
      </div>

      {/* SIDEBAR */}
      <aside className="bg-[#1e293b] rounded-lg p-4 shadow-md h-fit mt-2 md:mt-0">
        <h2 className="text-xl font-semibold mb-4 text-gray-100">Zdroje</h2>
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
  );
}
