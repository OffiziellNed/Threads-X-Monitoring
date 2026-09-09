import { NextResponse } from 'next/server';
import * as cheerio from 'cheerio';

export const dynamic = 'force-dynamic';
export const runtime = 'nodejs';
export const maxDuration = 30;

function isCloudflareBlock(html) {
  if (!html) return true;
  const low = html.toLowerCase();
  return low.includes('just a moment') || low.includes('attention required') || low.includes('error 522') || low.includes('error 1020') || low.includes('the initial connection between cloudflare');
}

async function resolveGoogleNewsUrl(googleUrl) {
  if (!googleUrl.includes('news.google.com')) return googleUrl;
  try {
    const r1 = await fetch(googleUrl, { redirect: 'manual', headers: { 'User-Agent': 'Mozilla/5.0' }, signal: AbortSignal.timeout(4000) });
    const loc = r1.headers.get('location');
    if (loc && !loc.includes('news.google.com')) return loc;
  } catch {}
  try {
    const r2 = await fetch(googleUrl, { redirect: 'follow', headers: { 'User-Agent': 'Mozilla/5.0 (compatible; Googlebot/2.1)' }, signal: AbortSignal.timeout(5000) });
    if (r2.url && !r2.url.includes('news.google.com')) return r2.url;
  } catch {}
  return googleUrl;
}

async function extractWithCheerio(html) {
  const $ = cheerio.load(html);
  $('script, style, nav, footer, iframe, noscript').remove();
  const title = ($('meta[property="og:title"]').attr('content') || $('h1').first().text() || $('title').text() || '').replace(/\s+/g, ' ').trim();
  const imageUrl = $('meta[property="og:image"]').attr('content') || $('meta[name="twitter:image"]').attr('content') || $('article img').first().attr('src') || null;
  const metaDesc = $('meta[name="description"]').attr('content') || $('meta[property="og:description"]').attr('content') || '';
  let articleContent = '';
  const selectors = ['.detail__body-text', '.read__content', '.entry-content', '.article-content', 'article', '.thecontent'];
  for (const selector of selectors) {
    if ($(selector).length > 0) {
      const parts = [];
      $(selector).find('p').each((i, el) => {
        const text = $(el).text().trim();
        if (text.length > 35 && !/baca juga/i.test(text)) parts.push(text);
      });
      if (parts.join(' ').length > 200) { articleContent = parts.join('\n\n'); break; }
    }
  }
  if (!articleContent.trim()) {
    const allP = [];
    $('p').each((i, el) => { const t = $(el).text().trim(); if (t.length > 50) allP.push(t); });
    articleContent = allP.join('\n\n');
  }
  return { title, content: articleContent.trim(), imageUrl, metaDesc };
}

async function fetchWithTimeout(url, opts, timeout = 5000) {
  const controller = new AbortController();
  const id = setTimeout(() => controller.abort(), timeout);
  try {
    const res = await fetch(url, { ...opts, signal: controller.signal });
    clearTimeout(id);
    return res;
  } catch (e) {
    clearTimeout(id);
    throw e;
  }
}

async function tryFetchWithProxies(fetchUrl) {
  // Urutan: direct (cepat) -> allorigins (cepat) -> jina (paling ampuh)
  const proxies = [
    { name: 'direct', url: fetchUrl, opts: { headers: { 'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36', 'Accept': 'text/html', 'Referer': 'https://www.google.com/' }, cache: 'no-store' }, timeout: 5000 },
    { name: 'allorigins', url: `https://api.allorigins.win/raw?url=${encodeURIComponent(fetchUrl)}`, opts: { cache: 'no-store' }, timeout: 5000 },
    { name: 'jina', url: `https://r.jina.ai/http://${fetchUrl.replace(/^https?:\/\//, '')}`, opts: { headers: { 'X-Retain-Images': 'none' }, cache: 'no-store' }, timeout: 7000 },
  ];

  for (const p of proxies) {
    try {
      const res = await fetchWithTimeout(p.url, p.opts, p.timeout);
      if (!res.ok) continue;
      let html = await res.text();
      if (!html || html.length < 100) continue;
      if (isCloudflareBlock(html)) { console.log(`[${p.name}] blocked`); continue; }
      if (p.name === 'jina') {
        const lines = html.split('\n').filter(l => l.trim().length > 60);
        const longText = lines.join('\n\n');
        if (longText.length > 300) return { title: '', content: longText, imageUrl: null, metaDesc: '' };
        continue;
      }
      const ext = await extractWithCheerio(html);
      if (ext.content && ext.content.length > 200) {
        console.log(`[${p.name}] OK ${ext.content.length}`);
        return ext;
      }
    } catch (e) {
      console.log(`[${p.name}] timeout/error:`, e.message);
      continue;
    }
  }
  return null;
}

export async function POST(req) {
  try {
    const { url } = await req.json();
    if (!url) return NextResponse.json({ error: 'URL kosong' }, { status: 400 });
    let fetchUrl = url.trim();
    fetchUrl = await resolveGoogleNewsUrl(fetchUrl);
    if (fetchUrl.includes('kompas.com') || fetchUrl.includes('tribunnews.com')) {
      if (!fetchUrl.includes('page=all')) fetchUrl += fetchUrl.includes('?') ? '&page=all' : '?page=all';
    } else if (fetchUrl.includes('detik.com')) {
      if (!fetchUrl.includes('single=1')) fetchUrl += fetchUrl.includes('?') ? '&single=1' : '?single=1';
    }
    const extracted = await tryFetchWithProxies(fetchUrl);
    if (!extracted) throw new Error("Gagal bypass Cloudflare 522 setelah 3 percobaan.");
    const finalDesc = extracted.content || extracted.metaDesc || 'Deskripsi tidak ditemukan.';
    const cleanTitle = extracted.title ? extracted.title.replace(/\s+/g, ' ').trim() : 'Judul tidak ditemukan';
    let hostname = "";
    try { hostname = new URL(fetchUrl).hostname; } catch {}
    return NextResponse.json({
      status: 'success',
      title: cleanTitle,
      description: finalDesc,
      text: finalDesc,
      prompt: `Judul: ${cleanTitle}\n\nIsi Berita Lengkap:\n${finalDesc}`,
      gambar_url: extracted.imageUrl,
      sumber: hostname ? `Sumber Berita: ${hostname}` : "",
      real_url: fetchUrl,
      url: url
    });
  } catch (error) {
    return NextResponse.json({ status: 'error', message: error.message, description: error.message }, { status: 500 });
  }
}
export async function GET(req) {
  const url = new URL(req.url).searchParams.get('url');
  if (!url) return NextResponse.json({ status: 'error' }, { status: 400 });
  return POST(new Request(req.url, { method: 'POST', body: JSON.stringify({ url }), headers: { 'Content-Type': 'application/json' } }));
}
