"use client"

import { useState, useEffect, type ReactNode } from "react"
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { Bell, Users, X, Crown, Shield, UsersRound, Train, Wrench, Terminal } from "lucide-react"
import Image from "next/image"
import { getArticles, type Article } from "@/lib/supabase-rzd"
import { useTheme } from "@/contexts/theme-context"
import { getThemeColor } from "@/lib/theme-utils"
import { getAvatarFilterFromColor } from "@/lib/color-utils"
import type { UserRole } from "@/data/users"

const PAGE_SIZE = 10
const READ_KEY = "rzd-notifications-read"
const HAS_UNREAD_KEY = "rzd-notifications-has-unread"

interface NotificationsModalProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  userRole: UserRole
  secondaryRole?: string
  refreshKey?: string
  onUnreadChange?: (count: number) => void
}

function RoleBadgeIcon({ role, color }: { role: string; color: string }) {
  const cls = "w-3 h-3 flex-shrink-0"
  switch (role) {
    case "Руководство": return <Crown className={cls} style={{ color }} />
    case "Заместитель": return <Shield className={cls} style={{ color }} />
    case "Старший Состав": return <UsersRound className={cls} style={{ color }} />
    case "ЦдУД": return <Train className={cls} style={{ color }} />
    case "ПТО": return <Wrench className={cls} style={{ color }} />
    case "Тех. Администратор": return <Terminal className={cls} style={{ color }} />
    case "Группа РЖД": return <Crown className={cls} style={{ color }} />
    default: return <Users className={cls} style={{ color }} />
  }
}

const ROLE_AVATARS: Record<string, string> = {
  Руководство: "/avatars/management.png",
  Заместитель: "/avatars/senior-staff.png",
  "Старший Состав": "/avatars/senior-staff.png",
  ЦдУД: "/avatars/cdud.png",
  ПТО: "/avatars/pto.png",
}

const NOTIFICATION_URL_PATTERN = /(?:https?:\/\/|www\.)[^\s<>"']+|(?<![\w@])(?:[a-z0-9-]+\.)+(?:ru|com|org|net|io|dev|app|co|info|gg|me|tv|cc|online|site|рф)(?:\/[^\s<>"']*)?/gi

function LinkifiedText({ text, color }: { text: string; color: string }) {
  const parts: ReactNode[] = []
  const urlPattern = new RegExp(NOTIFICATION_URL_PATTERN.source, NOTIFICATION_URL_PATTERN.flags)
  let cursor = 0
  let linkIndex = 0
  let match: RegExpExecArray | null

  while ((match = urlPattern.exec(text)) !== null) {
    let url = match[0]
    let trailingText = ""
    while (/[.,!?;:)\]}]/.test(url.slice(-1))) {
      trailingText = url.slice(-1) + trailingText
      url = url.slice(0, -1)
    }
    if (!url) continue

    if (match.index > cursor) parts.push(text.slice(cursor, match.index))
    const href = url.startsWith("www.") ? `https://${url}` : url
    parts.push(
      <a
        key={`link-${linkIndex++}`}
        href={href}
        target="_blank"
        rel="noopener noreferrer"
        className="break-all underline underline-offset-2 hover:opacity-80 focus-visible:rounded-sm focus-visible:outline-none focus-visible:ring-2"
        style={{ color }}
      >
        {url}
      </a>,
    )
    if (trailingText) parts.push(trailingText)
    cursor = match.index + match[0].length
  }

  if (cursor < text.length) parts.push(text.slice(cursor))
  return <>{parts}</>
}

