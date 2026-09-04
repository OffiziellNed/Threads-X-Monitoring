import { NextResponse } from 'next/server';

export const dynamic = 'force-dynamic';

export async function GET(request) {
  try {
    // 1. SIMULASI/STRUKTUR DATA TOTAL MENTIONS (12 Jam Terakhir)
    const totalMentions = Math.floor(Math.random() * 500) + 1200; // Contoh: 1200 - 1700 mentions

    // 2. DATA TREND GARIS WAKTU (Lonjakan per hari/jam)
    const trendData = [
      { waktu: "Senin", mentions: 120, trigger: "Isu RUU Penyiaran" },
      { waktu: "Selasa", mentions: 250, trigger: "Rapat Paripurna" },
      { waktu: "Rabu", mentions: 180, trigger: "Normal" },
      { waktu: "Kamis", mentions: 850, trigger: "Statemen Viral Ketua DPR" },
      { waktu: "Jumat", mentions: 400, trigger: "Tanggapan Netizen" },
      { waktu: "Sabtu", mentions: 300, trigger: "Normal" },
      { waktu: "Minggu", mentions: 210, trigger: "Normal" },
    ];

    // 3. WORD CLOUD / TOP KEYWORDS (Beserta Bobotnya)
    const wordCloud = [
      { word: "Bansos", weight: 90 }, { word: "DPR", weight: 85 }, 
      { word: "Ketua", weight: 70 }, { word: "Pemilu", weight: 65 },
      { word: "Rakyat", weight: 50 }, { word: "Mic", weight: 45 },
      { word: "Sidang", weight: 40 }, { word: "PDIP", weight: 35 },
      { word: "Undang-undang", weight: 30 }, { word: "Kritik", weight: 25 }
    ];

    // 4. TOP INFLUENCERS (KOL)
    const influencers = [
      { name: "Asumsi", type: "Media/Netral", subs: "1.2M", impact: "Tinggi", stance: "Netral" },
      { name: "Narasi Newsroom", type: "Opini/Kritik", subs: "2.5M", impact: "Sangat Tinggi", stance: "Kontra" },
      { name: "Total Politik", type: "Analisis", subs: "800K", impact: "Tinggi", stance: "Netral" },
      { name: "Banteng TV", type: "Afiliasi", subs: "150K", impact: "Sedang", stance: "Pro" },
      { name: "Bocor Alus", type: "Siniar Politik", subs: "500K", impact: "Tinggi", stance: "Kontra" }
    ];

    // 5. TOP REAL-TIME COMMENTS (Sesuai Like Tertinggi)
    const topComments = [
      { 
        user: "@RakyatBiasa_99", 
        time: "10 menit yang lalu", 
        comment: "Sebagai ketua DPR harusnya lebih peka sama isu yang lagi rame di bawah, bukan malah ketok palu buru-buru.", 
        likes: 12450 
      },
      { 
        user: "@BudiSantoso_JKT", 
        time: "1 jam yang lalu", 
        comment: "Apresiasi buat Puan yang udah neken anggaran buat daerah tertinggal, semoga nyampe ke sasaran.", 
        likes: 8320 
      },
      { 
        user: "@KritikusTajam", 
        time: "3 jam yang lalu", 
        comment: "Itu mic-nya mati sendiri apa dimatiin lagi pas ada interupsi? Wkwkwk udah hafal polanya.", 
        likes: 6710 
      },
      { 
        user: "@MahasiswaHukum", 
        time: "5 jam yang lalu", 
        comment: "Secara struktural argumen yang dibawa PDIP di sidang ini lemah, Ketua DPR harusnya bisa nengahin perdebatan fraksi.", 
        likes: 4120 
      },
      { 
        user: "@SobatBanteng12", 
        time: "8 jam yang lalu", 
        comment: "Solid terus Bu Puan! Buktikan kalau perempuan bisa memimpin parlemen dengan tegas.", 
        likes: 3890 
      }
    ];

    return NextResponse.json({ 
      success: true, 
      data: { totalMentions, trendData, wordCloud, influencers, topComments } 
    });
  } catch (error) {
    return NextResponse.json({ success: false, data: null });
  }
}