import { NextRequest, NextResponse } from "next/server"
import { getSupabaseServer } from "@/lib/supabase-server"

export async function GET() {
  try {
    const { data, error } = await getSupabaseServer().from("bug_reports").select("*").order("created_at", { ascending: false })
    if (error) throw error
    return NextResponse.json({ data: data ?? [] })
  } catch (error: any) { return NextResponse.json({ error: error.message }, { status: 500 }) }
}

export async function POST(req: NextRequest) {
  try {
    const body = await req.json()
    const { sender_nickname, sender_role, sender_secondary_role, sender_position, from_section, message, sender_avatar } = body
    if (!sender_nickname || !sender_role || !sender_position || !from_section || !message) return NextResponse.json({ error: "Missing required fields" }, { status: 400 })
    const { data, error } = await getSupabaseServer().from("bug_reports").insert({ sender_nickname, sender_role, sender_secondary_role: sender_secondary_role || null, sender_position, from_section, message, sender_avatar: sender_avatar || null }).select().single()
    if (error) throw error
    return NextResponse.json({ data })
  } catch (error: any) { return NextResponse.json({ error: error.message }, { status: 500 }) }
}

export async function DELETE(req: NextRequest) {
  try {
    const id = new URL(req.url).searchParams.get("id")
    if (!id) return NextResponse.json({ error: "Missing id" }, { status: 400 })
    const { error } = await getSupabaseServer().from("bug_reports").delete().eq("id", id)
    if (error) throw error
    return NextResponse.json({ success: true })
  } catch (error: any) { return NextResponse.json({ error: error.message }, { status: 500 }) }
}
