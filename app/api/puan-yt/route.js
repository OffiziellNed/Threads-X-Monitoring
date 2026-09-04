import { NextResponse } from 'next/server';

export const dynamic = 'force-dynamic';

const STOP_WORDS = ['yang', 'untuk', 'pada', 'dari', 'dengan', 'dalam', 'dan', 'ini', 'itu', 'oleh', 'akan', 'bisa', 'telah', 'tidak', 'sebagai', 'karena', 'jadi', 'bagi', 'atau', 'saat', 'puan', 'maharani', 'dpr', 'ri', 'ketua', 'youtube', 'video', 'saya', 'di', 'ke', 'ada', 'itu', 'ini', 'kita', 'kami', 'mereka', 'juga', 'sudah'];

export async function GET() {
  try {
    // 1. Tarik RSS aktual video hari ini dari Google News
    const query = encodeURIComponent(`"Puan Maharani" OR "Ketua DPR" site:youtube.com when:24h`);
    const rssUrl = `https://news.google.com/rss/search?q=${query}&hl=id&gl=ID&ceid=ID:id`;

    const response = await fetch(rssUrl, { cache: 'no-store' });
    const xmlText = await response.text();
    const items = xmlText.split("<item>");
    
    let realVideos = [];
    let allCommentText = "";
    
    let daysCount = { "Senin": 0, "Selasa": 0, "Rabu": 0, "Kamis": 0, "Jumat": 0, "Sabtu": 0, "Minggu": 0 };
    const daysIndo = ["Minggu", "Senin", "Selasa", "Rabu", "Kamis", "Jumat", "Sabtu"];
    const now = new Date();

    // Dibatasi memproses 6 video terbaru agar server tidak timeout saat scraping API eksternal
    const maxVideos = Math.min(items.length - 1, 6);

    for (let i = 1; i <= maxVideos; i++) {
      const item = items[i];
      const titleMatch = item.match(/<title>([\s\S]*?)<\/title>/);
      const linkMatch = item.match(/<link>([\s\S]*?)<\/link>/);
      const dateMatch = item.match(/<pubDate>([\s\S]*?)<\/pubDate>/);
      const sourceMatch = item.match(/<source.*?>([\s\S]*?)<\/source>/);

      if (titleMatch && linkMatch && dateMatch) {
        let rawTitle = titleMatch[1].replace(/<!\[CDATA\[(.*?)\]\]>/g, '$1').replace(/&amp;/g, '&').replace(/&quot;/g, '"').replace(/&#39;/g, "'");
        const cleanTitle = rawTitle.split(" - ")[0]; 
        
        // Ekstrak ID Video YouTube Asli
        const url = linkMatch[1];
        let videoId = "";
        const vMatch = url.match(/v=([^&]+)/);
        if (vMatch) videoId = vMatch[1];
        if (!videoId) continue;

        const pubDate = new Date(dateMatch[1]);
        const sourceName = sourceMatch ? sourceMatch[1].replace(/<!\[CDATA\[(.*?)\]\]>/g, '$1') : "YouTube";
        
        const dayName = daysIndo[pubDate.getDay()];
        daysCount[dayName] += 1;

        // =========================================================
        // SCRAPING 100% REAL STATS (Views, Likes, Dislikes)
        // =========================================================
        let views = 0, likes = 0, dislikes = 0;
        try {
            const rydRes = await fetch(`https://returnyoutubedislikeapi.com/votes?videoId=${videoId}`, { cache: 'no-store' });
            const rydData = await rydRes.json();
            views = rydData.viewCount || 0;
            likes = rydData.likes || 0;
            dislikes = rydData.dislikes || 0;
        } catch(e) { console.error("Gagal tarik metrik video"); }

        // =========================================================
        // SCRAPING 100% REAL COMMENTS BESERTA AKUN
        // =========================================================
        let commentsData = [];
        try {
            const cmtRes = await fetch(`https://yt.lemnoslife.com/commentThreads?part=snippet&videoId=${videoId}&maxResults=5`, { cache: 'no-store' });
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
                    // Kumpulkan teks untuk analisis sentimen kata kunci
                    allCommentText += snippet.textOriginal + " ";
                });
            }
        } catch(e) { console.error("Gagal tarik komentar"); }

        realVideos.push({
          id: videoId,
          title: cleanTitle,
          link: url,
          date: pubDate.toLocaleDateString('id-ID', { timeZone: 'Asia/Jakarta', day: 'numeric', month: 'long', year: 'numeric' }),
          uploadTime: pubDate.toLocaleTimeString('id-ID', { timeZone: 'Asia/Jakarta', hour: '2-digit', minute:'2-digit' }),
          channelName: sourceName,
          timestamp: pubDate.getTime(),
          views: views,
          likes: likes,
          dislikes: dislikes,
          comments: commentsData
        });
      }
    }

    const totalMentions = realVideos.length; 

    // TREND DATA REAL 
    const trendData = ["Senin", "Selasa", "Rabu", "Kamis", "Jumat", "Sabtu", "Minggu"].map(day => {
      const count = daysCount[day] || 0;
      return { waktu: day, mentions: count };
    });

    // TOP 5 KEYWORDS REAL (DARI KOMENTAR AKTUAL NETIZEN)
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
