import { NextResponse } from 'next/server';
import * as cheerio from 'cheerio';

export const dynamic = 'force-dynamic';
export const runtime = 'nodejs';
export const maxDuration = 30;

function isCloudflareError(text) {
  if (!text) return true;
  const low = text.toLowerCase();
  return (
    low.includes('error 522') ||
    low.includes('error 1020') ||
    low.includes('attention required') ||
    low.includes('the initial connection between cloudflare') ||
    low.includes('cf-error') ||
    low.includes('please wait') && low.includes('cloudflare') ||
    low.includes('enable javascript') && low.includes('cloudflare') ||
    low.length < 120
  );
}

async function resolveGoogleNewsUrl(googleUrl) {
  if (!googleUrl.includes('news.google.com')) return googleUrl;
  try {
    const r1 = await fetch(googleUrl, { redirect: 'manual', headers: { 'User-Agent': 'Mozilla/5.0' } });
    const loc = r1.headers.get('location');
    if (loc && !loc.includes('news.google.com')) return loc;
    const r2 = await fetch(googleUrl, { redirect: 'follow', headers: { 'User-Agent': 'Mozilla/5.0 (compatible; Googlebot/2.1)' } });
    if (r2.url && !r2.url.includes('news.google.com')) return r2.url;
  } catch {}
  return googleUrl;
}

async function extractWithCheerio(html) {
  const $ = cheerio.load(html);
  $('script, style, nav, footer, iframe, noscript').remove();
  const title = ($('meta[property="og:title"]').attr('content') || $('h1').first().text() || $('title').text()).trim();
  const imageUrl = $('meta[property="og:image"]').attr('content') || null;
  const metaDesc = $('meta[name="description"]').attr('content') || $('meta[property="og:description"]').attr('content') || "";
  let content = '';
  const selectors = [
    'div[itemprop="articleBody"]', '.post-content', '.detail__body-text', '.read__content',
    '.thecontent', '.detail-news', '.content-detail', '.artikel', 'article'
  ];
  for (const sel of selectors) {
    if ($(sel).length) {
      const parts = [];
      $(sel).find('p').each((i, el) => {
        const t = $(el).text().trim();
        if (t.length > 35 && !/baca juga/i.test(t)) parts.push(t);
      });
      if (parts.join(' ').length > 200) { content = parts.join('\n\n'); break; }
    }
  }
  if (!content || content.length < 150) {
    content = $('p').map((i, el) => $(el).text().trim()).get().filter(t => t.length > 60).join('\n\n');
  }
  return { title, content, imageUrl, metaDesc };
}

async function tryFetch(url) {
  const proxies = [
    // 1. Direct
    { url: url, opts: { headers: { 'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36', 'Referer': 'https://www.google.com/' }, cache: 'no-store' } },
    // 2. AllOrigins
    { url: `https://api.allorigins.win/raw?url=${encodeURIComponent(url)}`, opts: { cache: 'no-store' } },
    // 3. CorsProxy
    { url: `https://corsproxy.io/?${encodeURIComponent(url)}`, opts: { cache: 'no-store' } },
    // 4. Codetabs
    { url: `https://api.codetabs.com/v1/proxy?quest=${encodeURIComponent(url)}`, opts: { cache: 'no-store' } },
    // 5. Jina AI - ini paling ampuh buat Cloudflare
    { url: `https://r.jina.ai/http://${url.replace(/^https?:\/\//, '')}`, opts: { headers: { 'X-Retain-Images': 'none' }, cache: 'no-store' } },
    // 6. Bing Cache via Jina
    { url: `https://r.jina.ai/http://cc.bingj.com/cache.aspx?d=${encodeURIComponent(url)}`, opts: { cache: 'no-store' } },
  ];

  for (const p of proxies) {
    try {
      const res = await fetch(p.url, p.opts);
      if (!res.ok) continue;
      let text = await res.text();
      if (!text || text.length < 50) continue;
      if (isCloudflareError(text)) {
        console.log('Blocked by CF detected from:', p.url);
        continue;
      }
      // Kalau dari Jina, dia markdown, langsung pakai
      if (p.url.includes('r.jina.ai')) {
        const lines = text.split('\n').filter(l => l.trim().length > 50);
        const longText = lines.join('\n\n');
        if (longText.length > 200) {
          return { content: longText, title: '', imageUrl: null, metaDesc: '' };
        }
      }
      const ext = await extractWithCheerio(text);
      if (ext.content && ext.content.length > 200 && !isCloudflareError(ext.content)) {
        return ext;
      }
    } catch (e) {
      console.log('proxy fail', p.url, e.message);
      continue;
    }
  }
  return null;
}

async function scrapeOne(originalUrl) {
  const realUrl = await resolveGoogleNewsUrl(originalUrl.trim());
  const extracted = await tryFetch(realUrl);

  if (!extracted) throw new Error('Semua proxy diblokir Cloudflare 522 untuk ' + realUrl + '. Coba berita lain.');

  let finalContent = extracted.content || extracted.metaDesc || '';
  let finalTitle = extracted.title || 'Tanpa Judul';

  if (finalContent.length < 80) {
    finalContent = extracted.metaDesc || finalTitle;
  }

  let hostname = "";
  try { hostname = new URL(realUrl).hostname; } catch {}

  return {
    status: "success",
    url: originalUrl,
    real_url: realUrl,
    title: finalTitle,
    text: finalContent,
    description: finalContent,
    gambar_url: extracted.imageUrl,
    sumber: hostname ? `Sumber Berita: ${hostname}` : ""
  };
}

export async function POST(req) {
  try {
    const { url } = await req.json();
    if (!url) return NextResponse.json({ status: 'error', message: 'URL kosong' }, { status: 400 });
    const data = await scrapeOne(url);
    return NextResponse.json(data);
  } catch (e) {
    return NextResponse.json({ status: 'error', message: e.message, text: e.message, description: e.message }, { status: 500 });
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
