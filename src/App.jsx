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
  {
    id: "cryptoquant",
    title: "CryptoQuant Blog",
    url: "https://medium.com/feed/cryptoquant",
    tag: "on-chain",
  },
];

// 🧠 RSS načítání s pokročilým parsingem obrázků
async function fetchFeedAsJson(rssUrl) {
  try {
    const proxy = `https://crypto-news-proxy.vercel.app/api/rss-proxy?url=${encodeURIComponent(
      rssUrl
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
      const sourceTitle = xml.querySelector("title")?.textContent || "Unknown";

      // 🖼️ Obrázek – vyber jen první relevantní, žádné duplikáty
      let imageUrl = null;

      // 1️⃣ media:content / thumbnail
      const media = item.querySelector("media\\:content, media\\:thumbnail");
      if (media?.getAttribute("url")) imageUrl = media.getAttribute("url");

      // 2️⃣ content:encoded – jen první obrázek
      if (!imageUrl) {
        const content = item.querySelector("content\\:encoded")?.textContent;
        const match = content?.match(/<img[^>]+src="([^">]+)"/i);
        if (match) imageUrl = match[1];
      }

      // 3️⃣ description – první obrázek, ignoruj další
      if (!imageUrl) {
        const match = description.match(/<img[^>]+src="([^">]+)"/i);
        if (match) imageUrl = match[1];
      }

      // 4️⃣ fallback pro Medium / CryptoQuant
      if (!imageUrl && rssUrl.includes("medium.com")) {
        imageUrl = "https://cdn-icons-png.flaticon.com/512/3176/3176290.png";
      }

      if (imageUrl?.startsWith("//")) imageUrl = "https:" + imageUrl;

      return { title, link, description, pubDate, sourceTitle, imageUrl };
    });

    return items;
  } catch (e) {
    console.error("Feed error:", rssUrl, e);
    return [];
  }
}

export default function App() {
  const [items, setItems] = useState([]);
  const [loading, setLoading] = useState(false);
  const [filter, setFilter] = useState("all");

  useEffect(() => {
    const loadFeeds = async () => {
      setLoading(true);
      const results = await Promise.all(FEEDS.map((f) => fetchFeedAsJson(f.url)));
      const merged = results.flat().map((i) => {
        const feedMatch = FEEDS.find((f) =>
          i.sourceTitle.toLowerCase().includes(f.title.toLowerCase())
        );
        return { ...i, tag: feedMatch?.tag || "news" };
      });
      setItems(merged);
      setLoading(false);
    };
    loadFeeds();
  }, []);

  const filtered = items.filter(
    (i) => filter === "all" || i.tag === filter
  );

  return (
    <div className="min-h-screen bg-[#0f172a] text-gray-100 font-sans">
      {/* HEADER */}
      <header className="bg-[#1e293b] text-white p-5 shadow-md flex flex-wrap justify-between items-center">
        <h1 className="text-2xl font-semibold tracking-wide">
          🪙 Crypto News Dashboard
        </h1>
        <div className="flex gap-2 mt-3 sm:mt-0">
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
                  src={
                    it.imageUrl ||
                    `https://cdn-icons-png.flaticon.com/512/${
                      it.tag === "on-chain"
                        ? "3176/3176290.png"
                        : "825/825540.png"
                    }`
                  }
                  alt={it.title}
                  className="w-full h-full object-cover"
                  loading="lazy"
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

                {/* Tag vpravo dole */}
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
