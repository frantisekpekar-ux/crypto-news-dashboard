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
  {
    id: "cryptoquant",
    title: "CryptoQuant",
    url: "https://medium.com/feed/cryptoquant",
    tag: "on-chain",
    logo: "https://cryptoquant.com/_next/static/media/favicon.4e1eb18b.ico",
  },
];

// 🧠 Pokročilý RSS parser s fallback obrázky
async function fetchFeedAsJson(feed) {
  const { url } = feed;
  try {
    const proxy = `https://crypto-news-proxy.vercel.app/api/rss-proxy?url=${encodeURIComponent(url)}`;
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

      // 🖼️ Obrázek – s více fallbacky
      let imageUrl = null;

      const media = item.querySelector("media\\:content, media\\:thumbnail");
      if (media?.getAttribute("url")) imageUrl = media.getAttribute("url");

      const enclosure = item.querySelector("enclosure");
      if (!imageUrl && enclosure?.getAttribute("url")) imageUrl = enclosure.getAttribute("url");

      const content = item.querySelector("content\\:encoded")?.textContent;
      if (!imageUrl && content) {
        const match = content.match(/<img[^>]+src=["']([^"'>]+)["']/i);
        if (match) imageUrl = match[1];
      }

      if (!imageUrl) {
        const match = description.match(/<img[^>]+src=["']([^"'>]+)["']/i);
        if (match) imageUrl = match[1];
      }

      if (imageUrl?.startsWith("//")) imageUrl = "https:" + imageUrl;
      if (imageUrl?.startsWith("/")) {
        try {
          const domain = new URL(url).origin;
          imageUrl = domain + imageUrl;
        } catch (e) {}
      }

      // ✅ Fallback logo nebo placeholder
      if (!imageUrl) {
        imageUrl =
          feed.tag === "on-chain"
            ? "https://cdn-icons-png.flaticon.com/512/3176/3176290.png" // modrý blockchain
            : "https://cdn-icons-png.flaticon.com/512/825/825540.png"; // oranžová mince
      }

      return {
        title,
        link,
        description,
        pubDate,
        sourceTitle,
        tag: feed.tag,
        imageUrl,
      };
    });

    return items;
  } catch (e) {
    console.error("Feed error:", url, e);
    return [];
  }
}

export default function App() {
  const [lastUpdated, setLastUpdated] = useState(null);

  useEffect(() => {
    loadAllFeeds();
    const interval = setInterval(() => loadAllFeeds(), 5 * 60 * 1000); // Auto refresh every 5 minutes
    return (
    <div className="flex flex-col md:flex-row gap-6">
      <div className="flex-1">) => clearInterval(interval);
  }, []);

  const loadAllFeeds = async () => {
    if (typeof fetchFeeds === 'function') {
      await fetchFeeds();
      setLastUpdated(new Date());
    }
  };

  const [items, setItems] = useState([]);
  const [loading, setLoading] = useState(false);
  const [filter, setFilter] = useState("all");
  const [query, setQuery] = useState("");

  useEffect(() => {
    const loadFeeds = async () => {
      setLoading(true);
      const results = await Promise.all(FEEDS.map((f) => fetchFeedAsJson(f)));
      const merged = results.flat().sort(
        (a, b) => new Date(b.pubDate) - new Date(a.pubDate)
      );
      setItems(merged);
      setLoading(false);
    };
    loadFeeds();
  }, []);

  // 🔍 Hledání i ve jménu zdroje
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
    <div className="flex flex-col md:flex-row gap-6">
      <div className="flex-1">
    <div className="min-h-screen bg-[#0f172a] text-gray-100 font-sans">
      {/* HEADER */}
      <header className="bg-[#1e293b] text-white p-5 shadow-md flex flex-wrap justify-between items-center gap-4">
        <h1 className="text-2xl font-semibold tracking-wide">
          🪙 Crypto News Dashboard
        </h1>

        {/* Vyhledávání */}
        <input
          type="text"
          placeholder="🔍 Hledat podle názvu, popisu nebo zdroje..."
          className="px-3 py-2 rounded bg-slate-800 text-gray-200 placeholder-gray-500 focus:outline-none focus:ring-2 focus:ring-sky-500 w-full sm:w-72"
          value={query}
          onChange={(e) => setQuery(e.target.value)}
        />

        {/* Filtry */}
        <div className="flex gap-2 flex-wrap">
          {["all", "news", "on-chain"].map((t) => (
            <button
              key={t}
              onClick={() => setFilter(t)}
              className={`px-3 py-1 rounded text-sm font-medium transition ${
                filter === t
                  ? "bg-sky-600 text-white"
                  : "bg-slate-700 hover:bg-slate-600 text-gray-300"
              }`}
            >
              {t === "all" ? "All" : t === "on-chain" ? "On-Chain" : "News"}
            </button>
          ))}
        </div>
      </header>

      {/* MAIN CONTENT */}
      <main className="p-6 max-w-4xl mx-auto">
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
                  onError={(e) => {
                    e.target.src =
                      it.tag === "on-chain"
                        ? "https://cdn-icons-png.flaticon.com/512/3176/3176290.png"
                        : "https://cdn-icons-png.flaticon.com/512/825/825540.png";
                  }}
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

                {/* Tag */}
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
      </main>
    </div>
      {/* Right Sidebar */}
      <aside className="md:w-64 bg-[#1e293b] text-gray-100 rounded-lg shadow-md p-4 h-fit mt-2 md:mt-0">
        <h2 className="text-lg font-semibold mb-3 text-sky-400">Zdroje</h2>
        <ul className="space-y-2 text-sm">
          <li><a href="https://www.coindesk.com" target="_blank" rel="noreferrer" className="text-sky-300 hover:text-sky-200">CoinDesk</a></li>
          <li><a href="https://cointelegraph.com" target="_blank" rel="noreferrer" className="text-sky-300 hover:text-sky-200">CoinTelegraph</a></li>
          <li><a href="https://insights.glassnode.com" target="_blank" rel="noreferrer" className="text-sky-300 hover:text-sky-200">Glassnode Insights</a></li>
          <li><a href="https://messari.io" target="_blank" rel="noreferrer" className="text-sky-300 hover:text-sky-200">Messari</a></li>
          <li><a href="https://bitcoinist.com" target="_blank" rel="noreferrer" className="text-sky-300 hover:text-sky-200">Bitcoinist</a></li>
        </ul>
        <div className="text-xs text-gray-400 mt-4">
          Poslední refresh: {lastUpdated ? lastUpdated.toLocaleTimeString() : "--"}
        </div>
      </aside>
    </div>
  );
}
