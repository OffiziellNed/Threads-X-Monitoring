import { NextResponse } from 'next/server';
import * as cheerio from 'cheerio';

export const dynamic = 'force-dynamic';
export const runtime = 'nodejs';
export const maxDuration = 30;

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
  $('script, style, nav, footer, iframe, .ads, [class*="share"], [id*="share"]').remove();

  const title = ($('meta[property="og:title"]').attr('content') || $('h1').first().text() || $('title').text()).trim();
  const imageUrl = $('meta[property="og:image"]').attr('content') || $('article img').first().attr('src') || null;
  const metaDesc = $('meta[name="description"]').attr('content') || $('meta[property="og:description"]').attr('content') || "";

  let content = '';
  const selectors = [
    'div[itemprop="articleBody"]',
    'div[itemprop="articleBody"] p',
    '.post-content',
    '.thecontent',
    '.content-detail',
    '.detail-news',
    '.artikel',
    '#content',
    '#isi',
    '.detail__body-text',
    '.read__content',
    '.entry-content',
    'article'
  ];

  for (const sel of selectors) {
    if ($(sel).length) {
      const parts = [];
      // kalau selector sudah p, ambil langsung
      if (sel.includes(' p')) {
        $(sel).each((i, el) => {
          const t = $(el).text().trim();
          if (t.length > 30 && !/baca juga|advertisement/i.test(t)) parts.push(t);
        });
      } else {
        $(sel).find('p').each((i, el) => {
          const t = $(el).text().trim();
          if (t.length > 30 && !/baca juga|advertisement|Rmol.id/i.test(t)) parts.push(t);
        });
        // fallback kalau gak ada p, ambil text langsung
        if (parts.length === 0) {
          const txt = $(sel).text().trim();
          if (txt.length > 200) parts.push(txt);
        }
      }
      if (parts.join(' ').length > 200) {
        content = parts.join('\n\n');
        break;
      }
    }
  }

  if (!content || content.length < 150) {
    const allP = $('p').map((i, el) => $(el).text().trim()).get().filter(t => t.length > 60).join('\n\n');
    if (allP.length > content.length) content = allP;
  }

  return { title, content, imageUrl, metaDesc };
}

async function scrapeOne(originalUrl) {
  const realUrl = await resolveGoogleNewsUrl(originalUrl.trim());
  let fetchUrl = realUrl;
  let html = '';
  let extracted = null;

  // 1. Coba direct
  try {
    const res = await fetch(fetchUrl, {
      headers: {
        'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36',
        'Accept': 'text/html,application/xhtml+xml',
        'Referer': 'https://www.google.com/'
      },
      cache: 'no-store'
    });
    html = await res.text();
    extracted = await extractWithCheerio(html);
  } catch (e) {
    console.log('direct fail', e.message);
  }

  // 2. Kalau kosong / diblokir cloudflare, coba via allorigins proxy
  if (!extracted || !extracted.content || extracted.content.length < 150) {
    try {
      const proxyUrl = `https://api.allorigins.win/raw?url=${encodeURIComponent(fetchUrl)}`;
      const res = await fetch(proxyUrl, { cache: 'no-store' });
      html = await res.text();
      const ext2 = await extractWithCheerio(html);
      if (ext2.content.length > (extracted?.content?.length || 0)) extracted = ext2;
    } catch (e) {
      console.log('proxy fail', e.message);
    }
  }

  // 3. Kalau masih kosong (kasus rmol.id), coba via Jina AI reader - ini paling ampuh buat bypass CF
  if (!extracted || !extracted.content || extracted.content.length < 150) {
    try {
      const jinaUrl = `https://r.jina.ai/http://${fetchUrl.replace(/^https?:\/\//, '')}`;
      const res = await fetch(jinaUrl, {
        headers: { 'X-Retain-Images': 'none' },
        cache: 'no-store'
      });
      const text = await res.text();
      // Jina ngasih markdown, ambil paragraf panjang
      if (text && text.length > 200) {
        if (!extracted) extracted = { title: '', content: '', imageUrl: null, metaDesc: '' };
        // Jina kadang ada Title: di baris pertama
        const lines = text.split('\n').filter(l => l.trim().length > 50);
        const longText = lines.join('\n\n');
        if (longText.length > extracted.content.length) {
          extracted.content = longText;
        }
      }
    } catch (e) {
      console.log('jina fail', e.message);
    }
  }

  if (!extracted) throw new Error('Gagal ambil HTML dari ' + fetchUrl);

  let finalContent = extracted.content || extracted.metaDesc || '';
  if (finalContent.length < 80) {
    finalContent = extracted.metaDesc || `Berita dari ${realUrl} - ${extracted.title}`;
  }

  let hostname = "";
  try { hostname = new URL(realUrl).hostname; } catch {}

  return {
    status: "success",
    url: originalUrl,
    real_url: realUrl,
    title: extracted.title || "Tanpa Judul",
    text: finalContent,
    description: finalContent,
    gambar_url: extracted.imageUrl,
    sumber: hostname ? `Sumber Berita: ${hostname}` : ""
  };
}

export async function POST(req) {
  try {
    const body = await req.json();
    const url = body.url;
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
