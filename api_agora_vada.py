from fastapi import FastAPI, HTTPException
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel
from newspaper import Article
from urllib.parse import urlparse

# Inisialisasi Aplikasi API
app = FastAPI(title="Agora Vada API")

# Wajib: Mengizinkan Vercel (Frontend) berkomunikasi dengan API ini
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],  # Nanti kalau sudah aman, ganti dengan URL Vercel lo
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# Skema format data yang masuk
class URLInput(BaseModel):
    url: str

@app.post("/tarik-berita")
async def tarik_berita(data: URLInput):
    try:
        # Menyedot artikel menggunakan newspaper3k
        article = Article(data.url)
        article.download()
        article.parse()
        
        judul = article.title
        teks = article.text
	gambar_url = article.top_image
        
        # Jika website memblokir scraping
        if not teks or len(teks.strip()) < 20:
            teks = "(⚠️ Website ini memblokir penarikan teks otomatis. Silakan Copy-Paste manual teks beritanya di sini.)"
        
        # Meracik prompt sesuai standar lo sebelumnya
        prompt = f"""Tolong buat 10 judul berita menggunakan hook dan copywriter handal untuk media alternatif "AgoraVada", serta buatkan caption untuk instagram, normatif saja dan informatif. Pastikan diakhiri oleh sumber berita dan 3 hastag (wajib ada #AgoraVada sisanya disesuaikan dengan kata kunci subjek dan topik yang dibahas).

BERIKUT REFERENSI BERITANYA:

JUDUL ASLI: {judul}

ISI BERITA KESELURUHAN: {teks}"""

        # Format sumber berita
        domain = urlparse(data.url).netloc.replace('www.', '')
        sumber = f"Sumber Berita: {domain}"
        
        return {
            "status": "success",
            "prompt": prompt,
            "sumber": sumber,
            "gambar_url": gambar_url
	
        }
        
    except Exception as e:
        raise HTTPException(status_code=400, detail=f"Gagal menarik berita: {str(e)}")