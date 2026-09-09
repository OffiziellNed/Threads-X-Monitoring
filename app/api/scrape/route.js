import { NextResponse } from 'next/server';
import * as cheerio from 'cheerio';

export const dynamic = 'force-dynamic';

export async function GET(request) {
  try {
    const { searchParams } = new URL(request.url);
    let fetchUrl = searchParams.get('url');

    if (!fetchUrl || fetchUrl === '#') {
      // Return success: true agar frontend tidak memunculkan "Deskripsi Singkat"
      return NextResponse.json({ success: true, text: "URL kosong atau tidak valid." });
    }

    fetchUrl = fetchUrl.trim();

    // 1. Menyamar sebagai Googlebot (Trik dari AgoraVada)
    const headers = {
      'User-Agent': 'Mozilla/5.0 (compatible; Googlebot/2.1; +http://www.google.com/bot.html)',
      'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8',
      'Accept-Language': 'id-ID,id;q=0.9,en-US;q=0.8,en;q=0.7',
      'Referer': 'https://www.google.com/'
    };

    // 2. BONGKAR JEBAKAN REDIRECT GOOGLE NEWS
    if (fetchUrl.includes('news.google.com') || fetchUrl.includes('google.com/url')) {
        try {
            const gnRes = await fetch(fetchUrl, { headers, redirect: 'follow' });
            const gnHtml = await gnRes.text();
            
            let realUrl = null;
            // Cari link asli yang disembunyikan Google News
            const matchDataNv = gnHtml.match(/data-n-v="([^"]+)"/);
            const matchRefresh = gnHtml.match(/URL=['"]?(https?:\/\/[^"'>]+)['"]?/i);
            const matchHref = gnHtml.match(/<a[^>]+href="([^"]+)"/i);
            
            if (matchDataNv && matchDataNv[1].startsWith('http')) realUrl = matchDataNv[1];
            else if (matchRefresh && matchRefresh[1].startsWith('http')) realUrl = matchRefresh[1];
            else if (matchHref && matchHref[1].startsWith('http') && !matchHref[1].includes('google.com')) realUrl = matchHref[1];

            if (realUrl) {
                fetchUrl = realUrl.replace(/&amp;/g, '&').replace(/\\u0026/g, '&');
            }
        } catch(e) {
            console.error("Gagal bongkar Google News");
        }
    }

    // 3. Trik Khusus Media Indonesia: Bypass Pagination (Trik dari AgoraVada)
    if (fetchUrl.includes('kompas.com') || fetchUrl.includes('tribunnews.com')) {
      if (!fetchUrl.includes('page=all')) fetchUrl += fetchUrl.includes('?') ? '&page=all' : '?page=all';
    } else if (fetchUrl.includes('detik.com')) {
      if (!fetchUrl.includes('single=1')) fetchUrl += fetchUrl.includes('?') ? '&single=1' : '?single=1';
    }

    // 4. Fetch Web Berita Asli
    const response = await fetch(fetchUrl, { headers, redirect: 'follow' });
    const html = await response.text();

    // Deteksi anti-bot
    if (html.includes("Just a moment...") || html.includes("Cloudflare") || html.includes("Attention Required!")) {
        return NextResponse.json({ success: true, text: "Website sumber memblokir akses bot sepenuhnya." });
    }

    // 5. Ekstraksi Full Teks Menggunakan Cheerio
    const $ = cheerio.load(html);

    // Bersihkan elemen pengganggu agar teks rapi
    $('script, style, iframe, nav, footer, header, aside, .baca-juga, .related-news, .video, .ads, .detail__promoted').remove();

    let articleContent = '';
    const articleSelectors = [
        'article', 
        '.detail__body-text', 
        '.read__content', 
        '.entry-content', 
        '.article-content', 
        '.detail-text'
    ];
    
    for (const selector of articleSelectors) {
        if ($(selector).length > 0) {
            $(selector).find('p').each((i, el) => {
                const text = $(el).text().replace(/\s+/g, ' ').trim();
                if (text.length > 40 && !text.toLowerCase().includes('baca juga') && !text.toLowerCase().includes('halaman selanjutnya')) { 
                    articleContent += text + '\n\n';
                }
            });
            break;
        }
    }
    
    // Jika selector spesifik meleset, ambil semua tag <p> global
    if (!articleContent.trim() || articleContent.trim().length < 100) {
        $('p').each((i, el) => {
            const text = $(el).text().replace(/\s+/g, ' ').trim();
            if (text.length > 50 && !text.toLowerCase().includes('baca juga')) { 
                articleContent += text + '\n\n';
            }
        });
    }

    let finalDescription = articleContent.trim();

    // Cegah teks sampah bawaan RSS Google News masuk
    if (!finalDescription || finalDescription.includes("Liputan berita terbaru yang komprehensif") || finalDescription.includes("Comprehensive up-to-date")) {
         return NextResponse.json({ success: true, text: "Teks gagal diekstrak. Kemungkinan besar halaman sumber berupa video, paywall, atau memblokir bot." }); 
    }

    // Berhasil! Kirim teks penuh.
    return NextResponse.json({
      success: true, // WAJIB TRUE agar frontend gak memanggil "Deskripsi Singkat"
      text: finalDescription.substring(0, 15000)
    });

  } catch (error) {
    console.error("Error scraping:", error.message);
    // WAJIB TRUE agar error Vercel Timeout tidak memunculkan Deskripsi Singkat
    return NextResponse.json({ success: true, text: "Server Timeout saat mengambil artikel penuh. Web sumber terlalu lambat merespon." }); 
  }
}
