import * as cheerio from 'cheerio';
import { NextResponse } from 'next/server';

export async function POST(request) {
  try {
    const { url } = await request.json();
    
    // Menyamar sebagai browser Chrome agar tidak diblokir web berita
    const response = await fetch(url, {
      headers: {
        'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/114.0.0.0 Safari/537.36'
      }
    });

    if (!response.ok) throw new Error("Gagal menyedot web. Website mungkin dilindungi anti-bot.");
    
    const html = await response.text();
    const $ = cheerio.load(html);

    // 1. Ambil Judul Berita (SEO Tag)
    let title = $('meta[property="og:title"]').attr('content') || $('title').text() || $('h1').first().text();

    // 2. Ambil Gambar Utama Berita (Open Graph Image)
    let image = $('meta[property="og:image"]').attr('content') || $('meta[name="twitter:image"]').attr('content') || '';

    // 3. Ambil Isi Teks Berita
    let content = '';
    // Mencari elemen artikel utama agar tidak nyedot menu/footer
    const articleBody = $('article, .read__content, .detail__body-text, .post-content, main');
    if (articleBody.length > 0) {
      articleBody.find('p').each((i, el) => { content += $(el).text() + '\n\n'; });
    } else {
      $('p').each((i, el) => { content += $(el).text() + '\n\n'; });
    }

    // Merapikan spasi yang berlebihan
    content = content.replace(/\n\s*\n/g, '\n\n').trim();

    // Template untuk dimasukkan ke Textarea Page 2
    const promptTeks = `[JUDUL BERITA]\n${title}\n\n[ISI BERITA]\n${content.substring(0, 2500)}...`;
    
    return NextResponse.json({
      status: "success",
      prompt: promptTeks,
      gambar_url: image,
      sumber: `Sumber Berita: ${new URL(url).hostname}`
    });

  } catch (error) {
    return NextResponse.json({ status: "error", detail: error.message });
  }
}