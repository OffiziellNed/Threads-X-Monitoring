import { NextResponse } from 'next/server';
import * as cheerio from 'cheerio';

export const dynamic = 'force-dynamic';

export async function GET(request) {
  try {
    const { searchParams } = new URL(request.url);
    const urlParam = searchParams.get('url');

    if (!urlParam || urlParam === '#') {
      return NextResponse.json({ success: false, text: "URL kosong atau tidak valid" });
    }

    let fetchUrl = urlParam.trim();

    // 1. Menyamar sebagai Googlebot agar lolos dari blokir Vercel / Cloudflare
    const headers = {
      'User-Agent': 'Mozilla/5.0 (compatible; Googlebot/2.1; +http://www.google.com/bot.html)',
      'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8',
      'Accept-Language': 'id-ID,id;q=0.9,en-US;q=0.8,en;q=0.7',
      'Referer': 'https://www.google.com/'
    };

    // 2. BONGKAR JEBAKAN GOOGLE NEWS
    // Jika URL dari Google News, kita harus masuk dulu untuk ngambil link aslinya
    if (fetchUrl.includes('news.google.com') || fetchUrl.includes('google.com/url')) {
        const redirectRes = await fetch(fetchUrl, { headers, redirect: 'follow' });
        const redirectHtml = await redirectRes.text();
        
        // Cari link asli yang disembunyikan Google di tag <a> atau <c-wiz>
        const aMatch = redirectHtml.match(/<a[^>]+href="([^"]+)"/i);
        const jsMatch = redirectHtml.match(/data-n-v="([^"]+)"/i);
        
        if (jsMatch && jsMatch[1] && jsMatch[1].startsWith('http')) {
            fetchUrl = jsMatch[1];
        } else if (aMatch && aMatch[1]) {
            fetchUrl = aMatch[1];
        }
        fetchUrl = fetchUrl.replace(/&amp;/g, '&');
    }

    // 3. Trik Khusus Media Indonesia: Paksa tampilkan semua halaman (Bypass Paging)
    if (fetchUrl.includes('kompas.com') || fetchUrl.includes('tribunnews.com')) {
      if (!fetchUrl.includes('page=all')) {
        fetchUrl += fetchUrl.includes('?') ? '&page=all' : '?page=all';
      }
    } else if (fetchUrl.includes('detik.com')) {
      if (!fetchUrl.includes('single=1')) {
        fetchUrl += fetchUrl.includes('?') ? '&single=1' : '?single=1';
      }
    }

    // 4. Fetch Artikel Asli (Detik, Kompas, dll)
    const response = await fetch(fetchUrl, { headers, redirect: 'follow' });
    const html = await response.text();

    if (html.includes("Just a moment...") || html.includes("Cloudflare") || html.includes("Attention Required!")) {
        return NextResponse.json({ success: false, text: "Website ini memblokir akses bot sepenuhnya dari IP Datacenter." });
    }

    // 5. Ekstraksi Menggunakan Cheerio (Sesuai Code Agora Vada)
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
                // Filter agar teks promosi tidak ikut tersedot
                if (text.length > 30 && !text.toLowerCase().includes('baca juga') && !text.toLowerCase().includes('halaman selanjutnya')) { 
                    articleContent += text + '\n\n';
                }
            });
            break;
        }
    }
    
    // Fallback jika selector spesifik tidak ketemu
    if (!articleContent.trim()) {
        $('p').each((i, el) => {
            const text = $(el).text().trim();
            if (text.length > 50 && !text.toLowerCase().includes('baca juga')) { 
                articleContent += text + '\n\n';
            }
        });
    }

    const fallbackDesc = $('meta[name="description"]').attr('content') || $('meta[property="og:description"]').attr('content') || '';
    let finalDescription = articleContent.trim() ? articleContent.trim() : fallbackDesc;

    // Filter terakhir: Jika yang disedot masih nyangkut teks Google News (misal karena web aslinya mati/error)
    if (finalDescription.includes("Liputan berita terbaru yang komprehensif") || finalDescription.includes("Comprehensive up-to-date news coverage")) {
        finalDescription = "Gagal memuat isi berita. Halaman sumber diproteksi atau berupa video tanpa teks.";
    }

    return NextResponse.json({
      success: true,
      text: finalDescription.substring(0, 15000)
    });

  } catch (error) {
    console.error("Error scraping:", error.message);
    return NextResponse.json({ success: false, text: "Koneksi Timeout. Gagal menyedot artikel penuh." });
  }
}
