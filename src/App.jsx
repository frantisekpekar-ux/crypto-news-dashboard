import React, { useEffect, useState, useRef } from "react";

// Crypto News Dashboard (single-file React component)
// - Tailwind CSS utility classes assumed available
// - Safer RSS fetching with clear fallback reporting and per-feed retry
// - If both public proxies fail we **do not throw** — we return an object with an `error` field

const DEFAULT_FEEDS = [
  { id: "coindesk", title: "CoinDesk", url: "https://www.coindesk.com/arc/outboundfeeds/rss/", tag: "news" },
  { id: "theblock", title: "The Block", url: "https://www.theblock.co/rss", tag: "news" },
  { id: "cointelegraph", title: "CoinTelegraph", url: "https://cointelegraph.com/rss", tag: "news" },
  { id: "glassnode", title: "Glassnode Insights", url: "https://insights.glassnode.com/feed/", tag: "on-chain" },
  // removed/muted feeds that are known-problematic can be edited by the user
  // { id: "cryptoquant", title: "CryptoQuant Blog", url: "https://cryptoquant.com/feed/", tag: "on-chain" },
  // { id: "messari", title: "Messari", url: "https://messari.io/rss.xml", tag: "research" },
];

/**
 * fetchFeedAsJson
 * - Tries two public RSS proxies (rss2json, allorigins) in order
 * - If both fail, returns an object with items: [] and error: string
 * - Never throws to the caller (so UI can show friendly diagnostics)
 */
async function fetchFeedAsJson(rssUrl, { timeoutMs = 7000 } = {}) {
  // helper: timed fetch wrapper
  const timedFetch = async (input, init = {}) => {
    const controller = new AbortController();
    const id = setTimeout(() => controller.abort(), timeoutMs);
    try {
      const res = await fetch(input, { ...init, signal: controller.signal });
      return res;
    } finally {
      clearTimeout(id);
    }
  };

  // 1) Try rss2json public endpoint
  try {
    const proxy1 = `https://api.rss2json.com/v1/api.json?rss_url=${encodeURIComponent(rssUrl)}`;
    const r1 = await timedFetch(proxy1);
    if (r1.ok) {
      const j = await r1.json();
      // rss2json returns { items: [...] }
      if (j && Array.isArray(j.items)) return { feed: { url: rssUrl }, items: j.items };
    }
  } catch (err) {
    // ignore and fallback
    console.debug("rss2json failed for:", rssUrl, err?.message || err);
  }

  // 2) Try allorigins raw endpoint -> parse XML in-browser
  try {
    const proxy2 = `https://api.allorigins.win/raw?url=${encodeURIComponent(rssUrl)}`;
    const r2 = await timedFetch(proxy2);
    if (!r2.ok) throw new Error(`allorigins returned ${r2.status}`);
    const xmlText = await r2.text();
    const parsed = new window.DOMParser().parseFromString(xmlText, "text/xml");

    // if parser produced parsererror, detect it
    if (parsed.querySelector("parsererror")) {
      throw new Error("XML parse error from allorigins response");
    }

    const items = Array.from(parsed.querySelectorAll("item")).slice(0, 25).map((it) => ({
      title: it.querySelector("title")?.textContent || "-",
      link: (it.querySelector("link")?.textContent || it.querySelector("guid")?.textContent || "#").trim(),
      pubDate: it.querySelector("pubDate")?.textContent || "",
      description: it.querySelector("description")?.textContent || "",
    }));

    return { feed: { url: rssUrl }, items };
  } catch (err) {
    console.debug("allorigins failed for:", rssUrl, err?.message || err);
  }

  // 3) As a last resort return an informative error object (no throw)
  const errorMsg = `Both RSS proxies failed for ${rssUrl}. This may be caused by rate limits, Cloudflare blocks, or an invalid URL.`;
  console.error(errorMsg);
  return { feed: { url: rssUrl }, items: [], error: errorMsg };
}

