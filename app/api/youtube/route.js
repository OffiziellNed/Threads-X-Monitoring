import { NextResponse } from 'next/server';

export const dynamic = 'force-dynamic';
export const fetchCache = 'force-no-store'; 

export async function POST(request) {
  try {
    const body = await request.json();
    const type = body.type || 'negative';
    
    const YOUTUBE_API_KEY = "AIzaSyBNoLOXG7uflkFBtFUQ2lANlC5eAaWs3QY";
    const OPENROUTER_KEY = "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";

    // 1. Ambil video terbaru Puan Maharani
    const searchUrl = `https://www.googleapis.com/youtube/v3/search?part=snippet&q=Puan+Maharani&type=video&order=date&maxResults=1&key=${YOUTUBE_API_KEY}`;
    const searchRes = await fetch(searchUrl);
    const searchData = await searchRes.json();
    
    if (!searchData.items?.length) throw new Error("Video tidak ditemukan");
    
    const videoId = searchData.items[0].id.videoId;

    // 2. Ambil komentar YouTube
    const commentRes = await fetch(`https://www.googleapis.com/youtube/v3/commentThreads?part=snippet&videoId=${videoId}&maxResults=30&key=${YOUTUBE_API_KEY}`);
    const commentData = await commentRes.json();
    const comments = commentData.items?.map(c => c.snippet.topLevelComment.snippet.textDisplay).join("\n") || "Tidak ada komentar.";

    // 3. Minta konteks AI lewat OpenRouter (GPT-4o-mini)
    const aiRes = await fetch("https://openrouter.ai/api/v1/chat/completions", {
      method: 'POST',
      headers: { 
        'Authorization': `Bearer ${OPENROUTER_KEY}`,
        'Content-Type': 'application/json',
        'HTTP-Referer': 'https://your-app-url.vercel.app/' 
      },
      body: JSON.stringify({
        model: "openai/gpt-4o-mini",
        messages: [{ 
          role: "user", 
          content: `Analisis komentar ini tentang Puan Maharani: "${comments}". 
          Berikan 5 poin utama sentimen ${type}. 
          Format JSON murni dengan struktur: {"items": [{"topik": "Judul Isu", "volume": 80, "konteks": "Penjelasan detail kenapa netizen berpendapat demikian"}]}` 
        }],
        response_format: { type: "json_object" }
      })
    });

    const aiData = await aiRes.json();
    
    if (aiData.error) {
        return NextResponse.json({ success: true, data: [{ topik: "AI Error", volume: 0, konteks: aiData.error.message }] });
    }

    const finalData = JSON.parse(aiData.choices[0].message.content).items;

    return NextResponse.json({ success: true, data: finalData });

  } catch (error) {
    return NextResponse.json({ success: true, data: [{ topik: "System Error", volume: 0, konteks: error.message }] });
  }
}
