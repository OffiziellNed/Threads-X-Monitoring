import { NextResponse } from 'next/server';

export const dynamic = 'force-dynamic';

const STOP_WORDS = ['yang', 'untuk', 'pada', 'dari', 'dengan', 'dalam', 'dan', 'ini', 'itu', 'oleh', 'akan', 'bisa', 'telah', 'tidak', 'sebagai', 'karena', 'jadi', 'bagi', 'atau', 'saat', 'puan', 'maharani', 'dpr', 'ri', 'ketua', 'youtube', 'video', 'saya', 'di', 'ke', 'ada', 'itu', 'ini', 'kita', 'kami', 'mereka', 'juga', 'sudah', 'yg', 'nya', 'aku', 'aja', 'sama', 'buat'];

export async function GET() {
  try {
    // BYPASS GOOGLE NEWS: Langsung tembak ke YouTube Search (Filter: This Week)
    // sp=EgQIAhAB menjamin kita selalu dapat video terbaru agar data tidak pernah 0
    const searchUrl = `https://www.youtube.com/results?search_query=${encodeURIComponent('Puan Maharani Ketua DPR')}&sp=EgQIAhAB`;
    
    const ytRes = await fetch(searchUrl, { 
        headers: { 'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64)' },
        cache: 'no-store' 
    });
    const html = await ytRes.text();
    
    // Ekstrak JSON Tersembunyi dari Internal YouTube
    const dataMatch = html.match(/var ytInitialData = (\{.*?\});<\/script>/);
    if (!dataMatch) throw new Error("Gagal ekstrak ytInitialData");
    
    const ytData = JSON.parse(dataMatch[1]);
    
    let videoItems = [];
    try {
        const contents = ytData.contents.twoColumnSearchResultsRenderer.primaryContents.sectionListRenderer.contents[0].itemSectionRenderer.contents;
        contents.forEach(item => {
            if (item.videoRenderer) videoItems.push(item.videoRenderer);
        });
    } catch(e) { console.error("Struktur JSON YT berubah"); }

    // Dibatasi 6 video teratas agar API pihak ketiga tidak Vercel Timeout
    videoItems = videoItems.slice(0, 6);
    
    let allCommentText = "";
    let daysCount = { "Senin": 0, "Selasa": 0, "Rabu": 0, "Kamis": 0, "Jumat": 0, "Sabtu": 0, "Minggu": 0 };
    const daysIndo = ["Minggu", "Senin", "Selasa", "Rabu", "Kamis", "Jumat", "Sabtu"];

    // Eksekusi Penarikan Metrik API Paralel
    const fetchPromises = videoItems.map(async (vid) => {
        const videoId = vid.videoId;
        const title = vid.title.runs[0].text;
        const channelName = vid.ownerText?.runs[0]?.text || "YouTube Channel";
        const publishedText = vid.publishedTimeText?.simpleText || "Baru saja"; 
        
        // Kalkulasi Hari Aktual dari Teks YouTube (misal: "3 hari yang lalu")
        let pubDate = new Date();
        const timeText = publishedText.toLowerCase();
        if (timeText.includes('hari') || timeText.includes('day')) {
            const num = parseInt(timeText) || 1;
            pubDate.setDate(pubDate.getDate() - num);
        } else if (timeText.includes('minggu') || timeText.includes('week')) {
            pubDate.setDate(pubDate.getDate() - 7);
        }
        const dayName = daysIndo[pubDate.getDay()];
        daysCount[dayName] = (daysCount[dayName] || 0) + 1;

        let views = 0, likes = 0, dislikes = 0, commentsData = [];

        // 1. Scraping RYD API (Real-time View/Like/Dislike)
        try {
            const rydRes = await fetch(`https://returnyoutubedislikeapi.com/votes?videoId=${videoId}`, { cache: 'no-store' });
            const rydData = await rydRes.json();
            views = rydData.viewCount || 0;
            likes = rydData.likes || 0;
            dislikes = rydData.dislikes || 0;
        } catch(e) {}

        // 2. Scraping Lemnoslife API (Real-time Comments)
        try {
            const cmtRes = await fetch(`https://yt.lemnoslife.com/commentThreads?part=snippet&videoId=${videoId}&maxResults=8`, { cache: 'no-store' });
            const cmtJson = await cmtRes.json();
            if (cmtJson.items) {
                cmtJson.items.forEach(c => {
                    const snippet = c.snippet.topLevelComment.snippet;
                    commentsData.push({
                        user: snippet.authorDisplayName,
                        comment: snippet.textOriginal,
                        likes: snippet.likeCount || 0,
                        time: new Date(snippet.publishedAt).toLocaleString('id-ID', { timeZone: 'Asia/Jakarta', dateStyle: 'short', timeStyle: 'short' })
                    });
                    allCommentText += snippet.textOriginal + " ";
                });
            }
        } catch(e) {}

        return {
          id: videoId,
          title: title,
          link: `https://www.youtube.com/watch?v=${videoId}`,
          date: pubDate.toLocaleDateString('id-ID', { timeZone: 'Asia/Jakarta', day: 'numeric', month: 'long', year: 'numeric' }),
          uploadTime: publishedText, 
          channelName: channelName,
          timestamp: pubDate.getTime(),
          views: views,
          likes: likes,
          dislikes: dislikes,
          comments: commentsData
        };
    });

    const realVideos = (await Promise.all(fetchPromises)).filter(v => v !== null);

    // Fallback Darurat jika YouTube merespon kosong
    if (realVideos.length === 0) {
        return NextResponse.json({ success: true, data: { totalMentions: 0, trendData: ["Senin", "Selasa", "Rabu", "Kamis", "Jumat", "Sabtu", "Minggu"].map(d => ({ waktu: d, mentions: 0 })), topKeywords: [], realVideos: [] } });
    }

    const totalMentions = realVideos.length; 

    // Kalkulasi Grafik Garis
    const trendData = ["Senin", "Selasa", "Rabu", "Kamis", "Jumat", "Sabtu", "Minggu"].map(day => {
      return { waktu: day, mentions: daysCount[day] || 0 };
    });

    // Menghitung Top 5 Keywords Aktual dari Teks Komentar
    const words = allCommentText.toLowerCase().replace(/[^a-z0-9\s]/g, '').split(/\s+/);
    let wordCounts = {};
    words.forEach(w => {
        if (w.length > 3 && !STOP_WORDS.includes(w)) {
            wordCounts[w] = (wordCounts[w] || 0) + 1;
        }
    });
    const sortedWords = Object.keys(wordCounts).sort((a, b) => wordCounts[b] - wordCounts[a]).slice(0, 5);
    const topKeywords = sortedWords.map(word => ({
        word: word.charAt(0).toUpperCase() + word.slice(1),
        commentCount: wordCounts[word]
    }));

    return NextResponse.json({ 
      success: true, 
      data: { totalMentions, trendData, topKeywords, realVideos } 
    });
  } catch (error) {
    return NextResponse.json({ success: false, data: null });
  }
}
