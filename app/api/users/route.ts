import { NextRequest, NextResponse } from "next/server"
import { getSupabaseServer } from "@/lib/supabase-server"

const pendingVkPhotos = new Map<string, Promise<string | null>>()

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
    if (p.get("hydrate_vk") === "1") {
      const refreshAll = p.get("refresh_vk") === "1"
      const usersToHydrate = rows.filter((row: any) => row.vk_id && (refreshAll || !row.vk_avatar)).slice(0, 100)
      const getPublicPhoto = async (vkId: string): Promise<string | null> => {
        const pending = pendingVkPhotos.get(vkId)
        if (pending) return pending
        const request = fetchPublicPhoto(vkId)
        pendingVkPhotos.set(vkId, request)
        try {
          return await request
        } finally {
          if (pendingVkPhotos.get(vkId) === request) pendingVkPhotos.delete(vkId)
        }
      }
      const fetchPublicPhoto = async (vkId: string): Promise<string | null> => {
        const token = process.env.VK_SERVICE_TOKEN
        if (token) {
          try {
            const apiUrl = new URL("https://api.vk.com/method/users.get")
            apiUrl.searchParams.set("user_ids", vkId)
            apiUrl.searchParams.set("fields", "photo_max_orig,photo_200")
            apiUrl.searchParams.set("access_token", token)
            apiUrl.searchParams.set("v", "5.199")
            const apiResponse = await fetch(apiUrl, { cache: "no-store", signal: AbortSignal.timeout(7000) })
            if (apiResponse.ok) {
              const apiData = await apiResponse.json()
              const photo = apiData.response?.[0]?.photo_max_orig || apiData.response?.[0]?.photo_200
              if (photo && /^https:\/\//i.test(photo)) return photo
            }
          } catch {
            // Fall back to the public profile page if the VK API is unavailable.
          }
        }
        const profileUrl = `https://vk.com/id${encodeURIComponent(vkId)}`
        for (let attempt = 0; attempt < 3; attempt++) {
          try {
            const response = await fetch(profileUrl, {
              headers: {
                "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/124.0.0.0 Safari/537.36",
                "Accept-Language": "ru-RU,ru;q=0.9,en;q=0.8",
              },
              signal: AbortSignal.timeout(7000),
              cache: "no-store",
            })
            if (response.ok) {
              const html = await response.text()
              for (const photoField of ["photo_max_orig", "photo_200", "photo_100"]) {
                const embeddedPhoto = html.match(new RegExp(`\\"${photoField}\\"\\s*:\\s*\\"([^\\"]+)\\"`, "i"))?.[1]
                if (!embeddedPhoto) continue
                const photo = embeddedPhoto.replaceAll("\\u0026", "&").replace(/&amp;/g, "&").replaceAll("\\/", "/")
                if (/^https?:\/\//i.test(photo)) return photo
              }
              const metaTags = html.match(/<meta\b[^>]*>/gi) ?? []
              for (const tag of metaTags) {
                if (!/property=[\"']og:image[\"']/i.test(tag)) continue
                const photo = tag.match(/content=[\"']([^\"']+)[\"']/i)?.[1]
                if (photo && /^https?:\/\//i.test(photo)) {
                  return photo.replace(/&amp;/g, "&").replaceAll("\\u0026", "&").replaceAll("\\/", "/")
                }
              }
              return null
            }
            if (response.status < 500 && response.status !== 429) return null
          } catch {
            if (attempt === 2) return null
          }
          if (attempt < 2) await new Promise((resolve) => setTimeout(resolve, 300 * (attempt + 1)))
        }
        return null
      }
      for (let index = 0; index < usersToHydrate.length; index += 5) {
        const batch = usersToHydrate.slice(index, index + 5)
        await Promise.all(batch.map(async (row: any) => {
          const photo = await getPublicPhoto(String(row.vk_id))
          if (!photo) return
          const { error: saveError } = await getSupabaseServer().from("users").update({ vk_avatar: photo }).eq("id", row.id)
          if (!saveError) row.vk_avatar = photo
        }))
      }
    }
    return NextResponse.json({ data: rows }, vkId ? { headers: { "Cache-Control": "no-store" } } : undefined)
  } catch (err: any) { return NextResponse.json({ error: err.message }, { status: 500 }) }
}
export async function POST(req: Request) { try { const b = await req.json(); const { data, error } = await getSupabaseServer().from("users").insert({ username: b.username, password: b.password, full_name: b.full_name, position: b.position, rank: b.rank, avatar: b.avatar, vk_id: b.vk_id ?? null }).select().maybeSingle(); if (error && error.code !== "23505") throw error; return NextResponse.json({ data: data ?? null }) } catch (err: any) { return NextResponse.json({ error: err.message }, { status: 500 }) } }
export async function PATCH(req: Request) { try { const { id, ...updates } = await req.json(); if (!Object.keys(updates).length) return NextResponse.json({ error: "No fields to update" }, { status: 400 }); const db = getSupabaseServer(); if (Object.prototype.hasOwnProperty.call(updates, "vk_id")) { const { data: current, error: readError } = await db.from("users").select("vk_id").eq("id", id).maybeSingle(); if (readError) throw readError; if (current && String(current.vk_id ?? "") !== String(updates.vk_id ?? "") && !Object.prototype.hasOwnProperty.call(updates, "vk_avatar")) updates.vk_avatar = null } const { data, error } = await db.from("users").update({ ...updates, updated_at: new Date().toISOString() }).eq("id", id).select().maybeSingle(); if (error) throw error; return NextResponse.json({ data: data ?? null }) } catch (err: any) { return NextResponse.json({ error: err.message }, { status: 500 }) } }
export async function DELETE(req: Request) { try { const b = await req.json(); const column = b.id ? "id" : b.username ? "username" : null; const value = b.id ?? b.username; if (!column) return NextResponse.json({ error: "id or username required" }, { status: 400 }); const client = getSupabaseServer(); const { data: user } = await client.from("users").select("vk_avatar").eq(column, value).maybeSingle(); if (user?.vk_avatar) await client.from("user_avatar_cleanup").insert({ avatar_url: user.vk_avatar, delete_after: new Date(Date.now() + 86400000).toISOString() }); const { error } = await client.from("users").delete().eq(column, value); if (error) throw error; return NextResponse.json({ success: true }) } catch (err: any) { return NextResponse.json({ error: err.message }, { status: 500 }) } }
