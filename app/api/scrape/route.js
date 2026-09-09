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

    const headers = {
      'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/122.0.0.0 Safari/537.36',
      'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,image/webp,*/*;q=0.8',
      'Accept-Language': 'id-ID,id;q=0.9,en-US;q=0.8,en;q=0.7',
      'Referer': 'https://news.google.com/'
    };

    const fetchWithTimeout = async (url, ms) => {
      const controller = new AbortController();
      const timeout = setTimeout(() => controller.abort(), ms);
      try {
        const res = await fetch(url, { method: 'GET', headers, redirect: 'follow', signal: controller.signal });
        clearTimeout(timeout);
        return res;
      } catch (err) {
        clearTimeout(timeout);
        return null;
      }
    };

    // 1. Tembus Halaman Redirect Google News
    let response = await fetchWithTimeout(fetchUrl, 4500);
    if (!response) return NextResponse.json({ success: false, text: "Timeout: Server Google News tidak merespon." });
    
    let html = await response.text();
    let finalUrl = response.url;

    const cWizMatch = html.match(/data-n-v="([^"]+)"/i);
    const aHrefMatch = html.match(/<a[^>]*href="([^"]+)"[^>]*>here<\/a>/i);
    
    if (cWizMatch && cWizMatch[1] && cWizMatch[1].startsWith('http')) {
        finalUrl = cWizMatch[1];
    } else if (aHrefMatch && aHrefMatch[1]) {
        finalUrl = aHrefMatch[1];
    }

    finalUrl = finalUrl.replace(/&amp;/g, '&');

    // 2. Bypass Pagination Media Indonesia
    if (finalUrl.includes('detik.com') && !finalUrl.includes('single=1')) {
        finalUrl += finalUrl.includes('?') ? '&single=1' : '?single=1';
    } else if ((finalUrl.includes('kompas.com') || finalUrl.includes('tribunnews.com')) && !finalUrl.includes('page=all')) {
        finalUrl += finalUrl.includes('?') ? '&page=all' : '?page=all';
    }

    // 3. Fetch web berita aslinya
    if (finalUrl !== response.url && finalUrl !== fetchUrl) {
        response = await fetchWithTimeout(finalUrl, 4500);
        if (!response) return NextResponse.json({ success: false, text: "Timeout: Server Detik/Kompas lambat merespon." });
        html = await response.text();
    }

    if (html.includes("Just a moment...") || html.includes("Cloudflare")) {
        return NextResponse.json({ success: false, text: "Terblokir sistem keamanan website sumber (Cloudflare/Anti-Bot)." });
    }

    // 4. Ekstraksi Elemen dengan Cheerio
    const $ = cheerio.load(html);

    // Pembersihan elemen iklan dan link sampah
    $('script, style, iframe, nav, footer, header, aside, .baca-juga, .related-news, .video, .ads, .parallax, .box-embed').remove();

    let articleContent = '';
    
    const articleSelectors = [
        '.detail__body-text', 
        '.read__content',     
        '.txt-article',       
        '.entry-content', 
        '.article-content',
        'article'
    ];
    
    for (const selector of articleSelectors) {
        if ($(selector).length > 0) {
            $(selector).find('p, div, strong').each((i, el) => {
                const text = $(el).text().replace(/\s+/g, ' ').trim();
                if (text.length > 50 && !text.toLowerCase().includes('baca juga') && !text.toLowerCase().includes('halaman selanjutnya')) { 
                    articleContent += text + '\n\n';
                }
            });
            break;
        }
    }
    
    if (!articleContent.trim()) {
        $('p').each((i, el) => {
            const text = $(el).text().replace(/\s+/g, ' ').trim();
            if (text.length > 60 && !text.toLowerCase().includes('baca juga')) { 
                articleContent += text + '\n\n';
            }
        });
    }

    const finalContent = articleContent.trim();

    if (!finalContent) {
         return NextResponse.json({ success: false, text: "Teks gagal diekstrak. Kemungkinan besar artikel ini berupa Video atau Foto Galeri." });
    }

    return NextResponse.json({
      success: true,
      text: finalContent.substring(0, 15000) 
    });

  } catch (error) {
    return NextResponse.json({ success: false, text: "Sistem gagal mengeksekusi ekstraksi (Internal Error)." });
  }
}
