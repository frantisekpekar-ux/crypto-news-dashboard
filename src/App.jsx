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

// 🔧 Pokročilé načtení RSS s podporou obrázků
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

      let imageUrl = null;

      // 1️⃣ media:content
      const media = item.querySelector("media\\:content, media\\:thumbnail");
      if (media?.getAttribute("url")) imageUrl = media.getAttribute("url");

      // 2️⃣ content:encoded
      if (!imageUrl) {
        const content = item.querySelector("content\\:encoded")?.textContent;
        const match = content?.match(/<img[^>]+src="([^">]+)"/i);
        if (match) imageUrl = match[1];
      }

      // 3️⃣ description
      if (!imageUrl) {
        const match = description.match(/<img[^>]+src="([^">]+)"/i);
        if (match) imageUrl = match[1];
      }

      // 4️⃣ fallback – Medium thumbnail
      if (!imageUrl && rssUrl.includes("medium.com")) {
        imageUrl = "https://cdn-images-1.medium.com/max/600/1*0w8qMOnGjWDcfSvAUrP0Bg.png";
      }

      // 5️⃣ normalizace URL
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
    <div className="min-h-screen bg-gray-100 text-gray-900 font-sans">
      <header className="bg-gray-900 text-white p-4 flex flex-wrap justify-between items-center shadow">
        <h1 className="text-xl font-semibold">🪙 Crypto News Dashboard</h1>
        <div className="flex gap-2 mt-3 sm:mt-0">
          {["all", "news", "on-chain"].map((t) => (
            <button
              key={t}
              onClick={() => setFilter(t)}
              className={`px-3 py-1 rounded-full text-sm ${
                filter === t
                  ? "bg-blue-500 text-white"
                  : "bg-gray-700 hover:bg-gray-600 text-gray-200"
              }`}
            >
              {t === "all" ? "All" : t === "on-chain" ? "On-Chain" : "News"}
            </button>
          ))}
        </div>
      </header>

      <main className="p-6 max-w-4xl mx-auto">
        {loading ? (
          <p className="text-center text-gray-500 mt-10">Načítám články...</p>
        ) : filtered.length === 0 ? (
          <p className="text-center text-gray-500 mt-10">Žádné výsledky.</p>
        ) : (
          filtered.map((it, i) => (
            <article
              key={i}
              className="relative flex bg-white rounded-xl shadow-md hover:shadow-lg transition mb-6 overflow-hidden border border-gray-200"
            >
              <div className="w-1/3 bg-gray-50">
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
                  className="w-full h-full object-cover"
                />
              </div>
              <div className="w-2/3 p-5 flex flex-col justify-between">
                <div>
                  <h2 className="text-lg font-semibold mb-2 leading-snug">
                    {it.title}
                  </h2>
                  <p
                    className="text-sm text-gray-600 mb-3 line-clamp-3"
                    dangerouslySetInnerHTML={{ __html: it.description }}
                  />
                </div>
                <div className="flex justify-between items-center">
                  <a
                    href={it.link}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="text-blue-600 font-medium hover:underline"
                  >
                    Číst článek →
                  </a>
                  <span
                    className={`px-3 py-1 rounded-full text-xs font-semibold uppercase ${
                      it.tag === "on-chain"
                        ? "bg-blue-600 text-white"
                        : "bg-green-600 text-white"
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
