import { NextResponse } from 'next/server';
import * as cheerio from 'cheerio';

export const dynamic = 'force-dynamic';

export async function GET(req) {
  try {
    const { searchParams } = new URL(req.url);
    let fetchUrl = searchParams.get('url');

    if (!fetchUrl || fetchUrl === '#') {
      return NextResponse.json({ success: false, text: 'URL kosong atau tidak valid' }, { status: 400 });
    }

    fetchUrl = fetchUrl.trim();
    
    // Trik Khusus Media Indonesia: Paksa tampilkan semua halaman[cite: 1, 4]
    if (fetchUrl.includes('kompas.com') || fetchUrl.includes('tribunnews.com')) {
      if (!fetchUrl.includes('page=all')) {
        fetchUrl += fetchUrl.includes('?') ? '&page=all' : '?page=all';
      }
    } else if (fetchUrl.includes('detik.com')) {
      if (!fetchUrl.includes('single=1')) {
        fetchUrl += fetchUrl.includes('?') ? '&single=1' : '?single=1';
      }
    }

    // Menyamar sebagai Googlebot[cite: 1, 4]
    const response = await fetch(fetchUrl, {
      method: 'GET',
      headers: {
        'User-Agent': 'Mozilla/5.0 (compatible; Googlebot/2.1; +http://www.google.com/bot.html)',
        'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8',
        'Accept-Language': 'id-ID,id;q=0.9,en-US;q=0.8,en;q=0.7',
        'Referer': 'https://www.google.com/'
      },
    });

    const html = await response.text();

    if (html.includes("Just a moment...") || html.includes("Cloudflare") || html.includes("Attention Required!")) {
        throw new Error("Website ini memblokir akses bot sepenuhnya dari IP Datacenter.");
    }

    const $ = cheerio.load(html);

    const title = $('title').text() || $('h1').first().text();
    
    // Ekstraksi Gambar Cover[cite: 4]
    const imageUrl = $('meta[property="og:image"]').attr('content') || 
                     $('meta[name="twitter:image"]').attr('content') || 
                     $('article img').first().attr('src') || 
                     null;
    
    // Ekstraksi Full Text Paragraf[cite: 4]
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
                if (text.length > 30 && !text.toLowerCase().includes('baca juga')) { 
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

    const fallbackDesc = $('meta[name="description"]').attr('content') || 'Deskripsi tidak ditemukan.';
    const finalDescription = articleContent.trim() ? articleContent.trim() : fallbackDesc;
    const cleanTitle = title ? title.replace(/\s+/g, ' ').trim() : 'Judul tidak ditemukan';

    // Sesuaikan format balasan JSON agar cocok dengan state frontend lo
    return NextResponse.json({
      success: true,
      status: 'success',
      title: cleanTitle,
      text: finalDescription, // INI YANG DIBACA FRONTEND (menggantikan description)
      description: finalDescription,
      gambar_url: imageUrl
    });

  } catch (error) {
    console.error("Error scraping:", error.message);
    return NextResponse.json({ 
      success: false,
      status: 'error',
      text: `Gagal menyedot: ${error.message}`
    }, { status: 500 });
  }
}
