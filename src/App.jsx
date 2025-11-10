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

      // 🔍 Pokus o nalezení obrázku
      let imageUrl = null;

      // 1️⃣ media:content
      const media = item.querySelector("media\\:content, media\\:thumbnail");
      if (media?.getAttribute("url")) imageUrl = media.getAttribute("url");

      // 2️⃣ enclosure
      if (!imageUrl) {
        const enclosure = item.querySelector("enclosure");
        if (enclosure?.getAttribute("url")) imageUrl = enclosure.getAttribute("url");
      }

      // 3️⃣ content:encoded
      if (!imageUrl) {
        const content = item.querySelector("content\\:encoded")?.textContent;
        const match = content?.match(/<img[^>]+src=["']([^"'>]+)["']/i);
        if (match) imageUrl = match[1];
      }

      // 4️⃣ description
      if (!imageUrl) {
        const match = description.match(/<img[^>]+src=["']([^"'>]+)["']/i);
        if (match) imageUrl = match[1];
      }

      // 5️⃣ normalize
      if (imageUrl?.startsWith("//")) imageUrl = "https:" + imageUrl;
      if (imageUrl?.startsWith("/")) {
        try {
          const domain = new URL(url).origin;
          imageUrl = domain + imageUrl;
        } catch (e) {}
      }

      // 6️⃣ fallback logo
      if (!imageUrl) imageUrl = feed.logo;

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
  const [items, setItems] = useState([]);
  const [loading, setLoading] = useState(false);
  const [filter, setFilter] = useState("all");
  const [query, setQuery] = useState("");

  useEffect(() => {
    const loadFeeds = async () => {
      setLoading(true);
      const results = await Promise.all(FEEDS.map((f) => fetchFeedAsJson(f)));
      // 🔽 Sloučíme a seřadíme podle času
      const merged = results.flat().sort(
        (a, b) => new Date(b.pubDate) - new Date(a.pubDate)
      );
      setItems(merged);
      setLoading(false);
    };
    loadFeeds();
  }, []);

  const filtered = items.filter((i) => {
    const tagOK = filter === "all" || i.tag === filter;
    const queryOK =
      !query ||
      i.title.toLowerCase().includes(query.toLowerCase()) ||
      i.description.toLowerCase().includes(query.toLowerCase());
    return tagOK && queryOK;
  });

  return (
    <div className="min-h-screen bg-[#0f172a] text-gray-100 font-sans">
      {/* HEADER */}
      <header className="bg-[#1e293b] text-white p-5 shadow-md flex flex-wrap justify-between items-center gap-4">
        <h1 className="text-2xl font-semibold tracking-wide">
          🪙 Crypto News Dashboard
        </h1>

        {/* Vyhledávání */}
        <input
          type="text"
          placeholder="🔍 Hledat články..."
          className="px-3 py-2 rounded bg-slate-800 text-gray-200 placeholder-gray-500 focus:outline-none focus:ring-2 focus:ring-sky-500 w-full sm:w-64"
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
          <p className="text-center text-gray-400 mt-10">Načítám články...</p>
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
                  onError={(e) => (e.target.src = it.imageUrl)}
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
  );
}
