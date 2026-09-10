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
        // Clean trailing junk like \x01 etc and extra chars
        let real = urls[0].replace(/[^\x20-\x7E]+.*$/, '').replace(/[^A-Za-z0-9\/:._?=&%#+-]+$/, '');
        return real;
      }
    } catch {}
  } catch {}
  return null;
}

function findRealUrlInHtml(html) {
  const patterns = [
    /data-n-a=["'](https?:\/\/[^"']+)["']/i,
    /data-n-au=["'](https?:\/\/[^"']+)["']/i,
    /"url"\s*:\s*"(https?:\/\/[^"]+)"/i,
    /window\.location(?:\.href)?\s*=\s*["'](https?:\/\/[^"']+)["']/i,
    /<meta[^>]*http-equiv=["']refresh["'][^>]*url=(https?:\/\/[^"'>]+)/i,
  ];
  for (const regex of patterns) {
    const m = html.match(regex);
    if (m && m[1] && !m[1].includes('google.com') && m[1].length > 15) {
      try { new URL(m[1]); return m[1].replace(/&amp;/g, '&'); } catch {}
    }
  }
  const allHrefs = [...html.matchAll(/href=["'](https?:\/\/(?!.*google\.com|.*gstatic\.com|.*doubleclick\.net)[^"']+)["']/gi)];
  for (const match of allHrefs) {
    const href = match[1].replace(/&amp;/g, '&');
    if (href.length > 25 && (href.includes('.com') || href.includes('.co.id') || href.includes('.id/') || href.includes('.go.id'))) {
      if (!href.includes('accounts.google') && !href.includes('support.google')) {
        try { new URL(href); return href; } catch {}
      }
    }
  }
  return null;
}

async function searchViaDuckDuckGo(title, source) {
  try {
    const query = `${title} ${source || ''}`.trim();
    const searchUrl = `https://html.duckduckgo.com/html/?q=${encodeURIComponent(query)}`;
    console.log('[search] DuckDuckGo:', searchUrl);
    const res = await fetch(searchUrl, {
      headers: {
        'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36',
        'Accept': 'text/html'
      },
      cache: 'no-store'
    });
    const html = await res.text();
    // DuckDuckGo result links are in <a class="result__url" href="/l/?...&uddg=https%3A%2F%2F...">
    const matches = [...html.matchAll(/uddg=([^&"]+)/gi)];
    for (const m of matches) {
      try {
        const decoded = decodeURIComponent(m[1]);
        if (decoded.startsWith('http') && !decoded.includes('duckduckgo.com') && !decoded.includes('google.com')) {
          console.log('[search] Found via uddg:', decoded);
          return decoded;
        }
      } catch {}
    }
    // Fallback: result__a href
    const aMatches = [...html.matchAll(/class="[^"]*result__a[^"]*"[^>]*href="([^"]+)"/gi)];
    for (const m of aMatches) {
      let href = m[1];
      if (href.startsWith('/l/?')) {
        try {
          const u = new URL(href, 'https://duckduckgo.com');
          const uddg = u.searchParams.get('uddg');
          if (uddg) {
            const decoded = decodeURIComponent(uddg);
            if (decoded.startsWith('http')) return decoded;
          }
        } catch {}
      } else if (href.startsWith('http') && !href.includes('duckduckgo.com')) {
        return href;
      }
    }
  } catch (e) {
    console.log('[search] DuckDuckGo failed', e.message);
  }
  return null;
}

async function extractRealUrl(googleUrl, title, source) {
  const original = googleUrl.trim();
  console.log('[extract] Input:', original.slice(0,120), 'title:', title?.slice(0,50));

  if (!original.includes('news.google.com') && !original.includes('google.com/url')) {
    return { realUrl: original, method: 'already_real' };
  }

  // 1. Base64 decode
  const decoded = decodeCBMiUrl(original);
  if (decoded) {
    console.log('[extract] Base64 decoded:', decoded);
    return { realUrl: decoded, method: 'base64_decode' };
  }

  // 2. RD endpoint manual redirect
  try {
    const rdUrl = original.replace('/rss/articles/', '/__i/rss/rd/articles/').replace('/articles/', '/__i/rss/rd/articles/');
    const res = await fetch(rdUrl, {
      redirect: 'manual',
      headers: { 'User-Agent': 'Mozilla/5.0', 'Cookie': 'CONSENT=YES+cb.20210328-17-p0.en+FX+379;' }
    });
    const loc = res.headers.get('location');
    if (loc && !loc.includes('google.com') && loc.startsWith('http')) {
      console.log('[extract] RD Location:', loc);
      return { realUrl: loc, method: 'rd_redirect' };
    }
    const text = await res.text().catch(()=> '');
    const found = findRealUrlInHtml(text);
    if (found) return { realUrl: found, method: 'rd_html' };
  } catch (e) { console.log('[extract] RD failed', e.message); }

  // 3. Follow redirect
  try {
    const res = await fetch(original, {
      redirect: 'follow',
      headers: {
        'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36',
        'Accept': 'text/html,application/xhtml+xml',
        'Accept-Language': 'id-ID,id;q=0.9,en-US;q=0.8,en;q=0.7',
        'Cookie': 'CONSENT=YES+cb.20210328-17-p0.en+FX+379;'
      }
    });
    console.log('[extract] Follow final:', res.url);
    if (res.url && !res.url.includes('news.google.com') && res.url !== original) {
      return { realUrl: res.url, method: 'follow_redirect' };
    }
    const html = await res.text();
    const found = findRealUrlInHtml(html);
    if (found) return { realUrl: found, method: 'follow_html' };
  } catch (e) { console.log('[extract] Follow failed', e.message); }

  // 4. Proxy
  try {
    const proxyUrl = `https://api.allorigins.win/raw?url=${encodeURIComponent(original)}`;
    const res = await fetch(proxyUrl, { cache: 'no-store' });
    const html = await res.text();
    const found = findRealUrlInHtml(html);
    if (found) return { realUrl: found, method: 'proxy' };
  } catch (e) { console.log('[extract] Proxy failed', e.message); }

  // 5. Search by title (fallback paling ampuh untuk CBMisAFB...)
  if (title) {
    const searched = await searchViaDuckDuckGo(title, source);
    if (searched) {
      console.log('[extract] Found via search:', searched);
      return { realUrl: searched, method: 'search_duckduckgo' };
    }
  }

  // 6. URL param
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
    const { url, title, source } = await request.json();
    if (!url) return NextResponse.json({ status: 'error', message: 'URL kosong' }, { status: 400 });

    const result = await extractRealUrl(url, title, source);
    
    if (result.failed || result.realUrl.includes('news.google.com/rss/articles')) {
      return NextResponse.json({
        status: 'error',
        message: `Gagal extract otomatis untuk format baru Google News (CBMisAFB...).\\n\\nCoba cara manual:\\n1. Klik tombol "Buka Link Baca" di bawah\\n2. Di halaman Google News yang terbuka, klik judul berita untuk buka portal asli (detik.com, tvri.go.id, dll)\\n3. Copy URL asli dari address bar browser\\n4. Paste di kolom "Link Asli" lalu klik Scrape`,
        original_url: url,
        real_url: result.realUrl,
        method: result.method,
        need_manual: true,
        title: title || ''
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
