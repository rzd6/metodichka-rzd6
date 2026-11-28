import { NextRequest, NextResponse } from "next/server"
import { getSupabaseServer } from "@/lib/supabase-server"

export const dynamic = "force-dynamic"
export const runtime = "edge"

const MAX_ID_LENGTH = 128
const MAX_ARTICLE_IDS = 1000
const MAX_READ_STATES = 5000

function normalizeUserId(value: unknown): string | null {
  if (typeof value !== "string") return null
  const userId = value.trim()
  return userId.length > 0 && userId.length <= MAX_ID_LENGTH ? userId : null
}

function normalizeArticleIds(input: unknown): string[] | null {
  if (!Array.isArray(input) || input.length === 0 || input.length > MAX_ARTICLE_IDS) return null

  const ids: string[] = []
  for (const value of input) {
    if (typeof value !== "string" && !(typeof value === "number" && Number.isSafeInteger(value))) return null
    const articleId = String(value).trim()
    if (!articleId || articleId.length > MAX_ID_LENGTH) return null
    ids.push(articleId)
  }

  return [...new Set(ids)]
}

export async function GET(req: NextRequest) {
  const userId = normalizeUserId(new URL(req.url).searchParams.get("user_id"))
  if (!userId) {
    return NextResponse.json({ error: "user_id is required" }, { status: 400 })
  }

  try {
    const { data, error } = await getSupabaseServer()
      .from("user_notification_reads")
      .select("article_id")
      .eq("user_id", userId)
      .limit(MAX_READ_STATES)

    if (error) throw error

    return NextResponse.json(
      { readArticleIds: (data ?? []).map((row: { article_id: string }) => row.article_id) },
      { headers: { "Cache-Control": "no-store" } },
    )
  } catch (error) {
    console.error("[api/notifications] Failed to load read states", error)
    return NextResponse.json({ error: "Не удалось загрузить прочтения уведомлений" }, { status: 500 })
  }
}

export async function POST(req: Request) {
  let body: unknown
  try {
    body = await req.json()
  } catch {
    return NextResponse.json({ error: "Invalid JSON body" }, { status: 400 })
  }

  if (!body || typeof body !== "object" || Array.isArray(body)) {
    return NextResponse.json({ error: "Invalid request body" }, { status: 400 })
  }

  const payload = body as { user_id?: unknown; article_ids?: unknown }
  const userId = normalizeUserId(payload.user_id)
  const articleIds = normalizeArticleIds(payload.article_ids)
  if (!userId || !articleIds) {
    return NextResponse.json({ error: "user_id and valid article_ids are required" }, { status: 400 })
  }

  try {
    const { error } = await getSupabaseServer()
      .from("user_notification_reads")
      .upsert(
        articleIds.map((articleId) => ({ user_id: userId, article_id: articleId })),
        { onConflict: "user_id,article_id", ignoreDuplicates: true },
      )

    if (error) throw error

    return NextResponse.json({ success: true, marked: articleIds.length })
  } catch (error) {
    console.error("[api/notifications] Failed to save read states", error)
    return NextResponse.json({ error: "Не удалось сохранить прочтения уведомлений" }, { status: 500 })
  }
}
