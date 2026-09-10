import { NextResponse } from 'next/server';
export const dynamic = 'force-dynamic';

function decodeCBMiUrl(googleUrl) {
  try {
    const match = googleUrl.match(/\/articles\/(CBM[A-Za-z0-9_-]+)/);
    if (!match) return null;
    let id = match[1];
    let b64 = id;
    if (b64.startsWith('CBM')) b64 = b64.substring(4);
    b64 = b64.replace(/-/g, '+').replace(/_/g, '/');
    while (b64.length % 4) b64 += '=';
    try {
      const buffer = Buffer.from(b64, 'base64');
      const binary = buffer.toString('binary');
      const urlRegex = /https?:\/\/[^\x00-\x08\x0B\x0C\x0E-\x1F\s"'<>\]]+/g;
      let urls = [];
      let m;
      while ((m = urlRegex.exec(binary)) !== null) {
        let u = m[0].replace(/[\x00-\x1F]+.*$/, '').split('"')[0].split("'")[0];
        if (!u.includes('google.com') && !u.includes('gstatic') && u.length > 15) {
          try { new URL(u); urls.push(u); } catch {}
        }
      }
      if (urls.length > 0) {
        urls.sort((a,b)=>b.length-a.length);
        return urls[0];
      }
    } catch {}
  } catch {}
  return null;
}

function findRealUrlInHtml(html, baseUrl) {
  // 1. Look for data-n-a, data-n-au, data-n-href
  const patterns = [
    /data-n-a=["'](https?:\/\/[^"']+)["']/i,
    /data-n-au=["'](https?:\/\/[^"']+)["']/i,
    /data-n-href=["'](https?:\/\/[^"']+)["']/i,
    /class=["'][^"']*DY5T1d[^"']*["'][^>]*href=["'](https?:\/\/[^"']+)["']/i,
    /<a[^>]+class="[^"]*WwrzSb[^"]*"[^>]*href=["'](https?:\/\/[^"']+)["']/i,
    /"url"\s*:\s*"(https?:\/\/[^"]+)"/i,
    /"Url"\s*:\s*"(https?:\/\/[^"]+)"/i,
    /window\.location(?:\.href)?\s*=\s*["'](https?:\/\/[^"']+)["']/i,
    /<meta[^>]*http-equiv=["']refresh["'][^>]*url=(https?:\/\/[^"'>]+)/i,
  ];
  for (const regex of patterns) {
    const m = html.match(regex);
    if (m && m[1] && !m[1].includes('google.com') && m[1].length > 15) {
      try { new URL(m[1]); return m[1].replace(/&amp;/g, '&'); } catch {}
    }
  }
  // 2. Find all https:// links that look like news articles
  const allHrefs = [...html.matchAll(/href=["'](https?:\/\/(?!.*google\.com|.*gstatic\.com|.*doubleclick\.net|.*googleapis\.com)[^"']+)["']/gi)];
  for (const match of allHrefs) {
    const href = match[1].replace(/&amp;/g, '&');
    if (href.length > 25 && (href.includes('.com') || href.includes('.co.id') || href.includes('.id/') || href.includes('.go.id'))) {
      // Skip google, youtube, etc
      if (!href.includes('accounts.google') && !href.includes('support.google') && !href.includes('policies.google')) {
        try { new URL(href); return href; } catch {}
      }
    }
  }
  return null;
}

async function extractRealUrl(googleUrl) {
  const original = googleUrl.trim();
  console.log('[extract] Input:', original.slice(0,100));

  if (!original.includes('news.google.com') && !original.includes('google.com/url')) {
    return { realUrl: original, method: 'already_real' };
  }

  // Method 1: base64 decode CBMi
  const decoded = decodeCBMiUrl(original);
  if (decoded) {
    console.log('[extract] Decoded base64:', decoded);
    return { realUrl: decoded, method: 'base64_decode' };
  }

  // Method 2: /__i/rss/rd/articles/ endpoint - manual redirect
  try {
    const rdUrl = original.replace('/rss/articles/', '/__i/rss/rd/articles/').replace('/articles/', '/__i/rss/rd/articles/');
    const res = await fetch(rdUrl, {
      redirect: 'manual',
      headers: {
        'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36',
        'Cookie': 'CONSENT=YES+cb.20210328-17-p0.en+FX+379;'
      }
    });
    const loc = res.headers.get('location');
    if (loc && !loc.includes('google.com') && loc.startsWith('http')) {
      console.log('[extract] RD Location:', loc);
      return { realUrl: loc, method: 'rd_redirect' };
    }
    const text = await res.text().catch(()=> '');
    const found = findRealUrlInHtml(text, rdUrl);
    if (found) return { realUrl: found, method: 'rd_html' };
  } catch (e) { console.log('[extract] RD failed', e.message); }

  // Method 3: Fetch original with follow
  try {
    const res = await fetch(original, {
      redirect: 'follow',
      headers: {
        'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
        'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8',
        'Accept-Language': 'id-ID,id;q=0.9,en-US;q=0.8,en;q=0.7',
        'Cookie': 'CONSENT=YES+cb.20210328-17-p0.en+FX+379;'
      }
    });
    console.log('[extract] Follow final url:', res.url);
    if (res.url && !res.url.includes('news.google.com') && res.url !== original) {
      return { realUrl: res.url, method: 'follow_redirect' };
    }
    const html = await res.text();
    const found = findRealUrlInHtml(html, original);
    if (found) {
      console.log('[extract] Found in follow HTML:', found);
      return { realUrl: found, method: 'follow_html' };
    }
  } catch (e) { console.log('[extract] Follow failed', e.message); }

  // Method 4: Proxy via allorigins
  try {
    const proxyUrl = `https://api.allorigins.win/raw?url=${encodeURIComponent(original)}`;
    const res = await fetch(proxyUrl, { cache: 'no-store' });
    const html = await res.text();
    const found = findRealUrlInHtml(html, original);
    if (found) return { realUrl: found, method: 'proxy' };
  } catch (e) { console.log('[extract] Proxy failed', e.message); }

  // Method 5: Try url param
  try {
    const u = new URL(original);
    const q = u.searchParams.get('url') || u.searchParams.get('q');
    if (q && q.startsWith('http') && !q.includes('google.com')) {
      return { realUrl: q, method: 'url_param' };
    }
  } catch {}

  return { realUrl: original, method: 'failed', failed: true };
}

export async function POST(request) {
  try {
    const { url } = await request.json();
    if (!url) return NextResponse.json({ status: 'error', message: 'URL kosong' }, { status: 400 });

    const result = await extractRealUrl(url);
    
    if (result.failed || result.realUrl.includes('news.google.com/rss/articles')) {
      return NextResponse.json({
        status: 'error',
        message: 'Gagal extract link asli. Google News memblokir. Silakan buka tombol Baca, copy link asli dari portal (detik.com, kompas.com, tvri.go.id) dan paste manual.',
        original_url: url,
        real_url: result.realUrl,
        method: result.method,
        need_manual: true
      });
    }

    return NextResponse.json({
      status: 'success',
      original_url: url,
      real_url: result.realUrl,
      method: result.method,
      need_manual: false
    });

  } catch (e) {
    console.error('extract error', e);
    return NextResponse.json({ status: 'error', message: String(e) }, { status: 500 });
  }
}
