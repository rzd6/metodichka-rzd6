import { randomUUID } from "node:crypto"
import { NextRequest, NextResponse } from "next/server"
import { getSupabaseServer } from "@/lib/supabase-server"

export const dynamic = "force-dynamic"
export const maxDuration = 30

const COMMUNITY_ID = 175390558
const CATEGORY_PREFIX = `vk-post:wall-${COMMUNITY_ID}_`
const LOCK_KEY = "vk_rzd_news_sync_lock"
const LAST_CHECK_KEY = "vk_rzd_news_last_checked_at"
const POLL_INTERVAL_MS = 4.5 * 60 * 1000
const STALE_LOCK_MS = 2 * 60 * 1000
const INITIAL_LOOKBACK_MS = 14 * 24 * 60 * 60 * 1000
const VISIBLE_ROLES = [
  "Руководство",
  "Заместитель",
  "Старший Состав",
  "ЦдУД",
  "ПТО",
  "Тех. Администратор",
]

function jsonError(message: string, status: number) {
  return NextResponse.json({ error: message }, { status })
}

async function readSetting(supabase: ReturnType<typeof getSupabaseServer>, key: string) {
  const { data, error } = await supabase.from("app_settings").select("value").eq("key", key).maybeSingle()
  if (error) throw error
  return typeof data?.value === "string" ? data.value : null
}

async function acquireLock(supabase: ReturnType<typeof getSupabaseServer>) {
  const lockValue = `${Date.now()}:${randomUUID()}`
  const inserted = await supabase.from("app_settings").insert({ key: LOCK_KEY, value: lockValue })
  if (!inserted.error) return lockValue
  if (inserted.error.code !== "23505") throw inserted.error

  const currentValue = await readSetting(supabase, LOCK_KEY)
  const startedAt = Number(currentValue?.split(":", 1)[0])
  if (!currentValue || (Number.isFinite(startedAt) && Date.now() - startedAt < STALE_LOCK_MS)) return null

  const { data, error } = await supabase
    .from("app_settings")
    .update({ value: lockValue, updated_at: new Date().toISOString() })
    .eq("key", LOCK_KEY)
    .eq("value", currentValue)
    .select("key")
    .maybeSingle()
  if (error) throw error
  return data ? lockValue : null
}

async function getPhotoUrls(attachments: Array<Record<string, any>> = []) {
  const urls = attachments.flatMap((attachment) => {
    if (attachment.type !== "photo" || !attachment.photo) return []
    const sizes = Array.isArray(attachment.photo.sizes) ? attachment.photo.sizes : []
    const largest = [...sizes].sort((a, b) => (b.width ?? 0) * (b.height ?? 0) - (a.width ?? 0) * (a.height ?? 0))[0]
    const url = largest?.url || attachment.photo.photo_1280 || attachment.photo.photo_807 || attachment.photo.photo_604
    return typeof url === "string" ? [url] : []
  })
  return [...new Set(urls)].slice(0, 10)
}

function parseRzdNewsPost(post: Record<string, any>) {
  const text = typeof post.text === "string" ? post.text : ""
  const match = text.match(/^\s*\[([^\]\r\n]{1,300})\][ \t]*(?:\r?\n[ \t]*|[ \t]+)?([\s\S]*)$/)
  if (!match) return null

  const heading = match[1].trim()
  if (!/(?:р\s*[.\-]?\s*ж\s*[.\-]?\s*д|железн)/iu.test(heading)) return null

  return {
    title: `[${heading}]`,
    content: match[2].trim(),
  }
}

async function fetchCommunityWall() {
  const token = process.env.VK_SERVICE_TOKEN
  if (!token) throw new Error("VK_SERVICE_TOKEN is not configured")

  const url = new URL("https://api.vk.com/method/wall.get")
  url.searchParams.set("owner_id", `-${COMMUNITY_ID}`)
  url.searchParams.set("count", "100")
  url.searchParams.set("filter", "owner")
  url.searchParams.set("access_token", token)
  url.searchParams.set("v", "5.199")

  const response = await fetch(url, { cache: "no-store", signal: AbortSignal.timeout(12000) })
  if (!response.ok) throw new Error(`VK API returned HTTP ${response.status}`)
  const result = await response.json()
  if (result.error) {
    throw new Error(`VK API error ${result.error.error_code}: ${result.error.error_msg}`)
  }
  return Array.isArray(result.response?.items) ? result.response.items : []
}

