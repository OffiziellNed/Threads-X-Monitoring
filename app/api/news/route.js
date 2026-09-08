const cleanUrl = (rawUrl) => {
  if (!rawUrl) return "";
  
  try {
    // 1. Bersihkan &amp; bawaan dari hasil scraping (raw HTML)
    const decodedUrl = rawUrl.replace(/&amp;/g, '&');

    // 2. Kalau kena bungkus redirect Google, bongkar paksa
    if (decodedUrl.includes("google.com/url")) {
      const urlObj = new URL(decodedUrl);
      // Google biasanya nyimpan link asli di parameter 'url' atau 'q'
      const cleanLink = urlObj.searchParams.get('url') || urlObj.searchParams.get('q');
      
      if (cleanLink) return cleanLink; // Return link murni (Kompas, CNN, Tribun, dll)
    }

    // 3. Kalau link dari awal udah murni (nggak dibungkus Google), langsung return
    return decodedUrl;
    
  } catch (error) {
    // Failsafe: kalau gagal diproses, balikin link aslinya biar tombol di frontend nggak mati
    return rawUrl;
  }
};
