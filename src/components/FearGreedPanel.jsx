import React, { useEffect, useState } from "react";

const API_URL = "https://api.alternative.me/fng/?limit=1";

const FearGreedPanel = () => {
  const [data, setData] = useState({
    value: null,
    classification: "Loading...",
  });

  useEffect(() => {
    const fetchFG = async () => {
      try {
        const res = await fetch(API_URL);
        const json = await res.json();

        if (json.data && json.data.length > 0) {
          const fg = json.data[0];
          setData({
            value: fg.value,
            classification: fg.value_classification,
          });
        }
      } catch (err) {
        console.error("F&G fetch error:", err);
        setData({ value: null, classification: "Error" });
      }
    };

    fetchFG();
    const interval = setInterval(fetchFG, 24 * 60 * 60 * 1000); // 1× denně
    return () => clearInterval(interval);
  }, []);

  const sentimentColor = {
    "Extreme Fear": "text-red-500",
    Fear: "text-red-400",
    Neutral: "text-gray-300",
    Greed: "text-green-400",
    "Extreme Greed": "text-green-500",
  }[data.classification] || "text-gray-300";

  return (
    <div className="bg-[#1e293b] text-gray-100 rounded-lg shadow-md p-4 border border-gray-700 my-6">
      <h3 className="text-base font-semibold mb-2">Fear & Greed Index</h3>
      
      {data.value ? (
        <>
          <p className="text-3xl font-bold text-sky-400">{data.value}</p>
          <p className={`text-sm font-medium mt-1 ${sentimentColor}`}>
            {data.classification}
          </p>
        </>
      ) : (
        <p className="text-sm text-gray-400">Načítám...</p>
      )}
    </div>
  );
};

export default FearGreedPanel;
