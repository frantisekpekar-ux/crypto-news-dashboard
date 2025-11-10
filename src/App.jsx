import React, { useEffect, useState } from "react";

const DEFAULT_FEEDS = [
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

// 🧩 Pokročilý RSS parser s podporou obrázků
async function fetchFeedAsJson(rssUrl) {
  try {
    const proxy = `https://crypto-news-proxy.vercel.app/api/rss-proxy?url=${encodeURIComponent(
      rssUrl
    )}`;

    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), 7000);
    const response = await fetch(proxy, { signal: controller.signal });
    clearTimeout(timeout);

    if (!response.ok) {
      console.warn("Feed failed:", rssUrl, response.status);
      return null;
    }

    const text = await response.text();
    const parser = new DOMParser();
    const xml = parser.parseFromString(text, "application/xml");

    const items = Array.from(xml.querySelectorAll("item")).map((item) => {
      const title =
        item.querySelector("title")?.textContent?.trim() || "Untitled";
      const link = item.querySelector("link")?.textContent?.trim() || "";
      const description = item.querySelector("description")?.textContent || "";
      const pubDate = item.querySelector("pubDate")?.textContent || "";
      const sourceTitle = xml.querySelector("title")?.textContent || "Unknown";

      // 🖼️ Hledání obrázků
      let imageUrl = null;
      const media = item.querySelector("media\\:content, media\\:thumbnail");
      if (media?.getAttribute("url")) imageUrl = media.getAttribute("url");

      if (!imageUrl) {
        const content = item.querySelector("content\\:encoded")?.textContent;
        const match = content?.match(/<img[^>]+src="([^">]+)"/i);
        if (match) imageUrl = match[1];
      }

      if (!imageUrl) {
        const match = description.match(/<img[^>]+src="([^">]+)"/i);
        if (match) imageUrl = match[1];
      }

      if (imageUrl) {
        if (imageUrl.startsWith("//")) imageUrl = "https:" + imageUrl;
        else if (imageUrl.startsWith("/")) {
          try {
            const feedDomain = new URL(rssUrl).origin;
            imageUrl = feedDomain + imageUrl;
          } catch (e) {}
        }
      }

      return { title, link, description, pubDate, sourceTitle, imageUrl };
    });

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

  useEffect(() => {
    const loadFeeds = async () => {
      setLoading(true);
      const results = await Promise.all(
        feeds.map((f) => fetchFeedAsJson(f.url))
      );
      const merged = results
        .filter(Boolean)
        .flat()
        .map((i) => ({
          ...i,
          tag: feeds.find((f) =>
            i.sourceTitle?.toLowerCase().includes(f.title.toLowerCase())
          )?.tag,
        }));
      setItems(merged);
      setLoading(false);
    };
    loadFeeds();
  }, [feeds]);

  const filtered = items.filter((it) => {
    const tagOk = activeTag === "all" || it.tag === activeTag;
    const queryOk =
      !query ||
      it.title.toLowerCase().includes(query.toLowerCase()) ||
      it.description.toLowerCase().includes(query.toLowerCase());
    return tagOk && queryOk;
  });

  return (
    <div className="min-h-screen bg-gray-100 text-gray-800 font-sans">
      <header className="bg-gray-900 text-white p-5 shadow-md flex flex-wrap items-center justify-between">
        <h1 className="text-xl font-semibold tracking-wide">
          📰 Crypto News Dashboard
        </h1>
        <div className="flex gap-2 mt-3 sm:mt-0">
          {["all", "news", "on-chain"].map((t) => (
            <button
              key={t}
              onClick={() => setActiveTag(t)}
              className={`px-3 py-1 rounded-full text-sm font-medium ${
                activeTag === t
                  ? "bg-blue-500 text-white"
                  : "bg-gray-700 text-gray-300 hover:bg-gray-600"
              }`}
            >
              {t === "all" ? "All" : t === "news" ? "News" : "On-Chain"}
            </button>
          ))}
        </div>
        <input
          type="text"
          placeholder="🔍 Search..."
          className="mt-3 sm:mt-0 px-3 py-1 rounded bg-gray-800 text-white placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-blue-500"
          value={query}
          onChange={(e) => setQuery(e.target.value)}
        />
      </header>

      <main className="p-6 grid gap-6 sm:grid-cols-2 lg:grid-cols-3">
        {loading ? (
          <p>Loading feeds...</p>
        ) : filtered.length === 0 ? (
          <p>No results found.</p>
        ) : (
          filtered.map((it, idx) => (
            <article
              key={idx}
              className="relative bg-white rounded-2xl shadow-md hover:shadow-lg transition overflow-hidden border border-gray-200"
            >
              <img
                src={
                  it.imageUrl ||
                  `https://cdn-icons-png.flaticon.com/512/${
                    it.tag === "on-chain"
                      ? "3176/3176290.png"
                      : "825/825540.png"
                  }`
                }
                alt=""
                className="w-full h-48 object-cover"
              />

              {/* 🔷 Stylovaný badge v jednom řádku */}
              <span
                className={`absolute top-3 right-3 px-3 py-1 rounded-full text-xs font-semibold uppercase tracking-wide ${
                  it.tag === "on-chain"
                    ? "bg-blue-600 text-white"
                    : "bg-emerald-600 text-white"
                }`}
                style={{
                  whiteSpace: "nowrap",
                  letterSpacing: "0.05em",
                }}
              >
                {it.tag}
              </span>

              <div className="p-4">
                <h2 className="font-semibold text-lg mb-2 line-clamp-2">
                  {it.title}
                </h2>
                <p
                  className="text-sm text-gray-600 mb-3 line-clamp-3"
                  dangerouslySetInnerHTML={{ __html: it.description }}
                />
                <a
                  href={it.link}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="text-blue-600 font-medium hover:underline"
                >
                  Read more →
                </a>
              </div>
            </article>
          ))
        )}
      </main>
    </div>
  );
}
