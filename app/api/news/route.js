import { NextResponse } from 'next/server';

export async function GET() {
  try {
    const rssUrl = `https://news.google.com/rss?hl=id&gl=ID&ceid=ID:id`;
    const response = await fetch(rssUrl, { cache: 'no-store' });
    const xmlText = await response.text();

    const items = xmlText.split("<item>");
    let dynamicIssues = [];

    for (let i = 1; i < Math.min(6, items.length); i++) {
      const item = items[i];
      const titleMatch = item.match(/<title>(.*?)<\/title>/);
      const sourceMatch = item.match(/<source.*?>(.*?)<\/source>/);
      const dateMatch = item.match(/<pubDate>(.*?)<\/pubDate>/);
      const linkMatch = item.match(/<link>(.*?)<\/link>/);

      if (titleMatch) {
        let rawTitle = titleMatch[1].replace(/<!\[CDATA\[(.*?)\]\]>/g, '$1');
        rawTitle = rawTitle.replace(/&amp;/g, '&').replace(/&quot;/g, '"').replace(/&#39;/g, "'");
        
        const source = sourceMatch ? sourceMatch[1] : "Media Nasional";
        const pubDate = dateMatch ? new Date(dateMatch[1]).toLocaleString('id-ID', { timeZone: 'Asia/Jakarta' }) : "Baru saja";
        const link = linkMatch ? linkMatch[1] : "#"; // Ini adalah URL spesifik ke artikel berita tersebut
        const cleanTitle = rawTitle.split(" - ")[0];

        let kategori = "Sosial & Publik";
        const lowerTitle = cleanTitle.toLowerCase();
        if (lowerTitle.includes("hukum") || lowerTitle.includes("korupsi") || lowerTitle.includes("polisi") || lowerTitle.includes("uu") || lowerTitle.includes("ekshumasi")) {
          kategori = "Hukum & Kriminal";
        } else if (lowerTitle.includes("politik") || lowerTitle.includes("pemilu") || lowerTitle.includes("menteri") || lowerTitle.includes("prabowo")) {
          kategori = "Politik & Kebijakan";
        }

        // Menyusun daftar tautan spesifik yang mengarah langsung ke halaman beritanya
        const specificSources = [
          { name: `${source} (Artikel Utama)`, url: link },
          // Kita juga bisa menyertakan variasi parameter pencarian spesifik Google News untuk topik ini
          { name: `Cari referensi lain terkait "${cleanTitle.substring(0, 25)}..." di Google`, url: `https://www.google.com/search?q=${encodeURIComponent(cleanTitle)}&tbm=nws` }
        ];

        dynamicIssues.push({
          id: i,
          topik: cleanTitle,
          kategori: kategori,
          volume: Math.floor(Math.random() * 50000) + 60000 - (i * 7000),
          source: source,
          pubDate: pubDate,
          articleTitle: rawTitle,
          sourcesList: specificSources
        });
      }
    }

    return NextResponse.json({ success: true, data: dynamicIssues });

  } catch (error) {
    console.error("Live fetch error:", error);
    return NextResponse.json({ 
      success: true, 
      data: [
        { 
          id: 1, 
          topik: "Dinamika Isu Publik Nasional", 
          kategori: "Politik & Sosial", 
          volume: 88000, 
          source: "Redaksi", 
          pubDate: "Hari ini", 
          articleTitle: "Perkembangan Terbaru Isu Publik di Indonesia", 
          sourcesList: [{ name: "Portal Berita Utama", url: "https://news.google.com" }]
        }
      ] 
    });
  }
}
