import { NextResponse } from 'next/server';
import * as cheerio from 'cheerio';

export const dynamic = 'force-dynamic';
export const runtime = 'nodejs';

async function resolveGoogleNewsUrl(googleUrl) {
  if (!googleUrl.includes('news.google.com')) return googleUrl;
  try {
    const res = await fetch(googleUrl, {
      redirect: 'follow',
      headers: { 'User-Agent': 'Mozilla/5.0 (compatible; Googlebot/2.1; +http://www.google.com/bot.html)' }
    });
    if (res.url && !res.url.includes('news.google.com')) return res.url;
    const html = await res.text();
    const $ = cheerio.load(html);
    const meta = $('meta[http-equiv="refresh"]').attr('content');
    if (meta) {
      const m = meta.match(/url=(.+)/i);
      if (m) return m[1].replace(/['"]/g, '');
    }
    return res.url;
  } catch {
    return googleUrl;
  }
}

async function scrapeOne(originalUrl) {
  const realUrl = await resolveGoogleNewsUrl(originalUrl.trim());
  let fetchUrl = realUrl;

  if (fetchUrl.includes('kompas.com') || fetchUrl.includes('tribunnews.com')) {
    if (!fetchUrl.includes('page=all')) fetchUrl += fetchUrl.includes('?') ? '&page=all' : '?page=all';
  } else if (fetchUrl.includes('detik.com')) {
    if (!fetchUrl.includes('single=1')) fetchUrl += fetchUrl.includes('?') ? '&single=1' : '?single=1';
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
  $('script, style, nav, footer, iframe, .ads').remove();

  const title = ($('meta[property="og:title"]').attr('content') || $('h1').first().text() || $('title').text()).trim();
  const imageUrl = $('meta[property="og:image"]').attr('content') || null;

  let articleContent = '';
  const selectors = [
    'div[itemprop="articleBody"]',
    '.post-content',
    '.article-content',
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
        if (t.length > 40 && !/baca juga/i.test(t)) parts.push(t);
      });
      if (parts.join(' ').length > 200) { articleContent = parts.join('\n\n'); break; }
    }
  }
  if (!articleContent) {
    articleContent = $('p').map((i, el) => $(el).text().trim()).get().filter(t => t.length > 60).join('\n\n');
  }

  let hostname = "";
  try { hostname = new URL(realUrl).hostname; } catch {}

  return {
    status: "success",
    success: true,
    url: originalUrl,
    real_url: realUrl,
    title: title.replace(/\s+/g, ' ').trim(),
    text: articleContent,
    description: articleContent,
    gambar_url: imageUrl,
    sumber: hostname ? `Sumber Berita: ${hostname}` : ""
  };
}

export async function POST(req) {
  try {
    const body = await req.json();
    const url = body.url;
    const urls = body.urls;
    const list = urls || (url ? [url] : []);
    if (!list.length) return NextResponse.json({ status: 'error', message: 'URL kosong' }, { status: 400 });
    if (list.length === 1) {
      const data = await scrapeOne(list[0]);
      return NextResponse.json(data);
    }
    const results = await Promise.allSettled(list.map(u => scrapeOne(u)));
    const data = results.map((r,i) => r.status === 'fulfilled' ? r.value : { url: list[i], status: 'error', text: r.reason.message });
    return NextResponse.json({ success: true, count: data.length, data });
  } catch (e) {
    return NextResponse.json({ status: 'error', message: e.message }, { status: 500 });
  }
}

export async function GET(req) {
  const url = new URL(req.url).searchParams.get('url');
  if (!url) return NextResponse.json({ status: 'error', message: 'URL kosong' }, { status: 400 });
  try {
    const data = await scrapeOne(url);
    return NextResponse.json(data);
  } catch (e) {
    return NextResponse.json({ status: 'error', message: e.message }, { status: 500 });
  }
}
