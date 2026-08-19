import { NextResponse } from 'next/server';

export const dynamic = 'force-dynamic';
export const fetchCache = 'force-no-store'; 

export async function POST(request) {
  try {
    const body = await request.json();
    const type = body.type || 'negative';

    const YOUTUBE_API_KEY = "AIzaSyBNoLOXG7uflkFBtFUQ2lANlC5eAaWs3QY";
    // KUNCI BARU LO UDAH TERPASANG DI SINI
    const GROQ_API_KEY = "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";

    // 1. CARI VIDEO
    const searchUrl = `https://www.googleapis.com/youtube/v3/search?part=snippet&q=${encodeURIComponent('Puan Maharani')}&type=video&order=date&maxResults=1&key=${YOUTUBE_API_KEY}`;
    const searchRes = await fetch(searchUrl);
    const searchData = await searchRes.json();
    
    if (!searchData.items?.length) {
      return NextResponse.json({ success: true, data: [{ topik: "Video Error", volume: 0, konteks: "Gagal ambil data video." }] });
    }

    // 2. SEDOT KOMENTAR
    const videoId = searchData.items[0].id.videoId;
    const commentUrl = `https://www.googleapis.com/youtube/v3/commentThreads?part=snippet&videoId=${videoId}&maxResults=20&key=${YOUTUBE_API_KEY}`;
    const commentRes = await fetch(commentUrl);
    const commentData = await commentRes.json();
    
    const allComments = commentData.items?.map(c => c.snippet?.topLevelComment?.snippet?.textDisplay) || [];
    const rawCommentsText = allComments.join("\n- ").substring(0, 5000); 

    // 3. PROMPT KE GROQ
    const promptContext = type === 'negative' 
      ? `Ekstrak 5 isu kritik dari komentar ini tentang Puan Maharani. Format JSON: {"items": [{"topik": "...", "volume": 50, "konteks": "..."}]}`
      : `Ekstrak 5 pujian dari komentar ini tentang Puan Maharani. Format JSON: {"items": [{"topik": "...", "volume": 50, "konteks": "..."}]}`;

    const groqResponse = await fetch("https://api.groq.com/openai/v1/chat/completions", {
      method: 'POST',
      headers: { 
        'Authorization': `Bearer ${GROQ_API_KEY}`,
        'Content-Type': 'application/json' 
      },
      body: JSON.stringify({
        model: "llama-3.3-70b-versatile",
        messages: [{ role: "user", content: `${promptContext}\n\nKomentar:\n${rawCommentsText}` }],
        temperature: 0.3,
        response_format: { type: "json_object" }
      })
    });

    const groqData = await groqResponse.json();
    
    if (groqData.error) {
        return NextResponse.json({ success: true, data: [{ topik: "Groq Error", volume: 0, konteks: groqData.error.message }] });
    }

    // 4. PARSING
    const content = groqData.choices[0].message.content;
    const finalData = JSON.parse(content).items || [];

    return NextResponse.json({ success: true, data: finalData });

  } catch (error) {
    return NextResponse.json({ success: true, data: [{ topik: "Error Sistem", volume: 0, konteks: error.message }] });
  }
}
