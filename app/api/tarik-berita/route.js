import { NextResponse } from 'next/server';
import * as cheerio from 'cheerio';

export const dynamic = 'force-dynamic';
export const runtime = 'nodejs';

// 1. RESOLVE LINK GOOGLE NEWS RSS JADI LINK ASLI
async function resolveGoogleNewsUrl(googleUrl) {
  if (!googleUrl.includes('news.google.com')) return googleUrl;

  try {
    // fetch dengan follow redirect, Google akan redirect 302 ke situs asli
    const res = await fetch(googleUrl, {
      redirect: 'follow',
      headers: {
        'User-Agent': 'Mozilla/5.0 (compatible; Googlebot/2.1; +http://www.google.com/bot.html)',
      }
    });

    // res.url ini adalah URL akhir setelah redirect
    if (res.url &&!res.url.includes('news.google.com')) {
      return res.url;
    }

    // Fallback: kadang Google kasih meta refresh
    const html = await res.text();
    const $ = cheerio.load(html);
    const meta = $('meta[http-equiv="refresh"]').attr('content');
    if (meta) {
      const match = meta.match(/url=(.+)/i);
      if (match) return match[1].replace(/['"]/g, '');
    }

    return res.url;
  } catch (e) {
    console.log('Gagal resolve GNews:', e.message);
    return googleUrl;
  }
}

async function scrapeOne(originalUrl) {
  if (!originalUrl || originalUrl === '#') throw new Error('URL kosong');

  // STEP 1: ubah dulu link Google News jadi link asli
  const realUrl = await resolveGoogleNewsUrl(originalUrl.trim());
  let fetchUrl = realUrl;

  if (fetchUrl.includes('kompas.com') || fetchUrl.includes('tribunnews.com')) {
    if (!fetchUrl.includes('page=all')) fetchUrl += fetchUrl.includes('?')? '&page=all' : '?page=all';
  } else if (fetchUrl.includes('detik.com')) {
    if (!fetchUrl.includes('single=1')) fetchUrl += fetchUrl.includes('?')? '&single=1' : '?single=1';
  }

  const res = await fetch(fetchUrl, {
    headers: {
      'User-Agent': 'Mozilla/5.0 (compatible; Googlebot/2.1; +http://www.google.com/bot.html)',
      'Accept': 'text/html',
      'Referer': 'https://www.google.com/'
    }
  });
  const html = await res.text();
  const $ = cheerio.load(html);
  $('script, style, nav, footer, iframe').remove();

  const title = ($('meta[property="og:title"]').attr('content') || $('h1').first().text() || $('title').text()).trim();
  const imageUrl = $('meta[property="og:image"]').attr('content') || null;

  let articleContent = '';
  const selectors = [
    'div[itemprop="articleBody"]',
    '.post-content',
    '.post-body',
    '.article-content',
    '.content-article',
    '.detail__body-text',
    '.read__content',
    '.entry-content',
    'article'
  ];

  for (const sel of selectors) {
    if ($(sel).length) {
      const parts = [];
      $(sel).find('p').each((i, el) => {
        const t = $(el).text().trim();
        if (t.length > 40 &&!/baca juga/i.test(t)) parts.push(t);
      });
      if (parts.join(' ').length > 200) {
        articleContent = parts.join('\n\n');
        break;
      }
    }
  }

  if (!articleContent) {
    articleContent = $('p').map((i, el) => $(el).text().trim()).get().filter(t => t.length > 60).join('\n\n');
  }

  return {
    url: originalUrl, // url asli google news
    real_url: realUrl, // url publisher yang udah ke-resolve
    success: true,
    title: title.replace(/\s+/g, ' ').trim(),
    text: articleContent,
    description: articleContent,
    gambar_url: imageUrl
  };
}

export async function GET(req) {
  const { searchParams } = new URL(req.url);
  const url = searchParams.get('url');
  if (!url) return NextResponse.json({ success: false, text: 'URL kosong' }, { status: 400 });
  try {
    const data = await scrapeOne(url);
    return NextResponse.json(data);
  } catch (e) {
    return NextResponse.json({ success: false, text: e.message }, { status: 500 });
  }
}

export async function POST(req) {
  const { urls } = await req.json();
  const results = await Promise.allSettled(urls.map(u => scrapeOne(u)));
  const data = results.map((r, i) => r.status === 'fulfilled'? r.value : { url: urls[i], success: false, text: r.reason.message });
  return NextResponse.json({ success: true, count: data.length, data });
}
