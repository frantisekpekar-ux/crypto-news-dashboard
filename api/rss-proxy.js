{\rtf1\ansi\ansicpg1250\cocoartf2761
\cocoatextscaling0\cocoaplatform0{\fonttbl\f0\fswiss\fcharset0 Helvetica;}
{\colortbl;\red255\green255\blue255;}
{\*\expandedcolortbl;;}
\paperw11900\paperh16840\margl1440\margr1440\vieww19220\viewh19620\viewkind0
\pard\tx720\tx1440\tx2160\tx2880\tx3600\tx4320\tx5040\tx5760\tx6480\tx7200\tx7920\tx8640\pardirnatural\partightenfactor0

\f0\fs24 \cf0 export default async function handler(req, res) \{\
  const feedUrl = req.query.url;\
\
  if (!feedUrl) \{\
    return res.status(400).json(\{ error: "Missing 'url' query parameter" \});\
  \}\
\
  try \{\
    const response = await fetch(feedUrl);\
    if (!response.ok) \{\
      throw new Error(`Fetch failed: $\{response.status\}`);\
    \}\
\
    const text = await response.text();\
\
    // nastav\'edme CORS hlavi\uc0\u269 ky, aby to pro\'9alo z frontendu\
    res.setHeader("Access-Control-Allow-Origin", "*");\
    res.setHeader("Access-Control-Allow-Methods", "GET,OPTIONS");\
    res.setHeader("Access-Control-Allow-Headers", "Content-Type");\
\
    res.status(200).send(text);\
  \} catch (error) \{\
    console.error("Proxy error:", error.message);\
    res.status(500).json(\{ error: "Failed to fetch feed", details: error.message \});\
  \}\
\}\
}