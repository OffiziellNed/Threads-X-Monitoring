import { NextResponse } from 'next/server';

export const dynamic = 'force-dynamic';
export const fetchCache = 'force-no-store'; 

export async function POST(request) {
  try {
    const body = await request.json();
    const type = body.type || 'negative';

    const YOUTUBE_API_KEY = "AIzaSyBNoLOXG7uflkFBtFUQ2lANlC5eAaWs3QY";

    // 1. CARI VIDEO
    const searchUrl = `https://www.googleapis.com/youtube/v3/search?part=snippet&q=${encodeURIComponent('Puan Maharani')}&type=video&order=date&maxResults=1&key=${YOUTUBE_API_KEY}`;
    const searchRes = await fetch(searchUrl);
    const searchData = await searchRes.json();
    
    if (!searchData.items?.length) {
      return NextResponse.json({ success: true, data: [{ topik: "System", volume: 0, konteks: "Video tidak ditemukan." }] });
    }

    // 2. SEDOT KOMENTAR
    const videoId = searchData.items[0].id.videoId;
    const commentUrl = `https://www.googleapis.com/youtube/v3/commentThreads?part=snippet&videoId=${videoId}&maxResults=50&key=${YOUTUBE_API_KEY}`;
    const commentRes = await fetch(commentUrl);
    const commentData = await commentRes.json();
    
    const comments = commentData.items?.map(c => c.snippet?.topLevelComment?.snippet?.textDisplay.toLowerCase()) || [];

    // 3. ANALISIS KEYWORD LOKAL (TANPA AI)
    const negKeywords = ['gagal', 'buruk', 'korupsi', 'tidak setuju', 'kecewa', 'mahal', 'kritik', 'pencitraan', 'rugi'];
    const posKeywords = ['dukung', 'bagus', 'setuju', 'hebat', 'lanjutkan', 'mantap', 'terima kasih', 'puan', 'oke'];
    
    let analysis = {};
    const targetKeywords = type === 'negative' ? negKeywords : posKeywords;

    targetKeywords.forEach(word => {
        analysis[word] = 0;
        comments.forEach(comment => {
            if (comment.includes(word)) analysis[word]++;
        });
    });

    // 4. FORMAT DATA JSON
    const finalData = Object.entries(analysis)
        .map(([topik, count]) => ({
            topik: topik.toUpperCase(),
            volume: count * 2, // Scaling volume
            konteks: `Ditemukan dalam ${count} komentar netizen.`
        }))
        .filter(item => item.volume > 0)
        .sort((a, b) => b.volume - a.volume)
        .slice(0, 5);

    return NextResponse.json({ success: true, data: finalData.length > 0 ? finalData : [{ topik: "Hasil", volume: 0, konteks: "Data sentimen belum terbaca signifikan." }] });

  } catch (error) {
    return NextResponse.json({ success: true, data: [{ topik: "Error", volume: 0, konteks: error.message }] });
  }
}
