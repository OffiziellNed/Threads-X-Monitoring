import { NextResponse } from 'next/server';

export const dynamic = 'force-dynamic';

const TARGET_KOLS = [
  { id: "totalpolitik", name: "Total Politik" },
  { id: "akbarfaizal", name: "Akbar Faizal" },
  { id: "ferryirwandi", name: "Ferry Irwandi" },
  { id: "tempo", name: "Tempo" },
  { id: "detik", name: "Detik" },
  { id: "antara", name: "Antara" },
  { id: "hensa", name: "Hensa" },
  { id: "sisigelap", name: "Sisi Gelap" },
  { id: "kesetpolitik", name: "Keset Politik" },
  { id: "tribunnews", name: "Tribunnews" }
];

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
    if (!dataMatch) throw new Error("Gagal ekstrak data YouTube");
    
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

    // Siapkan wadah untuk ke-10 KOL
    let kolResults = TARGET_KOLS.map(k => ({ ...k, hasContent: false, video: null }));

    for (const vid of rawVideos) {
        if (!vid.videoId) continue;
        
        const title = (vid.title?.runs?.[0]?.text || "");
        const titleLower = title.toLowerCase();
        const channelName = (vid.ownerText?.runs?.[0]?.text || "").toLowerCase();

        // Cek apakah konten bahas Puan/Ketua DPR
        if (titleLower.includes("puan") || titleLower.includes("ketua dpr")) {
            
            // Cek apakah video ini milik salah satu dari 10 KOL kita
            const matchedIndex = kolResults.findIndex(k => 
                channelName.includes(k.id) || 
                channelName.includes(k.name.toLowerCase()) || 
                (k.id === "tempo" && channelName.includes("tempovideochannel")) ||
                (k.id === "hensa" && channelName.includes("hendri satrio"))
            );

            if (matchedIndex !== -1 && !kolResults[matchedIndex].hasContent) {
                kolResults[matchedIndex].hasContent = true;
                kolResults[matchedIndex].video = {
                    title: title,
                    link: `https://www.youtube.com/watch?v=${vid.videoId}`,
                    timeText: vid.publishedTimeText?.simpleText || "Baru saja"
                };
            }
        }
    }

    return NextResponse.json({ success: true, data: kolResults });
  } catch (error) {
    return NextResponse.json({ success: false, data: [] });
  }
}
