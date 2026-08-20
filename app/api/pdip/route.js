import { NextResponse } from 'next/server';

export const dynamic = 'force-dynamic';

const STOP_WORDS = ['yang', 'untuk', 'pada', 'dari', 'dengan', 'dalam', 'dan', 'ini', 'itu', 'oleh', 'akan', 'bisa', 'telah', 'tidak', 'sebagai', 'karena', 'jadi', 'bagi', 'atau', 'saat'];
// IGNORE KEYWORDS agar mesin tidak overcounting hanya karena ada kata "PDIP"
const IGNORE_WORDS = ['pdip', 'pdi', 'perjuangan', 'megawati', 'soekarnoputri', 'hasto', 'ganjar'];

function getRealVolume(title, allTitles) {
  const words = title.toLowerCase().replace(/[^a-z0-9\s]/g, '').split(/\s+/);
  const coreWords = words.filter(w => w.length > 3 && !STOP_WORDS.includes(w) && !IGNORE_WORDS.includes(w));
  if (coreWords.length === 0) return 1;

  let count = 0;
  allTitles.forEach(t => {
    const tLower = t.toLowerCase();
    const isRelated = coreWords.some(cw => tLower.includes(cw));
    if (isRelated) count++;
  });
  return count;
}

export async function GET(request) {
  try {
    const { searchParams } = new URL(request.url);
    const hours = parseInt(searchParams.get('hours') || '3', 10);
    const timeFilter = hours === 3 ? 'when:3h' : 'when:12h';
    const query = encodeURIComponent(`"PDI Perjuangan" OR PDIP OR "Megawati Soekarnoputri" OR Hasto OR Ganjar ${timeFilter}`);
    const rssUrl = `https://news.google.com/rss/search?q=${query}&hl=id&gl=ID&ceid=ID:id`;

    const response = await fetch(rssUrl, { cache: 'no-store' });
    const xmlText = await response.text();
    const items = xmlText.split("<item>");
    
    let rawItems = [];
    let allTitles = [];
    const pdipKeywords = ['pdip', 'pdi perjuangan', 'megawati', 'hasto', 'ganjar', 'pramono', 'banteng', 'gesuri', 'kader'];

    for (let i = 1; i < items.length; i++) {
      const item = items[i];
      const titleMatch = item.match(/<title>([\s\S]*?)<\/title>/);
      const descMatch = item.match(/<description>([\s\S]*?)<\/description>/);
      
      if (titleMatch) {
        let rawTitle = titleMatch[1].replace(/<!\[CDATA\[(.*?)\]\]>/g, '$1');
        const cleanTitle = rawTitle.split(" - ")[0];
        const lowerTitle = cleanTitle.toLowerCase();

        if (lowerTitle.includes('voli') || lowerTitle.includes('hangestri') || lowerTitle.includes('red sparks')) continue; 
        if (!pdipKeywords.some(kw => lowerTitle.includes(kw))) continue;

        allTitles.push(cleanTitle);

        let pureDesc = "Tidak ada deskripsi rinci.";
        if (descMatch) {
          let rawDesc = descMatch[1].replace(/<!\[CDATA\[([\s\S]*?)\]\]>/g, '$1');
          rawDesc = rawDesc.replace(/&lt;/g, '<').replace(/&gt;/g, '>').replace(/&quot;/g, '"').replace(/&#39;/g, "'").replace(/&amp;/g, '&');
          pureDesc = rawDesc.replace(/<[^>]*>?/gm, ' ').replace(/&nbsp;/g, ' ').replace(/\s+/g, ' ').trim();
        }

        const sourceMatch = item.match(/<source.*?>([\s\S]*?)<\/source>/);
        const linkMatch = item.match(/<link>([\s\S]*?)<\/link>/);
        const sourceName = sourceMatch ? sourceMatch[1] : "Media";
        const link = linkMatch ? linkMatch[1] : "#";

        rawItems.push({
          topik: cleanTitle,
          kategori: "Politik",
          source: sourceName,
          pubDate: "Baru saja",
          articleTitle: rawTitle,
          articleDesc: pureDesc,
          sourcesList: [{ name: `${sourceName} (Artikel Utama)`, url: link }]
        });
      }
    }

    let dynamicIssues = [];
    let seenTopics = new Set();

    rawItems.forEach((item, index) => {
      const volumeData = getRealVolume(item.topik, allTitles);
      const mainKeyword = item.topik.substring(0, 15).toLowerCase();
      
      if (!seenTopics.has(mainKeyword)) {
        seenTopics.add(mainKeyword);
        dynamicIssues.push({
          id: `pdip-${index}`,
          ...item,
          volume: hours === 12 ? Math.floor(volumeData * 1.5) : volumeData
        });
      }
    });

    dynamicIssues.sort((a, b) => b.volume - a.volume);
    
    if (dynamicIssues.length === 0) {
      dynamicIssues.push({ id: "pdip-empty", topik: `Belum ada berita signifikan dalam ${hours} jam terakhir.`, kategori: "Politik", volume: 0, source: "Sistem", pubDate: "Saat ini", articleTitle: "Radar Sepi", articleDesc: "Tidak ditemukan berita.", sourcesList: [] });
    }

    return NextResponse.json({ success: true, data: dynamicIssues.slice(0, 20) });
  } catch (error) {
    return NextResponse.json({ success: false, data: [] });
  }
}
