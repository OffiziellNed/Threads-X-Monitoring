import { NextResponse } from 'next/server';
import * as cheerio from 'cheerio';

export const dynamic = 'force-dynamic';
export const runtime = 'nodejs';

function buildFetchUrl(originalUrl) {
  let url = originalUrl.trim();
  if (url.includes('kompas.com') || url.includes('tribunnews.com')) {
    if (!url.includes('page=all')) url += url.includes('?')? '&page=all' : '?page=all';
  } else if (url.includes('detik.com')) {
    if (!url.includes('single=1')) url += url.includes('?')? '&single=1' : '?single=1';
  }
  return url;
}

async function scrapeOne(originalUrl) {
  if (!originalUrl || originalUrl === '#') throw new Error('URL kosong');

  const fetchUrl = buildFetchUrl(originalUrl);

  const res = await fetch(fetchUrl, {
    headers: {
      'User-Agent': 'Mozilla/5.0 (compatible; Googlebot/2.1; +http://www.google.com/bot.html)',
      'Accept': 'text/html',
      'Referer': 'https://www.google.com/'
    }
  });
  const html = await res.text();

  if (html.includes("Just a moment") || html.includes("Attention Required")) {
    throw new Error("Diblokir Cloudflare / Bot Protection");
  }

  const $ = cheerio.load(html);

  // Hapus yang ganggu
  $('script, style, nav, footer, iframe,.ads,.advertisement').remove();

  const title = ($('meta[property="og:title"]').attr('content') || $('h1').first().text() || $('title').text()).trim();

  const imageUrl = $('meta[property="og:image"]').attr('content') ||
                   $('article img').first().attr('src') || null;

  // SELECTOR KHUSUS ANTARA + UMUM
  let articleContent = '';
  const selectors = [
    'div[itemprop="articleBody"]', // ANTARA paling sering ini
    '.post-content', // ANTARA Sumsel pakai ini
    '.article__content',
    '.content-article',
    '.post-body',
    'article.post-content',
    '.detail__body-text',
    '.read__content',
    '.entry-content',
    'article'
  ];

  for (const sel of selectors) {
    if ($(sel).length) {
      const texts = [];
      $(sel).find('p').each((i, el) => {
        let t = $(el).text().trim();
        if (t.length > 40 &&!/baca juga|advertisement/i.test(t)) {
          texts.push(t);
        }
      });
      if (texts.join(' ').length > 200) {
        articleContent = texts.join('\n\n');
        break;
      }
    }
  }

  // Fallback terakhir
  if (!articleContent) {
    articleContent = $('p').map((i, el) => $(el).text().trim()).get().filter(t => t.length > 60).join('\n\n');
  }

  // DETEKSI KALO YANG LO SCRAPE HALAMAN LIST BUKAN DETAIL
  if (articleContent.length < 300 || articleContent.includes('Berita Terkini Sumatera Selatan - ANTARA News Sumsel')) {
     // Coba cari link berita pertama di halaman list itu
     const firstArticleLink = $('a[href*="/berita/"]').first().attr('href');
     if (firstArticleLink) {
       throw new Error(`Ini halaman daftar, bukan detail berita. Coba pakai link detail seperti: ${firstArticleLink}. Yang lo input: ${originalUrl}`);
     }
  }

  const fallbackDesc = $('meta[name="description"]').attr('content') || '';
  const finalText = articleContent.trim() || fallbackDesc;

  return {
    url: originalUrl,
    success: true,
    status: 'success',
    title: title.replace(/\s+/g, ' ').trim(),
    text: finalText,
    description: finalText,
    gambar_url: imageUrl
  };
}

// GET buat 1 link (biar editor lama lo gak jebol)
export async function GET(req) {
  try {
    const { searchParams } = new URL(req.url);
    const url = searchParams.get('url');
    if (!url) return NextResponse.json({ success: false, text: 'URL kosong' }, { status: 400 });
    const data = await scrapeOne(url);
    return NextResponse.json(data);
  } catch (e) {
    return NextResponse.json({ success: false, status: 'error', text: e.message }, { status: 500 });
  }
}

// POST buat banyak link
export async function POST(req) {
  try {
    const { urls } = await req.json();
    const results = await Promise.allSettled(urls.map(u => scrapeOne(u)));
    const data = results.map((r, i) => r.status === 'fulfilled'? r.value : { url: urls[i], success: false, text: r.reason.message });
    return NextResponse.json({ success: true, count: data.length, data });
  } catch (e) {
    return NextResponse.json({ success: false, text: e.message }, { status: 500 });
  }
}
