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
    }
    return now;
}

export async function GET() {
  try {
    const searchUrl = `https://www.youtube.com/results?search_query=${encodeURIComponent('Puan Maharani OR Ketua DPR')}&sp=EgQIAhAB`;
    
    const ytRes = await fetch(searchUrl, { 
        headers: { 
            'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64)',
            'Cookie': 'CONSENT=YES+cb.20230101-01-p0.en+FX+478'
        },
        cache: 'no-store' 
    });
    
    const html = await ytRes.text();
    const dataMatch = html.match(/ytInitialData\s*=\s*(\{.+?\});/);
    if (!dataMatch) throw new Error("Gagal ekstrak data");
    
    const ytData = JSON.parse(dataMatch[1]);
    let rawVideos = [];
    
    const findVideos = (obj) => {
        if (!obj) return;
        if (obj.videoRenderer && obj.videoRenderer.videoId) {
            rawVideos.push(obj.videoRenderer);
        } else if (Array.isArray(obj)) {
            obj.forEach(findVideos);
        } else if (typeof obj === 'object') {
            Object.values(obj).forEach(findVideos);
        }
    };
    findVideos(ytData);

    let strictFilteredVideos = [];
    let seenIds = new Set();

    for (const vid of rawVideos) {
        if (!vid.videoId || seenIds.has(vid.videoId)) continue;
        const title = (vid.title?.runs?.[0]?.text || "").toLowerCase();

        if (title.includes("puan") || title.includes("ketua dpr")) {
            const viewText = vid.viewCountText?.simpleText || "";
            const exactViews = parseInt(viewText.replace(/[^0-9]/g, '')) || 0;
            
            if (exactViews >= 1000) {
                strictFilteredVideos.push({
                    id: vid.videoId,
                    title: vid.title?.runs?.[0]?.text,
                    publishedText: vid.publishedTimeText?.simpleText || "Baru saja",
                    views: exactViews,
                    channelName: vid.ownerText?.runs?.[0]?.text || "YouTube"
                });
                seenIds.add(vid.videoId);
            }
        }
    }

    strictFilteredVideos = strictFilteredVideos.slice(0, 15);

    const fetchPromises = strictFilteredVideos.map(async (vid) => {
        let likes = 0, dislikes = 0;
        let finalViews = vid.views;

        try {
            const rydRes = await fetch(`https://returnyoutubedislikeapi.com/votes?videoId=${vid.id}`, { cache: 'no-store' });
            if(rydRes.ok) {
                const rydData = await rydRes.json();
                likes = rydData.likes || 0;
                dislikes = rydData.dislikes || 0;
                if (finalViews === 0 && rydData.viewCount) finalViews = rydData.viewCount;
            }
        } catch(e) {}

        const pubDate = parseRelativeTime(vid.publishedText);

        return {
          id: vid.id,
          title: vid.title,
          link: `https://www.youtube.com/watch?v=${vid.id}`,
          date: pubDate.toLocaleDateString('id-ID', { timeZone: 'Asia/Jakarta', day: '2-digit', month: 'short', year: 'numeric' }),
          time: pubDate.toLocaleTimeString('id-ID', { timeZone: 'Asia/Jakarta', hour: '2-digit', minute:'2-digit' }) + " WIB",
          views: finalViews,
          likes: likes,
          dislikes: dislikes
        };
    });

    let finalData = await Promise.all(fetchPromises);
    finalData.sort((a, b) => b.views - a.views);

    return NextResponse.json({ success: true, data: finalData });
  } catch (error) {
    return NextResponse.json({ success: false, data: [] });
  }
}