async function synchronize() {
  let lockValue: string | null = null
  const supabase = getSupabaseServer()

  try {
    lockValue = await acquireLock(supabase)
    if (!lockValue) return NextResponse.json({ success: true, skipped: "sync_in_progress" })

    const lastCheckedAt = await readSetting(supabase, LAST_CHECK_KEY)
    const lastCheckedMs = lastCheckedAt ? Date.parse(lastCheckedAt) : Number.NaN
    if (Number.isFinite(lastCheckedMs) && Date.now() - lastCheckedMs < POLL_INTERVAL_MS) {
      return NextResponse.json({ success: true, skipped: "checked_recently", checkedAt: lastCheckedAt, imported: 0 })
    }

    const posts = await fetchCommunityWall()
    const sinceMs = Number.isFinite(lastCheckedMs) ? lastCheckedMs - 10 * 60 * 1000 : Date.now() - INITIAL_LOOKBACK_MS
    const candidates = posts
      .filter((post: Record<string, any>) => Number.isFinite(post.date) && post.date * 1000 >= sinceMs)
      .map((post: Record<string, any>) => ({ post, parsed: parseRzdNewsPost(post) }))
      .filter((item: { post: Record<string, any>; parsed: ReturnType<typeof parseRzdNewsPost> }) => item.parsed !== null)

    const categories = candidates.map(({ post }: { post: Record<string, any> }) => `${CATEGORY_PREFIX}${post.id}`)
    const existingCategories = new Set<string>()
    if (categories.length > 0) {
      const { data, error } = await supabase.from("articles").select("category").in("category", categories)
      if (error) throw error
      for (const row of data ?? []) {
        if (typeof row.category === "string") existingCategories.add(row.category)
      }
    }

    const newPosts = candidates.filter(({ post }: { post: Record<string, any> }) => !existingCategories.has(`${CATEGORY_PREFIX}${post.id}`))
    const articles = await Promise.all(newPosts.map(async ({ post, parsed }: { post: Record<string, any>; parsed: NonNullable<ReturnType<typeof parseRzdNewsPost>> }) => {
      const sourceUrl = `https://vk.com/wall-${COMMUNITY_ID}_${post.id}`
      const content = [parsed.content, `Источник: ${sourceUrl}`].filter(Boolean).join("\n\n")
      const publishedAt = new Date(post.date * 1000).toISOString()
      return {
        title: parsed.title,
        content,
        is_published: true,
        author_name: "Группа РЖД",
        author_id: "",
        author_role: "Группа РЖД",
        section_label: "Новости фракции",
        category: `${CATEGORY_PREFIX}${post.id}`,
        allowed_roles: VISIBLE_ROLES,
        image_url: await getPhotoUrls(post.attachments),
        created_at: publishedAt,
        updated_at: publishedAt,
      }
    }))

    if (articles.length > 0) {
      const { error } = await supabase.from("articles").insert(articles)
      if (error) throw error
    }

    const checkedAt = new Date().toISOString()
    const { error: settingError } = await supabase.from("app_settings").upsert(
      { key: LAST_CHECK_KEY, value: checkedAt, updated_at: checkedAt },
      { onConflict: "key" },
    )
    if (settingError) throw settingError

    return NextResponse.json({ success: true, checkedAt, imported: articles.length })
  } catch (error) {
    console.error("[vk-rzd-sync] failed:", error instanceof Error ? error.message : "unknown error")
    return jsonError("Не удалось обновить новости ВК", 500)
  } finally {
    if (lockValue) {
      try {
        await supabase.from("app_settings").delete().eq("key", LOCK_KEY).eq("value", lockValue)
      } catch {
        // The lock expires automatically and can be reclaimed after a failed request.
      }
    }
  }
}

export async function GET(request: NextRequest) {
  const cronSecret = process.env.CRON_SECRET
  if (cronSecret && request.headers.get("authorization") !== `Bearer ${cronSecret}`) {
    return jsonError("Unauthorized", 401)
  }
  return synchronize()
}

export async function POST(request: NextRequest) {
  const origin = request.headers.get("origin")
  if (origin && origin !== new URL(request.url).origin) return jsonError("Forbidden", 403)
  return synchronize()
}
