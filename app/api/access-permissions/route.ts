import { NextRequest, NextResponse } from "next/server"
import { getDefaultSectionPermissions, type SectionPermissionsMap } from "@/data/access-permissions"
import { getSupabaseServer } from "@/lib/supabase-server"

const SETTINGS_KEY = "section_permissions"

export async function GET() {
  try {
    const { data, error } = await getSupabaseServer().from("app_settings").select("value").eq("key", SETTINGS_KEY).maybeSingle()
    if (error) throw error
    if (!data?.value) return NextResponse.json({ permissions: getDefaultSectionPermissions() })
    const parsed = JSON.parse(data.value) as SectionPermissionsMap
    return NextResponse.json({ permissions: { ...getDefaultSectionPermissions(), ...parsed } })
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : "Unknown error"
    return NextResponse.json({ permissions: getDefaultSectionPermissions(), error: message }, { status: 500 })
  }
}

export async function POST(req: NextRequest) {
  try {
    const permissions = (await req.json()).permissions as SectionPermissionsMap
    if (!permissions || typeof permissions !== "object") return NextResponse.json({ error: "permissions required" }, { status: 400 })
    const { error } = await getSupabaseServer().from("app_settings").upsert({ key: SETTINGS_KEY, value: JSON.stringify(permissions), updated_at: new Date().toISOString() }, { onConflict: "key" })
    if (error) throw error
    return NextResponse.json({ success: true })
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : "Unknown error"
    return NextResponse.json({ success: false, error: message }, { status: 500 })
  }
}
