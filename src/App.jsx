import React, { useEffect, useState, useRef } from "react";

const DEFAULT_FEEDS = [
  { id: "coindesk", title: "CoinDesk", url: "https://www.coindesk.com/arc/outboundfeeds/rss/", tag: "news" },
  { id: "theblock", title: "The Block", url: "https://rsshub.app/theblock/latest", tag: "news" },
  { id: "cointelegraph", title: "CoinTelegraph", url: "https://cointelegraph.com/rss", tag: "news" },
  { id: "glassnode", title: "Glassnode Insights", url: "https://insights.glassnode.com/feed/", tag: "on-chain" },
  { id: "cryptoquant", title: "CryptoQuant Blog", url: "https://rsshub.app/cryptoquant/blog", tag: "on-chain" },
  { id: "messari", title: "Messari", url: "https://rsshub.app/messari/research", tag: "research" },
];

async function fetchFeedAsJson(rssUrl) {
  try {
    // 🔗 použijeme náš vlastní proxy backend (žádné CORS)
    const proxy = `https://crypto-news-proxy.vercel.app/api/rss-proxy?url=${encodeURIComponent(rssUrl)}`;

    // 🧠 přidáme timeout – pokud server neodpoví do 7s, přejdeme dál
    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), 7000);

    const response = await fetch(proxy, { signal: controller.signal });
    clearTimeout(timeout);

    if (!response.ok) {
      console.warn("Feed failed:", rssUrl, response.status);
      return null;
    }

    const text = await response.text();

    // 🧩 jednoduchý XML parser
    const parser = new DOMParser();
    const xml = parser.parseFromString(text, "application/xml");

    // 🧾 převedeme RSS na JSON strukturu
    const items = Array.from(xml.querySelectorAll("item")).map((item) => ({
      title: item.querySelector("title")?.textContent || "Untitled",
      link: item.querySelector("link")?.textContent || "",
      description: item.querySelector("description")?.textContent || "",
      pubDate: item.querySelector("pubDate")?.textContent || "",
      sourceTitle: xml.querySelector("title")?.textContent || "Unknown source",
    }));

    return items;
  } catch (error) {
    console.error("Error loading RSS feed:", rssUrl, error.message);
    return null;
  }
}

