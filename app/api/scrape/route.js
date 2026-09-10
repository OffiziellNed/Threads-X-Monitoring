import { NextResponse } from 'next/server';
export const dynamic = 'force-dynamic';

// Helper: extract real URL from Google News redirect
async function extractRealUrl(googleUrl) {
  try {
    let url = googleUrl.trim();
    
    // Case 1: https://news.google.com/rss/articles/CBMi... - need to follow redirect
    if (url.includes('news.google.com/rss/articles') || url.includes('news.google.com/rss/link')) {
      try {
        // Fetch without following redirect to get Location header, or follow and get final url
        const res = await fetch(url, {
          headers: {
            'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
            'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8',
            'Accept-Language': 'id-ID,id;q=0.9,en-US;q=0.8,en;q=0.7'
          },
          redirect: 'follow',
        });
        // response.url is final URL after redirects
        if (res.url && !res.url.includes('news.google.com')) {
          return res.url;
        }
        // Try to parse HTML for meta refresh or JS redirect
        const html = await res.text();
        // Look for <meta http-equiv="refresh" content="0;url=...">
        const metaRefresh = html.match(/<meta[^>]*http-equiv=["']refresh["'][^>]*content=["'][^"']*url=([^"']+)["']/i);
        if (metaRefresh) {
          return metaRefresh[1].replace(/&amp;/g, '&');
        }
        // Look for <a href="https://..."> in Google's redirect page
        const anchorMatch = html.match(/<a[^>]+href=["'](https?:\/\/[^"']+)["'][^>]*>/i);
        if (anchorMatch && !anchorMatch[1].includes('google.com') && !anchorMatch[1].includes('googleapis')) {
          return anchorMatch[1].replace(/&amp;/g, '&');
        }
        // Try to find url in JS: window.location = "..."
        const jsRedirect = html.match(/window\.location(?:\.href)?\s*=\s*["'](https?:\/\/[^"']+)["']/i);
        if (jsRedirect) return jsRedirect[1];
      } catch (e) {
        console.error('Extract from rss/articles failed:', e);
      }
    }
    
    // Case 2: https://www.google.com/url?q=...&url=... or https://news.google.com/__i/rss/rd/articles/...
    if (url.includes('google.com/url')) {
      try {
        const urlObj = new URL(url);
        const q = urlObj.searchParams.get('url') || urlObj.searchParams.get('q');
        if (q) return q;
      } catch {}
    }
    
    // Case 3: URL with encoded real URL as param
    try {
      const urlObj = new URL(url);
      // Check for 'url' param
      const possibleParams = ['url', 'q', 'u', 'link'];
      for (const p of possibleParams) {
        const val = urlObj.searchParams.get(p);
        if (val && val.startsWith('http') && !val.includes('google.com')) {
          return val;
        }
      }
    } catch {}
    
    // If already real URL (not google), return as is
    if (!url.includes('google.com') && !url.includes('googleapis.com')) {
      return url;
    }
    
    return url; // fallback
  } catch (e) {
    return googleUrl;
  }
}

async function fetchWithHeaders(url, useProxy = false) {
  const headers = {
    'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
    'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,image/avif,image/webp,*/*;q=0.8',
    'Accept-Language': 'id-ID,id;q=0.9,en-US;q=0.8,en;q=0.7',
    'Referer': 'https://www.google.com/',
    'Cache-Control': 'no-cache'
  };
  
  let fetchUrl = url;
  if (useProxy) {
    // Try allorigins or wsrv as fallback for Cloudflare
    if (url.includes('tribunnews') || url.includes('detik') || url.includes('kompas')) {
      // Don't use proxy for big sites, try direct first
    } else {
      fetchUrl = `https://api.allorigins.win/raw?url=${encodeURIComponent(url)}`;
    }
  }
  
  const res = await fetch(fetchUrl, { headers, cache: 'no-store' });
  if (!res.ok) throw new Error(`HTTP ${res.status}`);
  const text = await res.text();
  return { html: text, finalUrl: res.url || url };
}

