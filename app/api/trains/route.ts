import { NextRequest, NextResponse } from "next/server"
import { getSupabaseServer } from "@/lib/supabase-server"

function corsHeaders() { return { "Access-Control-Allow-Origin": "*", "Access-Control-Allow-Methods": "GET, OPTIONS", "Access-Control-Allow-Headers": "Content-Type" } }
export async function OPTIONS() { return new Response(null, { status: 204, headers: corsHeaders() }) }
export async function GET(req: NextRequest) {
  try {
    const id = new URL(req.url).searchParams.get("id")
    let lastError: any = null
    for (let attempt = 0; attempt < 3; attempt++) {
      let query = getSupabaseServer().from("trains").select("*")
      query = id ? query.eq("id", id).maybeSingle() : query.order("train_number", { ascending: true })
      const { data, error } = await query
      if (!error) return NextResponse.json({ data: id ? data : data ?? [] }, { headers: corsHeaders() })
      lastError = error
      await new Promise((resolve) => setTimeout(resolve, 150 * (attempt + 1)))
    }
    throw lastError
  } catch (err: any) { return NextResponse.json({ error: err.message }, { status: 500, headers: corsHeaders() }) }
}
export async function POST(req: Request) {
  try {
    const b = await req.json()
    const row = { train_number: b.train_number, direction: b.direction, class: b.class ?? "Скоростной", depart_depot: b.depart_depot ?? null, depart_start: b.depart_start ?? null, arrive_middle: b.arrive_middle ?? null, depart_middle: b.depart_middle ?? null, arrive_end: b.arrive_end ?? null, arrive_depot: b.arrive_depot ?? null, platform_start: b.platform_start ?? 1, platform_middle: b.platform_middle ?? 1, platform_end: b.platform_end ?? 1, display_days: Array.isArray(b.display_days) && b.display_days.length ? b.display_days : [0,1,2,3,4,5,6] }
    const { data, error } = await getSupabaseServer().from("trains").upsert(row, { onConflict: "train_number", ignoreDuplicates: true }).select().maybeSingle()
    if (error) throw error
    return NextResponse.json({ data: data ?? null })
  } catch (err: any) { return NextResponse.json({ error: err.message }, { status: 500 }) }
}
export async function PATCH(req: Request) {
  try {
    const { id, ...updates } = await req.json()
    if (!id) return NextResponse.json({ error: "id required" }, { status: 400 })
    if (!Object.keys(updates).length) return NextResponse.json({ error: "No fields to update" }, { status: 400 })
    const { data, error } = await getSupabaseServer().from("trains").update(updates).eq("id", id).select().maybeSingle()
    if (error) throw error
    return NextResponse.json({ data: data ?? null })
  } catch (err: any) { return NextResponse.json({ error: err.message }, { status: 500 }) }
}
export async function DELETE(req: Request) {
  try { const { id } = await req.json(); if (!id) return NextResponse.json({ error: "id required" }, { status: 400 }); const { error } = await getSupabaseServer().from("trains").delete().eq("id", id); if (error) throw error; return NextResponse.json({ success: true }) } catch (err: any) { return NextResponse.json({ error: err.message }, { status: 500 }) }
}
