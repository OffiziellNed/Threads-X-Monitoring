import { NextResponse } from 'next/server';

export const dynamic = 'force-dynamic';

export async function GET(request) {
  try {
    // Mesin pencari khusus kata kunci bencana alam dan kedaruratan dalam 24 jam
    const query = encodeURIComponent(`(bencana OR gempa OR banjir OR tsunami OR longsor OR kebakaran OR karhutla OR erupsi OR "gunung meletus" OR basarnas) when:24h`);
    const rssUrl = `https://news.google.com/rss/search?q=${query}&hl=id&gl=ID&ceid=ID:id`;

    const response = await fetch(rssUrl, { cache: 'no-store' });
    const xmlText = await response.text();
    const items = xmlText.split("<item>");
    
    let rawItems = [];
    const now = new Date();

    for (let i = 1; i < items.length; i++) {
      const item = items[i];
      const titleMatch = item.match(/<title>([\s\S]*?)<\/title>/);
      const descMatch = item.match(/<description>([\s\S]*?)<\/description>/);
      const dateMatch = item.match(/<pubDate>([\s\S]*?)<\/pubDate>/);
      
      if (titleMatch && dateMatch) {
        const articleDate = new Date(dateMatch[1]);
        const diffHours = (now - articleDate) / (1000 * 60 * 60);
        
        // FILTER KETAT: Hanya berita 24 jam terakhir
        if (diffHours > 24) continue;

        let rawTitle = titleMatch[1].replace(/<!\[CDATA\[(.*?)\]\]>/g, '$1').replace(/&amp;/g, '&').replace(/&quot;/g, '"').replace(/&#39;/g, "'");
        const cleanTitle = rawTitle.split(" - ")[0];

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
        const pubDate = articleDate.toLocaleString('id-ID', { timeZone: 'Asia/Jakarta', dateStyle: 'long', timeStyle: 'short' });

        rawItems.push({
          id: `bencana-${i}`,
          topik: cleanTitle,
          kategori: "Bencana",
          source: sourceName,
          pubDate: pubDate,
          timestamp: articleDate.getTime(), // Disimpan untuk logika pengurutan waktu
          articleTitle: rawTitle,
          articleDesc: pureDesc,
          sourcesList: [{ name: `${sourceName} (Artikel Utama)`, url: link }]
        });
      }
    }

    // LOGIKA KHUSUS: Mengurutkan dari yang TERBARU (Berdasarkan Jam Rilis Asli), bukan berdasarkan Volume
    rawItems.sort((a, b) => b.timestamp - a.timestamp);

    // Mencegah berita dengan judul yang sangat mirip tampil berulang
    let dynamicIssues = [];
    let seenTopics = new Set();

    rawItems.forEach((item) => {
      const mainKeyword = item.topik.substring(0, 20).toLowerCase();
      if (!seenTopics.has(mainKeyword)) {
        seenTopics.add(mainKeyword);
        dynamicIssues.push(item);
      }
    });

    if (dynamicIssues.length === 0) {
      dynamicIssues.push({ id: "bencana-empty", topik: `Tidak ada berita bencana signifikan dalam 24 jam terakhir.`, kategori: "Bencana", source: "Sistem", pubDate: "Saat ini", articleTitle: "Radar Sepi", articleDesc: "Aman terkendali.", sourcesList: [] });
    }

    // Tampilkan hingga 20 berita terbaru
    return NextResponse.json({ success: true, data: dynamicIssues.slice(0, 20) });
  } catch (error) {
    return NextResponse.json({ success: false, data: [] });
  }
}