export default function App() {
  const [feeds] = useState(DEFAULT_FEEDS);
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
        // ✅ j je přímo pole článků (ne objekt s j.items)
        return (j || []).slice(0, 15).map((it) => ({
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
    const merged = results
      .flat()
      .sort((a, b) => new Date(b.pubDate) - new Date(a.pubDate));
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
    <div className="min-h-screen bg-[#0f172a] text-gray-100 p-6">
      <div className="max-w-6xl mx-auto">
        {/* Header */}
        <header className="flex items-center justify-between mb-6">
          <div>
            <h1 className="text-3xl font-bold text-gray-100">Crypto News Dashboard</h1>
            <p className="text-sm text-gray-400">Aggregated crypto headlines from top sources.</p>
          </div>
          <div className="text-right text-sm text-gray-500">
            <div>Last updated: {lastUpdated ? lastUpdated.toLocaleTimeString() : "--"}</div>
          </div>
        </header>

        {/* Controls */}
        <div className="bg-[#1e293b] p-4 rounded-lg shadow-sm mb-6">
          <div className="flex items-center gap-3 mb-4">
            <input
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              placeholder="Search headlines..."
              className="flex-1 border border-slate-700 bg-slate-800 text-gray-100 rounded px-3 py-2 placeholder-gray-500"
            />
            <button
              onClick={loadAllFeeds}
              className="px-4 py-2 bg-sky-600 hover:bg-sky-500 text-white rounded transition"
            >
              Refresh
            </button>
          </div>

          {/* Filter buttons */}
          <div className="flex gap-2 mb-4 flex-wrap">
            <button
              onClick={() => setActiveTag("all")}
              className={`px-3 py-1 rounded transition ${
                activeTag === "all"
                  ? "bg-sky-600 hover:bg-sky-500 text-white"
                  : "bg-slate-800 hover:bg-slate-700 text-gray-300"
              }`}
            >
              All
            </button>
            {[...new Set(feeds.map((f) => f.tag))].map((t) => (
              <button
                key={t}
                onClick={() => setActiveTag(t)}
                className={`px-3 py-1 rounded transition ${
                  activeTag === t
                    ? "bg-sky-600 hover:bg-sky-500 text-white"
                    : "bg-slate-800 hover:bg-slate-700 text-gray-300"
                }`}
              >
                {t}
              </button>
            ))}
          </div>

          {/* Loading state */}
          {loading && <div className="text-sm text-gray-500">Loading feeds...</div>}
          {!loading && filteredItems().length === 0 && (
            <div className="text-sm text-gray-500">No results found.</div>
          )}

          {/* News cards */}
          <div className="space-y-3">
            {filteredItems().map((it, idx) => (
            <article
  key={idx}
  className="border-l-4 border-[#334155] bg-[#1e293b] hover:bg-[#334155] p-3 rounded-lg shadow-lg shadow-slate-900/50 hover:shadow-sky-900/40 transition"
>
  <div className="flex flex-col md:flex-row items-start gap-4">

    {/* 🖼️ Obrázek vlevo (s dynamickým placeholderem) */}
    <div className="w-full md:w-48 flex-shrink-0">
      {(() => {
        // 1️⃣ Najdeme první obrázek v RSS
        const match = it.description?.match(/<img[^>]+src="([^">]+)"/i);
        const imgSrc = match ? match[1] : null;

        // 2️⃣ fallback – některé feedy mají obrázek v content
        const matchContent = it.content?.match(/<img[^>]+src="([^">]+)"/i);
        const fallbackSrc = matchContent ? matchContent[1] : null;

        let src = imgSrc || fallbackSrc;

        // 3️⃣ Oprava neúplných URL (//cdn..., /images..., apod.)
        if (src) {
          if (src.startsWith("//")) {
            src = "https:" + src;
          } else if (src.startsWith("/")) {
            try {
              const feedDomain = new URL(it.link).origin;
              src = feedDomain + src;
            } catch (e) {
              src = "https:" + src;
            }
          }
        }

        // 4️⃣ Barevně odlišené placeholdery podle typu článku
        const placeholders = {
          news: "https://cdn-icons-png.flaticon.com/512/825/825540.png",         // oranžová BTC mince 🟠
          "on-chain": "https://cdn-icons-png.flaticon.com/512/3176/3176290.png",  // modrý blockchain 🔵
          research: "https://cdn-icons-png.flaticon.com/512/4144/4144356.png",    // zelený graf 🟢
          default: "https://cdn-icons-png.flaticon.com/512/2965/2965879.png",     // fallback mince
        };

        const placeholder = placeholders[it.tag] || placeholders.default;
        const finalSrc = src || placeholder;

        // 5️⃣ Výstup obrázku
        return (
          <img
            src={finalSrc}
            alt={it.title}
            className="rounded-md object-cover w-full h-32 md:h-28 max-h-[150px] hover:opacity-90 transition border border-slate-700/50 bg-slate-800"
            loading="lazy"
            onError={(e) => (e.target.src = placeholder)}
          />
        );
      })()}
    </div>

    {/* 📰 Text vpravo */}
    <div className="flex-1">
      <a
        href={it.link}
        target="_blank"
        rel="noreferrer"
        className="text-lg font-semibold text-sky-400 hover:text-sky-300"
      >
        {it.title}
      </a>

      <div className="mt-1 text-sm text-gray-400">
        {it.sourceTitle} •{" "}
        {it.pubDate ? new Date(it.pubDate).toLocaleDateString() : ""}
      </div>

      <p
        className="mt-2 text-sm text-gray-300 leading-relaxed line-clamp-3 [&_img]:hidden"
        dangerouslySetInnerHTML={{ __html: it.description || "" }}
      />
    </div>

    {/* 🏷️ Tag */}
    <div
      className={`text-xs text-gray-300 md:w-16 text-right mt-2 md:mt-0 px-2 py-1 rounded 
        ${
          it.tag === "news"
            ? "bg-orange-500/20 text-orange-300"
            : it.tag === "on-chain"
            ? "bg-sky-500/20 text-sky-300"
            : it.tag === "research"
            ? "bg-emerald-500/20 text-emerald-300"
            : "bg-slate-700/40 text-gray-400"
        }`}
    >
      {it.tag}
    </div>
  </div>
</article>




            ))}
          </div>
        </div>
      </div>
    </div>
  );
}
