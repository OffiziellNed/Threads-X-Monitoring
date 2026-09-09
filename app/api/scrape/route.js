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
      'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36'
    };

    // Langkah 1: Tembus redirect Google News
    let res = await fetch(targetUrl, { headers, redirect: 'follow' });
    let html = await res.text();

    // Bongkar link asli dari sistem Redirect Google
    let realUrl = targetUrl;
    const metaRefresh = html.match(/url=([^"'>]+)/i);
    const jsReplace = html.match(/window\.location\.replace\(['"]([^'"]+)['"]\)/i);

    if (metaRefresh && metaRefresh[1]) {
        realUrl = metaRefresh[1];
    } else if (jsReplace && jsReplace[1]) {
        realUrl = jsReplace[1];
    }

    // Fetch ulang ke link asli penerbit (Kompas, Detik, dll)
    if (realUrl !== targetUrl) {
        realUrl = realUrl.replace(/&amp;/g, '&');
        res = await fetch(realUrl, { headers, redirect: 'follow' });
        html = await res.text();
    }

    // Langkah 2: Ekstrak semua teks berformat Paragraf (<p>)
    const pRegex = /<p[^>]*>([\s\S]*?)<\/p>/gi;
    let paragraphs = [];
    let match;
    
    while ((match = pRegex.exec(html)) !== null) {
      let text = match[1]
        .replace(/<[^>]+>/g, '') // Buang sisa kode HTML
        .replace(/&nbsp;/g, ' ')
        .replace(/&quot;/g, '"')
        .replace(/&#39;/g, "'")
        .replace(/\s+/g, ' ')
        .trim();
        
      // Hanya sedot teks panjang (Bukan menu navigasi atau tombol "Baca Juga")
      if (text.length > 60 && !text.toLowerCase().includes('baca juga') && !text.toLowerCase().includes('halaman selanjutnya')) { 
        paragraphs.push(text);
      }
    }

    let articleText = paragraphs.join('\n\n');

    if (!articleText || paragraphs.length < 2) {
      return NextResponse.json({ 
        success: false, 
        text: "Website sumber mengunci artikel (Paywall/Anti-Bot). Menggunakan Deskripsi Singkat." 
      });
    }

    // Balikin full text (Limit 15.000 karakter agar tidak error di prompt AI)
    return NextResponse.json({ success: true, text: articleText.substring(0, 15000) });
  } catch (error) {
    return NextResponse.json({ success: false, text: "Koneksi Timeout. Menggunakan Deskripsi Singkat." });
  }
}