export default function CryptoNewsDashboard() {
  const [feeds, setFeeds] = useState(DEFAULT_FEEDS);
  const [activeTag, setActiveTag] = useState("all");
  const [query, setQuery] = useState("");
  const [items, setItems] = useState([]);
  const [loading, setLoading] = useState(false);
  const [lastUpdated, setLastUpdated] = useState(null);
  const [failedFeeds, setFailedFeeds] = useState([]); // { url, message }
  const intervalRef = useRef(null);

  useEffect(() => {
    loadAllFeeds();
    intervalRef.current = setInterval(loadAllFeeds, 5 * 60 * 1000);
    return () => clearInterval(intervalRef.current);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [feeds]);

  async function loadAllFeeds() {
    setLoading(true);
    setFailedFeeds([]);
    try {
      const fetches = feeds.map(async (f) => {
        const result = await fetchFeedAsJson(f.url);
        // result: { feed:{url}, items:[], error? }
        if (result.error) {
          // mark feed as failed but don't throw
          return { feed: f, items: [], error: result.error };
        }

        const items = (result.items || []).slice(0, 20).map((it) => ({
          sourceId: f.id,
          sourceTitle: f.title,
          tag: f.tag,
          title: it.title,
          link: it.link,
          pubDate: it.pubDate,
          description: it.description,
        }));
        return { feed: f, items };
      });

      const resolved = await Promise.all(fetches);

      // collect failures and successes
      const failures = resolved.filter((r) => r.error || (Array.isArray(r.items) && r.items.length === 0));
      const failedList = failures.map((f) => ({ url: f.feed.url, title: f.feed.title, message: f.error || 'No items returned' }));
      setFailedFeeds(failedList);

      const merged = resolved.flatMap((r) => r.items || []).sort((a, b) => new Date(b.pubDate) - new Date(a.pubDate));
      setItems(merged);
      setLastUpdated(new Date());
    } catch (e) {
      console.error("Unexpected error loading feeds:", e);
    } finally {
      setLoading(false);
    }
  }

  async function retryFeed(url) {
    // simple retry logic for a single feed
    setLoading(true);
    try {
      const feed = feeds.find((f) => f.url === url);
      if (!feed) return;
      const result = await fetchFeedAsJson(feed.url);
      if (result.error) {
        setFailedFeeds((s) => s.map((f) => (f.url === url ? { ...f, message: result.error } : f)));
        return;
      }

      const itemsForFeed = (result.items || []).slice(0, 20).map((it) => ({
        sourceId: feed.id,
        sourceTitle: feed.title,
        tag: feed.tag,
        title: it.title,
        link: it.link,
        pubDate: it.pubDate,
        description: it.description,
      }));

      // merge into current items and sort
      setItems((prev) => [...itemsForFeed.filter(Boolean), ...prev].sort((a, b) => new Date(b.pubDate) - new Date(a.pubDate)));
      setFailedFeeds((s) => s.filter((f) => f.url !== url));
    } catch (err) {
      console.error("Retry failed:", err);
    } finally {
      setLoading(false);
    }
  }

  function filteredItems() {
    return items.filter((it) => {
      if (activeTag !== "all" && it.tag !== activeTag) return false;
      if (query && !(`${it.title} ${it.description} ${it.sourceTitle}`.toLowerCase().includes(query.toLowerCase()))) return false;
      return true;
    });
  }

  function addFeed(url, title = "Custom Feed", tag = "custom") {
    const id = title.toLowerCase().replace(/[^a-z0-9]+/g, "-") + Date.now();
    setFeeds((s) => [...s, { id, title, url, tag }]);
  }

  return (
    <div className="min-h-screen bg-gray-50 p-6">
      <div className="max-w-6xl mx-auto">
        <header className="flex items-center justify-between mb-6">
          <div>
            <h1 className="text-3xl font-bold">Crypto News Dashboard</h1>
            <p className="text-sm text-gray-600">Aggregated RSS + on-chain insights — quick view for BTC, alts & macro</p>
          </div>
          <div className="text-right text-sm text-gray-500">
            <div>Last updated: {lastUpdated ? lastUpdated.toLocaleString() : "--"}</div>
            <div className="mt-2">Auto-refresh: 5 min</div>
          </div>
        </header>

        {/* Failed feeds banner */}
        {failedFeeds.length > 0 && (
          <div className="mb-4 p-3 rounded bg-yellow-50 border border-yellow-200 text-yellow-800">
            <div className="font-semibold">Some feeds failed to load:</div>
            <ul className="mt-2">
              {failedFeeds.map((f) => (
                <li key={f.url} className="flex items-center justify-between gap-3">
                  <div>
                    <strong>{f.title}</strong> — <span className="text-xs">{f.url}</span>
                    <div className="text-xs text-gray-600 mt-1">{f.message}</div>
                  </div>
                  <div className="flex gap-2">
                    <button onClick={() => retryFeed(f.url)} className="px-2 py-1 bg-slate-800 text-white rounded text-sm">Retry</button>
                    <a href={f.url} target="_blank" rel="noreferrer" className="px-2 py-1 border rounded text-sm">Open</a>
                  </div>
                </li>
              ))}
            </ul>
          </div>
        )}

        <section className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-6">
          <div className="md:col-span-3 bg-white p-4 rounded-lg shadow-sm">
            <div className="flex items-center gap-3 mb-4">
              <input value={query} onChange={(e) => setQuery(e.target.value)} placeholder="Search headlines or descriptions..." className="flex-1 border rounded px-3 py-2" />
              <button onClick={loadAllFeeds} className="px-4 py-2 bg-slate-800 text-white rounded">Refresh</button>
            </div>

            <div className="flex gap-2 mb-4 flex-wrap">
              <button onClick={() => setActiveTag("all")} className={`px-3 py-1 rounded ${activeTag === "all" ? "bg-slate-800 text-white" : "bg-gray-100"}`}>All</button>
              {[...new Set(feeds.map((f) => f.tag))].map((t) => (
                <button key={t} onClick={() => setActiveTag(t)} className={`px-3 py-1 rounded ${activeTag === t ? "bg-slate-800 text-white" : "bg-gray-100"}`}>{t}</button>
              ))}
            </div>

            <div className="space-y-3">
              {loading && <div className="text-sm text-gray-500">Loading feeds...</div>}
              {!loading && filteredItems().length === 0 && <div className="text-sm text-gray-500">No items found for your filter.</div>}
              {filteredItems().map((it, idx) => (
                <article key={idx} className="border-l-4 border-slate-200 bg-white p-3 rounded shadow-sm hover:shadow-md transition">
                  <div className="flex items-start justify-between gap-4">
                    <div className="flex-1">
                      <a href={it.link} target="_blank" rel="noreferrer" className="text-lg font-semibold text-slate-900">{it.title}</a>
                      <div className="mt-1 text-sm text-gray-600">{it.sourceTitle} • {it.pubDate ? new Date(it.pubDate).toLocaleString() : ""}</div>
                      <p className="mt-2 text-sm text-gray-700 line-clamp-3" dangerouslySetInnerHTML={{ __html: it.description || "" }} />
                    </div>
                    <div className="w-28 text-right text-xs">
                      <div className="text-gray-500">{it.tag}</div>
                    </div>
                  </div>
                </article>
              ))}
            </div>
          </div>

          <aside className="bg-white p-4 rounded-lg shadow-sm">
            <h3 className="font-semibold mb-3">Feeds</h3>
            <div className="space-y-2 max-h-96 overflow-auto">
              {feeds.map((f) => (
                <div key={f.id} className="flex items-center justify-between gap-3 p-2 rounded hover:bg-gray-50">
                  <div>
                    <div className="text-sm font-medium">{f.title}</div>
                    <div className="text-xs text-gray-500">{f.url}</div>
                  </div>
                  <div className="text-xs text-gray-400">{f.tag}</div>
                </div>
              ))}
            </div>

            <div className="mt-4">
              <AddFeedForm onAdd={(url, title, tag) => addFeed(url, title, tag)} />
            </div>
          </aside>
        </section>

        <footer className="text-center text-sm text-gray-500 mt-8">Built for quick monitoring — customize sources or schedule alerts as needed.</footer>
      </div>
    </div>
  );
}

function AddFeedForm({ onAdd }) {
  const [url, setUrl] = useState("");
  const [title, setTitle] = useState("");
  const [tag, setTag] = useState("custom");

  function submit(e) {
    e.preventDefault();
    if (!url) return;
    onAdd(url, title || url, tag || "custom");
    setUrl("");
    setTitle("");
    setTag("custom");
  }

  return (
    <form onSubmit={submit} className="space-y-2">
      <input placeholder="Feed URL (RSS)" value={url} onChange={(e) => setUrl(e.target.value)} className="w-full border px-2 py-1 rounded" />
      <input placeholder="Optional title" value={title} onChange={(e) => setTitle(e.target.value)} className="w-full border px-2 py-1 rounded" />
      <div className="flex gap-2">
        <input placeholder="tag (news/on-chain/research)" value={tag} onChange={(e) => setTag(e.target.value)} className="flex-1 border px-2 py-1 rounded" />
        <button className="px-3 py-1 bg-slate-800 text-white rounded">Add</button>
      </div>
    </form>
  );
}
