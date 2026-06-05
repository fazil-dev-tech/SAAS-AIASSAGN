import { NextResponse } from 'next/server';

export async function POST(request) {
  try {
    const { prompt } = await request.json();

    if (!prompt) {
      return NextResponse.json({ error: "Missing prompt" }, { status: 400 });
    }

    const apiKey = process.env.NVIDIA_API_KEY;
    if (!apiKey) {
      return NextResponse.json({ error: "NVIDIA API Key not configured on server" }, { status: 500 });
    }

    const payload = {
      model: "meta/llama3-70b-instruct",
      messages: [{ role: "user", content: prompt }],
      temperature: 0.2,
      top_p: 0.7,
      max_tokens: 1024,
      stream: false
    };

    const res = await fetch("https://integrate.api.nvidia.com/v1/chat/completions", {
      method: "POST",
      headers: {
        "Authorization": `Bearer ${apiKey}`,
        "Content-Type": "application/json",
        "Accept": "application/json"
      },
      body: JSON.stringify(payload)
    });

    if (!res.ok) {
      const errText = await res.text();
      console.error("NVIDIA API Error:", errText);
      return NextResponse.json({ error: "NVIDIA API failed" }, { status: res.status });
    }

    const data = await res.json();
    const text = data.choices[0]?.message?.content || "";

    return NextResponse.json({ text }, { status: 200 });

  } catch (error) {
    console.error("NVIDIA Route Error:", error);
    return NextResponse.json({ error: "Internal Server Error" }, { status: 500 });
  }
}
