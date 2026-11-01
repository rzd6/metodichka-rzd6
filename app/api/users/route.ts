import { NextRequest, NextResponse } from "next/server"
import { getSupabaseServer } from "@/lib/supabase-server"

export async function GET(req: NextRequest) {
  try {
    const p = new URL(req.url).searchParams; const username = p.get("username"); const password = p.get("password"); const vkId = p.get("vk_id")
    let query = getSupabaseServer().from("users").select("*")
    if (username && password) query = query.eq("username", username).eq("password", password).limit(1)
    else if (username) query = query.eq("username", username).limit(1)
    else if (vkId) query = query.eq("vk_id", vkId).order("created_at", { ascending: true })
    else query = query.order("created_at", { ascending: true })
    const { data, error } = await query; if (error) throw error
    const rows = data ?? []
    if (username || password) return NextResponse.json({ data: rows[0] ?? null })
    if (p.get("hydrate_vk") === "1" && process.env.VK_SERVICE_TOKEN) await Promise.all(rows.filter((r: any) => r.vk_id).slice(0, 100).map(async (row: any) => { try { const u = new URL("https://api.vk.com/method/users.get"); u.searchParams.set("user_ids", String(row.vk_id)); u.searchParams.set("fields", "photo_max_orig,photo_200,photo_100"); u.searchParams.set("access_token", process.env.VK_SERVICE_TOKEN!); u.searchParams.set("v", "5.199"); const response = await fetch(u); const json = await response.json(); const photo = json.response?.[0]?.photo_max_orig || json.response?.[0]?.photo_200 || json.response?.[0]?.photo_100; if (photo) { await getSupabaseServer().from("users").update({ vk_avatar: photo, updated_at: new Date().toISOString() }).eq("id", row.id); row.vk_avatar = photo } } catch (e) { console.error("[v0] VK avatar hydration failed", e) } }))
    return NextResponse.json({ data: rows }, vkId ? { headers: { "Cache-Control": "no-store" } } : undefined)
  } catch (err: any) { return NextResponse.json({ error: err.message }, { status: 500 }) }
}
export async function POST(req: Request) { try { const b = await req.json(); const { data, error } = await getSupabaseServer().from("users").insert({ username: b.username, password: b.password, full_name: b.full_name, position: b.position, rank: b.rank, avatar: b.avatar, vk_id: b.vk_id ?? null }).select().maybeSingle(); if (error && error.code !== "23505") throw error; return NextResponse.json({ data: data ?? null }) } catch (err: any) { return NextResponse.json({ error: err.message }, { status: 500 }) } }
export async function PATCH(req: Request) { try { const { id, ...updates } = await req.json(); if (!Object.keys(updates).length) return NextResponse.json({ error: "No fields to update" }, { status: 400 }); const { data, error } = await getSupabaseServer().from("users").update({ ...updates, updated_at: new Date().toISOString() }).eq("id", id).select().maybeSingle(); if (error) throw error; return NextResponse.json({ data: data ?? null }) } catch (err: any) { return NextResponse.json({ error: err.message }, { status: 500 }) } }
export async function DELETE(req: Request) { try { const b = await req.json(); const column = b.id ? "id" : b.username ? "username" : null; const value = b.id ?? b.username; if (!column) return NextResponse.json({ error: "id or username required" }, { status: 400 }); const client = getSupabaseServer(); const { data: user } = await client.from("users").select("vk_avatar").eq(column, value).maybeSingle(); if (user?.vk_avatar) await client.from("user_avatar_cleanup").insert({ avatar_url: user.vk_avatar, delete_after: new Date(Date.now() + 86400000).toISOString() }); const { error } = await client.from("users").delete().eq(column, value); if (error) throw error; return NextResponse.json({ success: true }) } catch (err: any) { return NextResponse.json({ error: err.message }, { status: 500 }) } }
