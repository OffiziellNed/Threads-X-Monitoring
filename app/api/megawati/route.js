import { NextResponse } from 'next/server';

export const dynamic = 'force-dynamic';

const STOP_WORDS = ['yang', 'untuk', 'pada', 'dari', 'dengan', 'dalam', 'dan', 'ini', 'itu', 'oleh', 'akan', 'bisa', 'telah', 'tidak', 'sebagai', 'karena', 'jadi', 'bagi', 'atau', 'saat'];
const IGNORE_WORDS = ['megawati', 'soekarnoputri', 'mega', 'ketum', 'pdip'];

function getRealVolume(title, allTitles) {
  const words = title.toLowerCase().replace(/[^a-z0-9\s]/g, '').split(/\s+/);
  const coreWords = words.filter(w => w.length > 3 && !STOP_WORDS.includes(w) && !IGNORE_WORDS.includes(w));
  if (coreWords.length === 0) return 1;
  let count = 0;
  allTitles.forEach(t => { if (coreWords.some(cw => t.toLowerCase().includes(cw))) count++; });
  return count;
}

export async function GET(request) {
  try {
    const { searchParams } = new URL(request.url);
    const hours = parseInt(searchParams.get('hours') || '3', 10);
    const timeFilter = hours === 3 ? 'when:3h' : 'when:12h';
    
    // 1. FILTER LEVEL URL: Paksa Google cari yang nempel sama PDIP / nama lengkap
    const query = encodeURIComponent(`"Megawati Soekarnoputri" OR "Megawati PDIP" OR "Megawati PDI Perjuangan" ${timeFilter}`);
    const rssUrl = `https://news.google.com/rss/search?q=${query}&hl=id&gl=ID&ceid=ID:id`;

    const response = await fetch(rssUrl, { cache: 'no-store' });
    const xmlText = await response.text();
    const items = xmlText.split("<item>");
    
    let rawItems = [];
    let allTitles = [];
    const now = new Date();

    for (let i = 1; i < items.length; i++) {
      const item = items[i];
      const titleMatch = item.match(/<title>([\s\S]*?)<\/title>/);
      const descMatch = item.match(/<description>([\s\S]*?)<\/description>/);
      const dateMatch = item.match(/<pubDate>([\s\S]*?)<\/pubDate>/);
      
      if (titleMatch && dateMatch) {
        const articleDate = new Date(dateMatch[1]);
        const diffHours = (now - articleDate) / (1000 * 60 * 60);
        if (diffHours > hours) continue;

        let rawTitle = titleMatch[1].replace(/<!\[CDATA\[(.*?)\]\]>/g, '$1');
        const cleanTitle = rawTitle.split(" - ")[0];
        const lowerTitle = cleanTitle.toLowerCase();
        
        // 2. FILTER ANTI ATLET & SELEB (Tendang kalau ada unsur olahraga)
        if (lowerTitle.includes('voli') || lowerTitle.includes('hangestri') || lowerTitle.includes('red sparks') || lowerTitle.includes('korea') || lowerTitle.includes('atlet') || lowerTitle.includes('liga') || lowerTitle.includes('pemain')) {
            continue;
        }

        let pureDesc = "Tidak ada deskripsi rinci.";
        if (descMatch) {
          let rawDesc = descMatch[1].replace(/<!\[CDATA\[([\s\S]*?)\]\]>/g, '$1');
          rawDesc = rawDesc.replace(/&lt;/g, '<').replace(/&gt;/g, '>').replace(/&quot;/g, '"').replace(/&#39;/g, "'").replace(/&amp;/g, '&');
          pureDesc = rawDesc.replace(/<[^>]*>?/gm, ' ').replace(/&nbsp;/g, ' ').replace(/\s+/g, ' ').trim();
        }

        // 3. WAJIB KONTEKS POLITIK (Cek judul dan deskripsi)
        const fullTextContext = (lowerTitle + " " + pureDesc.toLowerCase());
        const isPoliticContext = fullTextContext.includes('pdip') || fullTextContext.includes('pdi perjuangan') || fullTextContext.includes('soekarnoputri') || fullTextContext.includes('ketum') || fullTextContext.includes('politik') || fullTextContext.includes('partai');
        
        // Kalau teksnya sama sekali nggak bahas PDIP/Politik, tendang!
        if (!isPoliticContext) continue; 

        allTitles.push(cleanTitle);

        const sourceMatch = item.match(/<source.*?>([\s\S]*?)<\/source>/);
        const linkMatch = item.match(/<link>([\s\S]*?)<\/link>/);
        const sourceName = sourceMatch ? sourceMatch[1] : "Media";
        const link = linkMatch ? linkMatch[1] : "#";
        const pubDate = articleDate.toLocaleString('id-ID', { timeZone: 'Asia/Jakarta', dateStyle: 'long', timeStyle: 'short' });

        rawItems.push({
          topik: cleanTitle,
          kategori: "Politik",
          source: sourceName,
          pubDate: pubDate,
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
        dynamicIssues.push({ id: `mega-${index}`, ...item, volume: volumeData });
      }
    });

    dynamicIssues.sort((a, b) => b.volume - a.volume);
    
    if (dynamicIssues.length === 0) {
      dynamicIssues.push({ id: "mega-empty", topik: `Tidak ada berita Megawati Soekarnoputri dalam ${hours} jam terakhir.`, kategori: "Politik", volume: 0, source: "Sistem", pubDate: "Saat ini", articleTitle: "Radar Sepi", articleDesc: "Tidak ada pemberitaan.", sourcesList: [] });
    }

    return NextResponse.json({ success: true, data: dynamicIssues.slice(0, 20) });
  } catch (error) {
    return NextResponse.json({ success: false, data: [] });
  }
}
