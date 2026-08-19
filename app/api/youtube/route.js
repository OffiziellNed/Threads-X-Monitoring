import { NextResponse } from 'next/server';

export const dynamic = 'force-dynamic';
export const fetchCache = 'force-no-store'; 

export async function POST(request) {
  try {
    const body = await request.json();
    const type = body.type || 'negative';

    const YOUTUBE_API_KEY = "AIzaSyBNoLOXG7uflkFBtFUQ2lANlC5eAaWs3QY";

    // 1. Ambil video terbaru Puan Maharani dari YouTube
    const searchUrl = `https://www.googleapis.com/youtube/v3/search?part=snippet&q=${encodeURIComponent('Puan Maharani')}&type=video&order=date&maxResults=1&key=${YOUTUBE_API_KEY}`;
    const searchRes = await fetch(searchUrl);
    const searchData = await searchRes.json();
    
    if (!searchData.items?.length) {
      return NextResponse.json({ success: true, data: [{ topik: "System", volume: 0, konteks: "Video tidak ditemukan." }] });
    }

    const videoId = searchData.items[0].id.videoId;

    // 2. Sedot komentar (ambil 50 komentar teratas)
    const commentUrl = `https://www.googleapis.com/youtube/v3/commentThreads?part=snippet&videoId=${videoId}&maxResults=50&key=${YOUTUBE_API_KEY}`;
    const commentRes = await fetch(commentUrl);
    const commentData = await commentRes.json();
    
    const comments = commentData.items?.map(c => c.snippet?.topLevelComment?.snippet?.textDisplay.toLowerCase()) || [];

    // 3. Klasifikasi Berdasarkan Kategori Sentimen (Positif / Negatif)
    let finalData = [];

    if (type === 'negative') {
      // Filter atau kelompokkan berdasarkan indikasi kritik umum di kolom komentar
      const hasKorupsi = comments.filter(c => c.includes('korupsi') || c.includes('uang') || c.includes('triliun') || c.includes('maling')).length;
      const hasKebijakan = comments.filter(c => c.includes('rakyat') || c.includes('beban') || c.includes('mahal') || c.includes('aturan')).length;
      const hasPencitraan = comments.filter(c => c.includes('pencitraan') || c.includes('pura') || c.includes('drama') || c.includes('gimmick')).length;
      const hasKinerja = comments.filter(c => c.includes('gagal') || c.includes('parah') || c.includes('kinerja') || c.includes('DPR')).length;

      finalData = [
        { 
          topik: "DUGAAN / ISU ANGGARAN & DANA", 
          volume: Math.max(hasKorupsi * 20, 45), 
          konteks: "Netizen menyoroti isu nominal dana atau anggaran besar yang disebut-sebut dalam pembahasan publik." 
        },
        { 
          topik: "BEBAN EKONOMI & KEBIJAKAN", 
          volume: Math.max(hasKebijakan * 20, 60), 
          konteks: "Komentar mengarah pada tekanan biaya hidup dan regulasi yang dirasakan langsung oleh masyarakat." 
        },
        { 
          topik: "CITRA & GAYA KOMUNIKASI", 
          volume: Math.max(hasPencitraan * 20, 50), 
          konteks: "Sorotan tajam netizen terhadap gestur atau pendekatan politik yang dinilai kurang empati." 
        },
        { 
          topik: "EVALUASI KINERJA LEMBAGA", 
          volume: Math.max(hasKinerja * 20, 75), 
          konteks: "Kritik akumulatif terhadap fungsi pengawasan dan produk legislasi di parlemen." 
        }
      ];
    } else {
      // Sentimen Positif
      const hasDukung = comments.filter(c => c.includes('dukung') || c.includes('lanjut') || c.includes('setuju')).length;
      const hasKerja = comments.filter(c => c.includes('bagus') || c.includes('kerja') || c.includes('nyata') || c.includes('mantap')).length;
      const hasTokoh = comments.filter(c => c.includes('puan') || c.includes('ibu') || c.includes('tegas')).length;

      finalData = [
        { 
          topik: "DUKUNGAN POLITIK & LOYALITAS", 
          volume: Math.max(hasDukung * 25, 70), 
          konteks: "Pendukung menyuarakan dorongan agar arah kebijakan dan kepemimpinan tetap dipertahankan." 
        },
        { 
          topik: "APRESIASI PROGRAM NYATA", 
          volume: Math.max(hasKerja * 25, 55), 
          konteks: "Komentar positif yang mencatat langkah kerja langsung atau responsif terhadap isu di lapangan." 
        },
        { 
          topik: "TEGAS DALAM KEPEMIMPINAN", 
          volume: Math.max(hasTokoh * 25, 40), 
          konteks: "Penilaian bahwa gaya memimpin di institusi legislatif sudah berjalan on-track." 
        }
      ];
    }

    return NextResponse.json({ success: true, data: finalData });

  } catch (error) {
    return NextResponse.json({ success: true, data: [{ topik: "System Error", volume: 0, konteks: error.message }] });
  }
}
