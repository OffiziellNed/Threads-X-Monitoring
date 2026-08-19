import { NextResponse } from 'next/server';

export const dynamic = 'force-dynamic';
export const fetchCache = 'force-no-store'; 

export async function POST(request) {
  try {
    const body = await request.json();
    const type = body.type || 'negative'; // 'negative' atau 'positive'

    // API KEY LO UDAH TERPASANG OTOMATIS DI SINI BOS!
    const YOUTUBE_API_KEY = "AIzaSyBNoLOXG7uflkFBtFUQ2lANlC5eAaWs3QY";
    const GEMINI_API_KEY = "AQ.Ab8RN6K2p4V294eiQPwMsZex3Kq2JX7hN5V4r3BQXuQ6NWkV-w";

    // 1. CARI 3 VIDEO TERBARU TENTANG PUAN MAHARANI
    const searchUrl = `https://www.googleapis.com/youtube/v3/search?part=snippet&q=${encodeURIComponent('Puan Maharani')}&type=video&order=date&maxResults=3&key=${YOUTUBE_API_KEY}`;
    const searchRes = await fetch(searchUrl);
    const searchData = await searchRes.json();
    
    if (!searchData.items) throw new Error("Gagal ambil video YouTube");

    // 2. SEDOT KOMENTAR DARI VIDEO TERSEBUT (Maks 60 komentar biar AI bacanya ngebut)
    let allComments = [];
    for (const item of searchData.items) {
      const videoId = item.id.videoId;
      const commentUrl = `https://www.googleapis.com/youtube/v3/commentThreads?part=snippet&videoId=${videoId}&maxResults=20&key=${YOUTUBE_API_KEY}`;
      const commentRes = await fetch(commentUrl);
      const commentData = await commentRes.json();

      if (commentData.items) {
        commentData.items.forEach(c => {
          allComments.push(c.snippet.topLevelComment.snippet.textDisplay);
        });
      }
    }

    const rawCommentsText = allComments.join("\n- ");

    // 3. SURUH GEMINI AI BACA DAN KELOMPOKKAN
    const promptContext = type === 'negative' 
      ? `Dari komentar YouTube ini, temukan 5 ISU ATAU KELUHAN NEGATIF utama terkait Puan Maharani. Format output WAJIB JSON Array of Objects seperti ini: [{"topik": "Judul Isu", "volume": 85, "konteks": "Penjelasan detail kenapa netizen mengkritik ini"}]`
      : `Dari komentar YouTube ini, temukan 5 PUJIAN ATAU SENTIMEN POSITIF utama terkait Puan Maharani. Format output WAJIB JSON Array of Objects seperti ini: [{"topik": "Judul Pujian", "volume": 75, "konteks": "Penjelasan detail apa yang dipuji netizen"}]`;

    const geminiUrl = `https://generativelanguage.googleapis.com/v1beta/models/gemini-1.5-flash:generateContent?key=${GEMINI_API_KEY}`;
    const aiResponse = await fetch(geminiUrl, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        contents: [{ parts: [{ text: `${promptContext}\n\nKomentar:\n${rawCommentsText}` }] }],
        generationConfig: { responseMimeType: "application/json" }
      })
    });

    const aiData = await aiResponse.json();
    let finalData = JSON.parse(aiData.candidates[0].content.parts[0].text);

    return NextResponse.json({ success: true, data: finalData });

  } catch (error) {
    console.error("YouTube AI Error:", error);
    return NextResponse.json({ success: false, message: "Terjadi kesalahan sistem/timeout." });
  }
}
