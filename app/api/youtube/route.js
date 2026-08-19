import { NextResponse } from 'next/server';

export const dynamic = 'force-dynamic';
export const fetchCache = 'force-no-store'; 

export async function POST(request) {
  try {
    const body = await request.json();
    const type = body.type || 'negative';

    // KUNCI YOUTUBE TETAP PAKAI YANG LAMA
    const YOUTUBE_API_KEY = "AIzaSyBNoLOXG7uflkFBtFUQ2lANlC5eAaWs3QY";
    
    // MASUKIN KUNCI GEMINI YANG BARU AJA LO BIKIN DI SINI:
    const GEMINI_API_KEY = "MASUKIN_KUNCI_GEMINI_YANG_BARU_DI_SINI";

    // 1. CARI 1 VIDEO SAJA
    const searchUrl = `https://www.googleapis.com/youtube/v3/search?part=snippet&q=${encodeURIComponent('Puan Maharani')}&type=video&order=date&maxResults=1&key=${YOUTUBE_API_KEY}`;
    const searchRes = await fetch(searchUrl);
    const searchData = await searchRes.json();
    
    if (searchData.error) {
       return NextResponse.json({ success: true, data: [{ topik: "YouTube API Error", volume: 0, konteks: searchData.error.message }] });
    }
    if (!searchData.items || searchData.items.length === 0) {
      return NextResponse.json({ success: true, data: [{ topik: "Error Video", volume: 0, konteks: "Tidak ada video terbaru di YouTube." }] });
    }

    // 2. SEDOT KOMENTAR
    const videoId = searchData.items[0].id.videoId;
    const commentUrl = `https://www.googleapis.com/youtube/v3/commentThreads?part=snippet&videoId=${videoId}&maxResults=30&key=${YOUTUBE_API_KEY}`;
    const commentRes = await fetch(commentUrl);
    const commentData = await commentRes.json();
    
    let allComments = [];
    if (commentData.items) {
      commentData.items.forEach(c => {
         if (c.snippet?.topLevelComment?.snippet) {
             allComments.push(c.snippet.topLevelComment.snippet.textDisplay);
         }
      });
    }

    if (allComments.length === 0) {
      return NextResponse.json({ success: true, data: [{ topik: "Sepi Komentar", volume: 0, konteks: "Video terbaru ditutup kolom komentarnya." }] });
    }

    const rawCommentsText = allComments.join("\n- ").substring(0, 10000); 

    // 3. PROMPT MAKSIMAL 
    const promptContext = type === 'negative' 
      ? `Tugas: Ekstrak 5 isu negatif atau kritik utama dari komentar YouTube berikut tentang Puan Maharani. Format WAJIB JSON Array murni. Contoh: [{"topik": "Isu A", "volume": 85, "konteks": "Penjelasan"}]`
      : `Tugas: Ekstrak 5 sentimen positif atau dukungan utama dari komentar YouTube berikut tentang Puan Maharani. Format WAJIB JSON Array murni. Contoh: [{"topik": "Pujian A", "volume": 75, "konteks": "Penjelasan"}]`;

    // 4. JALUR URL NORMAL PAKAI KUNCI BARU GEMINI
    const geminiUrl = `https://generativelanguage.googleapis.com/v1beta/models/gemini-1.5-flash:generateContent?key=${GEMINI_API_KEY}`;
    
    const aiResponse = await fetch(geminiUrl, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        contents: [{ parts: [{ text: `${promptContext}\n\nKomentar:\n${rawCommentsText}` }] }],
        generationConfig: { responseMimeType: "application/json" },
        safetySettings: [
          { category: "HARM_CATEGORY_HARASSMENT", threshold: "BLOCK_NONE" },
          { category: "HARM_CATEGORY_HATE_SPEECH", threshold: "BLOCK_NONE" },
          { category: "HARM_CATEGORY_SEXUALLY_EXPLICIT", threshold: "BLOCK_NONE" },
          { category: "HARM_CATEGORY_DANGEROUS_CONTENT", threshold: "BLOCK_NONE" }
        ]
      })
    });

    const aiData = await aiResponse.json();
    
    if (aiData.error) {
        return NextResponse.json({ success: true, data: [{ topik: "Gemini API Error", volume: 0, konteks: aiData.error.message }] });
    }

    if (!aiData.candidates || aiData.candidates.length === 0) {
        return NextResponse.json({ success: true, data: [{ topik: "AI Diblokir", volume: 0, konteks: "Gemini menolak menjawab." }] });
    }

    // 5. PARSING DATA
    let finalData = [];
    try {
        let rawText = aiData.candidates[0].content.parts[0].text;
        rawText = rawText.replace(/```json/g, '').replace(/```/g, '').trim();
        
        const arrayMatch = rawText.match(/\[\s*\{[\s\S]*\}\s*\]/);
        if (arrayMatch) {
            rawText = arrayMatch[0];
        }

        finalData = JSON.parse(rawText);

        if (!Array.isArray(finalData)) {
            if (finalData.data && Array.isArray(finalData.data)) {
                finalData = finalData.data;
            } else {
                finalData = [finalData]; 
            }
        }
    } catch (parseError) {
        return NextResponse.json({ success: true, data: [{ topik: "Gagal Baca Format", volume: 0, konteks: "AI membalas dengan format yang salah." }] });
    }

    return NextResponse.json({ success: true, data: finalData });

  } catch (error) {
    return NextResponse.json({ success: true, data: [{ topik: "Sistem Timeout", volume: 0, konteks: `Gagal proses: ${error.message}` }] });
  }
}