export function NotificationsModal({ open, onOpenChange, userRole, secondaryRole, refreshKey, onUnreadChange }: NotificationsModalProps) {
  const { theme } = useTheme()
  const [allArticles, setAllArticles] = useState<Article[]>([])
  const [displayedArticles, setDisplayedArticles] = useState<Article[]>([])
  const [page, setPage] = useState(0)
  const [isLoading, setIsLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [authorAvatars, setAuthorAvatars] = useState<Record<string, string | null>>({})
  const [hasMore, setHasMore] = useState(false)

  const getTieColor = () => getThemeColor(theme.colorTheme)

  const getReadIds = (): number[] => {
    try {
      const raw = localStorage.getItem(READ_KEY)
      if (!raw) return []
      const parsed = JSON.parse(raw)
      return Array.isArray(parsed) ? parsed.map(Number).filter(Boolean) : []
    } catch {
      return []
    }
  }

  const markAsRead = (ids: number[]) => {
    const current = getReadIds()
    const merged = [...new Set([...current, ...ids])]
    localStorage.setItem(READ_KEY, JSON.stringify(merged))
    localStorage.setItem(HAS_UNREAD_KEY, "0")
  }

  useEffect(() => {
    if (!open) return
    setIsLoading(true)
    setError(null)
    setPage(0)
    setDisplayedArticles([])

    getArticles()
      .then(async (all) => {
        const filtered = all.filter((a) => {
          if (!a.is_published || !Array.isArray(a.allowed_roles)) return false
          // Тех. Администратор (primary or secondary) sees all articles
          if (userRole === "Тех. Администратор" || secondaryRole === "Тех. Администратор") return true
          return a.allowed_roles.includes(userRole) || (secondaryRole ? a.allowed_roles.includes(secondaryRole) : false)
        })
        // Сортируем по дате, новые первыми
        filtered.sort((a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime())
        setAllArticles(filtered)

        const readIds = getReadIds()
        const unreadCount = filtered.filter((a) => !readIds.includes(Number(a.id))).length
        if (onUnreadChange) {
          onUnreadChange(unreadCount)
        }

        // Показываем первые PAGE_SIZE
        const firstPage = filtered.slice(0, PAGE_SIZE)
        setDisplayedArticles(firstPage)
        setHasMore(filtered.length > PAGE_SIZE)

        // Помечаем показанные как прочитанные в localStorage (сохраняется при перезагрузке)
        if (filtered.length > 0) {
          markAsRead(filtered.map((a) => Number(a.id)))
          localStorage.setItem(HAS_UNREAD_KEY, "0")
        }

        // Fetch custom avatars for authors from users API
        const authorIds = [...new Set(filtered.map((a) => a.author_id).filter(Boolean))]
        if (authorIds.length > 0) {
          try {
            const res = await fetch("/api/users")
            const json = await res.json()
            const avatarMap: Record<string, string | null> = {}
            for (const u of json.data || []) {
              if (u.vk_avatar || u.avatar || u.custom_avatar) {
                avatarMap[u.id] = u.vk_avatar || u.avatar || u.custom_avatar
              }
            }
            setAuthorAvatars(avatarMap)
          } catch {
            // silent
          }
        }
      })
      .catch((err: any) => {
        setError(err?.message || "Не удалось загрузить уведомления")
        setAllArticles([])
        setDisplayedArticles([])
        if (onUnreadChange) {
          onUnreadChange(0)
        }
      })
      .finally(() => setIsLoading(false))
  }, [open, userRole, secondaryRole, refreshKey, onUnreadChange])

  const loadMore = () => {
    const nextPage = page + 1
    const start = nextPage * PAGE_SIZE
    const end = start + PAGE_SIZE
    const nextBatch = allArticles.slice(start, end)
    setDisplayedArticles((prev) => [...prev, ...nextBatch])
    setPage(nextPage)
    setHasMore(end < allArticles.length)
  }

  const getAuthorBlock = (article: Article) => {
    const isFaction = article.author_name === "Группа РЖД"
    const customAv = article.author_id ? authorAvatars[article.author_id] : null
    const authorRole = article.author_role || (isFaction ? "Группа РЖД" : "")
    const roleAvatar = (authorRole && ROLE_AVATARS[authorRole]) || (isFaction ? "/avatars/management.png" : "/avatars/senior-staff.png")
    const avatarSrc = customAv || roleAvatar
    const tieColor = getTieColor()

    return (
      <div className="flex items-center gap-2 flex-wrap">
        {/* Avatar */}
        <div
          className="w-5 h-5 rounded-full overflow-hidden border flex-shrink-0"
          style={{ borderColor: tieColor + "60" }}
        >
          <Image
            src={avatarSrc || "/placeholder.svg"}
            alt={article.author_name}
            width={20}
            height={20}
            className="w-full h-full object-cover object-center scale-110"
            style={customAv ? undefined : { filter: getAvatarFilterFromColor(theme.colorTheme) }}
          />
        </div>
        {/* Nickname */}
        <span className="text-sm font-medium" style={isFaction ? { color: tieColor } : {}}>
          {article.author_name}
        </span>
        {/* Role badge with icon */}
        {authorRole && (
          <span
            className="inline-flex items-center gap-1 px-1.5 py-0.5 rounded border text-[10px] font-semibold"
            style={{ borderColor: tieColor + "50", color: tieColor, backgroundColor: tieColor + "12" }}
          >
            <RoleBadgeIcon role={authorRole} color={tieColor} />
            {authorRole === "Группа РЖД" ? "Фракция" : authorRole}
          </span>
        )}
        {/* Section label */}
        {article.section_label && (
          <span
            className="text-[10px] px-2 py-0.5 rounded-full font-semibold"
            style={{ backgroundColor: tieColor + "18", color: tieColor }}
          >
            {article.section_label}
          </span>
        )}
      </div>
    )
  }

  const isUnread = (article: Article) => {
    const readIds = getReadIds()
    return !readIds.includes(Number(article.id))
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent
        className={`max-w-xl w-full max-h-[80vh] overflow-y-auto rounded-2xl border-2 ${
          theme.mode === "dark" ? "bg-[#0f1419] border-white/10 text-white" : "bg-white border-gray-200 text-gray-900"
        }`}
      >
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2 text-xl font-bold" style={{ color: getTieColor() }}>
            <Bell className="w-5 h-5" />
            Уведомления
          </DialogTitle>
        </DialogHeader>

        <div className="mt-2 space-y-3">
          {isLoading && (
            <div className="space-y-3 py-2">
              {[1, 2, 3].map((i) => (
                <div
                  key={i}
                  className={`rounded-xl border-2 p-4 animate-pulse ${
                    theme.mode === "dark" ? "bg-white/5 border-white/10" : "bg-gray-50 border-gray-200"
                  }`}
                  style={{ borderLeftWidth: "3px", borderLeftColor: getTieColor() + "60", opacity: 1 - (i - 1) * 0.2 }}
                >
                  <div className="h-4 rounded mb-2" style={{ backgroundColor: getTieColor() + "25", width: "60%" }} />
                  <div className="h-3 rounded mb-1.5" style={{ backgroundColor: getTieColor() + "15", width: "90%" }} />
                  <div className="h-3 rounded" style={{ backgroundColor: getTieColor() + "15", width: "70%" }} />
                </div>
              ))}
            </div>
          )}

          {!isLoading && error && (
            <div
              className="flex items-start gap-2 px-4 py-3 rounded-xl border text-sm"
              style={{ backgroundColor: "#ef44441a", borderColor: "#ef444440" }}
            >
              <X className="w-4 h-4 mt-0.5 flex-shrink-0 text-red-500" />
              <span className="text-red-500">{error}</span>
            </div>
          )}

          {!isLoading && !error && allArticles.length === 0 && (
            <div className="flex flex-col items-center gap-3 py-12">
              <div
                className="p-4 rounded-full"
                style={{ backgroundColor: getTieColor() + "15" }}
              >
                <Bell className="w-8 h-8" style={{ color: getTieColor() + "80" }} />
              </div>
              <p className="text-sm text-muted-foreground">Нет уведомлений</p>
            </div>
          )}

          {!isLoading && !error && allArticles.length > 0 && (
            <>
              {displayedArticles.map((article) => (
                <div
                  key={article.id}
                  className={`p-4 rounded-xl border-2 mb-3 ${
                    theme.mode === "dark"
                      ? "bg-white/5 border-white/10"
                      : "bg-gray-50 border-gray-200"
                  }`}
                  style={{
                    borderLeftWidth: "3px",
                    borderLeftColor: isUnread(article) ? getTieColor() : "#94a3b8",
                  }}
                >
                  {article.image_url && article.image_url.length > 0 && (
                    <div className={`mb-3 ${article.image_url.length === 1 ? "flex justify-center" : "grid grid-cols-2 gap-2"}`}>
                      {article.image_url.map((url, i) => (
                        <img
                          key={i}
                          src={url || "/placeholder.svg"}
                          alt={`${article.title} — изображение ${i + 1}`}
                          className="rounded-lg w-full max-h-48 object-contain"
                        />
                      ))}
                    </div>
                  )}

                  <h3 className={`font-bold text-base mb-2 ${isUnread(article) ? "text-gray-900" : "text-gray-500"}`}>
                    <LinkifiedText text={article.title} color={getTieColor()} />
                  </h3>
                  <p
                    className={`text-sm leading-relaxed whitespace-pre-wrap mb-3 ${
                      theme.mode === "dark" ? "text-white/70" : "text-gray-600"
                    }`}
                  >
                    <LinkifiedText text={article.content} color={getTieColor()} />
                  </p>

                  <div className="flex items-center gap-3 flex-wrap">
                    {getAuthorBlock(article)}
                    <span className={`text-xs font-medium ${isUnread(article) ? "text-red-500" : "text-muted-foreground"}`}>
                      {isUnread(article) ? "Новое" : new Date(article.created_at).toLocaleDateString("ru-RU", {
                        day: "2-digit",
                        month: "long",
                        year: "numeric",
                      })}
                    </span>
                  </div>
                </div>
              ))}

              {hasMore && (
                <Button
                  onClick={loadMore}
                  className="w-full py-2"
                  variant="outline"
                >
                  Показать ещё
                </Button>
              )}
              {!hasMore && displayedArticles.length > 0 && (
                <p className="text-center text-xs text-muted-foreground py-2">
                  Все уведомления показаны
                </p>
              )}
            </>
          )}
        </div>
      </DialogContent>
    </Dialog>
  )
}
