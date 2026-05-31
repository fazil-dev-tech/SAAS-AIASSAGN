import { NextResponse } from 'next/server';

export async function POST(request) {
  try {
    const { subject, title } = await request.json();

    if (!subject || !title) {
      return NextResponse.json({ error: "Missing subject or title" }, { status: 400 });
    }

    const searchQuery = encodeURIComponent(`${title} ${subject}`);
    
    // 1. Search Wikipedia
    const searchRes = await fetch(`https://en.wikipedia.org/w/api.php?action=query&list=search&srsearch=${searchQuery}&utf8=&format=json&origin=*`);
    const searchData = await searchRes.json();
    
    if (searchData.query.search.length === 0) {
      return NextResponse.json({ context: "No specific academic context found." });
    }

    const pageId = searchData.query.search[0].pageid;
    const pageTitle = searchData.query.search[0].title;

    // 2. Fetch specific page extract
    const detailRes = await fetch(`https://en.wikipedia.org/w/api.php?action=query&prop=extracts&exsentences=7&exlimit=1&titles=${pageTitle}&explaintext=1&format=json&origin=*`);
    const detailData = await detailRes.json();
    
    const context = detailData.query.pages[pageId].extract;

    return NextResponse.json({ context, source: pageTitle }, { status: 200 });

  } catch (error) {
    console.error("Wikipedia Grounding Error:", error);
    return NextResponse.json({ error: "Failed to fetch factual context." }, { status: 500 });
  }
}
