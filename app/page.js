"use client";

import React, { useState, useRef, useEffect } from "react";
import { 
  ArrowLeft, RefreshCw, ExternalLink, Calendar, Filter, 
  PlaySquare, Zap, Search, Flame, Megaphone, Copy, Check, X, Eye, ThumbsUp, ThumbsDown
} from "lucide-react";

export default function SocialMediaMonitoring() {
  const [currentPage, setCurrentPage] = useState("main");
  const [previousPage, setPreviousPage] = useState("main");
  
  const [topNewsData, setTopNewsData] = useState([]);
  const [terkiniData, setTerkiniData] = useState([]);
  const [isLoading, setIsLoading] = useState(false);
  
  const [ytData, setYtData] = useState([]);
  const [isLoadingYt, setIsLoadingYt] = useState(false);
  const [ytSortMode, setYtSortMode] = useState("views"); 
  const [ytFetchMode, setYtFetchMode] = useState("umum"); 
  
  const [selectedCategory, setSelectedCategory] = useState("Semua");
  const [isTopNewsFilter, setIsTopNewsFilter] = useState(false);
  const [selectedHours, setSelectedHours] = useState(12);
  const categories = ["Semua", "Politik", "Pemerintahan", "Sosial", "Hukum", "Kriminal", "Bencana", "Entertainment", "Olahraga", "Teknologi", "Finansial", "Global"];
  const hoursOptions = [6, 12, 24, 48];

  const [promptModalData, setPromptModalData] = useState(null);
  const [isCopied, setIsCopied] = useState(false);

  const [urlBerita, setUrlBerita] = useState("");
  const [promptTeks, setPromptTeks] = useState("");
  const [judulHtml, setJudulHtml] = useState("");
  const [sumberBerita, setSumberBerita] = useState("");
  const [imageUrl, setImageUrl] = useState(""); 
  const [editorSubPage, setEditorSubPage] = useState(2);

  const [imgX, setImgX] = useState(0);
  const [imgY, setImgY] = useState(0);
  const [imgScale, setImgScale] = useState(1);
  const [isDragging, setIsDragging] = useState(false);
  const [dragStart, setDragStart] = useState({ x: 0, y: 0 });

  const [teksX, setTeksX] = useState(140);
  const [teksY, setTeksY] = useState(800);
  const [ukuranFont, setUkuranFont] = useState(79);
  const [jarakBaris, setJarakBaris] = useState(1.4);

  const [sumberX, setSumberX] = useState(145); 
  const [sumberY, setSumberY] = useState(1243);
  const [ukuranFontSumber, setUkuranFontSumber] = useState(28);

  const canvasRef = useRef(null);
  const [loadedBgImg, setLoadedBgImg] = useState(null);
  const [templateImgObj, setTemplateImgObj] = useState(null);

  const fetchLiveTrends = async () => {
    setIsLoading(true);
    try {
      let epTop = "";
      let epTerkini = "";
      let nTime = String(Date.now());
      const h = selectedHours; // dynamic hours 6/12/24/48

      if (currentPage === "bencana") {
        epTop = `?hours=${h}&t=` + nTime;
        epTerkini = `?hours=${h}&mode=terkini&t=` + nTime;
      } else if (currentPage === "pdip") {
        epTop = `?hours=${h}&t=` + nTime;
        epTerkini = `?hours=${h}&mode=terkini&t=` + nTime;
      } else if (currentPage === "megawati") {
        epTop = `?hours=${h}&t=` + nTime;
        epTerkini = `?hours=${h}&mode=terkini&t=` + nTime;
      } else if (currentPage === "puan") {
        epTop = `?hours=${h}&t=` + nTime;
        epTerkini = `?hours=${h}&mode=terkini&t=` + nTime;
      } else if (currentPage === "nasional") {
        epTop = `?hours=${h}&t=` + nTime;
        epTerkini = `?hours=${h}&mode=terkini&t=` + nTime;
      }

      let pNews = ["api", "news"].join("/");
      let pPdip = ["api", "pdip"].join("/");
      let pMega = ["api", "megawati"].join("/");
      let pPuan = ["api", "puan"].join("/");
      let pBenc = ["api", "bencana"].join("/");

      let uTop = "";
      let uTerkini = "";

      if (currentPage === "bencana") { uTop = ["", pBenc].join("/") + epTop; uTerkini = ["", pBenc].join("/") + epTerkini; }
      if (currentPage === "pdip") { uTop = ["", pPdip].join("/") + epTop; uTerkini = ["", pPdip].join("/") + epTerkini; }
      if (currentPage === "megawati") { uTop = ["", pMega].join("/") + epTop; uTerkini = ["", pMega].join("/") + epTerkini; }
      if (currentPage === "puan") { uTop = ["", pPuan].join("/") + epTop; uTerkini = ["", pPuan].join("/") + epTerkini; }
      if (currentPage === "nasional") { uTop = ["", pNews].join("/") + epTop; uTerkini = ["", pNews].join("/") + epTerkini; }

      if (uTop && uTerkini) {
        const resTop = await fetch(uTop, { cache: "no-store" }).then(r => r.json()).catch(() => ({success: false, data: []}));
        const resTerkini = await fetch(uTerkini, { cache: "no-store" }).then(r => r.json()).catch(() => ({success: false, data: []}));
        
        if (resTop && resTop.success) setTopNewsData(resTop.data);
        else setTopNewsData([]);

        if (resTerkini && resTerkini.success) setTerkiniData(resTerkini.data);
        else setTerkiniData([]);
      }
    } catch (error) {
      setTopNewsData([]);
      setTerkiniData([]);
    } 
    finally { setIsLoading(false); }
  };

  const fetchYoutubeData = async () => {
    setIsLoadingYt(true);
    try {
      let pYt = ["api", "puan-yt"].join("/");
      let ytUrl = ["", pYt].join("/") + "?mode=" + ytFetchMode + "&t=" + String(Date.now());
      const response = await fetch(ytUrl, { cache: "no-store" });
      const result = await response.json();
      if (result && result.success) setYtData(result.data);
    } catch (error) {} 
    finally { setIsLoadingYt(false); }
  };

  // Reset kategori hanya pas ganti halaman, BUKAN pas ganti jam
  useEffect(() => {
    if (currentPage === "puan-yt-analysis") {
        fetchYoutubeData();
    } else if (currentPage !== "main" && currentPage !== "agora-editor") {
        fetchLiveTrends();
    }
  }, [currentPage, ytFetchMode]);

  useEffect(() => {
    if (currentPage !== "main" && currentPage !== "agora-editor" && currentPage !== "puan-yt-analysis") {
        setSelectedCategory("Semua");
        setIsTopNewsFilter(false);
    }
  }, [currentPage]);

  // Fetch ulang pas ganti jam TANPA reset filter kategori
  useEffect(() => {
    if (currentPage !== "main" && currentPage !== "agora-editor" && currentPage !== "puan-yt-analysis") {
        fetchLiveTrends();
    }
  }, [selectedHours]);

  useEffect(() => {
    if (currentPage !== "agora-editor") return;
    const loadFonts = async () => {
      try {
        const fontSB = new FontFace("PoppinsSemiBold", "url(/Poppins-SemiBold.ttf)");
        await fontSB.load();
        document.fonts.add(fontSB);
        const fontSBI = new FontFace("PoppinsSemiBoldItalic", "url(/Poppins-SemiBoldItalic.ttf)");
        await fontSBI.load();
        document.fonts.add(fontSBI);
      } catch (err) {}
    };
    loadFonts();
    const tImg = new Image();
    tImg.src = "/Agora Vada Template.png";
    tImg.onload = () => setTemplateImgObj(tImg);
  }, [currentPage]);

  useEffect(() => {
    if (currentPage !== "agora-editor" || !imageUrl) {
      setLoadedBgImg(null);
      return;
    }
    let isCancelled = false;
    const fetchImageSafely = async () => {
      const tryLoad = (urlLoad) => new Promise((resolve, reject) => {
        const img = new Image();
        img.crossOrigin = "anonymous";
        img.onload = () => resolve(img);
        img.onerror = () => reject();
        img.src = urlLoad;
      });
      if (imageUrl.indexOf("http") !== 0) {
        try { 
          const img = await tryLoad(imageUrl); 
          if (!isCancelled) setLoadedBgImg(img); 
        } catch(e) {}
        return;
      }
      const proxies = [
        "https://api.allorigins.win/raw?url=" + encodeURIComponent(imageUrl),
        "https://wsrv.nl/?url=" + encodeURIComponent(imageUrl),
        imageUrl 
      ];
      for (let i=0; i<proxies.length; i++) {
        try {
          const img = await tryLoad(proxies[i]);
          if (!isCancelled) setLoadedBgImg(img);
          return; 
        } catch(e) { continue; }
      }
    };
    fetchImageSafely();
    return () => { isCancelled = true; };
  }, [imageUrl, currentPage]);

  const handleFormat = (command, value = null) => {
    document.execCommand(command, false, value);
    const editor = document.getElementById("judul-editor");
    if (editor) setJudulHtml(editor.innerHTML);
  };

  const renderRichText = (ctx, htmlString, x, y, maxWidth, lineHeight, baseFontSize) => {
    if (!htmlString) return; 
    ctx.textAlign = "left"; 
    ctx.textBaseline = "top"; 
    const cleanHTML = htmlString
      .replace(new RegExp("<div[^>]*><br><\\/div>", "gi"), "\n")
      .replace(new RegExp("<div[^>]*>", "gi"), "\n")
      .replace(new RegExp("<\\/div>", "gi"), "")
      .replace(new RegExp("<br\\s*[\\/]?>", "gi"), "\n");
    const tempDiv = document.createElement("div");
    tempDiv.innerHTML = cleanHTML;
    let wordsWithContext = [];
    const extract = (node, currentContext) => {
      if (node.nodeType === Node.TEXT_NODE) {
        let text = node.textContent;
        let tokens = text.split("\n");
        tokens.forEach((lineText, index) => {
          if (index > 0) wordsWithContext.push({ word: "", ...currentContext, isNewline: true });
          let words = lineText.split(new RegExp("\\s+"));
          words.forEach(w => {
            if (w.trim().length > 0) wordsWithContext.push({ word: w.trim(), ...currentContext, isNewline: false });
          });
        });
      } else if (node.nodeType === Node.ELEMENT_NODE) {
        let newContext = { ...currentContext };
        const tag = node.tagName.toLowerCase();
        if (tag === "i" || tag === "em") newContext.isItalic = true;
        if (node.style && node.style.color) newContext.color = node.style.color;
        if (tag === "font" && node.getAttribute("color")) newContext.color = node.getAttribute("color");
        node.childNodes.forEach(child => extract(child, newContext));
      }
    };
    extract(tempDiv, { color: "#FFFFFF", isItalic: false }); 
    let lines = [];
    let currentLine = [];
    let currentWidth = 0;
    ctx.font = baseFontSize + "px PoppinsSemiBold, sans-serif";
    const spaceWidth = ctx.measureText(" ").width;
    wordsWithContext.forEach(item => {
      if (item.isNewline) {
        lines.push(currentLine);
        currentLine = [];
        currentWidth = 0;
      } else {
        const fontName = item.isItalic ? "PoppinsSemiBoldItalic" : "PoppinsSemiBold";
        ctx.font = baseFontSize + "px " + fontName + ", sans-serif";
        let wWidth = ctx.measureText(item.word).width;
        if (currentWidth + wWidth > maxWidth && currentLine.length > 0) {
          lines.push(currentLine);
          currentLine = [item];
          currentWidth = wWidth + spaceWidth;
        } else {
          currentLine.push(item);
          currentWidth += wWidth + spaceWidth;
        }
      }
    });
    if (currentLine.length > 0) lines.push(currentLine);
    let currentY = y;
    lines.forEach(lineArr => {
      let currentX = x;
      lineArr.forEach(item => {
        const fontName = item.isItalic ? "PoppinsSemiBoldItalic" : "PoppinsSemiBold";
        ctx.font = baseFontSize + "px " + fontName + ", sans-serif";
        ctx.fillStyle = item.color;
        ctx.fillText(item.word, currentX, currentY);
        currentX += ctx.measureText(item.word).width + spaceWidth;
      });
      currentY += lineHeight;
    });
  };

  useEffect(() => {
    if (currentPage !== "agora-editor" || editorSubPage !== 3) return;
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext("2d");
    ctx.fillStyle = "#111827";
    ctx.fillRect(0, 0, canvas.width, canvas.height);
    if (loadedBgImg) {
      ctx.save();
      const drawW = loadedBgImg.width * imgScale;
      const drawH = loadedBgImg.height * imgScale;
      ctx.drawImage(loadedBgImg, imgX, imgY, drawW, drawH);
      ctx.restore();
    }
    if (templateImgObj) {
      ctx.drawImage(templateImgObj, 0, 0, canvas.width, canvas.height);
    }
    const lh = ukuranFont * jarakBaris;
    renderRichText(ctx, judulHtml, teksX, teksY, 950, lh, ukuranFont);
    if (sumberBerita) {
      ctx.fillStyle = "#FFFFFF";
      ctx.font = ukuranFontSumber + "px PoppinsSemiBoldItalic, sans-serif";
      ctx.textAlign = "left";
      ctx.textBaseline = "top";
      ctx.fillText(sumberBerita, sumberX, sumberY);
    }
  }, [currentPage, editorSubPage, loadedBgImg, templateImgObj, imgX, imgY, imgScale, teksX, teksY, ukuranFont, jarakBaris, sumberX, sumberY, ukuranFontSumber, judulHtml, sumberBerita]);

  const handleMouseDown = (e) => {
    setIsDragging(true);
    const clientX = e.clientX || (e.touches && e.touches[0].clientX);
    const clientY = e.clientY || (e.touches && e.touches[0].clientY);
    setDragStart({ x: clientX - imgX, y: clientY - imgY });
  };
  const handleMouseMove = (e) => {
    if (!isDragging) return;
    const clientX = e.clientX || (e.touches && e.touches[0].clientX);
    const clientY = e.clientY || (e.touches && e.touches[0].clientY);
    setImgX(clientX - dragStart.x);
    setImgY(clientY - dragStart.y);
  };
  const handleMouseUp = () => setIsDragging(false);
  const handleWheel = (e) => {
    e.preventDefault();
    const zoomIntensity = 0.05;
    if (e.deltaY < 0) setImgScale(p => Math.min(p + zoomIntensity, 5));
    else setImgScale(p => Math.max(p - zoomIntensity, 0.1));
  };

  const handleUploadFoto = (e) => {
    const file = e.target.files[0];
    if (file) setImageUrl(URL.createObjectURL(file));
  };

  const downloadGambar = () => {
    const canvas = canvasRef.current;
    if (canvas) {
      const link = document.createElement("a");
      link.download = "AgoraVada_Post.jpg";
      link.href = canvas.toDataURL("image/jpeg", 0.95);
      link.click();
    }
  };

  const formatDateTime = (dateStr) => {
    if (!dateStr) return { date: "-", time: "-" };
    let str = String(dateStr);
    let strLower = str.toLowerCase();
    let datePart = str;
    let timePart = "-";
    let pukulIdx = strLower.indexOf("pukul");
    if (pukulIdx !== -1) {
      datePart = str.substring(0, pukulIdx).trim();
      if (datePart.endsWith(",")) datePart = datePart.substring(0, datePart.length - 1);
      let afterPukul = strLower.substring(pukulIdx + 5);
      afterPukul = afterPukul.split("wib").join("").split("wita").join("").split("wit").join("");
      timePart = afterPukul.trim().split(".").join(":");
    } else if (str.indexOf(":") !== -1) {
      let parts = str.split(" ");
      for (let i = 0; i < parts.length; i++) {
        if (parts[i].indexOf(":") !== -1) {
          timePart = parts[i];
          datePart = str.replace(timePart, "").trim();
          if (datePart.endsWith(",")) datePart = datePart.substring(0, datePart.length - 1);
          break;
        }
      }
    }
    let cleanDate = datePart.toLowerCase().split("wib").join("").split("wita").join("").split("wit").join("").trim();
    return { date: cleanDate || "-", time: timePart };
  };

  const getCleanLink = (isu) => {
    try {
      let raw = isu.link || isu.url || isu.guid || "";
      if (typeof raw === "object" && raw !== null) {
        if (raw.url) raw = raw.url;
        else if (raw.link) raw = raw.link;
      }
      if (typeof raw === "string" && raw.startsWith("http")) {
        return raw.split("&amp;").join("&").trim();
      }
      if (isu.enclosure) {
        if (typeof isu.enclosure === "string" && isu.enclosure.startsWith("http")) {
          return isu.enclosure.split("&amp;").join("&").trim();
        }
        if (isu.enclosure.url) {
          return isu.enclosure.url.split("&amp;").join("&").trim();
        }
      }
      const str = JSON.stringify(isu);
      const match = str.match(/https?:\/\/[^\s"'\\]+/);
      if (match) {
        let link = match[0].split("\\").join("").split("&amp;").join("&").trim();
        link = link.replace(/["']+$/, "");
        return link;
      }
    } catch (e) {}
    return "#";
  };

  const getPreamble = (titleText) => {
    let pre = "Tolong buat 10 judul berita menggunakan hook dan copywriter handal untuk media alternatif \"AgoraVada\", serta buatkan caption untuk instagram, normatif saja dan informatif. Pastikan diakhiri oleh sumber berita dan 3 hastag (wajib ada #AgoraVada sisanya disesuaikan dengan kata kunci subjek dan topik yang dibahas).\n\nJudul Berita:\n" + titleText + "\n\nIsi Berita:\n";
    return pre;
  };

  // ==== FIXED V5 - ANTI CLOUDFLARE 522 ====
  const isErrorPage = (text) => {
    if (!text) return true;
    const low = text.toLowerCase();
    return low.includes('cloudflare') || low.includes('error 522') || low.includes('error 1020') || low.includes('attention required') || low.includes('the initial connection between cloudflare');
  };

  const handleOpenPrompt = async (isu) => {
    const newsLink = getCleanLink(isu);
    let titleRaw = isu.articleTitle || isu.topik || isu.title || "Tanpa Judul";
    let preamble = getPreamble(titleRaw);
    setPromptModalData({ ...isu, fullText: "Mengaktifkan sistem...\nMenyedot teks penuh dari sumber (mohon tunggu)..." });
    if (newsLink && newsLink !== "#") {
      try {
        let fetchUrl = ["", "api", "tarik-berita"].join("/");
        const controller = new AbortController();
        const tId = setTimeout(() => controller.abort(), 10000);
        const res = await fetch(fetchUrl, { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ url: newsLink }), signal: controller.signal });
        clearTimeout(tId);
        const data = await res.json();
        let isi = data.description || data.text || "";
        let isDuplicate = isi && titleRaw && isi.trim() === titleRaw.trim();
        if (data.status === "success" && isi && !isErrorPage(isi) && !isDuplicate && isi.length > 80) {
          setPromptModalData({ ...isu, fullText: preamble + isi });
        } else {
          let fallback = isu.articleDesc || isu.description || "Gagal ekstrak isi (tribratanews), pakai ringkasan RSS.";
          if (isErrorPage(isi) || isDuplicate) fallback = isu.articleDesc || isu.description || "Berita ini struktur HTML nya tidak standar. Pakai ringkasan RSS.";
          setPromptModalData({ ...isu, fullText: preamble + fallback });
        }
      } catch (err) {
        let fallback = isu.articleDesc || "Koneksi Timeout (10s). Pakai ringkasan RSS.";
        if (err.name === 'AbortError') fallback = isu.articleDesc || "Timeout 10 detik - Cloudflare blokir.";
        setPromptModalData({ ...isu, fullText: preamble + fallback });
      }
    } else {
      setPromptModalData({ ...isu, fullText: preamble + (isu.articleDesc || "URL tidak valid.") });
    }
  };

  const handleCopyPrompt = async (textRaw) => {
    try {
      await navigator.clipboard.writeText(textRaw);
      setIsCopied(true);
      setTimeout(() => setIsCopied(false), 2000);
    } catch (err) {}
  };

  const isRedPrev = previousPage.indexOf("pdip") !== -1 || previousPage.indexOf("puan") !== -1 || previousPage.indexOf("megawati") !== -1;
  const isRedCurr = currentPage.indexOf("pdip") !== -1 || currentPage.indexOf("puan") !== -1 || currentPage.indexOf("megawati") !== -1;
  const isRedTheme = isRedCurr || isRedPrev;

  // === LOGIKA TOP NEWS V3 - BACKEND SUDAH TENTUKAN isTop (hanya top 10) ===
  // Backend cluster size*25 + recency, top 15% max 10 yang jadi isTop=true
  // Jadi tidak semua jadi TOP, hanya yang beneran rame
  let tableData = terkiniData.map(d => {
    // pakai flag isTop dari backend kalau ada, fallback ke logic lama
    const isTrending = d.isTop !== undefined ? d.isTop : (d.clusterSize >=3 || d.volume >=60);
    return { ...d, isTrending };
  });
  
  if (selectedCategory !== "Semua") { tableData = tableData.filter(d => d.kategori === selectedCategory); }
  if (isTopNewsFilter) { 
    tableData = tableData.filter(d => d.isTrending).sort((a,b) => (b.volume||0) - (a.volume||0)); 
  }

  // === EXTRACT & FULL SCRAPE - Mengubah news.google/rss jadi link asli + scraping full multi-halaman ===
  const handleOpenEditorFromMegaphone = async (isu) => {
    const newsLink = getCleanLink(isu);
    const judulBerita = isu.articleTitle || isu.topik || isu.title || "Tanpa Judul";
    let sumberText = "";
    try {
        if (isu.source) sumberText = "Sumber Berita: " + isu.source;
        else if (newsLink !== "#") sumberText = "Sumber Berita: " + new URL(newsLink).hostname;
    } catch(e) {}
    setPreviousPage(currentPage); 
    setUrlBerita(newsLink); // simpan google link dulu, nanti di-extract jadi real
    setSumberBerita(sumberText);
    setJudulHtml(judulBerita);
    setPromptTeks(`Tolong buat 10 judul berita menggunakan hook dan copywriter handal untuk media alternatif "AgoraVada", serta buatkan caption untuk instagram, normatif saja dan informatif. Pastikan diakhiri oleh sumber berita dan 3 hastag (wajib ada #AgoraVada sisanya disesuaikan dengan kata kunci subjek dan topik yang dibahas).

Judul Berita:
${judulBerita}

Isi Berita:
Mengekstrak link asli dari Google News...
Mengubah ${newsLink.substring(0,80)}...
Mohon tunggu sebentar, sistem sedang menyedot full artikel (termasuk halaman 2-3 jika ada)...`);
    setCurrentPage("agora-editor");
    setEditorSubPage(2); 
    
    let preambleFull = getPreamble(judulBerita);
    if (newsLink && newsLink !== "#") {
      try {
        let reqUrl = ["", "api", "tarik-berita"].join("/");
        const controller = new AbortController();
        const tId = setTimeout(() => controller.abort(), 25000); // 25 detik untuk multi-halaman
        const res = await fetch(reqUrl, { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ url: newsLink }), signal: controller.signal });
        clearTimeout(tId);
        const data = await res.json();
        if (data && data.status === "success") {
          let isiBerita = data.description || data.text || "";
          if (!isiBerita || isErrorPage(isiBerita) || isiBerita.trim() === judulBerita.trim() || isiBerita.length < 100) {
            isiBerita = isu.articleDesc || isu.description || "Gagal ekstrak isi, pakai ringkasan RSS.";
          }
          // Tampilkan info extract
          const extractInfo = data.real_url !== data.original_url ? `[Link asli berhasil di-extract]\nOriginal: ${data.original_url}\nReal: ${data.real_url}\nHalaman ter-scrape: ${data.pages_scraped || 1} | Panjang: ${data.content_length || isiBerita.length} karakter\n\n` : "";
          setPromptTeks(preambleFull + extractInfo + isiBerita); 
          if(data.sumber) setSumberBerita(data.sumber);
          if(data.real_url) { 
            setUrlBerita(data.real_url); // update input jadi link asli
            try { setSumberBerita("Sumber Berita: " + new URL(data.real_url).hostname); } catch {} 
          }
          if(data.gambar_url) setImageUrl(data.gambar_url);
        } else {
          if (data.need_manual) {
            setPromptTeks(preambleFull + `GAGAL EXTRACT OTOMATIS DARI GOOGLE NEWS

${data.message}

SOLUSI:
1. Klik tombol "Baca" di tabel untuk buka Google News
2. Di halaman Google News, klik judul berita untuk buka portal asli (detik.com, kompas.com, TVRI, dll)
3. Copy URL asli dari address bar browser
4. Paste URL asli di editor ini (kolom Link Berita) lalu klik "Extract Link Asli + Full Scrape"

Link Google yang gagal: ${data.original_url}

Ringkasan RSS sebagai fallback:
${isu.articleDesc || ""}`);
          } else {
            setPromptTeks(preambleFull + (isu.articleDesc || "Gagal menyedot isi berita: " + (data.message || "")) + `\n\nLink asli: ${data.real_url || ''}`);
          }
        }
      } catch(err) {
        if (err.name === 'AbortError') {
          setPromptTeks(preambleFull + (isu.articleDesc || "Timeout 25 detik - server berita lambat. Coba klik tombol Extract lagi di editor."));
        } else {
          setPromptTeks(preambleFull + (isu.articleDesc || "Koneksi ke API terputus: " + err.message));
        }
      }
    } else {
      setPromptTeks(preambleFull + (isu.articleDesc || "URL tidak tersedia."));
    }
  };

  // Handler untuk tombol Extract di dalam editor (manual)
  const handleExtractLink = async () => {
    if (!urlBerita) return alert("Masukkan link dulu!");
    setPromptTeks(`Tolong buat 10 judul berita menggunakan hook dan copywriter handal untuk media alternatif "AgoraVada", serta buatkan caption untuk instagram, normatif saja dan informatif. Pastikan diakhiri oleh sumber berita dan 3 hastag (wajib ada #AgoraVada sisanya disesuaikan dengan kata kunci subjek dan topik yang dibahas).

Mengekstrak link asli dari: ${urlBerita}
Mohon tunggu...`);
    try {
      let tUrl = ["", "api", "tarik-berita"].join("/");
      const res = await fetch(tUrl, { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ url: urlBerita }) });
      const data = await res.json();
      if(data && data.status === "success") {
        let jdInput = data.title || "Tanpa Judul";
        let preambuleTop = getPreamble(jdInput);
        let isi = data.description || data.text || "";
        if (isErrorPage(isi)) isi = "Gagal bypass Cloudflare.";
        const extractInfo = `[Link asli berhasil di-extract - ${data.pages_scraped || 1} halaman]\nReal URL: ${data.real_url}\n\n`;
        setPromptTeks(preambuleTop + extractInfo + isi); 
        setJudulHtml(jdInput);
        setUrlBerita(data.real_url || urlBerita); // ganti jadi link asli
        let hm = "";
        try { hm = new URL(data.real_url || urlBerita).hostname; } catch(e){}
        setSumberBerita(data.sumber || (hm ? "Sumber Berita: " + hm : ""));
        if(data.gambar_url) setImageUrl(data.gambar_url);
        setEditorSubPage(2);
      } else { 
        if (data.need_manual) {
          alert("Gagal extract otomatis Google News.\n\n" + data.message + "\n\nSilakan buka Baca -> copy link asli portal, paste di sini.");
          setPromptTeks(getPreamble(urlBerita) + "\n\n" + data.message);
        } else {
          alert("Gagal extract: " + (data.error || data.message) + "\nReal URL: " + (data.real_url || '-')); 
        }
      }
    } catch(err) { alert("API error: " + err.message); }
  };

  if (currentPage === "agora-editor") {
    return (
      <div style={{ width: "100%", maxWidth: editorSubPage === 3 ? "950px" : "480px", margin: "0 auto", padding: "20px", transition: "max-width 0.3s ease" }}>
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "20px" }}>
          <button onClick={() => setCurrentPage(previousPage || "main")} style={{ backgroundColor: "#21262d", color: "#c9d1d9", padding: "8px 14px", borderRadius: "8px", fontSize: "12px", fontWeight: "600", border: "1px solid #30363d", cursor: "pointer", display: "flex", alignItems: "center", gap: "6px" }}><ArrowLeft size={14} /> Kembali</button>
          <h1 style={{ fontSize: "16px", fontWeight: "800", letterSpacing: "1px", color: "#ffffff", margin: 0 }}>⚡ AGORA VADA EDITOR</h1>
        </div>
        <div style={{ backgroundColor: "#161b22", border: "1px solid #30363d", borderRadius: "16px", padding: "24px", boxShadow: "0 10px 25px rgba(0,0,0,0.5)" }}>
          {editorSubPage === 1 && (
            <div>
              <h2 style={{ fontSize: "15px", fontWeight: "700", marginBottom: "16px", color: "#c9d1d9", borderBottom: "1px solid #30363d", paddingBottom: "8px" }}>1. Masukkan Link Berita</h2>
              <p style={{ fontSize: "11px", color: "#8b949e", marginBottom: "8px" }}>Bisa paste link Google News (news.google.com/rss) atau link asli. Sistem akan otomatis extract ke link asli + scraping full multi-halaman.</p>
              <input type="text" placeholder="https://news.google.com/rss/articles/... atau https://detik.com/..." style={{ width: "100%", backgroundColor: "#0d1117", border: "1px solid #30363d", color: "#ffffff", padding: "12px 14px", borderRadius: "10px", fontSize: "13px", outline: "none", marginBottom: "12px", boxSizing: "border-box" }} value={urlBerita} onChange={(e) => setUrlBerita(e.target.value)} />
              {urlBerita && urlBerita.includes('google.com') && (
                <div style={{ backgroundColor: "#1c2128", border: "1px dashed #30363d", padding: "8px 12px", borderRadius: "8px", marginBottom: "12px", fontSize: "11px", color: "#fbbf24" }}>
                  ⚠️ Terdeteksi Google News link. Klik "Extract Link Asli" untuk ubah jadi link sebenarnya (detik.com, kompas.com, dll) + auto scraping full.
                </div>
              )}
              <div style={{ display: "flex", gap: "8px", flexWrap: "wrap" }}>
                <button style={{ flex: "1 1 120px", backgroundColor: "#1f6feb", color: "#ffffff", padding: "12px", borderRadius: "10px", fontWeight: "700", fontSize: "12px", border: "none", cursor: "pointer" }} onClick={handleExtractLink}>🔗 Extract Link Asli + Full Scrape</button>
                <button style={{ width: "100%", backgroundColor: "#21262d", color: "#c9d1d9", padding: "10px", borderRadius: "10px", fontWeight: "600", fontSize: "12px", border: "1px solid #30363d", cursor: "pointer", marginTop: "4px" }} onClick={async () => {
                    if (!urlBerita) return alert("Masukkan link dulu!");
                    setPromptTeks("Menyedot data dari web, tunggu sebentar...");
                    try {
                      let tUrl = ["", "api", "tarik-berita"].join("/");
                      const res = await fetch(tUrl, { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ url: urlBerita }) });
                      const data = await res.json();
                      if(data && data.status === "success") {
                        let jdInput = data.title || "Tanpa Judul";
                        let preambuleTop = getPreamble(jdInput);
                        let isi = data.description || data.text || "";
                        if (isErrorPage(isi)) isi = "Gagal bypass Cloudflare.";
                        const info = `[${data.pages_scraped || 1} halaman ter-scrape]\n`;
                        setPromptTeks(preambuleTop + info + isi); 
                        setJudulHtml(jdInput);
                        setUrlBerita(data.real_url || urlBerita);
                        let hm = "";
                        try { hm = new URL(data.real_url || urlBerita).hostname; } catch(e){}
                        setSumberBerita(data.sumber || (hm ? "Sumber Berita: " + hm : ""));
                        if(data.gambar_url) setImageUrl(data.gambar_url);
                        setEditorSubPage(2);
                      } else { alert("Gagal menyedot: " + (data.error || data.message)); }
                    } catch(err) { alert("API error: " + err.message); }
                  }}>Tarik Data Cepat 🔄</button>
                <button style={{ width: "100%", backgroundColor: "#238636", color: "#ffffff", padding: "12px", borderRadius: "10px", fontWeight: "700", fontSize: "13px", border: "none", cursor: "pointer", marginTop: "4px" }} onClick={() => { if(urlBerita) { try { setSumberBerita("Sumber Berita: " + new URL(urlBerita).hostname); } catch(e) {} } setEditorSubPage(3); }}>Ke Visual Editor ➔</button>
              </div>
            </div>
          )}
          {editorSubPage === 2 && (
            <div>
              <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "16px", borderBottom: "1px solid #30363d", paddingBottom: "8px" }}>
                <h2 style={{ fontSize: "15px", fontWeight: "700", color: "#c9d1d9", margin: 0 }}>Prompt AI & Teks Berita</h2>
                <button onClick={() => { navigator.clipboard.writeText(promptTeks); setIsCopied(true); setTimeout(() => setIsCopied(false), 2000); }} style={{ backgroundColor: isCopied ? "#238636" : "#21262d", color: "#ffffff", padding: "6px 12px", borderRadius: "6px", fontSize: "11px", fontWeight: "600", border: "1px solid #30363d", cursor: "pointer" }}>{isCopied ? "✅ Tersalin!" : "📋 Copy Prompt"}</button>
              </div>
              <textarea style={{ width: "100%", backgroundColor: "#0d1117", border: "1px solid #30363d", color: "#e6edf3", padding: "12px", borderRadius: "10px", fontSize: "13px", minHeight: "280px", outline: "none", marginBottom: "12px", boxSizing: "border-box", resize: "vertical" }} value={promptTeks} onChange={(e) => setPromptTeks(e.target.value)} />
              <div style={{ display: "flex", gap: "10px" }}>
                <button style={{ width: "35%", backgroundColor: "#21262d", color: "#c9d1d9", padding: "12px", borderRadius: "10px", fontWeight: "600", fontSize: "13px", border: "1px solid #30363d", cursor: "pointer" }} onClick={() => setCurrentPage(previousPage || "main")}>⬅ Kembali</button>
                <button style={{ width: "65%", backgroundColor: "#1f6feb", color: "#ffffff", padding: "12px", borderRadius: "10px", fontWeight: "600", fontSize: "13px", border: "none", cursor: "pointer" }} onClick={() => setEditorSubPage(3)}>Ke Visual Editor ➔</button>
              </div>
            </div>
          )}
          {editorSubPage === 3 && (
            <div style={{ display: "flex", flexDirection: "column", gap: "24px" }}>
              <div style={{ backgroundColor: "#0d1117", border: "1px solid #30363d", borderRadius: "12px", padding: "20px" }}>
                <div style={{ display: "flex", gap: "24px", alignItems: "flex-start", justifyContent: "center", flexWrap: "wrap" }}>
                  <div style={{ display: "flex", flexDirection: "column", alignItems: "center" }}>
                    <h2 style={{ fontSize: "14px", fontWeight: "700", marginBottom: "12px", color: "#8b949e", textAlign: "center", letterSpacing: "1px" }}>LIVE PREVIEW (1080 x 1350)</h2>
                    <div style={{ border: "2px dashed #30363d", borderRadius: "10px", padding: "8px", cursor: isDragging ? "grabbing" : "grab", backgroundColor: "#161b22" }}>
                      <canvas ref={canvasRef} width="1080" height="1350" onMouseDown={handleMouseDown} onMouseMove={handleMouseMove} onMouseUp={handleMouseUp} onMouseLeave={handleMouseUp} onTouchStart={handleMouseDown} onTouchMove={handleMouseMove} onTouchEnd={handleMouseUp} onWheel={handleWheel} style={{ width: "280px", height: "auto", borderRadius: "6px", display: "block", touchAction: "none" }}></canvas>
                    </div>
                  </div>
                  <div style={{ display: "flex", flexDirection: "column", gap: "16px", width: "280px", marginTop: "28px" }}>
                    <div style={{ backgroundColor: "#161b22", padding: "16px", borderRadius: "10px", border: "1px solid #30363d" }}>
                      <label style={{ fontSize: "11px", fontWeight: "700", color: "#3fb950", display: "block", marginBottom: "8px" }}>🖼 UPLOAD GAMBAR</label>
                      <input type="file" accept="image/*" onChange={handleUploadFoto} style={{ fontSize: "11px", color: "#c9d1d9", width: "100%" }} />
                    </div>
                  </div>
                </div>
              </div>
              <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "20px" }}>
                <div style={{ display: "flex", flexDirection: "column", gap: "12px" }}>
                  <div style={{ backgroundColor: "#0d1117", padding: "16px", borderRadius: "12px", border: "1px solid #30363d" }}>
                    <label style={{ fontSize: "11px", fontWeight: "700", color: "#a371f7", display: "block", marginBottom: "10px", letterSpacing: "1px" }}>📝 EDIT JUDUL</label>
                    <div style={{ display: "flex", gap: "8px", marginBottom: "10px", alignItems: "center" }}>
                      <button onClick={() => handleFormat("foreColor", "#E7E820")} style={{ backgroundColor: "#E7E820", color: "#000", padding: "6px 12px", borderRadius: "6px", fontSize: "11px", fontWeight: "bold", cursor: "pointer", border: "none" }}>Kuning</button>
                      <button onClick={() => handleFormat("italic")} style={{ backgroundColor: "#21262d", color: "#fff", padding: "6px 14px", borderRadius: "6px", fontSize: "12px", fontWeight: "bold", fontStyle: "italic", cursor: "pointer", border: "1px solid #30363d" }}>I</button>
                      <button onClick={() => handleFormat("foreColor", "#ffffff")} style={{ backgroundColor: "transparent", color: "#c9d1d9", padding: "6px 10px", borderRadius: "6px", fontSize: "10px", cursor: "pointer", border: "1px solid #30363d" }}>Reset Warna</button>
                    </div>
                    <div id="judul-editor" contentEditable suppressContentEditableWarning={true} dangerouslySetInnerHTML={{ __html: judulHtml }} onInput={(e) => setJudulHtml(e.currentTarget.innerHTML)} style={{ width: "100%", backgroundColor: "#161b22", border: "1px solid #30363d", color: "#ffffff", padding: "12px", borderRadius: "8px", fontSize: "14px", minHeight: "110px", outline: "none", boxSizing: "border-box", overflowY: "auto", lineHeight: "1.5" }} />
                  </div>
                  <div style={{ backgroundColor: "#0d1117", padding: "16px", borderRadius: "12px", border: "1px solid #30363d" }}>
                    <label style={{ fontSize: "11px", fontWeight: "700", color: "#f78166", display: "block", marginBottom: "8px", letterSpacing: "1px" }}>🔗 SUMBER BERITA</label>
                    <input type="text" style={{ width: "100%", backgroundColor: "#161b22", border: "1px solid #30363d", color: "#ffffff", padding: "10px", borderRadius: "8px", fontSize: "13px", outline: "none", boxSizing: "border-box" }} value={sumberBerita} onChange={(e) => setSumberBerita(e.target.value)} />
                  </div>
                </div>
                <div style={{ display: "flex", flexDirection: "column", gap: "12px" }}>
                  <div style={{ backgroundColor: "#0d1117", padding: "12px 16px", borderRadius: "12px", border: "1px solid #30363d" }}>
                    <label style={{ fontSize: "11px", fontWeight: "700", color: "#3fb950", display: "block", marginBottom: "8px" }}>🖼 SKALA GAMBAR</label>
                    <div style={{ display: "grid", gridTemplateColumns: "1fr", gap: "8px" }}>
                      <div><span style={{ fontSize: "10px", color: "#8b949e", display: "flex", justifyContent: "space-between" }}><span>Zoom</span> <span>{imgScale.toFixed(2)}</span></span><input type="range" min="0.2" max="3" step="0.05" value={imgScale} onChange={(e) => setImgScale(parseFloat(e.target.value))} style={{ width: "100%", accentColor: "#3fb950" }} /></div>
                      <div><span style={{ fontSize: "10px", color: "#8b949e", display: "flex", justifyContent: "space-between" }}><span>X</span> <span>{imgX}</span></span><input type="range" min="-1000" max="1000" step="10" value={imgX} onChange={(e) => setImgX(parseInt(e.target.value))} style={{ width: "100%", accentColor: "#3fb950" }} /></div>
                      <div><span style={{ fontSize: "10px", color: "#8b949e", display: "flex", justifyContent: "space-between" }}><span>Y</span> <span>{imgY}</span></span><input type="range" min="-1000" max="1000" step="10" value={imgY} onChange={(e) => setImgY(parseInt(e.target.value))} style={{ width: "100%", accentColor: "#3fb950" }} /></div>
                    </div>
                  </div>
                  <div style={{ backgroundColor: "#0d1117", padding: "12px 16px", borderRadius: "12px", border: "1px solid #30363d" }}>
                    <label style={{ fontSize: "11px", fontWeight: "700", color: "#a371f7", display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "8px" }}><span>✨ POSISI JUDUL</span><button onClick={() => { setTeksX(140); setTeksY(800); setUkuranFont(79); setJarakBaris(1.4); }} style={{ background: "none", border: "none", cursor: "pointer", fontSize: "14px", padding: 0 }}>🔄</button></label>
                    <div style={{ display: "grid", gridTemplateColumns: "1fr", gap: "8px" }}>
                      <div><span style={{ fontSize: "10px", color: "#8b949e", display: "flex", justifyContent: "space-between" }}><span>Font Size</span> <span>{ukuranFont}</span></span><input type="range" min="30" max="400" step="1" value={ukuranFont} onChange={(e) => setUkuranFont(parseInt(e.target.value))} style={{ width: "100%", accentColor: "#a371f7" }} /></div>
                      <div><span style={{ fontSize: "10px", color: "#8b949e", display: "flex", justifyContent: "space-between" }}><span>X</span> <span>{teksX}</span></span><input type="range" min="-500" max="1080" step="1" value={teksX} onChange={(e) => setTeksX(parseInt(e.target.value))} style={{ width: "100%", accentColor: "#a371f7" }} /></div>
                      <div><span style={{ fontSize: "10px", color: "#8b949e", display: "flex", justifyContent: "space-between" }}><span>Y</span> <span>{teksY}</span></span><input type="range" min="-500" max="2000" step="1" value={teksY} onChange={(e) => setTeksY(parseInt(e.target.value))} style={{ width: "100%", accentColor: "#a371f7" }} /></div>
                    </div>
                  </div>
                </div>
              </div>
              <div style={{ display: "flex", gap: "10px", borderTop: "1px solid #30363d", paddingTop: "16px" }}>
                <button style={{ width: "30%", backgroundColor: "#21262d", color: "#c9d1d9", padding: "14px", borderRadius: "10px", fontWeight: "600", fontSize: "13px", border: "1px solid #30363d", cursor: "pointer" }} onClick={() => setEditorSubPage(2)}>⬅ Kembali</button>
                <button style={{ width: "70%", backgroundColor: "#238636", color: "#ffffff", padding: "14px", borderRadius: "10px", fontWeight: "700", fontSize: "14px", border: "none", cursor: "pointer" }} onClick={downloadGambar}>📥 Download Postingan IG</button>
              </div>
            </div>
          )}
        </div>
      </div>
    );
  }

  if (currentPage === "puan-yt-analysis") {
    let sortedYtVideos = ytData && ytData.length > 0 ? [...ytData].sort((a, b) => b[ytSortMode] - a[ytSortMode]) : [];
    return (
      <main className="min-h-screen p-4 md:p-8 bg-[#0d1117] text-gray-200 font-sans flex flex-col items-center relative">
        {promptModalData && (
          <div className="fixed inset-0 z-[9999] flex items-center justify-center p-4" style={{ backgroundColor: "rgba(0,0,0,0.85)" }}>
            <div className="rounded-2xl w-full max-w-3xl overflow-hidden shadow-[0_0_50px_rgba(0,0,0,0.8)] flex flex-col border border-gray-600" style={{ backgroundColor: "#161b22", opacity: 1 }}>
              <div className="flex justify-between items-center p-5 border-b border-gray-600" style={{ backgroundColor: "#1c2128" }}>
                <h3 className="text-white font-bold flex items-center gap-2"><Megaphone size={18} className="text-blue-400" /> Copy Prompt Analisis AI</h3>
                <button onClick={() => setPromptModalData(null)} className="text-gray-400 hover:text-white transition-colors p-1.5 bg-[#2a313c] rounded-lg"><X size={20} /></button>
              </div>
              <div className="p-6 flex-1 overflow-y-auto max-h-[60vh]" style={{ backgroundColor: "#0d1117" }}>
                <div className="border border-gray-700 rounded-xl p-5 shadow-inner" style={{ backgroundColor: "#1c2128" }}>
                  <pre className="text-[13px] md:text-sm text-gray-200 whitespace-pre-wrap font-mono leading-relaxed font-normal selection:bg-[#1e3a8a]">{promptModalData.fullText}</pre>
                </div>
              </div>
              <div className="p-4 border-t border-gray-600 flex justify-end" style={{ backgroundColor: "#1c2128" }}>
                <button onClick={() => handleCopyPrompt(promptModalData.fullText)} className={`flex items-center gap-2 px-6 py-2.5 rounded-xl font-bold transition-all ${isCopied ? "bg-[#16a34a] text-white shadow-md" : "bg-[#2563eb] hover:bg-[#1d4ed8] text-white shadow-md"}`}>{isCopied ? <Check size={16} /> : <Copy size={16} />}{isCopied ? "Prompt Tersalin!" : "Copy Prompt"}</button>
              </div>
            </div>
          </div>
        )}
        <div className="w-full max-w-6xl space-y-6 mt-4">
          <div className="flex justify-between items-center w-full">
            <button onClick={() => setCurrentPage("main")} className="flex items-center gap-2 text-gray-400 hover:text-white font-semibold transition-colors"><ArrowLeft size={18} /> Menu Utama</button>
            <button onClick={fetchYoutubeData} className="flex items-center gap-2 bg-[#161b22] px-4 py-2 rounded-xl text-sm font-semibold hover:bg-[#1f242c] transition-colors"><RefreshCw size={16} className={isLoadingYt ? "animate-spin" : ""} /> Refresh</button>
          </div>
          <div className="bg-[#161b22] rounded-2xl shadow-2xl overflow-hidden flex flex-col pb-4">
            <div className="w-full bg-[#0d1117] flex items-center">
              <button onClick={() => setYtFetchMode("umum")} className={`flex-1 py-4 text-sm font-bold text-center transition-colors ${ytFetchMode === "umum" ? "text-red-500 bg-[#331c0b]" : "text-gray-400 hover:bg-[#161b22]"}`}>Semua Saluran</button>
              <button onClick={() => setYtFetchMode("kol")} className={`flex-1 py-4 text-sm font-bold text-center transition-colors ${ytFetchMode === "kol" ? "text-blue-500 bg-[#172033]" : "text-gray-400 hover:bg-[#161b22]"}`}>KOL / Berita</button>
            </div>
            <div className="w-full p-4 md:p-6 flex flex-col lg:flex-row justify-between items-start md:items-center gap-6">
              <div className="flex items-center gap-3"><PlaySquare size={28} className={ytFetchMode === "kol" ? "text-blue-500" : "text-red-500"} /><div><h2 className="text-lg md:text-xl font-bold text-white leading-tight">YouTube Analysis: Puan Maharani</h2><p className="text-xs md:text-sm text-gray-400">7 hari terakhir (Filter &gt; 1.000 Views).</p></div></div>
              <div className="flex flex-wrap items-center gap-2 shrink-0"><span className="text-xs font-bold text-gray-400 mr-1">Urutkan:</span><button onClick={() => setYtSortMode("views")} className={`px-3 py-1.5 text-xs font-semibold rounded-lg transition-colors ${ytSortMode === "views" ? "bg-[#1f242c] text-white" : "bg-transparent text-gray-400 hover:bg-[#1c2128]"}`}>View</button><button onClick={() => setYtSortMode("likes")} className={`px-3 py-1.5 text-xs font-semibold rounded-lg transition-colors ${ytSortMode === "likes" ? "bg-[#1f242c] text-white" : "bg-transparent text-gray-400 hover:bg-[#1c2128]"}`}>Like</button><button onClick={() => setYtSortMode("dislikes")} className={`px-3 py-1.5 text-xs font-semibold rounded-lg transition-colors ${ytSortMode === "dislikes" ? "bg-[#1f242c] text-white" : "bg-transparent text-gray-400 hover:bg-[#1c2128]"}`}>Dislike</button></div>
            </div>
            {isLoadingYt ? (<div className="w-full flex justify-center items-center h-64"><div className="animate-spin rounded-full h-10 w-10 border-b-2 border-[#2563eb]"></div></div>) : sortedYtVideos.length > 0 ? (<>
                <div className="hidden md:block w-full overflow-x-auto mt-2">
                  <table className="w-full border-collapse text-xs md:text-sm text-left border-none">
                    <thead className="border-none"><tr className="text-gray-500 uppercase tracking-wider font-semibold text-[10px] md:text-[11px] border-none"><th className="py-5 px-4 text-center w-10 border-none">No</th><th className="py-5 px-4 text-left w-24 border-none">Tanggal</th><th className="py-5 px-4 text-left w-20 border-none">Waktu</th><th className="py-5 px-4 text-left border-none">Judul Konten</th><th className="py-5 px-4 text-right w-20 border-none">View</th><th className="py-5 px-4 text-right w-20 border-none">Like</th><th className="py-5 px-4 text-right w-20 border-none">Dislike</th><th className="py-5 px-4 text-center w-24 border-none">Link</th></tr></thead>
                    <tbody className="border-none">{sortedYtVideos.map((vid, idx) => (<tr key={vid.id} className="group transition-colors odd:bg-transparent even:bg-[#1a1f26] hover:bg-[#252b36] border-none"><td className="py-4 px-4 text-center text-gray-500 font-medium border-none">{idx + 1}</td><td className="py-4 px-4 text-gray-400 border-none">{vid.date}</td><td className="py-4 px-4 text-gray-400 border-none">{vid.time}</td><td className="py-4 px-4 border-none"><div className="flex items-start justify-between w-full"><div className="flex flex-col gap-1 flex-1 pr-4 max-w-[80%]"><span className={`text-[10px] font-black uppercase ${ytFetchMode === "kol" ? "text-blue-400" : "text-gray-400"}`}>@{vid.author}</span><span className="text-gray-100 group-hover:text-white transition-colors leading-relaxed block">{vid.title}</span></div><div className="shrink-0 flex items-start justify-end w-[50px] mt-0.5"><button onClick={() => handleOpenPrompt(vid)} title="Generate Prompt Analisis" className="text-gray-400 hover:text-blue-400 transition-colors bg-[#2a313c] hover:bg-[#1e3a5f] p-1.5 rounded-md flex items-center justify-center"><Megaphone size={14} /></button></div></div></td><td className="py-4 px-4 text-right text-gray-200 font-bold border-none">{vid.views.toLocaleString()}</td><td className="py-4 px-4 text-right text-blue-400 border-none">{vid.likes.toLocaleString()}</td><td className="py-4 px-4 text-right text-red-400 border-none">{vid.dislikes.toLocaleString()}</td><td className="py-4 px-4 text-center border-none"><a href={vid.link} target="_blank" rel="noopener noreferrer" className="inline-flex items-center text-gray-500 hover:text-white"><ExternalLink size={16} /></a></td></tr>))}</tbody>
                  </table>
                </div>
                <div className="flex flex-col gap-3 md:hidden px-3 mt-2">{sortedYtVideos.map((vid, idx) => (<div key={vid.id} className="bg-[#0d1117] border border-[#30363d] rounded-xl p-4 flex flex-col gap-3 mx-auto w-full max-w-md shadow-lg"><div className="flex justify-between items-start gap-2"><span className={`text-[10px] font-black uppercase ${ytFetchMode === "kol" ? "text-blue-400" : "text-gray-400"}`}>@{vid.author}</span><span className="text-[10px] text-gray-500 font-medium px-2 py-0.5 bg-[#1c2128] rounded">#{idx + 1}</span></div><h3 className="text-gray-200 font-medium text-sm leading-snug">{vid.title}</h3><div className="flex flex-wrap items-center gap-x-3 gap-y-1 text-[11px] text-gray-400"><span>{vid.date}</span><span>•</span><span>{vid.time}</span></div><div className="grid grid-cols-3 gap-2 py-3 mt-1 border-t border-[#30363d]"><div className="flex flex-col items-center justify-center"><span className="text-gray-500 text-[10px] flex items-center gap-1"><Eye size={10}/> View</span><span className="text-gray-200 font-bold text-xs">{vid.views.toLocaleString()}</span></div><div className="flex flex-col items-center justify-center"><span className="text-gray-500 text-[10px] flex items-center gap-1"><ThumbsUp size={10}/> Like</span><span className="text-blue-400 font-bold text-xs">{vid.likes.toLocaleString()}</span></div><div className="flex flex-col items-center justify-center"><span className="text-gray-500 text-[10px] flex items-center gap-1"><ThumbsDown size={10}/> Dislike</span><span className="text-red-400 font-bold text-xs">{vid.dislikes.toLocaleString()}</span></div></div><div className="pt-2 border-t border-[#30363d] flex justify-end gap-2"><button onClick={() => handleOpenPrompt(vid)} className="px-3 py-2 rounded-lg text-xs font-bold text-gray-300 bg-[#1c2128] hover:bg-[#2d333b] flex items-center justify-center gap-1.5"><Megaphone size={14} /> Prompt</button><a href={vid.link} target="_blank" rel="noopener noreferrer" className="px-4 py-2 rounded-lg text-xs font-bold text-white transition-all flex items-center justify-center gap-1.5 flex-1 bg-[#374151] hover:bg-[#4b5563] shadow-md"><ExternalLink size={14} /> Tonton Video</a></div></div>))}</div>
              </>) : (<div className="w-full flex justify-center items-center h-64 text-gray-500 text-sm">Tidak ada video terkait.</div>)}
          </div>
        </div>
      </main>
    );
  }

  if (currentPage === "main") {
    return (
      <main className="h-screen w-screen overflow-hidden bg-[#0d1117] flex flex-col items-center justify-center p-4">
        <div className="w-full max-w-3xl flex flex-col items-center justify-center gap-6 md:gap-8 h-full max-h-[95vh]">
          <div className="text-center shrink-0 mb-2"><h1 className="text-4xl md:text-5xl font-black text-white tracking-tight drop-shadow-sm mb-2">Public Trend Radar</h1><p className="text-gray-400 text-sm md:text-base font-medium">Monitoring isu publik terupdate secara real-time.</p></div>
          <div className="flex flex-col gap-5 md:gap-6 w-full px-2 md:px-8">
            <div className="flex flex-row items-center w-full group cursor-pointer transition-transform duration-300 hover:translate-x-2"><img src="/nasional.png" alt="Nasional" className="w-20 h-20 md:w-28 md:h-28 rounded-2xl object-cover shrink-0 shadow-lg border border-[#1c2128]" /><div className="flex flex-col ml-6 md:ml-8 flex-1 justify-center text-left"><h2 className="text-white font-bold text-xl md:text-2xl mb-2 md:mb-3">Berita Nasional</h2><button onClick={() => setCurrentPage("nasional")} className="bg-[#3f444e] hover:bg-[#2d3038] text-white py-2 px-6 md:px-8 rounded-lg text-xs md:text-sm font-bold flex items-center gap-2 shadow-md w-max transition-colors border border-[#5a5e6b]"><Search size={16}/> Cek Sekarang</button></div></div>
            <div className="flex flex-row items-center w-full group cursor-pointer transition-transform duration-300 hover:translate-x-2"><img src="/bencana.png" alt="Bencana" className="w-20 h-20 md:w-28 md:h-28 rounded-2xl object-cover shrink-0 shadow-lg border border-[#1c2128]" /><div className="flex flex-col ml-6 md:ml-8 flex-1 justify-center text-left"><h2 className="text-white font-bold text-xl md:text-2xl mb-2 md:mb-3">Bencana Terkini</h2><button onClick={() => setCurrentPage("bencana")} className="bg-[#3f444e] hover:bg-[#2d3038] text-white py-2 px-6 md:px-8 rounded-lg text-xs md:text-sm font-bold flex items-center gap-2 shadow-md w-max transition-colors border border-[#5a5e6b]"><Search size={16}/> Cek Sekarang</button></div></div>
            <div className="flex flex-row items-center w-full group cursor-pointer transition-transform duration-300 hover:translate-x-2"><img src="/pdip.png" alt="PDIP" className="w-20 h-20 md:w-28 md:h-28 rounded-2xl object-cover shrink-0 shadow-lg border border-[#1c2128]" /><div className="flex flex-col ml-6 md:ml-8 flex-1 justify-center text-left"><h2 className="text-white font-bold text-xl md:text-2xl mb-2 md:mb-3">PDI Perjuangan</h2><button onClick={() => setCurrentPage("pdip")} className="bg-[#3f444e] hover:bg-[#2d3038] text-white py-2 px-6 md:px-8 rounded-lg text-xs md:text-sm font-bold flex items-center gap-2 shadow-md w-max transition-colors border border-[#5a5e6b]"><Search size={16}/> Cek Sekarang</button></div></div>
            <div className="flex flex-row items-center w-full group cursor-pointer transition-transform duration-300 hover:translate-x-2"><img src="/megawati.png" alt="Megawati" className="w-20 h-20 md:w-28 md:h-28 rounded-2xl object-cover shrink-0 shadow-lg border border-[#1c2128]" /><div className="flex flex-col ml-6 md:ml-8 flex-1 justify-center text-left"><h2 className="text-white font-bold text-xl md:text-2xl mb-2 md:mb-3">Megawati Soekarnoputri</h2><button onClick={() => setCurrentPage("megawati")} className="bg-[#3f444e] hover:bg-[#2d3038] text-white py-2 px-6 md:px-8 rounded-lg text-xs md:text-sm font-bold flex items-center gap-2 shadow-md w-max transition-colors border border-[#5a5e6b]"><Search size={16}/> Cek Sekarang</button></div></div>
            <div className="flex flex-row items-center w-full group cursor-pointer transition-transform duration-300 hover:translate-x-2"><img src="/puan.png" alt="Puan Maharani" className="w-20 h-20 md:w-28 md:h-28 rounded-2xl object-cover object-top shrink-0 shadow-lg border border-[#1c2128]" /><div className="flex flex-col ml-6 md:ml-8 flex-1 justify-center text-left"><h2 className="text-white font-bold text-xl md:text-2xl mb-2 md:mb-3">Puan Maharani</h2><div className="flex flex-wrap gap-2 md:gap-3"><button onClick={() => setCurrentPage("puan")} className="bg-[#3f444e] hover:bg-[#2d3038] text-white py-2 px-6 md:px-8 rounded-lg text-xs md:text-sm font-bold flex items-center gap-2 shadow-md w-max transition-colors border border-[#5a5e6b]"><Search size={16}/> Cek Sekarang</button><button onClick={() => setCurrentPage("puan-yt-analysis")} className="bg-transparent text-gray-400 hover:bg-[#1c2128] hover:text-white py-2 px-4 md:px-5 rounded-lg text-xs md:text-sm font-bold flex items-center gap-2 transition-colors"><PlaySquare size={16}/> YouTube</button></div></div></div>
          </div>
        </div>
      </main>
    );
  }

  return (
    <main className="min-h-screen p-4 md:p-8 bg-[#0d1117] text-gray-200 font-sans flex flex-col items-center relative">
      <div className="w-full max-w-[1400px] mt-4">
        <div className="flex flex-wrap gap-4 justify-between items-center w-full px-2 mb-8">
          <button onClick={() => setCurrentPage("main")} className="flex items-center gap-2 text-gray-400 hover:text-white font-semibold transition-colors"><ArrowLeft size={18} /> Menu Utama</button>
          <h1 className="text-xl md:text-2xl font-black text-white text-center flex-1 hidden md:block">Daftar Monitor Isu</h1>
          <button onClick={fetchLiveTrends} className="flex items-center gap-2 bg-[#161b22] px-4 py-2 rounded-xl text-sm font-semibold hover:bg-[#1f242c] transition-colors"><RefreshCw size={16} className={isLoading ? "animate-spin" : ""} /> Refresh</button>
        </div>
        <div className="w-full my-6 md:my-10 flex flex-col items-center gap-6">
          <div className="flex flex-wrap items-center justify-center gap-3 md:gap-8 px-2">
            {categories.map((cat) => (<button key={cat} onClick={() => setSelectedCategory(cat)} className={`text-xs md:text-sm font-bold transition-all ${selectedCategory === cat ? (isRedTheme ? "text-red-400 border-b-2 border-red-400 pb-1" : "text-blue-400 border-b-2 border-blue-400 pb-1") : "text-gray-500 hover:text-gray-300"}`}>{cat}</button>))}
          </div>
          <div className="flex flex-col items-center gap-2">
            <span className="text-[10px] uppercase tracking-widest text-gray-500 font-bold flex items-center gap-1"><Calendar size={10}/> Rentang Waktu Berita</span>
            <div className="flex items-center gap-1.5 bg-[#161b22] border border-[#2a313c] p-1 rounded-xl shadow-inner">
              {hoursOptions.map((h) => (
                <button key={h} onClick={() => setSelectedHours(h)} className={`px-4 py-1.5 rounded-lg text-xs font-bold transition-all ${selectedHours === h ? "bg-[#3f444e] text-white shadow-md border border-[#5a5e6b]" : "text-gray-400 hover:text-white hover:bg-[#1c2128]"}`}>
                  {h} Jam
                </button>
              ))}
            </div>
            <span className="text-[10px] text-gray-600">Top & Terkini mengikuti {selectedHours} jam terakhir • Clustering embedding aktif</span>
          </div>
        </div>
        {isLoading ? (<div className="flex justify-center items-center h-64"><div className={`animate-spin rounded-full h-12 w-12 border-b-2 ${isRedTheme ? "border-[#dc2626]" : "border-[#2563eb]"}`}></div></div>) : (
          <div className="bg-[#161b22] rounded-2xl shadow-2xl overflow-hidden pb-6">
            <div className="w-full px-4 md:px-6 py-4 flex flex-wrap justify-between items-center gap-3">
              <h1 className="text-lg font-bold text-white md:hidden">Daftar Isu Terkini</h1>
              <div className="flex items-center gap-3 md:ml-auto">
                <button onClick={() => setIsTopNewsFilter(!isTopNewsFilter)} className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-bold transition-all ${isTopNewsFilter ? "bg-[#331c0b] text-orange-500" : "bg-[#1c2128] text-gray-400 hover:text-orange-400"}`}><Flame size={14} className={isTopNewsFilter ? "text-white" : "text-orange-500"} /> Filter Top News {isTopNewsFilter ? `(${tableData.filter(d=>d.isTrending).length})` : `(${terkiniData.filter(d=> (d.clusterSize>=3 || d.sourcesCount>=3 || d.volume>=70)).length})`}</button>
                <span className="text-xs font-medium text-gray-500 hidden md:block">Total: {tableData.length} / {terkiniData.length} data | Top: {terkiniData.filter(d=>d.isTop).length} | Global: {terkiniData.filter(d=>d.kategori==="Global").length} | Kriminal: {terkiniData.filter(d=>d.kategori==="Kriminal").length}</span>
              </div>
            </div>
            {tableData.length > 0 ? (<>
                <div className="hidden md:block w-full overflow-x-auto mt-2">
                  <table className="w-full border-collapse text-xs md:text-sm text-left border-none">
                    <thead className="border-none"><tr className="text-gray-500 uppercase tracking-wider font-semibold text-[10px] md:text-[11px] border-none"><th className="py-5 px-4 w-12 text-center border-none">No</th><th className="py-5 px-4 w-32 whitespace-nowrap border-none">Tanggal</th><th className="py-5 px-4 w-20 whitespace-nowrap text-center border-none">Waktu</th><th className="py-5 px-4 w-32 whitespace-nowrap border-none">Sumber</th><th className="py-5 px-4 w-28 border-none">Kategori</th><th className="py-5 px-4 w-[40%] border-none">Judul Konten</th><th className="py-5 px-4 w-16 text-center border-none">Top</th><th className="py-5 px-4 w-16 text-center border-none">Editor</th><th className="py-5 px-4 w-24 text-center border-none">Aksi</th></tr></thead>
                    <tbody className="border-none">{tableData.map((isu, idx) => {
                        const { date, time } = formatDateTime(isu.pubDate);
                        const newsLink = getCleanLink(isu);
                        return (<tr key={idx} className="group transition-colors odd:bg-transparent even:bg-[#1a1f26] hover:bg-[#252b36] border-none"><td className="py-4 px-4 text-center text-gray-500 font-medium border-none">{idx + 1}</td><td className="py-4 px-4 text-gray-400 whitespace-nowrap border-none">{date}</td><td className="py-4 px-4 text-gray-400 whitespace-nowrap text-center border-none">{time}</td><td className="py-4 px-4 text-gray-300 font-medium truncate max-w-[128px] border-none">{isu.source || "-"}</td><td className="py-4 px-4 border-none"><span className={`inline-block px-2 py-1 rounded text-[10px] font-bold uppercase tracking-wider ${isRedTheme ? "bg-[#450a0a] text-red-400" : "bg-[#172033] text-blue-400"}`}>{isu.kategori}</span></td><td className="py-4 px-4 border-none"><span className="text-gray-200 font-medium leading-relaxed group-hover:text-white transition-colors">{isu.topik}</span></td><td className="py-4 px-4 text-center border-none">{isu.isTrending ? (<div className="bg-[#332211] px-2 py-1 rounded flex items-center justify-center gap-1 mx-auto w-fit" title="Top News (Trending)"><Flame size={12} className="text-orange-500" /><span className="text-[9px] font-bold text-orange-500 uppercase">Top</span></div>) : (<span className="text-gray-600 text-[10px]">-</span>)}</td><td className="py-4 px-4 text-center border-none"><button onClick={() => handleOpenEditorFromMegaphone(isu)} title="Buka di Agora Editor - Setelah TOP" className="text-gray-300 hover:text-blue-400 transition-colors bg-[#2a313c] hover:bg-[#1e3a5f] p-2 rounded-md flex items-center justify-center mx-auto border border-[#30363d]"><Megaphone size={14} /></button></td><td className="py-4 px-4 text-center border-none">{newsLink !== "#" ? (<a href={newsLink} target="_blank" rel="noopener noreferrer" className="px-4 py-2 rounded-lg text-xs font-bold text-white transition-all flex items-center justify-center gap-1.5 mx-auto max-w-[90px] bg-[#374151] hover:bg-[#4b5563] shadow-md"><ExternalLink size={14} /> Baca</a>) : (<span className="text-gray-600 text-xs font-medium italic">No Link</span>)}</td></tr>);
                      })}</tbody>
                  </table>
                </div>
                <div className="flex flex-col gap-3 md:hidden px-3 mt-2">{tableData.map((isu, idx) => {
                    const { date, time } = formatDateTime(isu.pubDate);
                    const newsLink = getCleanLink(isu);
                    return (<div key={idx} className="bg-[#0d1117] border border-[#30363d] rounded-xl p-4 flex flex-col gap-3 mx-auto w-full max-w-md shadow-lg"><div className="flex justify-between items-start gap-2"><span className={`inline-block px-2 py-1 rounded text-[10px] font-bold uppercase tracking-wider ${isRedTheme ? "bg-[#450a0a] text-red-400" : "bg-[#172033] text-blue-400"}`}>{isu.kategori}</span><div className="flex items-center gap-2"><span className="text-[10px] text-gray-500 font-medium px-2 py-0.5 bg-[#1c2128] rounded">#{idx + 1}</span></div></div><div className="flex items-start justify-between gap-3"><h3 className="text-gray-200 font-medium text-sm leading-snug">{isu.topik}</h3></div><div className="flex flex-wrap items-center gap-x-2 gap-y-1 text-xs text-gray-500"><span>{date}</span><span>•</span><span>{time}</span><span>•</span><span className="text-gray-400 font-medium">{isu.source || "-"}</span></div><div className="pt-3 mt-1 border-t border-[#30363d] flex items-center justify-between gap-2"><div className="flex items-center gap-2">{isu.isTrending && (<div className="bg-[#332211] px-2 py-1 rounded flex items-center gap-1"><Flame size={10} className="text-orange-500" /><span className="text-[9px] font-bold text-orange-500 uppercase">Top</span></div>)}<button onClick={() => handleOpenEditorFromMegaphone(isu)} className="px-3 py-2 rounded-lg text-xs font-bold text-gray-300 bg-[#1c2128] hover:bg-[#2d333b] flex items-center justify-center gap-1.5 border border-[#30363d]"><Megaphone size={14} /> Editor</button></div>{newsLink !== "#" ? (<a href={newsLink} target="_blank" rel="noopener noreferrer" className="px-4 py-2 rounded-lg text-xs font-bold text-white transition-all flex items-center justify-center gap-1.5 bg-[#374151] hover:bg-[#4b5563] shadow-md"><ExternalLink size={14} /> Baca Artikel</a>) : (<span className="text-gray-600 text-xs font-medium italic">No Link</span>)}</div></div>);
                  })}</div>
              </>) : (<div className="flex flex-col items-center justify-center py-16 px-4"><Search size={40} className="text-gray-600 mb-4" /><p className="text-gray-400 text-lg font-medium text-center">Tidak ada data yang ditemukan.</p><p className="text-gray-500 text-sm text-center mt-1">Coba ubah filter kategori atau matikan filter Top News.</p></div>)}
          </div>
        )}
      </div>
    </main>
  );
}
