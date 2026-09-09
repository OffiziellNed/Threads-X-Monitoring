import { NextResponse } from 'next/server';
import * as cheerio from 'cheerio';

export const dynamic = 'force-dynamic';
export const runtime = 'nodejs';

// Fungsi inti lo, gue jadiin reusable
async function scrapeOne(originalUrl) {
  if (!originalUrl || originalUrl === '#') {
    throw new Error('URL kosong atau tidak valid');
  }

  let fetchUrl = originalUrl.trim();

  // Trik Khusus Media Indonesia
  if (fetchUrl.includes('kompas.com') || fetchUrl.includes('tribunnews.com')) {
    if (!fetchUrl.includes('page=all')) {
      fetchUrl += fetchUrl.includes('?')? '&page=all' : '?page=all';
    }
  } else if (fetchUrl.includes('detik.com')) {
    if (!fetchUrl.includes('single=1')) {
      fetchUrl += fetchUrl.includes('?')? '&single=1' : '?single=1';
    }
  }

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
  const imageUrl = $('meta[property="og:image"]').attr('content') ||
                   $('meta[name="twitter:image"]').attr('content') ||
                   $('article img').first().attr('src') ||
                   null;

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
              if (text.length > 30 &&!text.toLowerCase().includes('baca juga')) {
                  articleContent += text + '\n\n';
              }
          });
          if (articleContent.trim().length > 100) break;
      }
  }

  if (!articleContent.trim()) {
      $('p').each((i, el) => {
          const text = $(el).text().trim();
          if (text.length > 50 &&!text.toLowerCase().includes('baca juga')) {
              articleContent += text + '\n\n';
          }
      });
  }

  const fallbackDesc = $('meta[name="description"]').attr('content') || 'Deskripsi tidak ditemukan.';
  const finalDescription = articleContent.trim()? articleContent.trim() : fallbackDesc;
  const cleanTitle = title? title.replace(/\s+/g, ' ').trim() : 'Judul tidak ditemukan';

  return {
    url: originalUrl,
    success: true,
    status: 'success',
    title: cleanTitle,
    text: finalDescription,
    description: finalDescription,
    gambar_url: imageUrl
  };
}

// TETEP SUPPORT 1 LINK BIAR FRONTEND LAMA LO GAK JEBOL
export async function GET(req) {
  try {
    const { searchParams } = new URL(req.url);
    const allUrls = searchParams.getAll('url'); // support?url=1&url=2&url=3

    // Kalau GET nya dikirim banyak: /api/scrape?url=link1&url=link2
    if (allUrls.length > 1) {
      const results = await Promise.allSettled(allUrls.map(u => scrapeOne(u)));
      const data = results.map((r, i) => r.status === 'fulfilled'? r.value : { url: allUrls[i], success: false, text: r.reason.message });
      return NextResponse.json({ success: true, count: data.length, data });
    }

    // Kalau cuma 1 link (kode lama lo)
    let fetchUrl = searchParams.get('url');
    if (!fetchUrl) return NextResponse.json({ success: false, text: 'URL kosong' }, { status: 400 });

    const result = await scrapeOne(fetchUrl);
    return NextResponse.json(result);

  } catch (error) {
    return NextResponse.json({ success: false, status: 'error', text: `Gagal menyedot: ${error.message}` }, { status: 500 });
  }
}

// BUAT BANYAK LINK (REKOMENDASI)
export async function POST(req) {
  try {
    const body = await req.json();
    const urls = body.urls || body; // support kirim array langsung atau {urls: []}

    if (!Array.isArray(urls) || urls.length === 0) {
      return NextResponse.json({ success: false, text: 'Kirim array urls: { urls: ["link1", "link2"] }' }, { status: 400 });
    }

    const results = await Promise.allSettled(urls.map(u => scrapeOne(u)));
    const data = results.map((r, i) => {
      if (r.status === 'fulfilled') return r.value;
      return { url: urls[i], success: false, status: 'error', text: r.reason.message, title: null, gambar_url: null };
    });

    return NextResponse.json({ success: true, count: data.length, data });

  } catch (error) {
    return NextResponse.json({ success: false, text: `Gagal: ${error.message}` }, { status: 500 });
  }
}
