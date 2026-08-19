import { NextResponse } from 'next/server';

export const dynamic = 'force-dynamic';
export const fetchCache = 'force-no-store'; 

export async function POST(request) {
  try {
    const body = await request.json();
    const type = body.type || 'negative';

    const YOUTUBE_API_KEY = "AIzaSyBNoLOXG7uflkFBtFUQ2lANlC5eAaWs3QY";
    const GROQ_API_KEY = "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";

    // 1. CARI VIDEO
    const searchUrl = `https://www.googleapis.com/youtube/v3/search?part=snippet&q=${encodeURIComponent('Puan Maharani')}&type=video&order=date&maxResults=1&key=${YOUTUBE_API_KEY}`;
    const searchRes = await fetch(searchUrl);
    const searchData = await searchRes.json();
    
    if (!searchData.items?.length) {
      return NextResponse.json({ success: true, data: [{ topik: "Error Video", volume: 0, konteks: "Gagal ambil data video." }] });
    }

    // 2. SEDOT KOMENTAR
    const videoId = searchData.items[0].id.videoId;
    const commentUrl = `https://www.googleapis.com/youtube/v3/commentThreads?part=snippet&videoId=${videoId}&maxResults=20&key=${YOUTUBE_API_KEY}`;
    const commentRes = await fetch(commentUrl);
    const commentData = await commentRes.json();
    
    const allComments = commentData.items?.map(c => c.snippet?.topLevelComment?.snippet?.textDisplay) || [];
    if (!allComments.length) {
      return NextResponse.json({ success: true, data: [{ topik: "Sepi Komentar", volume: 0, konteks: "Kolom komentar ditutup." }] });
    }

    const rawCommentsText = allComments.join("\n- ").substring(0, 8000); 

    // 3. PROMPT GROQ DENGAN MODEL UNIVERSAL
    const promptContext = type === 'negative' 
      ? `Ekstrak 5 isu kritik utama dari komentar berikut tentang Puan Maharani. Format JSON Array murni dengan key "items". Contoh: {"items": [{"topik": "Isu", "volume": 80, "konteks": "Penjelasan"}]}`
      : `Ekstrak 5 pujian utama dari komentar berikut tentang Puan Maharani. Format JSON Array murni dengan key "items". Contoh: {"items": [{"topik": "Pujian", "volume": 80, "konteks": "Penjelasan"}]}`;

    const groqResponse = await fetch("https://api.groq.com/openai/v1/chat/completions", {
      method: 'POST',
      headers: { 
        'Authorization': `Bearer ${GROQ_API_KEY}`,
        'Content-Type': 'application/json' 
      },
      body: JSON.stringify({
        model: "llama3-8b-8192", // Model universal yang pasti aktif
        messages: [{ role: "user", content: `${promptContext}\n\nKomentar:\n${rawCommentsText}` }],
        temperature: 0.5,
        response_format: { type: "json_object" }
      })
    });

    const groqData = await groqResponse.json();
    
    if (groqData.error) {
        return NextResponse.json({ success: true, data: [{ topik: "Groq API Error", volume: 0, konteks: groqData.error.message }] });
    }

    // 4. PARSING DATA
    let content = groqData.choices[0].message.content;
    let parsed = JSON.parse(content);
    let finalData = parsed.items || [];

    return NextResponse.json({ success: true, data: finalData });

  } catch (error) {
    return NextResponse.json({ success: true, data: [{ topik: "Sistem Error", volume: 0, konteks: error.message }] });
  }
}
