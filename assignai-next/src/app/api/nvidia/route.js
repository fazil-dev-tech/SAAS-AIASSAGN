import '@/utils/dns-hook';
import { NextResponse } from 'next/server';

export async function POST(request) {
  try {
    const { prompt, stream = false } = await request.json();

    if (!prompt) {
      return NextResponse.json({ error: "Missing prompt" }, { status: 400 });
    }

    // 1. Try NVIDIA API first
    const apiKey = process.env.NVIDIA_API_KEY;
    if (apiKey) {
      try {
        const payload = {
          model: "meta/llama-3.1-70b-instruct",
          messages: [{ role: "user", content: prompt }],
          temperature: 0.2,
          top_p: 0.7,
          max_tokens: 1024,
          stream: stream
        };

        const res = await fetch("https://integrate.api.nvidia.com/v1/chat/completions", {
          method: "POST",
          headers: {
            "Authorization": `Bearer ${apiKey}`,
            "Content-Type": "application/json",
            "Accept": stream ? "text/event-stream" : "application/json"
          },
          body: JSON.stringify(payload)
        });

        if (res.ok) {
          if (stream) {
            return new Response(res.body, {
              headers: {
                'Content-Type': 'text/event-stream',
                'Cache-Control': 'no-cache',
                'Connection': 'keep-alive',
              },
            });
          }

          const data = await res.json();
          const text = data.choices[0]?.message?.content || "";
          return NextResponse.json({ text, source: "nvidia" }, { status: 200 });
        }
        console.warn("NVIDIA API failed, attempting OpenRouter fallback...");
      } catch (nvidiaErr) {
        console.warn("NVIDIA request failed:", nvidiaErr.message);
      }
    }

    // 2. Try OpenRouter API second
    const openRouterKey = process.env.OPENROUTER_API_KEY || "";
    if (openRouterKey) {
      try {
        const res = await fetch("https://openrouter.ai/api/v1/chat/completions", {
          method: "POST",
          headers: {
            "Authorization": `Bearer ${openRouterKey}`,
            "Content-Type": "application/json",
            "Accept": stream ? "text/event-stream" : "application/json",
            "HTTP-Referer": "http://localhost:3000",
            "X-Title": "AssignAI"
          },
          body: JSON.stringify({
            model: "meta-llama/llama-3.1-70b-instruct",
            messages: [{ role: "user", content: prompt }],
            temperature: 0.2,
            top_p: 0.7,
            max_tokens: 1024,
            stream: stream
          })
        });

        if (res.ok) {
          if (stream) {
            return new Response(res.body, {
              headers: {
                'Content-Type': 'text/event-stream',
                'Cache-Control': 'no-cache',
                'Connection': 'keep-alive',
              },
            });
          }

          const data = await res.json();
          const text = data.choices[0]?.message?.content || "";
          return NextResponse.json({ text, source: "openrouter" }, { status: 200 });
        }
        console.warn("OpenRouter API failed.");
      } catch (openRouterErr) {
        console.error("OpenRouter request failed:", openRouterErr.message);
      }
    }

    // 3. Fallback to client-side Puter.js
    return NextResponse.json({ error: "Server APIs failed. Falling back to client-side generation." }, { status: 502 });

  } catch (error) {
    console.error("NVIDIA Route Error:", error);
    return NextResponse.json({ error: "Internal Server Error" }, { status: 500 });
  }
}
