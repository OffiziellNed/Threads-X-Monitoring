import { NextResponse } from 'next/server';
export const dynamic = 'force-dynamic';

// === DECODER CBMi... GOOGLE NEWS - FIX UTAMA ===
function decodeCBMiUrl(googleUrl) {
  try {
    const match = googleUrl.match(/\/articles\/(CBM[A-Za-z0-9_-]+)/);
    if (!match) return null;
    let id = match[1];
    // id like CBMingFBVV95cUxOU...
    // Remove CBM prefix (3-4 chars)
    let b64 = id;
    if (b64.startsWith('CBM')) {
      // CBMi or CBMj etc - remove first 4 chars
      b64 = b64.substring(4);
    }
    // base64url -> base64
    b64 = b64.replace(/-/g, '+').replace(/_/g, '/');
    while (b64.length % 4) b64 += '=';
    
    try {
      const buffer = Buffer.from(b64, 'base64');
      const text = buffer.toString('binary');
      // Cari https:// di binary
      // Google News protobuf: URL ada di dalam, biasanya setelah byte 0x12 atau 0x1A
      // Kita scan semua substring yang mirip URL
      const urlRegex = /https?:\/\/[^\x00-\x08\x0B\x0C\x0E-\x1F\s"'<>]+/g;
      let urls = [];
      let m;
      while ((m = urlRegex.exec(text)) !== null) {
        let u = m[0];
        // Bersihkan trailing junk
        u = u.split('\x00')[0].split('"')[0].split("'")[0].split(' ')[0];
        // Filter google internal
        if (!u.includes('google.com') && !u.includes('googleapis') && !u.includes('gstatic') && u.length > 15 && u.includes('.')) {
          urls.push(u);
        }
      }
      if (urls.length > 0) {
        // Ambil yang paling panjang / paling valid
        urls.sort((a,b) => b.length - a.length);
        // Hapus param google yang nempel
        let real = urls[0];
        // Kadang URL ada tambahan \x08 atau karakter aneh di akhir
        real = real.replace(/[\x00-\x1F\x7F]+.*$/, '').replace(/[^\x20-\x7E]+$/, '');
        // Validasi
        try { new URL(real); return real; } catch {}
      }
    } catch (e) {
      console.log('base64 binary scan failed', e.message);
    }
    
    // Fallback 2: decode as utf8
    try {
      const buffer = Buffer.from(b64, 'base64');
      const utf8 = buffer.toString('utf8');
      const m = utf8.match(/https?:\/\/[^\s"'<>]+/);
      if (m) {
        let u = m[0];
        if (!u.includes('google.com') && u.length > 15) return u;
      }
    } catch {}
    
  } catch (e) {
    console.error('decodeCBMiUrl error', e);
  }
  return null;
}

async function extractRealUrl(googleUrl) {
  const original = googleUrl.trim();
  console.log('[extractRealUrl] Input:', original.substring(0,120));

  // 1. Jika sudah link asli (bukan google), return langsung
  if (!original.includes('news.google.com') && !original.includes('google.com/url')) {
    return original;
  }

  // 2. Coba decode CBMi base64 (paling cepat, tidak perlu fetch)
  const decoded = decodeCBMiUrl(original);
  if (decoded) {
    console.log('[extractRealUrl] Decoded via base64:', decoded);
    return decoded;
  }

  // 3. Coba endpoint /__i/rss/rd/articles/ yang sering redirect 302 ke link asli
  try {
    const rdUrl = original.replace('/rss/articles/', '/__i/rss/rd/articles/').replace('/articles/', '/__i/rss/rd/articles/');
    console.log('[extractRealUrl] Trying rd endpoint:', rdUrl.substring(0,120));
    const res = await fetch(rdUrl, {
      redirect: 'manual',
      headers: {
        'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
      }
    });
    const location = res.headers.get('location');
    if (location && !location.includes('google.com') && location.startsWith('http')) {
      console.log('[extractRealUrl] Got via rd Location header:', location);
      return location;
    }
    // Kadang 302 tapi di body
    const text = await res.text().catch(()=> '');
    const meta = text.match(/<meta[^>]*http-equiv=["']refresh["'][^>]*url=([^"'>]+)/i);
    if (meta && !meta[1].includes('google.com')) return meta[1];
  } catch (e) {
    console.log('[extractRealUrl] rd endpoint failed', e.message);
  }

  // 4. Fetch Google News URL dengan follow redirect, lihat response.url final
  try {
    const res = await fetch(original, {
      redirect: 'follow',
      headers: {
        'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
        'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8',
        'Accept-Language': 'id-ID,id;q=0.9,en-US;q=0.8,en;q=0.7',
      }
    });
    console.log('[extractRealUrl] Follow redirect final url:', res.url);
    if (res.url && !res.url.includes('news.google.com') && !res.url.includes('google.com/url')) {
      return res.url;
    }
    const html = await res.text();
    // Cari anchor real
    const anchorMatches = [...html.matchAll(/<a[^>]+href=["'](https?:\/\/(?!.*google\.com)[^"']+)["']/gi)];
    for (const m of anchorMatches) {
      const href = m[1];
      if (href.length > 20 && !href.includes('google.com') && !href.includes('gstatic') && !href.includes('doubleclick')) {
        // Ambil yang pertama yang keliatan seperti berita
        if (href.includes('.com') || href.includes('.co.id') || href.includes('.id')) {
          console.log('[extractRealUrl] Found anchor:', href);
          return href;
        }
      }
    }
    // Meta refresh
    const metaRefresh = html.match(/URL=['"]?(https?:\/\/[^'"\s]+)['"]?/i);
    if (metaRefresh && !metaRefresh[1].includes('google.com')) return metaRefresh[1];
  } catch (e) {
    console.log('[extractRealUrl] follow redirect failed', e.message);
  }

  // 5. Coba via allorigins proxy untuk bypass consent page
  try {
    const proxyUrl = `https://api.allorigins.win/raw?url=${encodeURIComponent(original)}`;
    const res = await fetch(proxyUrl, { cache: 'no-store' });
    const html = await res.text();
    const anchorMatches = [...html.matchAll(/href=["'](https?:\/\/(?!.*google\.com)[^"']+)["']/gi)];
    for (const m of anchorMatches) {
      const href = m[1].replace(/&amp;/g, '&');
      if (href.length > 20 && (href.includes('.com') || href.includes('.co.id'))) {
        console.log('[extractRealUrl] Found via proxy:', href);
        return href;
      }
    }
  } catch (e) {
    console.log('[extractRealUrl] proxy failed', e.message);
  }

  // 6. Kalau semua gagal, coba parse url param ?url= atau ?q=
  try {
    const u = new URL(original);
    const q = u.searchParams.get('url') || u.searchParams.get('q');
    if (q && q.startsWith('http') && !q.includes('google.com')) return q;
  } catch {}

  console.log('[extractRealUrl] FAILED, returning original');
  return original;
}

async function fetchWithHeaders(url) {
  const headers = {
    'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
    'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,image/avif,image/webp,*/*;q=0.8',
    'Accept-Language': 'id-ID,id;q=0.9,en-US;q=0.8,en;q=0.7',
    'Referer': 'https://www.google.com/',
  };
  const res = await fetch(url, { headers, cache: 'no-store' });
  if (!res.ok) throw new Error(`HTTP ${res.status} for ${url}`);
  const html = await res.text();
  return { html, finalUrl: res.url || url };
}

function extractTitle(html) {
  let m = html.match(/<meta[^>]*property=["']og:title["'][^>]*content=["']([^"']+)["']/i);
  if (m) return m[1].replace(/&quot;/g, '"').replace(/&amp;/g, '&');
  m = html.match(/<title[^>]*>([^<]+)<\/title>/i);
  if (m) return m[1].split(' - ')[0].split(' | ')[0].trim();
  m = html.match(/<h1[^>]*>([^<]+)<\/h1>/i);
  if (m) return m[1].replace(/<[^>]+>/g, '').trim();
  return "Tanpa Judul";
}
function extractImage(html) {
  let m = html.match(/<meta[^>]*property=["']og:image["'][^>]*content=["']([^"']+)["']/i);
  if (m) return m[1];
  m = html.match(/<img[^>]+src=["'](https?:\/\/[^"']+\.(?:jpg|jpeg|png|webp)[^"']*)["']/i);
  if (m) return m[1];
  return "";
}
function extractContent(html) {
  let clean = html.replace(/<script[\s\S]*?<\/script>/gi, ' ').replace(/<style[\s\S]*?<\/style>/gi, ' ').replace(/<!--[\s\S]*?-->/g, ' ');
  const selectors = [
    /<div[^>]*class=["'][^"']*detail__body[^"']*["'][^>]*>([\s\S]*?)<\/div>\s*<div/i,
    /<div[^>]*class=["'][^"']*read__content[^"']*["'][^>]*>([\s\S]*?)<\/div>/i,
    /<div[^>]*class=["'][^"']*article__content[^"']*["'][^>]*>([\s\S]*?)<\/div>/i,
    /<div[^>]*class=["'][^"']*txt-article[^"']*["'][^>]*>([\s\S]*?)<\/div>/i,
    /<div[^>]*class=["'][^"']*detail-text[^"']*["'][^>]*>([\s\S]*?)<\/div>/i,
    /<article[^>]*>([\s\S]*?)<\/article>/i,
  ];
  let articleHtml = "";
  for (const regex of selectors) {
    const match = clean.match(regex);
    if (match && match[1] && match[1].length > 300) { articleHtml = match[1]; break; }
  }
  if (!articleHtml || articleHtml.length < 300) {
    const pMatches = [...clean.matchAll(/<p[^>]*>([\s\S]*?)<\/p>/gi)];
    const longPs = pMatches.filter(m => {
      const txt = m[1].replace(/<[^>]+>/g, '').trim();
      return txt.length > 50 && !txt.toLowerCase().includes('baca juga');
    }).map(m => `<p>${m[1]}</p>`).join('\n');
    if (longPs.length > 300) articleHtml = longPs;
  }
  if (!articleHtml) articleHtml = clean;
  let text = articleHtml.replace(/<br\s*\/?>/gi, '\n').replace(/<\/p>/gi, '\n\n').replace(/<[^>]+>/g, ' ').replace(/&nbsp;/g, ' ').replace(/&quot;/g, '"').replace(/&#39;/g, "'").replace(/&amp;/g, '&').replace(/\s+\n/g, '\n').replace(/\n\s+/g, '\n').replace(/[ \t]+/g, ' ').replace(/\n{3,}/g, '\n\n').trim();
  text = text.split('\n').filter(line => {
    const low = line.toLowerCase().trim();
    if (!low) return false;
    if (low.includes('baca juga:') && low.length < 80) return false;
    if (low.includes('advertisement')) return false;
    return low.length > 15;
  }).join('\n\n').trim();
  return text;
}
function findNextPageUrl(html, currentUrl) {
  const patterns = [
    /<a[^>]+href=["']([^"']+)["'][^>]*>\s*Halaman Selanjutnya\s*<\/a>/i,
    /<a[^>]+href=["']([^"']+)["'][^>]*>\s*Selanjutnya\s*<\/a>/i,
    /<a[^>]*class=["'][^"']*next[^"']*["'][^>]*href=["']([^"']+)["']/i,
  ];
  for (const regex of patterns) {
    const m = html.match(regex);
    if (m && m[1]) {
      try {
        const nextUrl = new URL(m[1], currentUrl).toString();
        if (nextUrl !== currentUrl) return nextUrl;
      } catch {}
    }
  }
  return null;
}

export async function POST(request) {
  try {
    const { url } = await request.json();
    if (!url) return NextResponse.json({ status: 'error', message: 'URL tidak ada' }, { status: 400 });

    // Step 1: Extract real URL
    let realUrl = await extractRealUrl(url);
    
    // Jika masih google, kasih error yang jelas
    if (realUrl.includes('news.google.com/rss/articles')) {
      return NextResponse.json({
        status: 'error',
        message: 'Gagal extract link asli dari Google News. Google memblokir decoder. Silakan buka tombol Baca di tabel (buka Google News), lalu copy link asli dari portal berita (detik.com, kompas.com, dll) dan paste di editor.',
        real_url: realUrl,
        original_url: url,
        need_manual: true,
        title: 'Gagal Extract Otomatis'
      });
    }

    console.log('Final real URL:', realUrl);

    // Step 2: Fetch article + multi-page
    let allContents = [];
    let finalHtml = "";
    let finalTitle = "";
    let finalImage = "";
    let visited = new Set();
    
    try {
      const first = await fetchWithHeaders(realUrl);
      finalHtml = first.html;
      finalTitle = extractTitle(finalHtml);
      finalImage = extractImage(finalHtml);
      let firstContent = extractContent(finalHtml);
      allContents.push(firstContent);
      visited.add(first.finalUrl || realUrl);
      
      let currentHtml = finalHtml;
      let currentUrl = first.finalUrl || realUrl;
      let nextUrl = findNextPageUrl(currentHtml, currentUrl);
      let pageCount = 1;
      
      while (nextUrl && pageCount < 3 && !visited.has(nextUrl)) {
        try {
          const next = await fetchWithHeaders(nextUrl);
          const nextContent = extractContent(next.html);
          if (nextContent.length > 200) {
            allContents.push(`\n\n--- Halaman ${pageCount+1} ---\n\n${nextContent}`);
            visited.add(next.finalUrl || nextUrl);
            currentHtml = next.html;
            currentUrl = next.finalUrl || nextUrl;
            nextUrl = findNextPageUrl(currentHtml, currentUrl);
            pageCount++;
          } else break;
        } catch { break; }
      }
    } catch (e) {
      console.error('Fetch article failed', e);
      return NextResponse.json({
        status: 'error',
        message: `Gagal fetch artikel asli (${e.message}). Mungkin portal diblokir Cloudflare. Coba buka link asli manual.`,
        real_url: realUrl,
        original_url: url,
        need_manual: false
      });
    }

    const fullContent = allContents.join('\n\n');
    if (!fullContent || fullContent.length < 100) {
      return NextResponse.json({
        status: 'error',
        message: 'Konten terlalu pendek, mungkin anti-scraping.',
        real_url: realUrl,
        original_url: url,
        title: finalTitle,
        text: fullContent
      });
    }

    return NextResponse.json({
      status: 'success',
      title: finalTitle,
      description: fullContent,
      text: fullContent,
      gambar_url: finalImage,
      real_url: realUrl,
      original_url: url,
      sumber: `Sumber Berita: ${new URL(realUrl).hostname}`,
      pages_scraped: allContents.length,
      content_length: fullContent.length
    });

  } catch (error) {
    console.error('tarik-berita error', error);
    return NextResponse.json({ status: 'error', message: String(error) }, { status: 500 });
  }
}
