import { NextResponse } from 'next/server';

export const dynamic = 'force-dynamic';
export const fetchCache = 'force-no-store'; 

export async function POST(request) {
  try {
    const body = await request.json();
    const type = body.type || 'negative';

    const YOUTUBE_API_KEY = "AIzaSyBNoLOXG7uflkFBtFUQ2lANlC5eAaWs3QY";
    const GEMINI_API_KEY = "AQ.Ab8RN6K2p4V294eiQPwMsZex3Kq2JX7hN5V4r3BQXuQ6NWkV-w";

    // 1. CARI VIDEO (Kita kurangi jadi 2 video biar Vercel nggak Timeout)
    const searchUrl = `[https://www.googleapis.com/youtube/v3/search?part=snippet&q=$](https://www.googleapis.com/youtube/v3/search?part=snippet&q=$){encodeURIComponent('Puan Maharani')}&type=video&order=date&maxResults=2&key=${YOUTUBE_API_KEY}`;
    const searchRes = await fetch(searchUrl);
    const searchData = await searchRes.json();
    
    if (!searchData.items || searchData.items.length === 0) {
      return NextResponse.json({ success: false, message: "Tidak ada video ditemukan." });
    }

    // 2. SEDOT KOMENTAR SECARA PARALEL (Lebih Cepat!)
    const commentPromises = searchData.items.map(item => {
      const videoId = item.id.videoId;
      const commentUrl = `[https://www.googleapis.com/youtube/v3/commentThreads?part=snippet&videoId=$](https://www.googleapis.com/youtube/v3/commentThreads?part=snippet&videoId=$){videoId}&maxResults=15&key=${YOUTUBE_API_KEY}`;
      return fetch(commentUrl).then(res => res.json());
    });

    const commentsResults = await Promise.all(commentPromises);
    
    let allComments = [];
    commentsResults.forEach(data => {
      if (data.items) {
        data.items.forEach(c => allComments.push(c.snippet.topLevelComment.snippet.textDisplay));
      }
    });

    if (allComments.length === 0) {
      return NextResponse.json({ success: false, message: "Tidak ada komentar untuk dianalisis." });
    }

    const rawCommentsText = allComments.join("\n- ");

    // 3. SURUH GEMINI BACA
    const promptContext = type === 'negative' 
      ? `Dari komentar YouTube ini, temukan 5 ISU ATAU KELUHAN NEGATIF utama terkait Puan Maharani. Format output WAJIB JSON Array of Objects MURNI tanpa markdown, seperti ini: [{"topik": "Judul Isu", "volume": 85, "konteks": "Penjelasan detail kenapa dikritik"}]`
      : `Dari komentar YouTube ini, temukan 5 PUJIAN ATAU SENTIMEN POSITIF utama terkait Puan Maharani. Format output WAJIB JSON Array of Objects MURNI tanpa markdown, seperti ini: [{"topik": "Judul Pujian", "volume": 75, "konteks": "Penjelasan detail apa yang dipuji"}]`;

    const geminiUrl = `[https://generativelanguage.googleapis.com/v1beta/models/gemini-1.5-flash:generateContent?key=$](https://generativelanguage.googleapis.com/v1beta/models/gemini-1.5-flash:generateContent?key=$){GEMINI_API_KEY}`;
    const aiResponse = await fetch(geminiUrl, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        contents: [{ parts: [{ text: `${promptContext}\n\nKomentar:\n${rawCommentsText}` }] }],
        generationConfig: { responseMimeType: "application/json" } // Paksa balasan dalam bentuk JSON
      })
    });

    const aiData = await aiResponse.json();
    
    if (!aiData.candidates) {
        throw new Error("Gemini API gagal merespons atau limit habis.");
    }

    // 4. PEMBERSIH KOTORAN MARKDOWN (Sangat Penting)
    let rawText = aiData.candidates[0].content.parts[0].text;
    rawText = rawText.replace(/```json/g, '').replace(/```/g, '').trim();

    let finalData = JSON.parse(rawText);

    return NextResponse.json({ success: true, data: finalData });

  } catch (error) {
    console.error("YouTube AI Error:", error);
    return NextResponse.json({ success: false, message: error.message });
  }
}
