import { NextResponse } from 'next/server';

export const dynamic = 'force-dynamic';

export async function GET(request) {
  try {
    const { searchParams } = new URL(request.url);
    let targetUrl = searchParams.get('url');
    
    if (!targetUrl || targetUrl === '#') {
      return NextResponse.json({ success: false, text: "URL tidak ditemukan atau tidak valid." });
    }

    const headers = { 
      'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
      'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,image/webp,*/*;q=0.8',
      'Accept-Language': 'en-US,en;q=0.5'
    };

    // 1. Fetch Inisial (Menembus Google News Redirect)
    let res = await fetch(targetUrl, { headers, redirect: 'follow' });
    let html = await res.text();

    // Mendeteksi dan mengikuti Javascript Redirect dari Google News
    if (targetUrl.includes('news.google.com') || html.includes('<c-wiz')) {
        const jsRedirectMatch = html.match(/data-n-v="([^"]+)"/);
        const aHrefMatch = html.match(/<a[^>]+href="([^"]+)"[^>]*>here<\/a>/i);
        
        let realUrl = null;
        if (jsRedirectMatch && jsRedirectMatch[1]) {
            realUrl = jsRedirectMatch[1];
        } else if (aHrefMatch && aHrefMatch[1]) {
            realUrl = aHrefMatch[1];
        }

        if (realUrl) {
            targetUrl = realUrl;
            res = await fetch(targetUrl, { headers, redirect: 'follow' });
            html = await res.text();
        }
    }

    // 2. Ekstraksi Paragraf dari Website Berita Asli
    const pRegex = /<p[^>]*>([\s\S]*?)<\/p>/gi;
    let paragraphs = [];
    let match;
    
    while ((match = pRegex.exec(html)) !== null) {
      let text = match[1]
        .replace(/<[^>]+>/g, '') // Hapus tag HTML sisa (misal link <a> di dalam paragraf)
        .replace(/&nbsp;/g, ' ')
        .replace(/&quot;/g, '"')
        .replace(/&#39;/g, "'")
        .replace(/\s+/g, ' ')    // Rata spasi
        .trim();
        
      // Hanya ambil paragraf yang panjangnya wajar (menghindari teks menu/footer nyasar)
      if (text.length > 50) { 
        paragraphs.push(text);
      }
    }

    let articleText = paragraphs.join('\n\n');

    if (!articleText || articleText.length < 150) {
      return NextResponse.json({ 
        success: false, 
        text: "Sistem keamanan website sumber (Paywall/Anti-Bot) mencegah penyedotan otomatis teks penuh. Silakan baca artikel secara manual melalui tombol 'Baca'." 
      });
    }

    return NextResponse.json({ success: true, text: articleText.substring(0, 15000) });
  } catch (error) {
    return NextResponse.json({ success: false, text: "Gagal menyedot isi berita penuh karena website sumber diproteksi atau server timeout." });
  }
}
