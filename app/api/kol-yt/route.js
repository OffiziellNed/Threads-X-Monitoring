import { NextResponse } from 'next/server';

export const dynamic = 'force-dynamic';

const TARGET_KOLS = [
  { id: "totalpolitik", name: "Total Politik", handle: "@totalpolitik" },
  { id: "akbarfaizal", name: "Akbar Faizal", handle: "@AkbarFaizalUncensored" },
  { id: "ferryirwandi", name: "Ferry Irwandi", handle: "@ferryirwandi" },
  { id: "tempo", name: "Tempo", handle: "@tempovideochannel" },
  { id: "detik", name: "Detik", handle: "@detikcom" },
  { id: "antara", name: "Antara", handle: "@antaraTV" },
  { id: "hensa", name: "Hensa", handle: "@hendrisatrioofficial" },
  { id: "sisigelap", name: "Sisi Gelap", handle: "@sigel-sisigelap" },
  { id: "kesetpolitik", name: "Keset Politik", handle: "@KESETPOLITIK" },
  { id: "tribunnews", name: "Tribunnews", handle: "@tribunnews" }
];

export async function GET() {
  try {
    const searchUrl = `https://www.youtube.com/results?search_query=${encodeURIComponent('Puan Maharani OR Ketua DPR')}&sp=EgIIAw%253D%253D`; // EgIIAw%3D%3D is This Month or This week? "EgQIAhAB" is This Week. 
// Let's use EgQIAhAB