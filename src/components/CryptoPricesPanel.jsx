import React, { useEffect, useState } from 'react';
import { ArrowUpRight, ArrowDownRight } from 'lucide-react';

const CryptoPricesPanel = () => {
  const [prices, setPrices] = useState({});
  const symbols = ['BTCUSDT', 'XRPUSDT', 'SOLUSDT', 'DOGEUSDT'];

  const fetchPrices = async () => {
    try {
      const responses = await Promise.all(
        symbols.map(symbol =>
          fetch(`https://api.binance.com/api/v3/ticker/24hr?symbol=${symbol}`)
        )
      );
      const data = await Promise.all(responses.map(res => res.json()));
      const newPrices = {};
      data.forEach(item => {
        newPrices[item.symbol] = {
          price: parseFloat(item.lastPrice).toFixed(3),
          change: parseFloat(item.priceChangePercent), // změna za 24h
        };
      });
      setPrices(newPrices);
    } catch (error) {
      console.error('Error fetching Binance prices:', error);
    }
  };

  useEffect(() => {
    fetchPrices();
    const interval = setInterval(fetchPrices, 30000); // aktualizace každých 30s
    return () => clearInterval(interval);
  }, []);

  return (
    <div className="bg-[#1e293b] text-gray-100 rounded-lg shadow-md p-4 border border-gray-700 mt-6">
      <h2 className="text-md font-medium mb-2">Jdi radši na kolo</h2>

      <div className="flex flex-col divide-y divide-gray-700">
        {symbols.map(symbol => {
          const data = prices[symbol];
          const name = symbol.replace('USDT', '');
          const isUp = data && data.change > 0;
          const isDown = data && data.change < 0;

          return (
            <div
              key={symbol}
              className="flex justify-between items-center py-2 text-sm whitespace-nowrap"
            >
              <span className="font-medium">{name}</span>
              {data ? (
                <span className="flex items-center space-x-1 text-sky-400">
                  ${data.price}
                  {isUp && <ArrowUpRight size={14} className="text-green-400" />}
                  {isDown && <ArrowDownRight size={14} className="text-red-400" />}
                </span>
              ) : (
                <span>Načítám...</span>
              )}
            </div>
          );
        })}
      </div>

      <p className="text-xs text-gray-500 mt-3">
        Aktualizace každých 30 s (24 h trend z Binance)
      </p>
    </div>
  );
};

export default CryptoPricesPanel;
