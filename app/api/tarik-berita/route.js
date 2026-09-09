import { NextResponse } from 'next/server';
import * as cheerio from 'cheerio';

export const dynamic = 'force-dynamic';
export const runtime = 'nodejs';
export const maxDuration = 30;

function isCloudflareBlock(html, text) {
  if (!html) return true;
  const low = (html + ' ' + (text || '')).toLowerCase();
  return low.includes('just a moment') || low.includes('attention required') || low.includes('error 522') || low.includes('error 1020') || low.includes('the initial connection between cloudflare');
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
  
  const title = ($('meta[property="og:title"]').attr('content') || $('h1').first().text() || $('title').text() || '').replace(/\s+/g, ' ').trim();
  const imageUrl = $('meta[property="og:image"]').attr('content') || $('meta[name="twitter:image"]').attr('content') || $('article img').first().attr('src') || null;
  const metaDesc = $('meta[name="description"]').attr('content') || $('meta[property="og:description"]').attr('content') || '';

  let articleContent = '';
  const selectors = ['article', '.detail__body-text', '.read__content', '.entry-content', '.article-content', '.detail-text', '.thecontent', '.detail__body', '.post-content'];
  
  for (const selector of selectors) {
    if ($(selector).length > 0) {
      const parts = [];
      $(selector).find('p').each((i, el) => {
        const text = $(el).text().trim();
        if (text.length > 30 && !/baca juga|advertisement/i.test(text)) parts.push(text);
      });
      if (parts.join(' ').length > 200) {
        articleContent = parts.join('\n\n');
        break;
      }
    }
  }
  
  if (!articleContent.trim()) {
    const allP = [];
    $('p').each((i, el) => {
      const text = $(el).text().trim();
      if (text.length > 50) allP.push(text);
    });
    articleContent = allP.join('\n\n');
  }

  return { title, content: articleContent.trim(), imageUrl, metaDesc };
}

async function tryFetchWithProxies(fetchUrl) {
  const proxies = [
    { name: 'direct', url: fetchUrl, opts: { headers: { 'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36', 'Accept': 'text/html', 'Referer': 'https://www.google.com/' }, cache: 'no-store' } },
    { name: 'allorigins', url: `https://api.allorigins.win/raw?url=${encodeURIComponent(fetchUrl)}`, opts: { cache: 'no-store' } },
    { name: 'corsproxy', url: `https://corsproxy.io/?${encodeURIComponent(fetchUrl)}`, opts: { cache: 'no-store' } },
    { name: 'codetabs', url: `https://api.codetabs.com/v1/proxy?quest=${encodeURIComponent(fetchUrl)}`, opts: { cache: 'no-store' } },
    { name: 'jina', url: `https://r.jina.ai/http://${fetchUrl.replace(/^https?:\/\//, '')}`, opts: { headers: { 'X-Retain-Images': 'none' }, cache: 'no-store' } },
  ];

  for (const p of proxies) {
    try {
      const res = await fetch(p.url, p.opts);
      if (!res.ok) continue;
      let html = await res.text();
      if (!html || html.length < 100) continue;
      if (isCloudflareBlock(html, '')) {
        console.log(`[${p.name}] kena Cloudflare block, coba proxy lain...`);
        continue;
      }
      if (p.name === 'jina') {
        // Jina ngasih markdown, bukan HTML
        const lines = html.split('\n').filter(l => l.trim().length > 60);
        const longText = lines.join('\n\n');
        if (longText.length > 300) {
          return { title: '', content: longText, imageUrl: null, metaDesc: '' };
        }
        continue;
      }
      const ext = await extractWithCheerio(html);
      if (ext.content && ext.content.length > 200 && !isCloudflareBlock('', ext.content)) {
        console.log(`[${p.name}] berhasil ${ext.content.length} chars`);
        return ext;
      }
    } catch (e) {
      console.log(`[${p.name}] error:`, e.message);
      continue;
    }
  }
  return null;
}

export async function POST(req) {
  try {
    const { url } = await req.json();
    if (!url) {
      return NextResponse.json({ error: 'URL kosong', message: 'URL tidak boleh kosong' }, { status: 400 });
    }

    let fetchUrl = url.trim();
    // Resolve Google News dulu
    fetchUrl = await resolveGoogleNewsUrl(fetchUrl);

    if (fetchUrl.includes('kompas.com') || fetchUrl.includes('tribunnews.com')) {
      if (!fetchUrl.includes('page=all')) {
        fetchUrl += fetchUrl.includes('?') ? '&page=all' : '?page=all';
      }
    } else if (fetchUrl.includes('detik.com')) {
      if (!fetchUrl.includes('single=1')) {
        fetchUrl += fetchUrl.includes('?') ? '&single=1' : '?single=1';
      }
    }

    const extracted = await tryFetchWithProxies(fetchUrl);

    if (!extracted) {
      throw new Error("Semua proxy diblokir Cloudflare 522. Website ini memblokir IP Vercel. Coba sumber lain (Kompas, Antara, Liputan6).");
    }

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
    console.error("Error scraping:", error.message);
    return NextResponse.json({ 
      status: 'error',
      error: `Gagal. ${error.message}`,
      message: `Gagal. ${error.message}`,
      description: `Gagal. ${error.message}`
    }, { status: 500 });
  }
}

export async function GET(req) {
  const url = new URL(req.url).searchParams.get('url');
  if (!url) return NextResponse.json({ status: 'error', message: 'URL kosong' }, { status: 400 });
  // Pakai logic yang sama
  return POST(new Request(req.url, { method: 'POST', body: JSON.stringify({ url }), headers: { 'Content-Type': 'application/json' } }));
}
