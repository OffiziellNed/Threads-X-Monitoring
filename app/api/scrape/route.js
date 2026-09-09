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

    // Waktu tunggu dinaikkan jadi 8 detik untuk loading full page
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), 8000);

    try {
        let res = await fetch(targetUrl, { headers, redirect: 'follow', signal: controller.signal });
        let html = await res.text();

        let realUrl = targetUrl;
        const metaRefresh = html.match(/url=([^"'>]+)/i);
        const jsReplace = html.match(/window\.location\.replace\(['"]([^'"]+)['"]\)/i);
        const aHrefMatch = html.match(/<a[^>]+href="([^"]+)"[^>]*>/i);

        if (metaRefresh && metaRefresh[1]) realUrl = metaRefresh[1];
        else if (jsReplace && jsReplace[1]) realUrl = jsReplace[1];
        else if (aHrefMatch && aHrefMatch[1] && targetUrl.includes('google.com')) realUrl = aHrefMatch[1];

        // BYPASS PAGINATION UNTUK BERITA INDONESIA AGAR FULL 2-3 HALAMAN
        if (realUrl !== targetUrl || realUrl.includes('detik.com') || realUrl.includes('kompas.com') || realUrl.includes('tribunnews.com')) {
            realUrl = realUrl.replace(/&amp;/g, '&');
            const urlObj = new URL(realUrl);
            
            // Panggil mode single page (Tampilkan semua halaman)
            if (urlObj.hostname.includes('detik.com') && !urlObj.search.includes('single')) {
                urlObj.searchParams.set('single', '1');
            } else if (urlObj.hostname.includes('kompas.com') && !urlObj.search.includes('page=')) {
                urlObj.searchParams.set('page', 'all');
            } else if (urlObj.hostname.includes('tribunnews.com') && !urlObj.search.includes('page=')) {
                urlObj.searchParams.set('page', 'all');
            }
            
            realUrl = urlObj.toString();
            
            const controller2 = new AbortController();
            const timeoutId2 = setTimeout(() => controller2.abort(), 8000);
            res = await fetch(realUrl, { headers, redirect: 'follow', signal: controller2.signal });
            html = await res.text();
            clearTimeout(timeoutId2);
        }
        clearTimeout(timeoutId);

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

        // Jika paragraf dikunci, ambil Meta Description sebagai Fallback terbaik
        if (!articleText || paragraphs.length < 2) {
            const ogDescMatch = html.match(/<meta[^>]*property="og:description"[^>]*content="([^"]+)"/i) || html.match(/<meta[^>]*name="description"[^>]*content="([^"]+)"/i);
            if (ogDescMatch && ogDescMatch[1]) {
                articleText = ogDescMatch[1];
            } else {
                return NextResponse.json({ success: false, text: "Gagal memproses (Paywall)." });
            }
        }

        return NextResponse.json({ success: true, text: articleText.substring(0, 15000) });
        
    } catch (fetchError) {
        clearTimeout(timeoutId);
        return NextResponse.json({ success: false, text: "Timeout" });
    }
  } catch (error) {
    return NextResponse.json({ success: false, text: "Error server." });
  }
}
