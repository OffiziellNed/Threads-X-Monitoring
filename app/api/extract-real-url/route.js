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
        if (!u.includes('google.com') && !u.includes('gstatic') && !u.includes('googleapis') && u.length > 15) {
          try { new URL(u); urls.push(u); } catch {}
        }
      }
      if (urls.length > 0) {
        urls.sort((a,b)=>b.length-a.length);
        let real = urls[0].replace(/[^\x20-\x7E]+.*$/, '').replace(/[^A-Za-z0-9\/:._?=&%#+-]+$/, '');
        if (!real.includes('google.com')) return real;
      }
    } catch {}
  } catch {}
  return null;
}

function isGoogleInternalUrl(url) {
  if (!url) return true;
  const low = url.toLowerCase();
  // Anggap google internal kalau masih news.google.com ATAU mengandung path google internal
  if (low.includes('news.google.com')) return true;
  if (low.includes('google.com/__i/')) return true;
  if (low.includes('google.com/_/')) return true;
  if (low.includes('google.com/dots')) return true;
  if (low.includes('google.com/rss')) return true;
  if (low.includes('google.com/url')) return true;
  if (low.includes('google.com/sorry')) return true;
  if (low.includes('accounts.google.com')) return true;
  if (low.includes('support.google.com')) return true;
  return false;
}

function findRealUrlInHtml(html) {
  const patterns = [
    /data-n-a=["'](https?:\/\/[^"']+)["']/i,
    /data-n-au=["'](https?:\/\/[^"']+)["']/i,
    /"url"\s*:\s*"(https?:\/\/(?!.*google\.com)[^"]+)"/i,
    /window\.location(?:\.href)?\s*=\s*["'](https?:\/\/[^"']+)["']/i,
    /<meta[^>]*http-equiv=["']refresh["'][^>]*url=(https?:\/\/[^"'>]+)/i,
  ];
  for (const regex of patterns) {
    const m = html.match(regex);
    if (m && m[1] && !isGoogleInternalUrl(m[1]) && m[1].length > 15) {
      try { new URL(m[1]); return m[1].replace(/&amp;/g, '&'); } catch {}
    }
  }
  // Cari semua href yang bukan google
  const allHrefs = [...html.matchAll(/href=["'](https?:\/\/[^"']+)["']/gi)];
  for (const match of allHrefs) {
    const href = match[1].replace(/&amp;/g, '&');
    if (isGoogleInternalUrl(href)) continue;
    if (href.length > 25 && (href.includes('.com') || href.includes('.co.id') || href.includes('.id/') || href.includes('.go.id'))) {
      if (!href.includes('doubleclick.net') && !href.includes('gstatic.com')) {
        try { new URL(href); return href; } catch {}
      }
    }
  }
  return null;
}

