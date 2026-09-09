import { NextResponse } from 'next/server';

export const dynamic = 'force-dynamic';

export async function GET(request) {
  try {
    const { searchParams } = new URL(request.url);
    let targetUrl = searchParams.get('url');
    
    if (!targetUrl || targetUrl === '#') {
      return NextResponse.json({ success: false, text: "URL tidak valid." });
    }

    const headers = { 
      'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/122.0.0.0 Safari/537.36',
      'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,image/webp,*/*;q=0.8'
    };

    // Fungsi Fetch dengan batas waktu agar tidak Timeout di Vercel
    const fetchWithTimeout = async (url, ms) => {
      const controller = new AbortController();
      const timeout = setTimeout(() => controller.abort(), ms);
      try {
        const res = await fetch(url, { headers, redirect: 'follow', signal: controller.signal });
        clearTimeout(timeout);
        return res;
      } catch (err) {
        clearTimeout(timeout);
        throw err;
      }
    };

    try {
        // 1. Tembus Redirect Google News
        let res = await fetchWithTimeout(targetUrl, 4000);
        let html = await res.text();

        let realUrl = targetUrl;
        const metaRefresh = html.match(/<meta[^>]*http-equiv="refresh"[^>]*content="[^"]*url=([^"]+)"/i);
        const aHrefMatch = html.match(/<a[^>]*href="([^"]+)"[^>]*>here<\/a>/i);
        const jsMatch = html.match(/window\.location\.replace\(['"]([^'"]+)['"]\)/i);

        if (metaRefresh && metaRefresh[1]) realUrl = metaRefresh[1];
        else if (aHrefMatch && aHrefMatch[1]) realUrl = aHrefMatch[1];
        else if (jsMatch && jsMatch[1]) realUrl = jsMatch[1];

        // 2. Modifikasi URL buat Bypass Pagination (Sedot full 2-3 halaman)
        if (realUrl !== targetUrl || realUrl.includes('detik.com') || realUrl.includes('kompas.com') || realUrl.includes('tribunnews.com')) {
            realUrl = realUrl.replace(/&amp;/g, '&');
            try {
                const urlObj = new URL(realUrl);
                if (urlObj.hostname.includes('detik.com') && !urlObj.search.includes('single')) urlObj.searchParams.set('single', '1');
                if (urlObj.hostname.includes('kompas.com') && !urlObj.search.includes('page=')) urlObj.searchParams.set('page', 'all');
                if (urlObj.hostname.includes('tribunnews.com') && !urlObj.search.includes('page=')) urlObj.searchParams.set('page', 'all');
                realUrl = urlObj.toString();
            } catch(e) {}

            res = await fetchWithTimeout(realUrl, 4000);
            html = await res.text();
        }

        // 3. Ekstrak Paragraf Penuh
        const pRegex = /<p[^>]*>([\s\S]*?)<\/p>/gi;
        let paragraphs = [];
        let match;
        
        while ((match = pRegex.exec(html)) !== null) {
          let text = match[1]
            .replace(/<[^>]+>/g, '') 
            .replace(/&nbsp;/g, ' ')
            .replace(/&quot;/g, '"')
            .replace(/&#39;/g, "'")
            .replace(/\s+/g, ' ')
            .trim();
            
          if (text.length > 50 && !text.toLowerCase().includes('baca juga') && !text.toLowerCase().includes('halaman selanjutnya')) { 
            paragraphs.push(text);
          }
        }

        let articleText = paragraphs.join('\n\n');

        // Jika paragraf kosong (Paywall), coba sedot Meta Description
        if (!articleText || paragraphs.length < 2) {
            const descMatch = html.match(/<meta[^>]*name="description"[^>]*content="([^"]+)"/i) || html.match(/<meta[^>]*property="og:description"[^>]*content="([^"]+)"/i);
            if (descMatch && descMatch[1]) {
                articleText = descMatch[1];
            } else {
                return NextResponse.json({ success: false, text: "Gagal memproses teks (di-blokir sistem penerbit)." });
            }
        }

        return NextResponse.json({ success: true, text: articleText.substring(0, 15000) });
        
    } catch (fetchError) {
        return NextResponse.json({ success: false, text: "Koneksi Timeout saat mengambil artikel penuh." });
    }
  } catch (error) {
    return NextResponse.json({ success: false, text: "Error server." });
  }
}
