import { NextRequest, NextResponse } from "next/server"
import { getSupabaseServer } from "@/lib/supabase-server"

/**
 * GET /api/notifications/unread?user_id=xxx
 * Возвращает статьи-уведомления, которые пользователь ещё не прочитал.
 */
export async function GET(req: NextRequest) {
  try {
    const supabase = getSupabaseServer()
    const { searchParams } = new URL(req.url)
    const userId = searchParams.get("user_id")

    if (!userId) {
      return NextResponse.json({ error: "user_id is required" }, { status: 400 })
    }

    // Получаем ID прочитанных статей для этого пользователя
    const { data: reads, error: readsError } = await supabase
      .from("user_notification_reads")
      .select("article_id")
      .eq("user_id", userId)

    if (readsError) throw readsError

    const readArticleIds = (reads ?? []).map((r: { article_id: number }) => r.article_id)

    // Получаем все опубликованные статьи
    let query = supabase.from("articles").select("*").eq("is_published", true).order("created_at", { ascending: false })

    // Если есть прочитанные — исключаем их
    if (readArticleIds.length > 0) {
      query = query.not("id", "in", `(${readArticleIds.join(",")})`)
    }

    const { data: articles, error } = await query

    if (error) throw error

    return NextResponse.json({ data: articles ?? [], unreadCount: (articles ?? []).length })
  } catch (err: any) {
    return NextResponse.json({ error: err.message || "Ошибка сервера" }, { status: 500 })
  }
}

/**
 * POST /api/notifications/read
 * Тело: { user_id: string, article_ids: number[] }
 * Помечает указанные статьи как прочитанные для пользователя.
 */
export async function POST(req: NextRequest) {
  try {
    const supabase = getSupabaseServer()
    const body = await req.json()
    const { user_id, article_ids } = body

    if (!user_id || !Array.isArray(article_ids) || article_ids.length === 0) {
      return NextResponse.json({ error: "user_id and article_ids are required" }, { status: 400 })
    }

    const rows = article_ids.map((article_id) => ({
      user_id,
      article_id,
    }))

    const { error } = await supabase.from("user_notification_reads").upsert(rows, {
      onConflict: "user_id, article_id",
    })

    if (error) throw error

    return NextResponse.json({ success: true, marked: article_ids.length })
  } catch (err: any) {
    return NextResponse.json({ error: err.message || "Ошибка сервера" }, { status: 500 })
  }
}
