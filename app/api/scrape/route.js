import { NextResponse } from 'next/server';
import * as cheerio from 'cheerio';

export const dynamic = 'force-dynamic';

export async function GET(request) {
  try {
    const { searchParams } = new URL(request.url);
    let fetchUrl = searchParams.get('url');

    if (!fetchUrl || fetchUrl === '#') {
      return NextResponse.json({ success: false, text: "URL kosong atau tidak valid" });
    }

    fetchUrl = fetchUrl.trim();

    // 1. Trik Khusus Media Indonesia: Paksa tampilkan semua halaman (Sesuai kode AgoraVada)[cite: 1]
    if (fetchUrl.includes('kompas.com') || fetchUrl.includes('tribunnews.com')) {
      if (!fetchUrl.includes('page=all')) {
        fetchUrl += fetchUrl.includes('?') ? '&page=all' : '?page=all';
      }
    } else if (fetchUrl.includes('detik.com')) {
      if (!fetchUrl.includes('single=1')) {
        fetchUrl += fetchUrl.includes('?') ? '&single=1' : '?single=1';
      }
    }

    // 2. Menyamar sebagai Googlebot (Sesuai kode AgoraVada)[cite: 1]
    const headers = {
      'User-Agent': 'Mozilla/5.0 (compatible; Googlebot/2.1; +http://www.google.com/bot.html)',
      'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8',
      'Accept-Language': 'id-ID,id;q=0.9,en-US;q=0.8,en;q=0.7',
      'Referer': 'https://www.google.com/'
    };

    let response = await fetch(fetchUrl, { method: 'GET', headers, redirect: 'follow' });
    let html = await response.text();

    // 3. Tangkap jebakan Redirect Google News (Jika link dari RSS Google)
    const metaRefreshMatch = html.match(/url=([^"'>]+)/i);
    if (response.url.includes('google.com') && metaRefreshMatch && metaRefreshMatch[1]) {
        let realUrl = metaRefreshMatch[1].replace(/&amp;/g, '&');
        
        // Terapkan ulang trik bypass ke URL asli
        if (realUrl.includes('kompas.com') || realUrl.includes('tribunnews.com')) {
            if (!realUrl.includes('page=all')) realUrl += realUrl.includes('?') ? '&page=all' : '?page=all';
        } else if (realUrl.includes('detik.com')) {
            if (!realUrl.includes('single=1')) realUrl += realUrl.includes('?') ? '&single=1' : '?single=1';
        }
        
        response = await fetch(realUrl, { method: 'GET', headers, redirect: 'follow' });
        html = await response.text();
    }

    // 4. Deteksi Cloudflare / Anti-Bot (Sesuai kode AgoraVada)[cite: 1]
    if (html.includes("Just a moment...") || html.includes("Cloudflare") || html.includes("Attention Required!")) {
        return NextResponse.json({ success: false, text: "Website memblokir akses bot sepenuhnya dari IP Datacenter." });
    }

    // 5. Ekstraksi dengan Cheerio (Sesuai kode AgoraVada)[cite: 1]
    const $ = cheerio.load(html);

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
                const text = $(el).text().trim();
                // Filter tambahan agar teks "Baca juga" dari Detik/Kompas hilang
                if (text.length > 30 && !text.toLowerCase().includes('baca juga') && !text.toLowerCase().includes('halaman selanjutnya')) { 
                    articleContent += text + '\n\n';
                }
            });
            break;
        }
    }
    
    if (!articleContent.trim()) {
        $('p').each((i, el) => {
            const text = $(el).text().trim();
            if (text.length > 50 && !text.toLowerCase().includes('baca juga')) { 
                articleContent += text + '\n\n';
            }
        });
    }

    const fallbackDesc = $('meta[name="description"]').attr('content') || '';
    const finalDescription = articleContent.trim() ? articleContent.trim() : fallbackDesc;

    // Filter akhir untuk memastikan Google News Deskripsi default tidak bocor
    if (!finalDescription || finalDescription.includes("Liputan berita terbaru yang komprehensif") || finalDescription.includes("Comprehensive up-to-date news coverage")) {
         return NextResponse.json({ success: false, text: "Gagal memuat isi berita. Halaman sumber diproteksi atau berupa video tanpa teks." });
    }

    return NextResponse.json({
      success: true,
      text: finalDescription.substring(0, 15000)
    });

  } catch (error) {
    console.error("Error scraping:", error.message);
    return NextResponse.json({ success: false, text: `Koneksi gagal atau timeout.` });
  }
}
