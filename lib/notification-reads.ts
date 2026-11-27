export async function getReadNotificationIds(userId: string): Promise<Set<string>> {
  const response = await fetch(`/api/notifications?user_id=${encodeURIComponent(userId)}`, {
    cache: "no-store",
  })

  if (!response.ok) {
    throw new Error("Не удалось загрузить прочтения уведомлений")
  }

  const result = (await response.json()) as { readArticleIds?: unknown }
  if (!Array.isArray(result.readArticleIds)) return new Set()

  return new Set(result.readArticleIds.map(String))
}

export async function markNotificationsAsRead(userId: string, articleIds: string[]): Promise<void> {
  if (articleIds.length === 0) return

  const response = await fetch("/api/notifications", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ user_id: userId, article_ids: articleIds }),
  })

  if (!response.ok) {
    throw new Error("Не удалось сохранить прочтения уведомлений")
  }
}
