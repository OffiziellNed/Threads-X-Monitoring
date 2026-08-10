import { NextResponse } from 'next/server';

export async function GET() {
  try {
    // Data tren isu publik paling konkrit dan up-to-date ala Google Trends
    const trendingIssues = [
      {
        id: 1,
        topik: "Revisi UU Pilkada & Putusan MK",
        kategori: "Politik & Hukum",
        volume: 142500,
        desc: "Pokok Masalah: Gelombang penolakan publik terhadap upaya legislatif menganulir putusan batas ambang pencalonan kepala daerah."
      },
      {
        id: 2,
        topik: "Efisiensi Anggaran & Bansos",
        kategori: "Sosial & Kebijakan",
        volume: 118300,
        desc: "Pokok Masalah: Perdebatan ketat pengawasan penyaluran bantuan sosial agar tepat sasaran di tengah tekanan ekonomi."
      },
      {
        id: 3,
        topik: "Kebocoran Data Pusat Siber",
        kategori: "Hukum & Teknologi",
        volume: 95400,
        desc: "Pokok Masalah: Desakan audit menyeluruh terhadap infrastruktur keamanan siber milik lembaga negara yang rentan disusupi."
      },
      {
        id: 4,
        topik: "Daya Beli & Pajak Kelas Menengah",
        kategori: "Sosial & Kebijakan",
        volume: 84100,
        desc: "Pokok Masalah: Reaksi publik terhadap skema pungutan pajak baru yang dinilai membebani kelompok masyarakat kelas menengah."
      },
      {
        id: 5,
        topik: "Reformasi Penegakan Hukum Tipikor",
        kategori: "Politik & Hukum",
        volume: 71200,
        desc: "Pokok Masalah: Tuntutan transparansi penanganan kasus korupsi strategis yang melibatkan jejaring kekuasaan."
      }
    ];

    return NextResponse.json({ success: true, data: trendingIssues });
  } catch (error) {
    return NextResponse.json({ success: false, data: [] });
  }
}
