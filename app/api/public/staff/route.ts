import { NextRequest, NextResponse } from "next/server"
import { getSupabaseServer } from "@/lib/supabase-server"

const CORS_HEADERS = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Methods": "GET, OPTIONS",
  "Access-Control-Allow-Headers": "Content-Type",
  "Cache-Control": "public, s-maxage=60, stale-while-revalidate=120",
}

export async function OPTIONS() { return new NextResponse(null, { status: 204, headers: CORS_HEADERS }) }

export async function GET(_req: NextRequest) {
  try {
    const { data, error } = await getSupabaseServer().from("users").select("username,position,position_title,rank,created_at").in("position", ["Руководство", "Заместитель", "Старший Состав", "Тех. Администратор"]).order("rank", { ascending: false }).order("created_at", { ascending: true })
    if (error) throw error
    const staff = (data ?? []).map((r: any) => ({ username: r.username, role: r.position, positionTitle: r.position_title ?? null, rank: Number(r.rank) }))
    return NextResponse.json({ data: staff }, { headers: CORS_HEADERS })
  } catch (err: any) { return NextResponse.json({ error: err.message, data: [] }, { status: 500, headers: CORS_HEADERS }) }
}
