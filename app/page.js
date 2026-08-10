"use client";

import React, { useState, useRef, useEffect } from 'react';

export default function AgoraVadaPortal() {
  const [currentPage, setCurrentPage] = useState(1);
  const [urlBerita, setUrlBerita] = useState('');
  const [promptTeks, setPromptTeks] = useState('');
  
  const [judulHtml, setJudulHtml] = useState('');
  const [sumberBerita, setSumberBerita] = useState('');
  const [imageUrl, setImageUrl] = useState(''); 
  
  const [isCopied, setIsCopied] = useState(false);
  
  const [imgX, setImgX] = useState(0);
  const [imgY, setImgY] = useState(0);
  const [imgScale, setImgScale] = useState(1);
  const [isDragging, setIsDragging] = useState(false);
  const [dragStart, setDragStart] = useState({ x: 0, y: 0 });

  const [teksX, setTeksX] = useState(140);
  const [teksY, setTeksY] = useState(800);
  const [ukuranFont, setUkuranFont] = useState(79);
  const [jarakBaris, setJarakBaris] = useState(1.4);

  const [sumberX, setSumberX] = useState(142); 
  const [sumberY, setSumberY] = useState(710);
  const [ukuranFontSumber, setUkuranFontSumber] = useState(28);

  const canvasRef = useRef(null);

  // CACHE MEMORY UNTUK GAMBAR
  const [loadedBgImg, setLoadedBgImg] = useState(null);
  const [templateImgObj, setTemplateImgObj] = useState(null);

  useEffect(() => {
    const loadFonts = async () => {
      try {
        const fontSB = new FontFace('PoppinsSemiBold', 'url(/Poppins-SemiBold.ttf)');
        await fontSB.load();
        document.fonts.add(fontSB);

        const fontSBI = new FontFace('PoppinsSemiBoldItalic', 'url(/Poppins-SemiBoldItalic.ttf)');
        await fontSBI.load();
        document.fonts.add(fontSBI);
      } catch (err) {
        console.warn("Font Poppins gagal di-load. Pastikan file ada di folder public.");
      }
    };
    loadFonts();

    const tImg = new Image();
    tImg.src = '/Agora Vada Template.png';
    tImg.onload = () => setTemplateImgObj(tImg);
  }, []);

  useEffect(() => {
    if (!imageUrl) {
      setLoadedBgImg(null);
      return;
    }

    let isCancelled = false;

    const fetchImageSafely = async () => {
      const tryLoad = (url) => new Promise((resolve, reject) => {
        const img = new Image();
        img.crossOrigin = 'anonymous';
        img.onload = () => resolve(img);
        img.onerror = () => reject();
        img.src = url;
      });

      if (!imageUrl.startsWith('http')) {
        try { 
          const img = await tryLoad(imageUrl); 
          if (!isCancelled) setLoadedBgImg(img); 
        } catch(e) {}
        return;
      }

      const proxies = [
        `https://api.allorigins.win/raw?url=${encodeURIComponent(imageUrl)}`,
        `https://wsrv.nl/?url=${encodeURIComponent(imageUrl)}`,
        `https://corsproxy.io/?${encodeURIComponent(imageUrl)}`,
        imageUrl 
      ];

      for (let proxy of proxies) {
        try {
          const img = await tryLoad(proxy);
          if (!isCancelled) setLoadedBgImg(img);
          return; 
        } catch(e) {
          continue; 
        }
      }

      if (!isCancelled) {
        setLoadedBgImg(null);
        alert("Server website memblokir akses gambar ini. Silakan download gambarnya secara manual, lalu gunakan menu 'UPLOAD DARI PC/HP'.");
      }
    };

    fetchImageSafely();

    return () => { isCancelled = true; };
  }, [imageUrl]);

  const handleFormat = (command, value = null) => {
    document.execCommand(command, false, value);
    const editor = document.getElementById('judul-editor');
    if (editor) setJudulHtml(editor.innerHTML);
  };

  const renderRichText = (ctx, htmlString, x, y, maxWidth, lineHeight, baseFontSize) => {
    if (!htmlString) return; 
    ctx.textAlign = 'left'; 
    ctx.textBaseline = 'top'; 

    const cleanHTML = htmlString
      .replace(/<div[^>]*><br><\/div>/gi, '\n')
      .replace(/<div[^>]*>/gi, '\n')
      .replace(/<\/div>/gi, '')
      .replace(/<br\s*[\/]?>/gi, '\n');

    const tempDiv = document.createElement('div');
    tempDiv.innerHTML = cleanHTML;
    
    let wordsWithContext = [];
    const extract = (node, currentContext) => {
      if (node.nodeType === Node.TEXT_NODE) {
        let text = node.textContent;
        let tokens = text.split('\n');
        tokens.forEach((lineText, index) => {
          if (index > 0) wordsWithContext.push({ word: '', ...currentContext, isNewline: true });
          let words = lineText.split(/\s+/);
          words.forEach(w => {
            if (w.trim().length > 0) wordsWithContext.push({ word: w.trim(), ...currentContext, isNewline: false });
          });
        });
      } else if (node.nodeType === Node.ELEMENT_NODE) {
        let newContext = { ...currentContext };
        const tag = node.tagName.toLowerCase();
        
        if (tag === 'i' || tag === 'em') newContext.isItalic = true;
        if (node.style && node.style.color) newContext.color = node.style.color;
        if (tag === 'font' && node.getAttribute('color')) newContext.color = node.getAttribute('color');
        
        node.childNodes.forEach(child => extract(child, newContext));
      }
    };
    
    extract(tempDiv, { color: '#FFFFFF', isItalic: false }); 

    let lines = [];
    let currentLine = [];
    let currentWidth = 0;
    
    ctx.font = `${baseFontSize}px PoppinsSemiBold, sans-serif`;
    const spaceWidth = ctx.measureText(' ').width;

    wordsWithContext.forEach(item => {
      if (item.isNewline) {
        lines.push(currentLine);
        currentLine = [];
        currentWidth = 0;
      } else {
        const fontName = item.isItalic ? 'PoppinsSemiBoldItalic' : 'PoppinsSemiBold';
        ctx.font = `${baseFontSize}px ${fontName}, sans-serif`;
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
        const fontName = item.isItalic ? 'PoppinsSemiBoldItalic' : 'PoppinsSemiBold';
        ctx.font = `${baseFontSize}px ${fontName}, sans-serif`;
        ctx.fillStyle = item.color;
        ctx.fillText(item.word, currentX, currentY);
        currentX += ctx.measureText(item.word).width + spaceWidth;
      });
      currentY += lineHeight;
    });
  };

  useEffect(() => {
    if (currentPage !== 3) return;
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');

    ctx.fillStyle = '#111827';
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
      ctx.fillStyle = '#FFFFFF';
      ctx.font = `${ukuranFontSumber}px PoppinsSemiBoldItalic, sans-serif`;
      ctx.textAlign = 'left';
      ctx.textBaseline = 'top';
      ctx.fillText(sumberBerita, sumberX, sumberY);
    }

  }, [currentPage, loadedBgImg, templateImgObj, imgX, imgY, imgScale, teksX, teksY, ukuranFont, jarakBaris, sumberX, sumberY, ukuranFontSumber, judulHtml, sumberBerita]);


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
      const link = document.createElement('a');
      link.download = 'AgoraVada_Post.jpg';
      link.href = canvas.toDataURL("image/jpeg", 0.95);
      link.click();
    }
  };

  const handleCopyPrompt = () => {
    navigator.clipboard.writeText(promptTeks);
    setIsCopied(true);
    setTimeout(() => {
      setIsCopied(false);
    }, 2000); 
  };

  return (
    <div style={{ width: '100%', maxWidth: currentPage === 3 ? '950px' : '480px', margin: '0 auto', padding: '20px', transition: 'max-width 0.3s ease' }}>
      
      <div style={{ textAlign: 'center', marginBottom: '20px' }}>
        <h1 style={{ fontSize: '20px', fontWeight: '800', letterSpacing: '1px', color: '#ffffff' }}>
          ⚡ AGORA VADA
        </h1>
      </div>

      <div style={{ backgroundColor: '#161b22', border: '1px solid #30363d', borderRadius: '16px', padding: '24px', boxShadow: '0 10px 25px rgba(0,0,0,0.5)' }}>

        {/* ================= PAGE 1 ================= */}
        {currentPage === 1 && (
          <div>
            <h2 style={{ fontSize: '15px', fontWeight: '700', marginBottom: '16px', color: '#c9d1d9', borderBottom: '1px solid #30363d', paddingBottom: '8px' }}>1. Masukkan Link Berita</h2>
            <input 
              type="text" placeholder="https://news.com/..." 
              style={{ width: '100%', backgroundColor: '#0d1117', border: '1px solid #30363d', color: '#ffffff', padding: '12px 14px', borderRadius: '10px', fontSize: '14px', outline: 'none', marginBottom: '16px', boxSizing: 'border-box' }}
              value={urlBerita} onChange={(e) => setUrlBerita(e.target.value)}
            />
            <div style={{ display: 'flex', gap: '10px' }}>
              <button 
                style={{ width: '50%', backgroundColor: '#21262d', color: '#c9d1d9', padding: '12px', borderRadius: '10px', fontWeight: '600', fontSize: '13px', border: '1px solid #30363d', cursor: 'pointer' }}
                onClick={async () => {
                  if (!urlBerita) return alert("Masukkan link dulu!");
                  
                  setPromptTeks("Menyedot data dari web, tunggu sebentar...");
                  try {
                    const res = await fetch("/api/tarik-berita", { 
                      method: "POST", 
                      headers: { "Content-Type": "application/json" }, 
                      body: JSON.stringify({ url: urlBerita }) 
                    });
                    
                    const data = await res.json();
                    
                    if(data.status === "success") {
                      const promptSakti = `Tolong buat 10 judul berita menggunakan hook dan copywriter handal untuk media alternatif "AgoraVada", serta buatkan caption untuk instagram, normatif saja dan informatif. Pastikan diakhiri oleh sumber berita dan 3 hastag (wajib ada #AgoraVada sisanya disesuaikan dengan kata kunci subjek dan topik yang dibahas).\n\n${data.prompt}`;
                      
                      setPromptTeks(promptSakti); 
                      setSumberBerita(data.sumber || (urlBerita ? `Sumber Berita: ${new URL(urlBerita).hostname}` : ''));
                      if(data.gambar_url) setImageUrl(data.gambar_url);
                      setCurrentPage(2);
                    } else {
                      alert("Gagal menyedot: " + data.detail);
                      setPromptTeks("Gagal menyedot data otomatis. Silakan ketik manual.");
                    }
                  } catch(err) { 
                    alert("Gagal konek ke API Vercel. Pastikan folder app/api/tarik-berita/route.js sudah dibuat."); 
                  }
                }}
              >Tarik Data 🔄</button>
              <button 
                style={{ width: '50%', backgroundColor: '#238636', color: '#ffffff', padding: '12px', borderRadius: '10px', fontWeight: '700', fontSize: '13px', border: 'none', cursor: 'pointer' }}
                onClick={() => {
                  if(urlBerita) { 
                    try { setSumberBerita(`Sumber Berita: ${new URL(urlBerita).hostname}`); } 
                    catch(e) { setSumberBerita(''); } 
                  }
                  setCurrentPage(3);
                }}
              >Langsung ke Editor ➔</button>
            </div>
          </div>
        )}

        {/* ================= PAGE 2 ================= */}
        {currentPage === 2 && (
          <div>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '16px', borderBottom: '1px solid #30363d', paddingBottom: '8px' }}>
              <h2 style={{ fontSize: '15px', fontWeight: '700', color: '#c9d1d9', margin: 0 }}>2. Prompt Manual & Edit Teks</h2>
              <button 
                onClick={handleCopyPrompt}
                style={{ 
                  backgroundColor: isCopied ? '#238636' : '#21262d', 
                  color: '#ffffff', 
                  padding: '6px 12px', 
                  borderRadius: '6px', 
                  fontSize: '11px', 
                  fontWeight: '600', 
                  border: isCopied ? '1px solid #2ea043' : '1px solid #30363d', 
                  cursor: 'pointer', 
                  display: 'flex', 
                  alignItems: 'center',
                  transition: 'all 0.2s ease'
                }}
              >
                {isCopied ? "✅ Tersalin!" : "📋 Copy Prompt"}
              </button>
            </div>
            
            <textarea 
              style={{ width: '100%', backgroundColor: '#0d1117', border: '1px solid #30363d', color: '#e6edf3', padding: '12px', borderRadius: '10px', fontSize: '13px', minHeight: '280px', outline: 'none', marginBottom: '12px', boxSizing: 'border-box', resize: 'vertical' }}
              value={promptTeks} onChange={(e) => setPromptTeks(e.target.value)}
            />
            <div style={{ display: 'flex', gap: '10px' }}>
              <button style={{ width: '35%', backgroundColor: '#21262d', color: '#c9d1d9', padding: '12px', borderRadius: '10px', fontWeight: '600', fontSize: '13px', border: '1px solid #30363d', cursor: 'pointer' }} onClick={() => setCurrentPage(1)}>⬅ Kembali</button>
              <button style={{ width: '65%', backgroundColor: '#1f6feb', color: '#ffffff', padding: '12px', borderRadius: '10px', fontWeight: '600', fontSize: '13px', border: 'none', cursor: 'pointer' }} onClick={() => setCurrentPage(3)}>Ke Visual Editor ➔</button>
            </div>
          </div>
        )}

        {/* ================= PAGE 3 ================= */}
        {currentPage === 3 && (
          <div style={{ display: 'flex', flexDirection: 'column', gap: '24px' }}>
            
            {/* BAGIAN ATAS: LIVE PREVIEW & SUMBER GAMBAR KANAN */}
            <div style={{ backgroundColor: '#0d1117', border: '1px solid #30363d', borderRadius: '12px', padding: '20px' }}>
              <div style={{ display: 'flex', gap: '24px', alignItems: 'flex-start', justifyContent: 'center', flexWrap: 'wrap' }}>
                
                {/* KANVAS KIRI */}
                <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center' }}>
                  <h2 style={{ fontSize: '14px', fontWeight: '700', marginBottom: '12px', color: '#8b949e', textAlign: 'center', letterSpacing: '1px' }}>
                    LIVE PREVIEW (1080 x 1350)
                  </h2>
                  <div style={{ border: '2px dashed #30363d', borderRadius: '10px', padding: '8px', cursor: isDragging ? 'grabbing' : 'grab', backgroundColor: '#161b22' }}>
                    <canvas 
                      ref={canvasRef} width="1080" height="1350" 
                      onMouseDown={handleMouseDown} onMouseMove={handleMouseMove} onMouseUp={handleMouseUp} onMouseLeave={handleMouseUp}
                      onTouchStart={handleMouseDown} onTouchMove={handleMouseMove} onTouchEnd={handleMouseUp} onWheel={handleWheel}
                      style={{ width: '280px', height: 'auto', borderRadius: '6px', display: 'block', touchAction: 'none' }}
                    ></canvas>
                  </div>
                </div>

                {/* BOARD GAMBAR (KANAN) */}
                <div style={{ display: 'flex', flexDirection: 'column', gap: '16px', width: '280px', marginTop: '28px' }}>
                  <div style={{ backgroundColor: '#161b22', padding: '16px', borderRadius: '10px', border: '1px solid #30363d' }}>
                    <label style={{ fontSize: '11px', fontWeight: '700', color: '#3fb950', display: 'block', marginBottom: '8px' }}>🖼️ UPLOAD DARI PC/HP</label>
                    <input type="file" accept="image/*" onChange={handleUploadFoto} style={{ fontSize: '11px', color: '#c9d1d9', width: '100%' }} />
                  </div>
                </div>

              </div>
            </div>

            {/* KONTROL BOARDS BAWAH */}
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '20px' }}>
              
              {/* KOLOM KIRI */}
              <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
                
                {/* BOARD EDIT TEKS & WARNA */}
                <div style={{ backgroundColor: '#0d1117', padding: '16px', borderRadius: '12px', border: '1px solid #30363d' }}>
                  <label style={{ fontSize: '11px', fontWeight: '700', color: '#a371f7', display: 'block', marginBottom: '10px', letterSpacing: '1px' }}>📝 EDIT JUDUL</label>
                  
                  <div style={{ display: 'flex', gap: '8px', marginBottom: '10px', alignItems: 'center' }}>
                    <button onClick={() => handleFormat('foreColor', '#E7E820')} style={{ backgroundColor: '#E7E820', color: '#000', padding: '6px 12px', borderRadius: '6px', fontSize: '11px', fontWeight: 'bold', cursor: 'pointer', border: 'none' }}>Kuning</button>
                    <button onClick={() => handleFormat('italic')} style={{ backgroundColor: '#21262d', color: '#fff', padding: '6px 14px', borderRadius: '6px', fontSize: '12px', fontWeight: 'bold', fontStyle: 'italic', cursor: 'pointer', border: '1px solid #30363d' }}>I</button>
                    <div style={{ width: '1px', height: '16px', backgroundColor: '#30363d', margin: '0 4px' }}></div>
                    <button onClick={() => handleFormat('foreColor', '#ffffff')} style={{ backgroundColor: 'transparent', color: '#c9d1d9', padding: '6px 10px', borderRadius: '6px', fontSize: '10px', cursor: 'pointer', border: '1px solid #30363d' }}>Teks Dasar</button>
                  </div>

                  <div 
                    id="judul-editor"
                    contentEditable
                    onInput={(e) => setJudulHtml(e.currentTarget.innerHTML)}
                    style={{ width: '100%', backgroundColor: '#161b22', border: '1px solid #30363d', color: '#ffffff', padding: '12px', borderRadius: '8px', fontSize: '14px', minHeight: '110px', outline: 'none', boxSizing: 'border-box', overflowY: 'auto', lineHeight: '1.5' }}
                  />
                </div>

                {/* BOARD EDIT SUMBER BERITA */}
                <div style={{ backgroundColor: '#0d1117', padding: '16px', borderRadius: '12px', border: '1px solid #30363d' }}>
                  <label style={{ fontSize: '11px', fontWeight: '700', color: '#f78166', display: 'block', marginBottom: '8px', letterSpacing: '1px' }}>🔗 SUMBER BERITA</label>
                  <input 
                    type="text" 
                    style={{ width: '100%', backgroundColor: '#161b22', border: '1px solid #30363d', color: '#ffffff', padding: '10px', borderRadius: '8px', fontSize: '13px', outline: 'none', boxSizing: 'border-box' }}
                    value={sumberBerita}
                    onChange={(e) => setSumberBerita(e.target.value)}
                  />
                </div>

                {/* BOARD KONTROL SUMBER BERITA */}
                <div style={{ backgroundColor: '#0d1117', padding: '12px 16px', borderRadius: '12px', border: '1px solid #30363d' }}>
                  <label style={{ fontSize: '11px', fontWeight: '700', color: '#f78166', display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '8px' }}>
                    <span>📍 KONTROL SUMBER BERITA</span>
                    <button onClick={() => { setSumberX(142); setSumberY(710); setUkuranFontSumber(28); }} style={{ background: 'none', border: 'none', cursor: 'pointer', fontSize: '14px', padding: 0 }} title="Kembalikan ke Setelan Awal">🔄</button>
                  </label>
                  <div style={{ display: 'grid', gridTemplateColumns: '1fr', gap: '8px' }}>
                    <div>
                      <span style={{ fontSize: '10px', color: '#8b949e', display: 'flex', justifyContent: 'space-between' }}><span>Ukuran Font</span> <span>{ukuranFontSumber}</span></span>
                      <input type="range" min="15" max="150" step="1" value={ukuranFontSumber} onChange={(e) => setUkuranFontSumber(parseInt(e.target.value))} style={{ width: '100%', accentColor: '#f78166' }} />
                    </div>
                    <div style={{ display: 'flex', gap: '8px' }}>
                      <div style={{ flex: 1 }}>
                        <span style={{ fontSize: '10px', color: '#8b949e', display: 'flex', justifyContent: 'space-between' }}><span>Geser X</span> <span>{sumberX}</span></span>
                        <input type="range" min="0" max="1080" step="1" value={sumberX} onChange={(e) => setSumberX(parseInt(e.target.value))} style={{ width: '100%', accentColor: '#f78166' }} />
                      </div>
                      <div style={{ flex: 1 }}>
                        <span style={{ fontSize: '10px', color: '#8b949e', display: 'flex', justifyContent: 'space-between' }}><span>Geser Y</span> <span>{sumberY}</span></span>
                        <input type="range" min="0" max="1350" step="1" value={sumberY} onChange={(e) => setSumberY(parseInt(e.target.value))} style={{ width: '100%', accentColor: '#f78166' }} />
                      </div>
                    </div>
                  </div>
                </div>

              </div>

              {/* KOLOM KANAN */}
              <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
                
                {/* BOARD KONTROL GAMBAR */}
                <div style={{ backgroundColor: '#0d1117', padding: '12px 16px', borderRadius: '12px', border: '1px solid #30363d' }}>
                  <label style={{ fontSize: '11px', fontWeight: '700', color: '#3fb950', display: 'block', marginBottom: '8px' }}>🖼️ KONTROL SKALA GAMBAR</label>
                  <div style={{ display: 'grid', gridTemplateColumns: '1fr', gap: '8px' }}>
                    <div>
                      <span style={{ fontSize: '10px', color: '#8b949e', display: 'flex', justifyContent: 'space-between' }}><span>Zoom Skala</span> <span>{imgScale.toFixed(2)}</span></span>
                      <input type="range" min="0.2" max="3" step="0.05" value={imgScale} onChange={(e) => setImgScale(parseFloat(e.target.value))} style={{ width: '100%', accentColor: '#3fb950' }} />
                    </div>
                    <div>
                      <span style={{ fontSize: '10px', color: '#8b949e', display: 'flex', justifyContent: 'space-between' }}><span>Geser X</span> <span>{imgX}</span></span>
                      <input type="range" min="-1000" max="1000" step="10" value={imgX} onChange={(e) => setImgX(parseInt(e.target.value))} style={{ width: '100%', accentColor: '#3fb950' }} />
                    </div>
                    <div>
                      <span style={{ fontSize: '10px', color: '#8b949e', display: 'flex', justifyContent: 'space-between' }}><span>Geser Y</span> <span>{imgY}</span></span>
                      <input type="range" min="-1000" max="1000" step="10" value={imgY} onChange={(e) => setImgY(parseInt(e.target.value))} style={{ width: '100%', accentColor: '#3fb950' }} />
                    </div>
                  </div>
                </div>

                {/* BOARD KONTROL TEKS JUDUL */}
                <div style={{ backgroundColor: '#0d1117', padding: '12px 16px', borderRadius: '12px', border: '1px solid #30363d' }}>
                  <label style={{ fontSize: '11px', fontWeight: '700', color: '#a371f7', display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '8px' }}>
                    <span>✨ KONTROL POSISI JUDUL</span>
                    <button onClick={() => { setTeksX(140); setTeksY(800); setUkuranFont(79); setJarakBaris(1.4); }} style={{ background: 'none', border: 'none', cursor: 'pointer', fontSize: '14px', padding: 0 }} title="Kembalikan ke Setelan Awal">🔄</button>
                  </label>
                  <div style={{ display: 'grid', gridTemplateColumns: '1fr', gap: '8px' }}>
                    <div>
                      <span style={{ fontSize: '10px', color: '#8b949e', display: 'flex', justifyContent: 'space-between' }}><span>Ukuran Font</span> <span>{ukuranFont}</span></span>
                      <input type="range" min="30" max="400" step="1" value={ukuranFont} onChange={(e) => setUkuranFont(parseInt(e.target.value))} style={{ width: '100%', accentColor: '#a371f7' }} />
                    </div>
                    <div>
                      <span style={{ fontSize: '10px', color: '#8b949e', display: 'flex', justifyContent: 'space-between' }}><span>Geser X</span> <span>{teksX}</span></span>
                      <input type="range" min="-500" max="1080" step="1" value={teksX} onChange={(e) => setTeksX(parseInt(e.target.value))} style={{ width: '100%', accentColor: '#a371f7' }} />
                    </div>
                    <div>
                      <span style={{ fontSize: '10px', color: '#8b949e', display: 'flex', justifyContent: 'space-between' }}><span>Geser Y (Atas/Bawah)</span> <span>{teksY}</span></span>
                      <input type="range" min="-500" max="2000" step="1" value={teksY} onChange={(e) => setTeksY(parseInt(e.target.value))} style={{ width: '100%', accentColor: '#a371f7' }} />
                    </div>
                    <div style={{ marginTop: '4px', paddingTop: '8px', borderTop: '1px dashed #30363d' }}>
                      <span style={{ fontSize: '10px', color: '#8b949e', display: 'flex', justifyContent: 'space-between' }}><span>Jarak Antar Kalimat</span> <span>{jarakBaris}</span></span>
                      <input type="range" min="0.8" max="2.5" step="0.1" value={jarakBaris} onChange={(e) => setJarakBaris(parseFloat(e.target.value))} style={{ width: '100%', accentColor: '#a371f7' }} />
                    </div>
                  </div>
                </div>

              </div>
            </div>

            {/* TOMBOL NAVIGASI BAWAH */}
            <div style={{ display: 'flex', gap: '10px', borderTop: '1px solid #30363d', paddingTop: '16px' }}>
              <button style={{ width: '30%', backgroundColor: '#21262d', color: '#c9d1d9', padding: '14px', borderRadius: '10px', fontWeight: '600', fontSize: '13px', border: '1px solid #30363d', cursor: 'pointer' }} onClick={() => setCurrentPage(2)}>⬅ Kembali</button>
              <button style={{ width: '70%', backgroundColor: '#238636', color: '#ffffff', padding: '14px', borderRadius: '10px', fontWeight: '700', fontSize: '14px', border: 'none', cursor: 'pointer' }} onClick={downloadGambar}>📥 Download Postingan IG</button>
            </div>

          </div>
        )}

      </div>
    </div>
  );
}
