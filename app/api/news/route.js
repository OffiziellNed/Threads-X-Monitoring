import { NextResponse } from 'next/server';

export const dynamic = 'force-dynamic';

const STOP_WORDS = ['yang', 'untuk', 'pada', 'dari', 'dengan', 'dalam', 'dan', 'ini', 'itu', 'oleh', 'akan', 'bisa', 'telah', 'tidak', 'sebagai', 'karena', 'jadi', 'bagi', 'atau', 'saat'];

function getRealVolume(title, allTitles) {
  const words = title.toLowerCase().replace(/[^a-z0-9\s]/g, '').split(/\s+/);
  const coreWords = words.filter(w => w.length > 3 && !STOP_WORDS.includes(w));
  if (coreWords.length === 0) return 1;

  let count = 0;
  allTitles.forEach(t => {
    if (coreWords.some(cw => t.toLowerCase().includes(cw))) count++;
  });
  return count;
}

export async function GET(request) {
  try {
    const { searchParams } = new URL(request.url);
    const hours = parseInt(searchParams.get('hours') || '3', 10);
    
    // PERBAIKAN: Gunakan URL Top Stories Nasional yang valid
    const rssUrl = `https://news.google.com/rss?hl=id&gl=ID&ceid=ID:id`;
    
    const response = await fetch(rssUrl, { cache: 'no-store' });
    const xmlText = await response.text();
    const items = xmlText.split("<item>");
    
    let rawItems = [];
    let allTitles = [];
    const now = new Date();

    // 1. Ekstraksi semua berita
    for (let i = 1; i < items.length; i++) {
      const item = items[i];
      const titleMatch = item.match(/<title>([\s\S]*?)<\/title>/);
      const descMatch = item.match(/<description>([\s\S]*?)<\/description>/);
      const dateMatch = item.match(/<pubDate>([\s\S]*?)<\/pubDate>/);
      
      if (titleMatch && dateMatch) {
        const articleDate = new Date(dateMatch[1]);
        const diffHours = (now - articleDate) / (1000 * 60 * 60);
        
        let rawTitle = titleMatch[1].replace(/<!\[CDATA\[(.*?)\]\]>/g, '$1').replace(/&amp;/g, '&').replace(/&quot;/g, '"').replace(/&#39;/g, "'");
        const cleanTitle = rawTitle.split(" - ")[0];
        allTitles.push(cleanTitle);
        
        let pureDesc = "Tidak ada deskripsi rinci.";
        if (descMatch) {
          let rawDesc = descMatch[1].replace(/<!\[CDATA\[([\s\S]*?)\]\]>/g, '$1');
          rawDesc = rawDesc.replace(/&lt;/g, '<').replace(/&gt;/g, '>').replace(/&quot;/g, '"').replace(/&#39;/g, "'").replace(/&amp;/g, '&');
          pureDesc = rawDesc.replace(/<[^>]*>?/gm, ' ').replace(/&nbsp;/g, ' ').replace(/\s+/g, ' ').trim();
        }

        const sourceMatch = item.match(/<source.*?>([\s\S]*?)<\/source>/);
        const linkMatch = item.match(/<link>([\s\S]*?)<\/link>/);
        const sourceName = sourceMatch ? sourceMatch[1] : "Media Nasional";
        const link = linkMatch ? linkMatch[1] : "#";
        const pubDate = articleDate.toLocaleString('id-ID', { timeZone: 'Asia/Jakarta' });

        let kategori = "Sosial";
        const lowerTitle = cleanTitle.toLowerCase();
        if (lowerTitle.includes("hukum") || lowerTitle.includes("korupsi") || lowerTitle.includes("polisi") || lowerTitle.includes("kpk") || lowerTitle.includes("tersangka")) kategori = "Hukum";
        else if (lowerTitle.includes("pemerintah") || lowerTitle.includes("menteri") || lowerTitle.includes("jokowi")) kategori = "Pemerintahan";
        else if (lowerTitle.includes("politik") || lowerTitle.includes("prabowo") || lowerTitle.includes("dpr") || lowerTitle.includes("pdip")) kategori = "Politik";

        rawItems.push({
          topik: cleanTitle,
          kategori: kategori,
          source: sourceName,
          pubDate: pubDate,
          articleTitle: rawTitle,
          articleDesc: pureDesc,
          sourcesList: [{ name: `${sourceName} (Artikel Utama)`, url: link }],
          diffHours: diffHours // Simpan selisih waktu untuk difilter
        });
      }
    }

    // 2. FILTER WAKTU KETAT & SMART FALLBACK
    let filteredItems = rawItems.filter(item => item.diffHours <= hours);
    
    // Kalau kosong (efek delay RSS), tarik 12 berita paling fresh hari ini!
    if (filteredItems.length === 0) {
        filteredItems = rawItems.sort((a, b) => a.diffHours - b.diffHours).slice(0, 12);
    }

    // 3. Hitung Volume & Bersihkan Duplikat Topik
    let dynamicIssues = [];
    let seenTopics = new Set();

    filteredItems.forEach((item, index) => {
      const volumeData = getRealVolume(item.topik, allTitles);
      const mainKeyword = item.topik.substring(0, 15).toLowerCase();
      
      if (!seenTopics.has(mainKeyword)) {
        seenTopics.add(mainKeyword);
        dynamicIssues.push({
          id: index,
          ...item,
          volume: volumeData 
        });
      }
    });

    dynamicIssues.sort((a, b) => b.volume - a.volume);

    return NextResponse.json({ success: true, data: dynamicIssues.slice(0, 20) });
  } catch (error) {
    return NextResponse.json({ success: false, data: [] });
  }
}
