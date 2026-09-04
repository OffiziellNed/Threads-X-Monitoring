import { NextResponse } from 'next/server';

export const dynamic = 'force-dynamic';

function parseRelativeTime(text) {
    const now = new Date();
    if (!text) return now;
    const num = parseInt(text.replace(/[^0-9]/g, '')) || 0;
    const lowerText = text.toLowerCase();
    
    if (lowerText.includes('hour') || lowerText.includes('jam')) {
        now.setHours(now.getHours() - num);
    } else if (lowerText.includes('minute') || lowerText.includes('menit')) {
        now.setMinutes(now.getMinutes() - num);
    } else if (lowerText.includes('day') || lowerText.includes('hari')) {
        now.setDate(now.getDate() - num);
    } else if (lowerText.includes('week') || lowerText.includes('minggu')) {
        now.setDate(now.getDate() - (num * 7));
    } else if (lowerText.includes('month') || lowerText.includes('bulan')) {
        now.setMonth(now.getMonth() - num);
    }
    return now;
}

export async function GET() {
  try {
    // Filter YouTube "This Week" (EgQIAhAB) untuk relevansi dan rentang waktu 7 hari terakhir
    const searchUrl = `https://www.youtube.com/results?search_query=${encodeURIComponent('Puan Maharani OR Ketua DPR')}&sp=EgQIAhAB`;
    
    const ytRes = await fetch(searchUrl, { 
        headers: { 
            'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
            'Cookie': 'CONSENT=YES+cb.20230101-01-p0.en+FX+478'
        },
        cache: 'no-store' 
    });
    
    const html = await ytRes.text();
    const dataMatch = html.match(/ytInitialData\s*=\s*(\{.+?\});/);
    if (!dataMatch) throw new Error("Gagal ekstrak data YouTube");
    
    const ytData = JSON.parse(dataMatch[1]);
    let videoItems = [];
    
    const findVideos = (obj) => {
        if (!obj) return;
        if (obj.videoRenderer && obj.videoRenderer.videoId) {
            videoItems.push(obj.videoRenderer);
        } else if (Array.isArray(obj)) {
            obj.forEach(findVideos);
        } else if (typeof obj === 'object') {
            Object.values(obj).forEach(findVideos);
        }
    };
    findVideos(ytData);

    // Dibatasi 12 video teratas agar tarikan ke API Komentar stabil
    videoItems = videoItems.slice(0, 12);
    
    const fetchPromises = videoItems.map(async (vid) => {
        const videoId = vid.videoId;
        const title = vid.title?.runs?.[0]?.text || "Tanpa Judul";
        const publishedText = vid.publishedTimeText?.simpleText || "Baru saja";
        
        const pubDate = parseRelativeTime(publishedText);
        
        let views = parseInt(vid.viewCountText?.simpleText?.replace(/[^0-9]/g, '') || 0);
        let likes = 0;
        let dislikes = 0;
        let comments = 0;

        // 1. Penarikan Likes & Dislikes (Individu)
        try {
            const rydRes = await fetch(`https://returnyoutubedislikeapi.com/votes?videoId=${videoId}`, { cache: 'no-store' });
            if(rydRes.ok) {
                const rydData = await rydRes.json();
                dislikes = rydData.dislikes || 0;
                likes = rydData.likes || 0;
                if (rydData.viewCount) views = rydData.viewCount;
            }
        } catch(e) {}

        // 2. Penarikan Komentar (Dipanggil per individu untuk menghindari kegagalan batch)
        try {
            const statRes = await fetch(`https://yt.lemnoslife.com/videos?part=statistics&id=${videoId}`, { cache: 'no-store' });
            if(statRes.ok) {
                const statData = await statRes.json();
                if (statData.items && statData.items.length > 0) {
                    comments = parseInt(statData.items[0].statistics.commentCount || 0);
                }
            }
        } catch(e) {}

        return {
          id: videoId,
          title: title,
          link: `https://www.youtube.com/watch?v=${videoId}`,
          date: pubDate.toLocaleDateString('id-ID', { timeZone: 'Asia/Jakarta', day: '2-digit', month: 'short', year: 'numeric' }),
          time: pubDate.toLocaleTimeString('id-ID', { timeZone: 'Asia/Jakarta', hour: '2-digit', minute:'2-digit' }) + " WIB",
          views: views,
          likes: likes,
          dislikes: dislikes,
          comments: comments
        };
    });

    let realVideos = (await Promise.all(fetchPromises)).filter(v => v !== null);

    // Mengurutkan dari tayangan tertinggi secara default
    realVideos.sort((a, b) => b.views - a.views);

    return NextResponse.json({ success: true, data: realVideos });
  } catch (error) {
    return NextResponse.json({ success: false, data: [] });
  }
}