async function searchViaDuckDuckGo(title, source) {
  try {
    // Bersihkan judul dari " - TVRI News" dll
    let cleanTitle = title.replace(/ - .*$/, '').replace(/ \| .*$/, '').trim();
    const query = `${cleanTitle}`.trim();
    const searchUrl = `https://html.duckduckgo.com/html/?q=${encodeURIComponent(query)}`;
    console.log('[search] DuckDuckGo:', query);
    const res = await fetch(searchUrl, {
      headers: {
        'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36',
        'Accept': 'text/html',
        'Accept-Language': 'id-ID,id;q=0.9,en;q=0.8'
      },
      cache: 'no-store'
    });
    const html = await res.text();
    // Cari uddg param (real URL)
    const matches = [...html.matchAll(/uddg=([^&"]+)/gi)];
    for (const m of matches) {
      try {
        const decoded = decodeURIComponent(m[1]);
        if (!isGoogleInternalUrl(decoded) && decoded.startsWith('http') && decoded.length > 20) {
          // Filter yang relevan dengan judul
          if (decoded.includes('.go.id') || decoded.includes('.co.id') || decoded.includes('tvri') || decoded.includes('detik') || decoded.includes('kompas') || decoded.includes('tribun') || decoded.includes('cnn') || decoded.includes('liputan6') || decoded.includes('okezone') || decoded.includes('sindonews') || decoded.includes('tempo')) {
            console.log('[search] Found via DuckDuckGo uddg:', decoded);
            return decoded;
          }
        }
      } catch {}
    }
    // Fallback: cari semua https:// di html yang bukan duckduckgo
    const urlMatches = [...html.matchAll(/https?:\/\/(?:www\.)?(?:detik|kompas|tribunnews|cnnindonesia|liputan6|okezone|sindonews|tempo|tvri|antaranews|republika|kumparan)[^"'\s<>]+/gi)];
    if (urlMatches.length > 0) {
      const first = urlMatches[0][0].replace(/&amp;/g, '&').replace(/["']$/, '');
      console.log('[search] Found via domain regex:', first);
      return first;
    }
  } catch (e) {
    console.log('[search] DuckDuckGo failed', e.message);
  }
  return null;
}

async function searchViaBing(title) {
  try {
    let cleanTitle = title.replace(/ - .*$/, '').trim();
    const searchUrl = `https://www.bing.com/search?q=${encodeURIComponent(cleanTitle)}`;
    console.log('[search] Bing:', cleanTitle);
    const res = await fetch(searchUrl, {
      headers: {
        'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
        'Accept': 'text/html',
        'Accept-Language': 'id-ID,id;q=0.9,en;q=0.8'
      },
      cache: 'no-store'
    });
    const html = await res.text();
    // Bing results: <a href="https://...">
    const matches = [...html.matchAll(/<a[^>]+href="(https?:\/\/(?:www\.)?(?:detik|kompas|tribunnews|cnnindonesia|liputan6|okezone|sindonews|tempo|tvri|antaranews)[^"]+)"/gi)];
    if (matches.length > 0) {
      const url = matches[0][1].replace(/&amp;/g, '&');
      console.log('[search] Found via Bing:', url);
      if (!isGoogleInternalUrl(url)) return url;
    }
  } catch (e) {
    console.log('[search] Bing failed', e.message);
  }
  return null;
}

async function extractRealUrl(googleUrl, title, source) {
  const original = googleUrl.trim();
  console.log('[extract] Input:', original.slice(0,120));

  if (!original.includes('news.google.com') && !original.includes('google.com/url')) {
    return { realUrl: original, method: 'already_real' };
  }

  // 1. Base64 decode
  const decoded = decodeCBMiUrl(original);
  if (decoded && !isGoogleInternalUrl(decoded)) {
    console.log('[extract] Base64 decoded:', decoded);
    return { realUrl: decoded, method: 'base64_decode' };
  }

  // 2. RD endpoint - tapi filter google internal
  try {
    const rdUrl = original.replace('/rss/articles/', '/__i/rss/rd/articles/').replace('/articles/', '/__i/rss/rd/articles/');
    const res = await fetch(rdUrl, {
      redirect: 'manual',
      headers: { 'User-Agent': 'Mozilla/5.0', 'Cookie': 'CONSENT=YES+cb.20210328-17-p0.en+FX+379;' }
    });
    const loc = res.headers.get('location');
    if (loc && !isGoogleInternalUrl(loc) && loc.startsWith('http')) {
      console.log('[extract] RD Location:', loc);
      return { realUrl: loc, method: 'rd_redirect' };
    }
    const text = await res.text().catch(()=> '');
    const found = findRealUrlInHtml(text);
    if (found && !isGoogleInternalUrl(found)) return { realUrl: found, method: 'rd_html' };
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
    if (res.url && !isGoogleInternalUrl(res.url) && res.url !== original) {
      return { realUrl: res.url, method: 'follow_redirect' };
    }
    const html = await res.text();
    const found = findRealUrlInHtml(html);
    if (found && !isGoogleInternalUrl(found)) return { realUrl: found, method: 'follow_html' };
  } catch (e) { console.log('[extract] Follow failed', e.message); }

  // 4. Search via DuckDuckGo (paling ampuh untuk CBMisAFB...)
  if (title) {
    const searched = await searchViaDuckDuckGo(title, source);
    if (searched && !isGoogleInternalUrl(searched)) {
      console.log('[extract] Found via DuckDuckGo search:', searched);
      return { realUrl: searched, method: 'search_duckduckgo' };
    }
    const bing = await searchViaBing(title);
    if (bing && !isGoogleInternalUrl(bing)) {
      console.log('[extract] Found via Bing search:', bing);
      return { realUrl: bing, method: 'search_bing' };
    }
  }

  // 5. Proxy
  try {
    const proxyUrl = `https://api.allorigins.win/raw?url=${encodeURIComponent(original)}`;
    const res = await fetch(proxyUrl, { cache: 'no-store' });
    const html = await res.text();
    const found = findRealUrlInHtml(html);
    if (found && !isGoogleInternalUrl(found)) return { realUrl: found, method: 'proxy' };
  } catch (e) { console.log('[extract] Proxy failed', e.message); }

  return { realUrl: original, method: 'failed', failed: true };
}

export async function POST(request) {
  try {
    const { url, title, source } = await request.json();
    if (!url) return NextResponse.json({ status: 'error', message: 'URL kosong' }, { status: 400 });

    const result = await extractRealUrl(url, title, source);
    
    if (result.failed || isGoogleInternalUrl(result.realUrl)) {
      return NextResponse.json({
        status: 'error',
        message: `Gagal extract otomatis. Format Google News baru (CBMisAFB...) memblokir decoder.\\n\\nSOLUSI CEPAT (30 detik):\\n1. Klik tombol "Buka Baca" di editor\\n2. Di tab Google News yang terbuka, KLIK JUDUL BERITA (bukan copy link Google)\\n3. Akan terbuka portal asli (detik.com / tvri.go.id / kompas.com)\\n4. COPY URL dari address bar portal asli tersebut\\n5. PASTE di kolom "Link Asli" di editor, lalu klik Scrape`,
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
