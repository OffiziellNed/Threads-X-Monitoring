import { NextResponse } from 'next/server';

export const dynamic = 'force-dynamic';

function parseRelativeTime(text) {
    const now = new Date();
    const num = parseInt(text.replace(/[^0-9]/g, '')) || 0;
    const lowerText = text.toLowerCase();
    
    if (lowerText.includes('hour') || lowerText.includes('jam')) {
        now.setHours(now.getHours() - num);
    } else if (lowerText.includes('minute') || lowerText.includes('menit')) {
        now.setMinutes(now.getMinutes() - num);
    } else if (lowerText.includes('day') || lowerText.includes('hari')) {
        now.setDate(now.getDate() - num);
    }
    return now;
}

export async function GET() {
  try {
    // Scraping YouTube Search "Puan Maharani OR Ketua DPR" dengan filter Upload Date: Today
    const searchUrl = `https://www.youtube.com/results?search_query=${encodeURIComponent('Puan Maharani OR Ketua DPR')}&sp=EgIIAQ%253D%253D`;
    
    const ytRes = await fetch(searchUrl, { 
        headers: { 'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36' },
        cache: 'no-store' 
    });
    const html = await ytRes.text();
    
    const dataMatch = html.match(/var ytInitialData = (\{.*?\});<\/script>/);
    if (!dataMatch) throw new Error("Gagal ekstrak ytInitialData");
    
    const ytData = JSON.parse(dataMatch[1]);
    
    let videoItems = [];
    try {
        const contents = ytData.contents.twoColumnSearchResultsRenderer.primaryContents.sectionListRenderer.contents;
        contents.forEach(section => {
            if (section.itemSectionRenderer && section.itemSectionRenderer.contents) {
                section.itemSectionRenderer.contents.forEach(item => {
                    if (item.videoRenderer) videoItems.push(item.videoRenderer);
                });
            }
        });
    } catch(e) { console.error("Struktur JSON YT berubah"); }

    // Ambil maksimal 15 video aktual agar tidak memberatkan server saat cross-check API
    videoItems = videoItems.slice(0, 15);
    
    // Kumpulkan ID untuk ditarik metriknya secara batch (Massal)
    const videoIds = videoItems.map(v => v.videoId).join(',');
    
    let statsData = {};
    if (videoIds) {
        try {
            // Lemnoslife API untuk ambil views, likes, dan comments secara real-time
            const statRes = await fetch(`https://yt.lemnoslife.com/videos?part=statistics&id=${videoIds}`, { cache: 'no-store' });
            const statJson = await statRes.json();
            if (statJson.items) {
                statJson.items.forEach(item => {
                    statsData[item.id] = {
                        views: parseInt(item.statistics.viewCount || 0),
                        likes: parseInt(item.statistics.likeCount || 0),
                        comments: parseInt(item.statistics.commentCount || 0)
                    };
                });
            }
        } catch (e) { console.error("Lemnoslife API error"); }
    }

    const fetchPromises = videoItems.map(async (vid) => {
        const videoId = vid.videoId;
        const title = vid.title.runs[0].text;
        const publishedText = vid.publishedTimeText?.simpleText || "Baru saja";
        
        const pubDate = parseRelativeTime(publishedText);
        
        let views = statsData[videoId]?.views || parseInt(vid.viewCountText?.simpleText?.replace(/[^0-9]/g, '') || 0);
        let likes = statsData[videoId]?.likes || 0;
        let comments = statsData[videoId]?.comments || 0;
        let dislikes = 0;

        // Tarik Dislike secara satuan dari ReturnYouTubeDislike API
        try {
            const rydRes = await fetch(`https://returnyoutubedislikeapi.com/votes?videoId=${videoId}`, { cache: 'no-store' });
            if(rydRes.ok) {
                const rydData = await rydRes.json();
                dislikes = rydData.dislikes || 0;
                if (views === 0) views = rydData.viewCount || views;
                if (likes === 0) likes = rydData.likes || likes;
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

    return NextResponse.json({ 
      success: true, 
      data: realVideos
    });
  } catch (error) {
    return NextResponse.json({ success: false, data: [] });
  }
}
