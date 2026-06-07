import '@/utils/dns-hook';
import { NextResponse } from 'next/server';

function generateTechnicalSVG(prompt) {
  const title = prompt.length > 55 ? prompt.substring(0, 55) + "..." : prompt;
  const cleanTitle = title.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;");
  const promptLower = prompt.toLowerCase();
  let diagramContent = "";

  if (promptLower.includes("cell") || promptLower.includes("biology") || promptLower.includes("organism")) {
    diagramContent = `
      <circle cx="230" cy="170" r="80" fill="none" stroke="#4a5568" stroke-width="2.5" stroke-dasharray="5,5"/>
      <circle cx="230" cy="170" r="30" fill="#f7fafc" stroke="#2d3748" stroke-width="2.5"/>
      <text x="230" y="174" font-family="sans-serif" font-size="11" font-weight="bold" fill="#1a202c" text-anchor="middle">Nucleus</text>
      
      <ellipse cx="190" cy="125" rx="18" ry="9" fill="#edf2f7" stroke="#4a5568" stroke-width="1.5"/>
      <text x="190" y="128" font-family="sans-serif" font-size="8" fill="#4a5568" text-anchor="middle">Mito</text>
      
      <rect x="265" y="130" width="22" height="12" rx="2" fill="#edf2f7" stroke="#4a5568" stroke-width="1.5"/>
      <text x="276" y="139" font-family="sans-serif" font-size="8" fill="#4a5568" text-anchor="middle">Ribo</text>
      
      <path d="M 160,170 Q 190,210 230,210" fill="none" stroke="#4a5568" stroke-width="1.5"/>
      <text x="230" y="275" font-family="sans-serif" font-size="10" font-weight="bold" fill="#2d3748" text-anchor="middle">Cellular Structure Diagram</text>
    `;
  } else if (promptLower.includes("network") || promptLower.includes("internet") || promptLower.includes("web") || promptLower.includes("cloud") || promptLower.includes("dns")) {
    diagramContent = `
      <rect x="180" y="65" width="100" height="40" rx="6" fill="#ebf8ff" stroke="#3182ce" stroke-width="2"/>
      <text x="230" y="90" font-family="sans-serif" font-size="11" font-weight="bold" fill="#2b6cb0" text-anchor="middle">Cloud Hub</text>
      
      <rect x="70" y="160" width="80" height="35" rx="4" fill="#f7fafc" stroke="#4a5568" stroke-width="1.5"/>
      <text x="110" y="182" font-family="sans-serif" font-size="10" fill="#2d3748" text-anchor="middle">Node A</text>
      
      <rect x="310" y="160" width="80" height="35" rx="4" fill="#f7fafc" stroke="#4a5568" stroke-width="1.5"/>
      <text x="350" y="182" font-family="sans-serif" font-size="10" fill="#2d3748" text-anchor="middle">Node B</text>
      
      <path d="M 110,160 L 230,105" fill="none" stroke="#a0aec0" stroke-width="1.5" stroke-dasharray="4,4"/>
      <path d="M 350,160 L 230,105" fill="none" stroke="#a0aec0" stroke-width="1.5" stroke-dasharray="4,4"/>
      <text x="230" y="275" font-family="sans-serif" font-size="10" font-weight="bold" fill="#2d3748" text-anchor="middle">Network System Topology</text>
    `;
  } else if (promptLower.includes("db") || promptLower.includes("database") || promptLower.includes("sql") || promptLower.includes("data") || promptLower.includes("schema")) {
    diagramContent = `
      <path d="M 90,85 A 35,12 0 0,0 160,85 L 160,130 A 35,12 0 0,1 90,130 Z" fill="#edf2f7" stroke="#2d3748" stroke-width="2"/>
      <ellipse cx="125" cy="85" rx="35" ry="12" fill="#edf2f7" stroke="#2d3748" stroke-width="2"/>
      <text x="125" y="112" font-family="sans-serif" font-size="10" font-weight="bold" fill="#1a202c" text-anchor="middle">Master DB</text>
      
      <path d="M 300,85 A 35,12 0 0,0 370,85 L 370,130 A 35,12 0 0,1 300,130 Z" fill="#edf2f7" stroke="#2d3748" stroke-width="2"/>
      <ellipse cx="335" cy="85" rx="35" ry="12" fill="#edf2f7" stroke="#2d3748" stroke-width="2"/>
      <text x="335" y="112" font-family="sans-serif" font-size="10" font-weight="bold" fill="#1a202c" text-anchor="middle">Replica DB</text>
      
      <path d="M 170,105 L 290,105" fill="none" stroke="#4a5568" stroke-width="2" marker-end="url(#arrow)"/>
      <text x="230" y="97" font-family="sans-serif" font-size="8" fill="#718096" text-anchor="middle">Replicate</text>
      <text x="230" y="275" font-family="sans-serif" font-size="10" font-weight="bold" fill="#2d3748" text-anchor="middle">Database Architecture Schema</text>
    `;
  } else {
    diagramContent = `
      <rect x="180" y="65" width="100" height="35" rx="5" fill="#f7fafc" stroke="#2d3748" stroke-width="2"/>
      <text x="230" y="87" font-family="sans-serif" font-size="10" font-weight="bold" fill="#2d3748" text-anchor="middle">START</text>
      
      <path d="M 230,100 L 230,140" fill="none" stroke="#4a5568" stroke-width="1.5"/>
      
      <rect x="150" y="140" width="160" height="40" fill="#edf2f7" stroke="#2d3748" stroke-width="2"/>
      <text x="230" y="165" font-family="sans-serif" font-size="10" fill="#2d3748" text-anchor="middle">Process Workflow</text>
      
      <path d="M 230,180 L 230,220" fill="none" stroke="#4a5568" stroke-width="1.5"/>
      
      <polygon points="230,220 275,240 230,260 185,240" fill="#f7fafc" stroke="#2d3748" stroke-width="1.5"/>
      <text x="230" y="244" font-family="sans-serif" font-size="9" fill="#2d3748" text-anchor="middle">Decision</text>
      <text x="230" y="280" font-family="sans-serif" font-size="10" font-weight="bold" fill="#2d3748" text-anchor="middle">System Flowchart Overview</text>
    `;
  }

  return `
    <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 460 320" width="460" height="320">
      <defs>
        <marker id="arrow" viewBox="0 0 10 10" refX="6" refY="5" markerWidth="6" markerHeight="6" orient="auto-start-reverse">
          <path d="M 0 2 L 10 5 L 0 8 z" fill="#4a5568" />
        </marker>
        <linearGradient id="headerGrad" x1="0%" y1="0%" x2="100%" y2="100%">
          <stop offset="0%" stop-color="#1a202c" />
          <stop offset="100%" stop-color="#2d3748" />
        </linearGradient>
      </defs>
      <rect width="460" height="320" rx="12" fill="#ffffff" stroke="#cbd5e1" stroke-width="2"/>
      <rect width="460" height="45" rx="12" fill="url(#headerGrad)"/>
      <rect y="35" width="460" height="10" fill="#2d3748"/>
      
      <pattern id="grid" width="20" height="20" patternUnits="userSpaceOnUse">
        <path d="M 20 0 L 0 0 0 20" fill="none" stroke="#f1f5f9" stroke-width="1"/>
      </pattern>
      <rect y="45" width="460" height="275" fill="url(#grid)"/>
      
      <text x="20" y="28" font-family="sans-serif" font-size="11" font-weight="bold" fill="#ffffff">AssignAI — Technical Diagram Fallback</text>
      <text x="440" y="28" font-family="monospace" font-size="9" fill="#a0aec0" text-anchor="end">FIG 1.0</text>
      
      ${diagramContent}
      
      <rect x="10" y="290" width="440" height="22" rx="4" fill="#f8fafc" stroke="#e2e8f0" stroke-width="1"/>
      <text x="20" y="304" font-family="sans-serif" font-size="8.5" font-style="italic" fill="#64748b">${cleanTitle}</text>
    </svg>
  `;
}

