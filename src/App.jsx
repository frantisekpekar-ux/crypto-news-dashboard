import React, { useEffect, useState, useRef } from "react";

const DEFAULT_FEEDS = [
  { id: "coindesk", title: "CoinDesk", url: "https://www.coindesk.com/arc/outboundfeeds/rss/", tag: "news" },
  { id: "theblock", title: "The Block", url: "https://www.theblock.co/rss", tag: "news" },
  { id: "cointelegraph", title: "CoinTelegraph", url: "https://cointelegraph.com/rss", tag: "news" },
  { id: "glassnode", title: "Glassnode Insights", url: "https://insights.glassnode.com/feed/", tag: "on-chain" },
  { id: "cryptoquant", title: "CryptoQuant Blog", url: "https://cryptoquant.com/feed/", tag: "on-chain" },
  { id: "messari", title: "Messari", url: "https://messari.io/rss.xml", tag: "research" },
];

async function fetchFeedAsJson(rssUrl) {
  try {
    const proxy = `https://api.rss2json.com/v1/api.json?rss_url=${encodeURIComponent(rssUrl)}`;
    const res = await fetch(proxy);
    const data = await res.json();
    if (data && data.items) return data;
  } catch (e) {}

  try {
    const proxy2 = `https://api.allorigins.win/raw?url=${encodeURIComponent(rssUrl)}`;
    const res2 = await fetch(proxy2);
    const xmlText = await res2.text();
    const parsed = new window.DOMParser().parseFromString(xmlText, "text/xml");
    const items = Array.from(parsed.querySelectorAll("item")).slice(0, 20).map((it) => ({
      title: it.querySelector("title")?.textContent || "-",
      link: it.querySelector("link")?.textContent || "#",
      pubDate: it.querySelector("pubDate")?.textContent || "",
      description: it.querySelector("description")?.textContent || "",
    }));
    return { feed: { url: rssUrl }, items };
  } catch (e) {
    console.error("RSS fetch failed", e);
    return { feed: { url: rssUrl }, items: [] };
  }
}

export default function App() {
  const [feeds, setFeeds] = useState(DEFAULT_FEEDS);
  const [activeTag, setActiveTag] = useState("all");
  const [query, setQuery] = useState("");
  const [items, setItems] = useState([]);
  const [loading, setLoading] = useState(false);
  const [lastUpdated, setLastUpdated] = useState(null);
  const intervalRef = useRef(null);

  useEffect(() => {
    loadAllFeeds();
    intervalRef.current = setInterval(loadAllFeeds, 5 * 60 * 1000);
    return () => clearInterval(intervalRef.current);
  }, []);

  async function loadAllFeeds() {
    setLoading(true);
    try {
      const results = await Promise.all(
        feeds.map(async (f) => {
          const j = await fetchFeedAsJson(f.url);
          return (j.items || []).slice(0, 15).map((it) => ({
            sourceId: f.id,
            sourceTitle: f.title,
            tag: f.tag,
            title: it.title,
            link: it.link,
            pubDate: it.pubDate,
            description: it.description,
          }));
        })
      );
      const merged = results.flat().sort((a, b) => new Date(b.pubDate) - new Date(a.pubDate));
      setItems(merged);
      setLastUpdated(new Date());
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  }

  function filteredItems() {
    return items.filter((it) => {
      if (activeTag !== "all" && it.tag !== activeTag) return false;
      if (query && !(`${it.title} ${it.description}`.toLowerCase().includes(query.toLowerCase()))) return false;
      return true;
    });
  }

  return (
        <div className="min-h-screen bg-slate-900 text-gray-100 p-6">
         <div className="max-w-6xl mx-auto">

        <header className="flex items-center justify-between mb-6">
          <div>
            <h1 className="text-3xl font-bold">Crypto News Dashboard</h1>
            <p className="text-sm text-gray-600">Aggregated crypto headlines from CoinDesk, The Block, Messari, and more.</p>
          </div>
          <div className="text-right text-sm text-gray-500">
            <div>Last updated: {lastUpdated ? lastUpdated.toLocaleTimeString() : "--"}</div>
          </div>
        </header>

        <div className="bg-slate-800 p-4 rounded-lg shadow-sm mb-6">
          <div className="flex items-center gap-3 mb-4">
            <input
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              placeholder="Search headlines..."
              className="flex-1 border rounded px-3 py-2"
            />
            <button onClick={loadAllFeeds} className="px-4 py-2 bg-slate-800 text-white rounded">
              Refresh
            </button>
          </div>
          <div className="flex gap-2 mb-4 flex-wrap">
            <button
              onClick={() => setActiveTag("all")}
              className={`px-3 py-1 rounded ${activeTag === "all" ? "bg-slate-800 text-white" : "bg-gray-100"}`}
            >
              All
            </button>
            {[...new Set(feeds.map((f) => f.tag))].map((t) => (
              <button
                key={t}
                onClick={() => setActiveTag(t)}
                className={`px-3 py-1 rounded ${activeTag === t ? "bg-slate-800 text-white" : "bg-gray-100"}`}
              >
                {t}
              </button>
            ))}
          </div>
          {loading && <div className="text-sm text-gray-500">Loading feeds...</div>}
          {!loading && filteredItems().length === 0 && <div className="text-sm text-gray-500">No results found.</div>}
          <div className="space-y-3">
            {filteredItems().map((it, idx) => (
              <article
                key={idx}
                className="border-l-4 border-slate-200 bg-white p-3 rounded shadow-sm hover:shadow-md transition"
              >
                <div className="flex items-start justify-between gap-4">
                  <div className="flex-1">
                    <a
                      href={it.link}
                      target="_blank"
                      rel="noreferrer"
                     className="text-lg font-semibold text-sky-400 hover:text-sky-300"
                    >
                      {it.title}
                    </a>
                    <div className="mt-1 text-sm text-gray-600">
                      {it.sourceTitle} • {it.pubDate ? new Date(it.pubDate).toLocaleDateString() : ""}
                    </div>
                    <p
                      className="mt-2 text-sm text-gray-700 line-clamp-3"
                      dangerouslySetInnerHTML={{ __html: it.description || "" }}
                    />
                  </div>
                  <div className="w-20 text-right text-xs text-gray-500">{it.tag}</div>
                </div>
              </article>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}
