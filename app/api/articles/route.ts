import { NextRequest, NextResponse } from "next/server"
import { getSupabaseServer } from "@/lib/supabase-server"

export async function GET() {
  try {
    const { data, error } = await getSupabaseServer().from("articles").select("*").eq("is_published", true).order("created_at", { ascending: false })
    if (error) throw error
    return NextResponse.json({ data: data ?? [] })
  } catch (err: any) {
    return NextResponse.json({ error: err.message || "Ошибка сервера" }, { status: 500 })
  }
}

export async function POST(req: NextRequest) {
  try {
    const supabase = getSupabaseServer()
    const body = await req.json()
    const { action, article, id, updates } = body
    if (action === "create") {
      const a = article as Record<string, any>
      const { data, error } = await supabase.from("articles").insert({
        title: a.title, content: a.content ?? "", is_published: a.is_published ?? true,
        author_name: a.author_name ?? "", author_id: a.author_id ?? "", author_role: a.author_role ?? "",
        section_label: a.section_label ?? "", category: a.category ?? null, allowed_roles: a.allowed_roles ?? [], image_url: a.image_url ?? [],
      }).select().single()
      if (error) throw error
      return NextResponse.json({ data })
    }
    if (action === "update") {
      const fields = Object.keys(updates ?? {})
      if (!fields.length) return NextResponse.json({ error: "No fields to update" }, { status: 400 })
      const { data, error } = await supabase.from("articles").update({ ...updates, updated_at: new Date().toISOString() }).eq("id", id).select().maybeSingle()
      if (error) throw error
      return NextResponse.json({ data: data ?? null })
    }
    if (action === "delete") {
      const { error } = await supabase.from("articles").delete().eq("id", id)
      if (error) throw error
      return NextResponse.json({ success: true })
    }
    return NextResponse.json({ error: "Unknown action" }, { status: 400 })
  } catch (err: any) {
    return NextResponse.json({ error: err.message || "Ошибка сервера" }, { status: 500 })
  }
}
