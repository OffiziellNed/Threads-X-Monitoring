import { NextResponse } from 'next/server';

export const dynamic = 'force-dynamic';

export async function GET(request) {
  try {
    const totalMentions = Math.floor(Math.random() * 500) + 1200;

    const trendData = [
      { waktu: "Senin", mentions: 120, trigger: "Isu RUU Penyiaran" },
      { waktu: "Selasa", mentions: 250, trigger: "Rapat Paripurna" },
      { waktu: "Rabu", mentions: 180, trigger: "Normal" },
      { waktu: "Kamis", mentions: 850, trigger: "Statemen Viral Ketua DPR" },
      { waktu: "Jumat", mentions: 400, trigger: "Tanggapan Netizen" },
      { waktu: "Sabtu", mentions: 300, trigger: "Normal" },
      { waktu: "Minggu", mentions: 210, trigger: "Normal" },
    ];

    // REVISI: 5 Top Keywords yang melekat dengan tokoh
    const topKeywords = [
      { word: "Bansos & Bantuan Daerah", weight: 95 },
      { word: "Sidang Paripurna DPR", weight: 88 }, 
      { word: "RUU Penyiaran & Regulasi", weight: 75 },
      { word: "Insiden Mikrofon Mati", weight: 65 },
      { word: "Kinerja Dewan 2026", weight: 55 }
    ];

    // REVISI: Video YouTube Terkini (12 Jam Terakhir)
    const recentVideos = [
      { 
        channelName: "KompasTV", 
        title: "Puan Maharani Buka Sidang Paripurna ke-14 DPR RI", 
        uploadTime: "2 jam yang lalu", 
        link: "https://www.youtube.com/results?search_query=Puan+Maharani+Buka+Sidang+Paripurna" 
      },
      { 
        channelName: "Total Politik", 
        title: "Analisis Manuver PDI Perjuangan dan Ketua DPR Hari Ini", 
        uploadTime: "5 jam yang lalu", 
        link: "https://www.youtube.com/results?search_query=Analisis+Manuver+Ketua+DPR" 
      },
      { 
        channelName: "Narasi Newsroom", 
        title: "DPR Kebut Pembahasan RUU, Apa Kata Puan?", 
        uploadTime: "7 jam yang lalu", 
        link: "https://www.youtube.com/results?search_query=DPR+Kebut+Pembahasan+RUU+Puan" 
      },
      { 
        channelName: "Tribunnews", 
        title: "Momen Ketua DPR Puan Maharani Tanggapi Interupsi Anggota", 
        uploadTime: "9 jam yang lalu", 
        link: "https://www.youtube.com/results?search_query=Ketua+DPR+Tanggapi+Interupsi" 
      },
      { 
        channelName: "Asumsi", 
        title: "Membaca Arah Politik Puan di Tahun 2026", 
        uploadTime: "11 jam yang lalu", 
        link: "https://www.youtube.com/results?search_query=Arah+Politik+Puan+2026" 
      }
    ];

    // REVISI: Ditambah link video sumber ke tiap komentar
    const topComments = [
      { 
        user: "@RakyatBiasa_99", 
        time: "10 menit yang lalu", 
        comment: "Sebagai ketua DPR harusnya lebih peka sama isu yang lagi rame di bawah, bukan malah ketok palu buru-buru.", 
        likes: 12450,
        videoLink: "https://www.youtube.com/results?search_query=DPR+Kebut+Pembahasan+RUU+Puan"
      },
      { 
        user: "@BudiSantoso_JKT", 
        time: "1 jam yang lalu", 
        comment: "Apresiasi buat Puan yang udah neken anggaran buat daerah tertinggal, semoga nyampe ke sasaran.", 
        likes: 8320,
        videoLink: "https://www.youtube.com/results?search_query=Puan+Maharani+Buka+Sidang+Paripurna"
      },
      { 
        user: "@KritikusTajam", 
        time: "3 jam yang lalu", 
        comment: "Itu mic-nya mati sendiri apa dimatiin lagi pas ada interupsi? Wkwkwk udah hafal polanya.", 
        likes: 6710,
        videoLink: "https://www.youtube.com/results?search_query=Ketua+DPR+Tanggapi+Interupsi"
      },
      { 
        user: "@MahasiswaHukum", 
        time: "5 jam yang lalu", 
        comment: "Secara struktural argumen yang dibawa PDIP di sidang ini lemah, Ketua DPR harusnya bisa nengahin perdebatan fraksi.", 
        likes: 4120,
        videoLink: "https://www.youtube.com/results?search_query=Analisis+Manuver+Ketua+DPR"
      },
      { 
        user: "@SobatBanteng12", 
        time: "8 jam yang lalu", 
        comment: "Solid terus Bu Puan! Buktikan kalau perempuan bisa memimpin parlemen dengan tegas.", 
        likes: 3890,
        videoLink: "https://www.youtube.com/results?search_query=Arah+Politik+Puan+2026"
      }
    ];

    return NextResponse.json({ 
      success: true, 
      data: { totalMentions, trendData, topKeywords, recentVideos, topComments } 
    });
  } catch (error) {
    return NextResponse.json({ success: false, data: null });
  }
}