function extractTitle(html) {
  // Try og:title first
  let m = html.match(/<meta[^>]*property=["']og:title["'][^>]*content=["']([^"']+)["']/i);
  if (m) return m[1].replace(/&quot;/g, '"').replace(/&amp;/g, '&').replace(/&#39;/g, "'");
  m = html.match(/<meta[^>]*name=["']twitter:title["'][^>]*content=["']([^"']+)["']/i);
  if (m) return m[1];
  m = html.match(/<title[^>]*>([^<]+)<\/title>/i);
  if (m) return m[1].split(' - ')[0].split(' | ')[0].trim();
  m = html.match(/<h1[^>]*>([^<]+)<\/h1>/i);
  if (m) return m[1].replace(/<[^>]+>/g, '').trim();
  return "Tanpa Judul";
}

function extractImage(html, baseUrl) {
  let m = html.match(/<meta[^>]*property=["']og:image["'][^>]*content=["']([^"']+)["']/i);
  if (m) return m[1];
  m = html.match(/<meta[^>]*name=["']twitter:image["'][^>]*content=["']([^"']+)["']/i);
  if (m) return m[1];
  // First large image in article
  m = html.match(/<img[^>]+src=["'](https?:\/\/[^"']+\.(?:jpg|jpeg|png|webp)[^"']*)["']/i);
  if (m) return m[1];
  return "";
}

function extractContent(html) {
  // Remove scripts, styles, comments
  let clean = html.replace(/<script[\s\S]*?<\/script>/gi, ' ')
                  .replace(/<style[\s\S]*?<\/style>/gi, ' ')
                  .replace(/<!--[\s\S]*?-->/g, ' ')
                  .replace(/<noscript[\s\S]*?<\/noscript>/gi, ' ');
  
  // Common Indonesian news content selectors - try in order
  const selectors = [
    /<div[^>]*class=["'][^"']*detail__body[^"']*["'][^>]*>([\s\S]*?)<\/div>\s*<div[^>]*class=["'][^"']*detail__/i,
    /<div[^>]*class=["'][^"']*read__content[^"']*["'][^>]*>([\s\S]*?)<\/div>/i,
    /<div[^>]*class=["'][^"']*article__content[^"']*["'][^>]*>([\s\S]*?)<\/div>/i,
    /<div[^>]*class=["'][^"']*content-detail[^"']*["'][^>]*>([\s\S]*?)<\/div>/i,
    /<div[^>]*class=["'][^"']*txt-article[^"']*["'][^>]*>([\s\S]*?)<\/div>/i,
    /<div[^>]*class=["'][^"']*article-content-body[^"']*["'][^>]*>([\s\S]*?)<\/div>/i,
    /<div[^>]*class=["'][^"']*the_content[^"']*["'][^>]*>([\s\S]*?)<\/div>/i,
    /<div[^>]*id=["']content["'][^>]*>([\s\S]*?)<\/div>/i,
    /<article[^>]*>([\s\S]*?)<\/article>/i,
  ];
  
  let articleHtml = "";
  for (const regex of selectors) {
    const match = clean.match(regex);
    if (match && match[1] && match[1].length > 300) {
      articleHtml = match[1];
      break;
    }
  }
  
  // Fallback: take all <p> tags that look like article
  if (!articleHtml || articleHtml.length < 300) {
    const pMatches = [...clean.matchAll(/<p[^>]*>([\s\S]*?)<\/p>/gi)];
    const longPs = pMatches.filter(m => {
      const txt = m[1].replace(/<[^>]+>/g, '').trim();
      return txt.length > 50 && !txt.toLowerCase().includes('baca juga') && !txt.toLowerCase().includes('advertisement');
    }).map(m => `<p>${m[1]}</p>`).join('\n');
    if (longPs.length > 300) articleHtml = longPs;
  }
  
  if (!articleHtml) articleHtml = clean;
  
  // Clean HTML to text but keep paragraph breaks
  let text = articleHtml
    .replace(/<br\s*\/?>/gi, '\n')
    .replace(/<\/p>/gi, '\n\n')
    .replace(/<\/div>/gi, '\n')
    .replace(/<[^>]+>/g, ' ')
    .replace(/&nbsp;/g, ' ')
    .replace(/&quot;/g, '"')
    .replace(/&#39;/g, "'")
    .replace(/&amp;/g, '&')
    .replace(/&lt;/g, '<')
    .replace(/&gt;/g, '>')
    .replace(/\s+\n/g, '\n')
    .replace(/\n\s+/g, '\n')
    .replace(/[ \t]+/g, ' ')
    .replace(/\n{3,}/g, '\n\n')
    .trim();
  
  // Remove common junk
  text = text
    .split('\n')
    .filter(line => {
      const low = line.toLowerCase().trim();
      if (!low) return false;
      if (low.includes('baca juga:')) return false;
      if (low.includes('advertisement')) return false;
      if (low.includes('©') && low.length < 50) return false;
      if (low.startsWith('sumber:') && low.length < 30) return true; // keep sumber
      return low.length > 20 || low.includes('sumber berita');
    })
    .join('\n\n')
    .replace(/\n{3,}/g, '\n\n')
    .trim();
  
  return text;
}

function findNextPageUrl(html, currentUrl) {
  // Look for "Halaman Selanjutnya" / "Selanjutnya" / "Next Page" / page 2
  const patterns = [
    /<a[^>]+href=["']([^"']+)["'][^>]*>\s*Halaman Selanjutnya\s*<\/a>/i,
    /<a[^>]+href=["']([^"']+)["'][^>]*>\s*Selanjutnya\s*<\/a>/i,
    /<a[^>]+href=["']([^"']+)["'][^>]*>\s*Next\s*<\/a>/i,
    /<a[^>]*class=["'][^"']*next[^"']*["'][^>]*href=["']([^"']+)["']/i,
    /<a[^>]+href=["']([^"']*(?:\/2|\?page=2|&page=2)[^"']*)["'][^>]*>\s*2\s*<\/a>/i,
  ];
  
  for (const regex of patterns) {
    const m = html.match(regex);
    if (m && m[1]) {
      try {
        const nextUrl = new URL(m[1], currentUrl).toString();
        // Avoid looping to same URL
        if (nextUrl !== currentUrl && !nextUrl.includes('#')) {
          return nextUrl;
        }
      } catch {}
    }
  }
  
  // Try to guess ?page=all or ?single=1 or /all
  const urlObj = new URL(currentUrl);
  const path = urlObj.pathname;
  
  // For detik, tribun, kompas, etc., ?page=all often works
  if (!currentUrl.includes('page=all') && !currentUrl.includes('single=1')) {
    // Don't auto-guess, only if we found explicit next link
    // But we can try common all-page patterns as fallback
    if (currentUrl.includes('detik.com')) {
      return currentUrl + (currentUrl.includes('?') ? '&' : '?') + 'single=1';
    }
  }
  
  return null;
}

async function tryAllPageVersion(url) {
  // Many Indonesian portals support ?page=all to show all pages at once
  const allPageCandidates = [
    url + (url.includes('?') ? '&' : '?') + 'page=all',
    url + (url.includes('?') ? '&' : '?') + 'page=all#page2',
    url.replace(/\/\d+\/?$/, '/all'),
    url + '/all',
  ];
  
  for (const candidate of allPageCandidates) {
    try {
      const { html } = await fetchWithHeaders(candidate);
      const content = extractContent(html);
      if (content.length > 500) {
        // If all-page version has significantly more content, use it
        return { html, content, url: candidate, isAllPage: true };
      }
    } catch {}
  }
  return null;
}

export async function POST(request) {
  try {
    const { url } = await request.json();
    if (!url) {
      return NextResponse.json({ status: 'error', message: 'URL tidak ada' }, { status: 400 });
    }

    console.log('Original URL:', url);
    
    // Step 1: Extract real URL from Google News
    let realUrl = await extractRealUrl(url);
    console.log('Real URL after extraction:', realUrl);
    
    // If still google, try one more time with proxy
    if (realUrl.includes('google.com') && url !== realUrl) {
      try {
        const proxyRes = await fetch(`https://api.allorigins.win/raw?url=${encodeURIComponent(url)}`, { cache: 'no-store' });
        const proxyHtml = await proxyRes.text();
        const m = proxyHtml.match(/<a[^>]+href=["'](https?:\/\/[^"']+)["']/i);
        if (m && !m[1].includes('google.com')) realUrl = m[1];
      } catch {}
    }

    // Step 2: Try to get all-page version first
    let finalHtml = "";
    let finalContent = "";
    let finalImage = "";
    let finalTitle = "";
    let allPagesContent = [];
    let visitedUrls = new Set();
    
    try {
      // First try all-page version
      const allPageResult = await tryAllPageVersion(realUrl);
      if (allPageResult && allPageResult.content.length > 800) {
        finalHtml = allPageResult.html;
        finalContent = allPageResult.content;
        finalTitle = extractTitle(finalHtml);
        finalImage = extractImage(finalHtml, realUrl);
        console.log('Using all-page version');
      } else {
        // Fetch first page
        const first = await fetchWithHeaders(realUrl);
        finalHtml = first.html;
        finalTitle = extractTitle(finalHtml);
        finalImage = extractImage(finalHtml, realUrl);
        let firstContent = extractContent(finalHtml);
        allPagesContent.push(firstContent);
        visitedUrls.add(first.finalUrl || realUrl);
        
        // Try to fetch next pages (max 3 pages)
        let currentHtml = finalHtml;
        let currentUrl = first.finalUrl || realUrl;
        let nextUrl = findNextPageUrl(currentHtml, currentUrl);
        let pageCount = 1;
        
        while (nextUrl && pageCount < 3 && !visitedUrls.has(nextUrl)) {
          try {
            console.log(`Fetching page ${pageCount+1}:`, nextUrl);
            const next = await fetchWithHeaders(nextUrl);
            const nextContent = extractContent(next.html);
            if (nextContent.length > 200) {
              allPagesContent.push(`\n\n--- Halaman ${pageCount+1} ---\n\n${nextContent}`);
              visitedUrls.add(next.finalUrl || nextUrl);
              currentHtml = next.html;
              currentUrl = next.finalUrl || nextUrl;
              nextUrl = findNextPageUrl(currentHtml, currentUrl);
              pageCount++;
            } else {
              break;
            }
          } catch (e) {
            console.error('Failed to fetch next page:', e);
            break;
          }
        }
        
        finalContent = allPagesContent.join('\n\n');
      }
    } catch (e) {
      console.error('Fetch article failed:', e);
      // Fallback to proxy
      try {
        const proxy = await fetchWithHeaders(realUrl, true);
        finalHtml = proxy.html;
        finalTitle = extractTitle(finalHtml);
        finalImage = extractImage(finalHtml, realUrl);
        finalContent = extractContent(finalHtml);
      } catch (e2) {
        return NextResponse.json({ 
          status: 'error', 
          message: `Gagal fetch artikel: ${e.message}`,
          real_url: realUrl,
          original_url: url
        });
      }
    }

    if (!finalContent || finalContent.length < 100) {
      return NextResponse.json({
        status: 'error',
        message: 'Konten terlalu pendek atau gagal ekstrak, mungkin Cloudflare / anti-scraping',
        real_url: realUrl,
        original_url: url,
        title: finalTitle,
        text: finalContent
      });
    }

    // Clean title
    finalTitle = finalTitle.replace(/&quot;/g, '"').replace(/&amp;/g, '&').replace(/&#39;/g, "'").trim();

    return NextResponse.json({
      status: 'success',
      title: finalTitle,
      description: finalContent,
      text: finalContent,
      gambar_url: finalImage,
      real_url: realUrl,
      original_url: url,
      sumber: `Sumber Berita: ${new URL(realUrl).hostname}`,
      pages_scraped: allPagesContent.length || 1,
      content_length: finalContent.length
    });

  } catch (error) {
    console.error('tarik-berita error:', error);
    return NextResponse.json({ status: 'error', message: String(error) }, { status: 500 });
  }
}
