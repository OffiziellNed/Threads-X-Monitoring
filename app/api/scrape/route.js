import { NextResponse } from 'next/server';
import * as cheerio from 'cheerio';

export const dynamic = 'force-dynamic';

export async function GET(request) {
  try {
    const { searchParams } = new URL(request.url);
    let fetchUrl = searchParams.get('url');

    if (!fetchUrl || fetchUrl === '#') {
      return NextResponse.json({ success: false, text: 'URL kosong atau tidak valid' });
    }

    fetchUrl = fetchUrl.trim();

    // 1. Menyamar sebagai Googlebot agar lolos dari blokir Vercel[cite: 1]
    const headers = {
      'User-Agent': 'Mozilla/5.0 (compatible; Googlebot/2.1; +http://www.google.com/bot.html)',
      'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8',
      'Accept-Language': 'id-ID,id;q=0.9,en-US;q=0.8,en;q=0.7',
      'Referer': 'https://www.google.com/'
    };

    // Eksekusi Fetch awal
    let response = await fetch(fetchUrl, { method: 'GET', headers });
    let html = await response.text();

    // 2. Deteksi & Tembus Halaman Redirect Google News
    let realUrl = fetchUrl;
    const metaRefresh = html.match(/<meta[^>]*http-equiv="refresh"[^>]*content="[^"]*url=([^"]+)"/i);
    const aHrefMatch = html.match(/<a[^>]*href="([^"]+)"[^>]*>here<\/a>/i);
    const jsMatch = html.match(/window\.location\.replace\(['"]([^'"]+)['"]\)/i);
    const jsDataMatch = html.match(/data-n-v="([^"]+)"/i);

    if (jsDataMatch && jsDataMatch[1] && jsDataMatch[1].startsWith('http')) realUrl = jsDataMatch[1];
    else if (metaRefresh && metaRefresh[1]) realUrl = metaRefresh[1];
    else if (aHrefMatch && aHrefMatch[1]) realUrl = aHrefMatch[1];
    else if (jsMatch && jsMatch[1]) realUrl = jsMatch[1];

    // Jika tertangkap sebagai redirect, kita set target ke URL aslinya
    if (realUrl !== fetchUrl) {
        realUrl = realUrl.replace(/&amp;/g, '&');
        fetchUrl = realUrl;
    }

    // 3. Trik Khusus Media Indonesia: Paksa tampilkan semua halaman[cite: 1]
    if (fetchUrl.includes('kompas.com') || fetchUrl.includes('tribunnews.com')) {
      if (!fetchUrl.includes('page=all')) {
        fetchUrl += fetchUrl.includes('?') ? '&page=all' : '?page=all';
      }
    } else if (fetchUrl.includes('detik.com')) {
      if (!fetchUrl.includes('single=1')) {
        fetchUrl += fetchUrl.includes('?') ? '&single=1' : '?single=1';
      }
    }

    // Fetch ulang dengan URL final (Sudah di-bypass page-nya)
    response = await fetch(fetchUrl, { method: 'GET', headers });
    html = await response.text();

    // Deteksi Cloudflare / Proteksi[cite: 1]
    if (html.includes("Just a moment...") || html.includes("Cloudflare") || html.includes("Attention Required!")) {
        return NextResponse.json({ success: false, text: "Website ini memblokir akses bot sepenuhnya dari IP Datacenter." });
    }

    // 4. Ekstraksi dengan Cheerio[cite: 1]
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
                // Filter tambahan agar teks "Baca juga" tidak ikut masuk
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

    const fallbackDesc = $('meta[name="description"]').attr('content') || $('meta[property="og:description"]').attr('content') || '';
    const finalDescription = articleContent.trim() ? articleContent.trim() : fallbackDesc;

    if (!finalDescription) {
       return NextResponse.json({ success: false, text: "Gagal menyedot isi berita. Kemungkinan Paywall atau format Video." });
    }

    // Output disesuaikan dengan kebutuhan frontend (success & text)
    return NextResponse.json({
      success: true,
      text: finalDescription.substring(0, 15000)
    });

  } catch (error) {
    console.error("Error scraping:", error.message);
    return NextResponse.json({ success: false, text: "Koneksi Timeout. Gagal menyedot artikel penuh." });
  }
}
