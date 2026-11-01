import { NextResponse } from "next/server"
import { getSupabaseServer } from "@/lib/supabase-server"

const KEY = "tech_mode"
export async function GET() {
  try {
    const { data, error } = await getSupabaseServer().from("app_settings").select("value").eq("key", KEY).maybeSingle()
    if (error) throw error
    return NextResponse.json({ enabled: data?.value === "true" })
  } catch (err: any) { return NextResponse.json({ enabled: false, error: err.message }, { status: 500 }) }
}
export async function POST(req: Request) {
  try {
    const { enabled, nickname } = await req.json()
    if (nickname !== "v0_dev_rzd") return NextResponse.json({ success: false, error: "Forbidden" }, { status: 403 })
    const { error } = await getSupabaseServer().from("app_settings").upsert({ key: KEY, value: enabled ? "true" : "false", updated_at: new Date().toISOString() })
    if (error) throw error
    return NextResponse.json({ success: true, enabled: !!enabled })
  } catch (err: any) { return NextResponse.json({ success: false, error: err.message }, { status: 500 }) }
}