export async function POST(request) {
  try {
    const { prompt } = await request.json();

    if (!prompt) {
      return NextResponse.json({ error: "Missing prompt" }, { status: 400 });
    }

    // 1. Try NVIDIA Image Generation first
    const apiKey = process.env.NVIDIA_API_KEY;
    if (apiKey) {
      try {
        const res = await fetch("https://ai.api.nvidia.com/v1/genai/stabilityai/stable-diffusion-xl", {
          method: "POST",
          headers: {
            "Authorization": `Bearer ${apiKey}`,
            "Content-Type": "application/json",
            "Accept": "application/json"
          },
          body: JSON.stringify({
            text_prompts: [{ text: prompt, weight: 1 }],
            cfg_scale: 7,
            sampler: "K_DPM_2_ANCESTRAL",
            seed: Math.floor(Math.random() * 10000),
            steps: 30
          })
        });

        if (res.ok) {
          const data = await res.json();
          const base64 = data.artifacts?.[0]?.base64 || "";
          if (base64) {
            return NextResponse.json({ base64: `data:image/jpeg;base64,${base64}` }, { status: 200 });
          }
        }
        console.warn("NVIDIA Image API failed/returned empty, attempting OpenRouter...");
      } catch (nvidiaErr) {
        console.warn("NVIDIA Image request failed:", nvidiaErr.message);
      }
    }

    // 2. Try OpenRouter Image Generation second
    const openRouterKey = process.env.OPENROUTER_API_KEY || "";
    if (openRouterKey) {
      try {
        const openRouterRes = await fetch("https://openrouter.ai/api/v1/chat/completions", {
          method: "POST",
          headers: {
            "Authorization": `Bearer ${openRouterKey}`,
            "Content-Type": "application/json",
            "HTTP-Referer": "http://localhost:3000",
            "X-Title": "AssignAI"
          },
          body: JSON.stringify({
            model: "google/gemini-2.5-flash-image",
            messages: [{ role: "user", content: prompt }],
            modalities: ["image"]
          })
        });

        if (openRouterRes.ok) {
          const data = await openRouterRes.json();
          const imgUrl = data.choices?.[0]?.message?.images?.[0]?.image_url?.url || data.choices?.[0]?.message?.content;
          if (imgUrl && imgUrl.startsWith("data:image")) {
            return NextResponse.json({ base64: imgUrl }, { status: 200 });
          }
        }
        console.warn("OpenRouter Image API failed.");
      } catch (orErr) {
        console.error("OpenRouter image request failed:", orErr.message);
      }
    }

    // 3. Fallback to procedural SVG (which client will intercept and try Puter.js first)
    const svg = generateTechnicalSVG(prompt);
    const base64 = Buffer.from(svg).toString('base64');
    return NextResponse.json({ base64: `data:image/svg+xml;base64,${base64}`, fallback: true }, { status: 200 });

  } catch (error) {
    console.error("NVIDIA Image Route Error:", error);
    try {
      const { prompt } = await request.clone().json();
      const svg = generateTechnicalSVG(prompt || "Academic Diagram");
      const base64 = Buffer.from(svg).toString('base64');
      return NextResponse.json({ base64: `data:image/svg+xml;base64,${base64}`, fallback: true }, { status: 200 });
    } catch (e) {
      return NextResponse.json({ error: "Internal Server Error" }, { status: 500 });
    }
  }
}
