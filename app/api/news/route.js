import { NextResponse } from "next/server";

// =========================================================================
// 1. FUNGSI PEMBERSIH LINK MUTLAK (Anti Google Redirect & Berlaku Semua Situs)
// =========================================================================
const cleanUrl = (rawUrl) => {
  if (!rawUrl) return "";
  try {
    const decodedUrl = rawUrl.replace(/&amp;/g, '&');
    
    // Bongkar paksa jika ada embel-embel google.com/url
    if (decodedUrl.includes("google.com/url")) {
      const urlObj = new URL(decodedUrl);
      const cleanLink = urlObj.searchParams.get('url') || urlObj.searchParams.get('q');
      if (cleanLink) return cleanLink; 
    }
    
    // Jika link sudah asli dari awal (misal langsung ke web sumber)
    return decodedUrl;
  } catch (error) {
    return rawUrl; // Failsafe agar tidak error
  }
};

// =========================================================================
// 2. FUNGSI FORMAT TANGGAL & WAKTU (Agar Frontend Bisa Memisahnya Sempurna)
// =========================================================================
const formatPubDate = (pubDateStr) => {
  if (!pubDateStr) return "-";
  try {
    const date = new Date(pubDateStr);
    if (isNaN(date.getTime())) return pubDateStr; 
    
    const optionsDate = { day: 'numeric', month: 'long', year: 'numeric', timeZone: 'Asia/Jakarta' };
    const optionsTime = { hour: '2-digit', minute: '2-digit', timeZone: 'Asia/Jakarta' };
    
    const formattedDate = new Intl.DateTimeFormat('id-ID', optionsDate).format(date);
    const formattedTime = new Intl.DateTimeFormat('id-ID', optionsTime).format(date).replace(/\./g, ':');
    
    // Format ini otomatis akan dibelah dengan rapi oleh Frontend lo jadi kolom Tanggal & Waktu
    return `${formattedDate} pukul ${formattedTime} WIB`;
  } catch (error) {
    return pubDateStr;
  }
};

// =========================================================================
// 3. HANDLER API ROUTE (BACKEND NEXT.JS)
// =========================================================================
export async function GET(request) {
  try {
    // Ambil parameter dari request Frontend (Misal: /api/news?hours=24)
    const { searchParams } = new URL(request.url);
    const hours = searchParams.get('hours') || '24';
    const mode = searchParams.get('mode') || 'default';

    // ---------------------------------------------------------------------
    // 👇 TARUH KODE SCRAPING / FETCHING LO DI BAWAH INI 👇
    // ---------------------------------------------------------------------
    
    // Contoh: const response = await fetch("URL_TARGET_LU");
    // const hasilScrapingKotor = await response.json(); ATAU parser.parseURL()
    
    let hasilScrapingKotor = []; // <-- GANTI INI DENGAN DATA ASLI HASIL SCRAPING LO
    
    // ---------------------------------------------------------------------
    // 👆 TARUH KODE SCRAPING / FETCHING LO DI ATAS INI 👆
    // ---------------------------------------------------------------------

    // =========================================================================
    // 4. CLEANING & FORMATTING (Merapikan Semua Data Sebelum Dikirim)
    // =========================================================================
    const dataSiapKirim = hasilScrapingKotor.map(item => {
      return {
        ...item, // Bawa semua data bawaan aslinya
        topik: item.title || item.topik || "Tanpa Judul",
        pubDate: formatPubDate(item.pubDate), // Otomatis rapi: "8 September 2026 pukul 12:05 WIB"
        source: item.source || "-",
        kategori: item.kategori || "UMUM",
        articleDesc: item.articleDesc || item.description || "",
        
        // INI KUNCINYA: Link langsung bersih dari backend! Berlaku buat Detik, CNN, Kompas, dll
        link: cleanUrl(item.link || item.url) 
      };
    });

    // 5. Kirim response bersih ke Frontend
    return NextResponse.json({
      success: true,
      data: dataSiapKirim
    });

  } catch (error) {
    console.error("Backend Error:", error);
    return NextResponse.json({
      success: false,
      message: "Gagal mengambil data dari Backend",
      error: error.message
    }, { status: 500 });
  }
}
