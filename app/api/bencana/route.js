import { NextResponse } from 'next/server';

export const dynamic = 'force-dynamic';

// =========================================================================
// FUNGSI PEMBERSIH LINK MUTLAK (Anti Google Redirect)
// =========================================================================
const cleanUrl = (rawUrl) => {
  if (!rawUrl) return "";
  try {
    const decodedUrl = rawUrl.replace(/&amp;/g, '&');
    if (decodedUrl.includes("google.com/url")) {
      const urlObj = new URL(decodedUrl);
      const cleanLink = urlObj.searchParams.get('url') || urlObj.searchParams.get('q');
      if (cleanLink) return cleanLink; 
    }
    return decodedUrl;
  } catch (error) {
    return rawUrl;
  }
};

// =========================================================================
// FUNGSI FORMAT TANGGAL (Standar "DD Bulan YYYY pukul HH:MM WIB")
// =========================================================================
const formatPubDate = (pubDateStr) => {
  if (!pubDateStr) return "-";
  try {
    const date = new Date(pubDateStr);
    if (isNaN(date.getTime())) return pubDateStr; 
    
    const optionsDate = { day: 'numeric', month: 'long', year: 'numeric', timeZone: 'Asia/Jakarta' };
    const optionsTime = { hour: '2-digit', minute: '2-digit', timeZone: 'Asia/Jakarta' };
    
    const formattedDate = new Intl.DateTimeFormat('id-ID', optionsDate).format(date);
    const formattedTime = new Intl.DateTimeFormat('id-ID', optionsTime).format(date).replace(/\./g, ':');
    
    return `${formattedDate} pukul ${formattedTime} WIB`;
  } catch (error) {
    return pubDateStr;
  }
};

export async function GET(request) {
  try {
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
        
        // PEMBERSIH NAMA SUMBER: Memotong teks panjang setelah strip, koma, atau pipa
        let rawSource = sourceMatch ? sourceMatch[1] : "Media";
        let cleanSource = rawSource.split(" - ")[0].split(",")[0].split("|")[0].trim();

        // EKSTRAK LINK ASLI DAN FORMAT TANGGAL
        const linkAsli = linkMatch ? cleanUrl(linkMatch[1]) : "#";
        const pubDateRapi = formatPubDate(dateMatch[1]);

        rawItems.push({
          id: `bencana-${i}`,
          topik: cleanTitle,
          kategori: "Bencana",
          source: cleanSource,
          pubDate: pubDateRapi,
          timestamp: articleDate.getTime(),
          articleTitle: rawTitle,
          articleDesc: pureDesc,
          link: linkAsli, // <-- Link asli yang langsung tembus ke sumber berita
          sourcesList: [{ name: `${cleanSource} (Artikel Utama)`, url: linkAsli }]
        });
      }
    }

    rawItems.sort((a, b) => b.timestamp - a.timestamp);

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
      dynamicIssues.push({ id: "bencana-empty", topik: `Tidak ada berita bencana signifikan dalam 24 jam terakhir.`, kategori: "Bencana", source: "Sistem", pubDate: "Saat ini", articleTitle: "Radar Sepi", articleDesc: "Aman terkendali.", link: "#", sourcesList: [] });
    }

    return NextResponse.json({ success: true, data: dynamicIssues.slice(0, 20) });
  } catch (error) {
    return NextResponse.json({ success: false, data: [] });
  }
}
```[cite: 1]
