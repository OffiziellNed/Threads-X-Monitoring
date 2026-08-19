import { NextResponse } from 'next/server';

export const dynamic = 'force-dynamic';

export async function POST(request) {
  try {
    const { type } = await request.json();
    const YOUTUBE_API_KEY = "AIzaSyBNoLOXG7uflkFBtFUQ2lANlC5eAaWs3QY";

    // 1. Cari video terbaru tentang Puan Maharani
    const searchUrl = `https://www.googleapis.com/youtube/v3/search?part=snippet&q=${encodeURIComponent('Puan Maharani')}&type=video&order=date&maxResults=1&key=${YOUTUBE_API_KEY}`;
    const searchRes = await fetch(searchUrl);
    const searchData = await searchRes.json();
    
    if (!searchData.items?.length) {
      return NextResponse.json({ success: false, error: "Video tidak ditemukan di YouTube." });
    }

    const videoId = searchData.items[0].id.videoId;
    const videoTitle = searchData.items[0].snippet.title;

    // 2. Ambil thread komentar dari video tersebut
    const commentUrl = `https://www.googleapis.com/youtube/v3/commentThreads?part=snippet&videoId=${videoId}&maxResults=30&key=${YOUTUBE_API_KEY}`;
    const commentRes = await fetch(commentUrl);
    const commentData = await commentRes.json();
    
    const comments = commentData.items?.map(item => {
      const snippet = item.snippet?.topLevelComment?.snippet;
      return {
        author: snippet?.authorDisplayName || "Anonim",
        text: snippet?.textDisplay || "",
        publishedAt: snippet?.publishedAt
      };
    }) || [];

    // 3. Filter atau petakan sentimen sederhana berdasarkan isi komentar asli
    // (Mengelompokkan isi komentar asli agar tampil dengan konteks nyata)
    const processedData = comments.map((c, index) => ({
      topik: `KOMENTAR #${index + 1} (${c.author})`,
      volume: c.text.length > 50 ? 80 : 40,
      konteks: c.text
    })).slice(0, 5); // Ambil 5 sampel konteks teratas

    return NextResponse.json({ 
      success: true, 
      videoInfo: { title: videoTitle, videoId },
      data: processedData.length > 0 ? processedData : [{ topik: "INFO", volume: 10, konteks: "Komentar kosong atau dimatikan pada video ini." }] 
    });

  } catch (error) {
    return NextResponse.json({ success: false, error: error.message });
  }
}
