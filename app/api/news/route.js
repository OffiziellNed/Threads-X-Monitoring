import { NextResponse } from 'next/server';

export const revalidate = 3600;

export async function GET(request) {
  try {
    const { searchParams } = new URL(request.url);
    const hours = parseInt(searchParams.get('hours') || '3', 10);

    const rssUrl = `https://news.google.com/rss?hl=id&gl=ID&ceid=ID:id`;
    
    const response = await fetch(rssUrl, { next: { revalidate: 3600 } });
    const xmlText = await response.text();

    const items = xmlText.split("<item>");
    let dynamicIssues = [];

    const generateStableVolume = (text, hoursMultiplier) => {
      let hash = 0;
      for (let i = 0; i < text.length; i++) { hash = text.charCodeAt(i) + ((hash << 5) - hash); }
      const baseVolume = Math.abs(hash % 50000) + 40000;
      return hoursMultiplier === 12 ? Math.floor(baseVolume * 1.5) : baseVolume;
    };

    for (let i = 1; i < Math.min(40, items.length); i++) {
      const item = items[i];
      const titleMatch = item.match(/<title>([\s\S]*?)<\/title>/);
      const sourceMatch = item.match(/<source.*?>([\s\S]*?)<\/source>/);
      const dateMatch = item.match(/<pubDate>([\s\S]*?)<\/pubDate>/);
      const linkMatch = item.match(/<link>([\s\S]*?)<\/link>/);
      const descMatch = item.match(/<description>([\s\S]*?)<\/description>/);
      
      let pureDesc = "Tidak ada deskripsi rinci.";

      if (titleMatch) {
        let rawTitle = titleMatch[1].replace(/<!\[CDATA\[(.*?)\]\]>/g, '$1');
        rawTitle = rawTitle.replace(/&amp;/g, '&').replace(/&quot;/g, '"').replace(/&#39;/g, "'");
        
        // PEMBERSIH KODE ALIEN (HTML ENTITIES DECODER)
        if (descMatch) {
          let rawDesc = descMatch[1].replace(/<!\[CDATA\[([\s\S]*?)\]\]>/g, '$1');
          // 1. Ubah entitas jadi tag HTML asli
          rawDesc = rawDesc.replace(/&lt;/g, '<').replace(/&gt;/g, '>').replace(/&quot;/g, '"').replace(/&#39;/g, "'").replace(/&amp;/g, '&');
          // 2. Sapu bersih semua tag HTML yang udah jadi
          pureDesc = rawDesc.replace(/<[^>]*>?/gm, ' ');
          // 3. Bersihkan spasi berlebih
          pureDesc = pureDesc.replace(/&nbsp;/g, ' ').replace(/\s+/g, ' ').trim();
        }

        const source = sourceMatch ? sourceMatch[1] : "Media Nasional";
        const pubDate = dateMatch ? new Date(dateMatch[1]).toLocaleString('id-ID', { timeZone: 'Asia/Jakarta' }) : "Baru saja";
        const link = linkMatch ? linkMatch[1] : "#";
        const cleanTitle = rawTitle.split(" - ")[0];

        let kategori = "Sosial";
        const lowerTitle = cleanTitle.toLowerCase();
        
        if (lowerTitle.includes("hukum") || lowerTitle.includes("korupsi") || lowerTitle.includes("polisi") || lowerTitle.includes("kpk") || lowerTitle.includes("tersangka")) {
          kategori = "Hukum";
        } else if (lowerTitle.includes("pemerintah") || lowerTitle.includes("menteri") || lowerTitle.includes("jokowi")) {
          kategori = "Pemerintahan";
        } else if (lowerTitle.includes("politik") || lowerTitle.includes("prabowo") || lowerTitle.includes("dpr") || lowerTitle.includes("pdip")) {
          kategori = "Politik";
        }

        dynamicIssues.push({
          id: i,
          topik: cleanTitle,
          kategori: kategori,
          volume: generateStableVolume(cleanTitle, hours),
          source: source,
          pubDate: pubDate,
          articleTitle: rawTitle,
          articleDesc: pureDesc,
          sourcesList: [{ name: `${source} (Artikel Utama)`, url: link }]
        });
      }
    }

    dynamicIssues.sort((a, b) => b.volume - a.volume);
    return NextResponse.json({ success: true, data: dynamicIssues });
  } catch (error) {
    return NextResponse.json({ success: false, data: [] });
  }
}
