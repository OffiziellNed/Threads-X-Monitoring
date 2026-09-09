import { NextResponse } from 'next/server';

export const dynamic = 'force-dynamic';

export async function GET(request) {
  try {
    const { searchParams } = new URL(request.url);
    const url = searchParams.get('url');
    
    if (!url || url === '#') {
      return NextResponse.json({ success: false, text: "URL tidak ditemukan atau tidak valid." });
    }

    // Melakukan fetch ke website sumber dengan User-Agent agar tidak diblokir bot detector
    const res = await fetch(url, { 
      headers: { 
        'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/91.0.4472.124 Safari/537.36'
      }
    });

    if (!res.ok) throw new Error("Gagal mengakses server sumber");

    const html = await res.text();
    
    // Mengekstrak semua teks yang berada di dalam tag paragraf <p> (Isi utama berita)
    const pTags = html.match(/<p[^>]*>([\s\S]*?)<\/p>/gi);
    let articleText = "";
    
    if (pTags && pTags.length > 0) {
      articleText = pTags
        .map(p => p.replace(/<[^>]+>/g, '').replace(/&nbsp;/g, ' ').trim())
        .filter(p => p.length > 30) // Membuang tag <p> yang isinya terlalu pendek (biasanya navigasi/iklan)
        .join('\n\n');
    }

    if (!articleText) {
      articleText = "Sistem keamanan website sumber (Paywall/Anti-Bot) mencegah penyedotan otomatis. Silakan baca artikel secara manual melalui tombol 'Baca'.";
    }

    // Mengembalikan teks penuh (maksimal 15.000 karakter agar tidak membebani prompt)
    return NextResponse.json({ success: true, text: articleText.substring(0, 15000) });
  } catch (error) {
    return NextResponse.json({ success: false, text: "Gagal menyedot isi berita penuh karena website sumber diproteksi atau server timeout." });
  }
}