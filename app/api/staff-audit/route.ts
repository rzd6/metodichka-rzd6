import { NextRequest, NextResponse } from "next/server"
import { getSupabaseServer } from "@/lib/supabase-server"
export async function GET(req: NextRequest) {
  try {
    const url = new URL(req.url)
    const month = url.searchParams.get("month")
    const page = Math.max(1, Number(url.searchParams.get("page") || 1))
    const pageSize = Math.min(100, Math.max(10, Number(url.searchParams.get("pageSize") || 50)))
    const from = (page - 1) * pageSize
    const to = from + pageSize - 1
    let query = getSupabaseServer().from("staff_audit_log").select("*", { count: "exact" }).order("created_at", { ascending: false }).range(from, to)
    if (month && /^\\d{4}-\\d{2}$/.test(month)) {
      const start = `${month}-01T00:00:00.000Z`
      const endDate = new Date(`${month}-01T00:00:00.000Z`)
      endDate.setUTCMonth(endDate.getUTCMonth() + 1)
      query = query.gte("created_at", start).lt("created_at", endDate.toISOString())
    }
    const { data, error, count } = await query
    if (error) throw error
    const unique = Array.from(new Map((data ?? []).map((entry: any) => [
      [entry.action, entry.actor_id, entry.target_id, entry.old_role, entry.new_role, entry.created_at].join("|"), entry,
    ])).values())
    return NextResponse.json({ data: unique, count: count ?? 0, page, pageSize, hasMore: from + pageSize < (count ?? 0) })
  } catch (err: any) { return NextResponse.json({ error: err.message }, { status: 500 }) }
}
export async function POST(req: NextRequest) {
  try {
    const body = await req.json()
    const db = getSupabaseServer()
    const payload = { action: body.action, actor_id: body.actor_id, actor_nickname: body.actor_nickname, actor_role: body.actor_role, target_id: body.target_id ?? null, target_nickname: body.target_nickname ?? null, old_role: body.old_role ?? null, new_role: body.new_role ?? null }
    const recent = new Date(Date.now() - 5000).toISOString()
    let duplicateQuery = db.from("staff_audit_log").select("id").eq("action", payload.action).eq("actor_id", payload.actor_id).gte("created_at", recent).limit(1)
    if (payload.target_id) duplicateQuery = duplicateQuery.eq("target_id", payload.target_id)
    else duplicateQuery = duplicateQuery.is("target_id", null)
    const { data: duplicate } = await duplicateQuery.maybeSingle()
    if (duplicate) return NextResponse.json({ data: duplicate, duplicate: true })
    const { data, error } = await db.from("staff_audit_log").insert(payload).select().single()
    if (error) throw error
    return NextResponse.json({ data })
  } catch (err: any) { return NextResponse.json({ error: err.message }, { status: 500 }) }
}
