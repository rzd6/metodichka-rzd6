"use client"

import { useState, useEffect, useCallback } from "react"
import { Button } from "@/components/ui/button"
import { BugReportButton } from "@/components/bug-report-button"
import { RefreshCw, UserPlus, Trash2, ArrowUp, ArrowDown, Terminal, Crown, ChevronDown, ChevronUp, Users, ChevronLeft, ChevronRight } from "lucide-react"

export interface StaffAuditEntry {
  id: string
  action: "add" | "delete" | "promote" | "demote" | "role_change" | "secondary_add" | "secondary_remove"
  actor_id: string
  actor_nickname: string
  actor_role: string
  target_id: string | null
  target_nickname: string | null
  old_role: string | null
  new_role: string | null
  created_at: string
}

const ACTION_META: Record<
  string,
  { label: string; icon: React.ComponentType<{ className?: string }>; color: string }
> = {
  add:              { label: "Добавлен",       icon: UserPlus,  color: "#22c55e" },
  delete:           { label: "Удалён",         icon: Trash2,    color: "#ef4444" },
  promote:          { label: "Повышен",        icon: ArrowUp,   color: "#3b82f6" },
  demote:           { label: "Понижен",        icon: ArrowDown, color: "#f59e0b" },
  role_change:      { label: "Смена роли",     icon: ArrowUp,   color: "#8b5cf6" },
  secondary_add:    { label: "Доп. роль выдана",   icon: Crown,     color: "#f59e0b" },
  secondary_remove: { label: "Доп. роль снята",    icon: Terminal,  color: "#64748b" },
}

function formatDate(iso: string) {
  const d = new Date(iso)
  return d.toLocaleString("ru-RU", {
    day: "2-digit",
    month: "2-digit",
    year: "2-digit",
    hour: "2-digit",
    minute: "2-digit",
  })
}

async function fetchEntries(month: string, page: number): Promise<{ entries: StaffAuditEntry[]; hasMore: boolean }> {
  try {
    const res = await fetch(`/api/staff-audit?month=${month}&page=${page}&pageSize=50`)
    const { data, hasMore } = await res.json()
    return { entries: Array.isArray(data) ? data : [], hasMore: Boolean(hasMore) }
  } catch { return { entries: [], hasMore: false } }
}

function monthOptions() {
  const result: string[] = []
  const date = new Date()
  date.setUTCDate(1)
  for (let i = 0; i < 24; i++) {
    result.push(date.toISOString().slice(0, 7))
    date.setUTCMonth(date.getUTCMonth() - 1)
  }
  return result
}

interface Props {
  tieColor: string
  isDark: boolean
}

export function StaffAuditTab({ tieColor, isDark }: Props) {
  const [entries, setEntries] = useState<StaffAuditEntry[]>([])
  const [loading, setLoading] = useState(true)
  const [refreshing, setRefreshing] = useState(false)
  const [expanded, setExpanded] = useState<Set<string>>(new Set())
  const [month, setMonth] = useState(() => new Date().toISOString().slice(0, 7))
  const [page, setPage] = useState(1)
  const [hasMore, setHasMore] = useState(false)

  const border = isDark ? "border-white/10" : "border-black/10"
  const cardBg = isDark ? "bg-[#0f1419]/50" : "bg-white"
  const textMuted = isDark ? "text-white/50" : "text-black/40"

  const load = useCallback(async (silent = false) => {
    if (!silent) setLoading(true)
    else setRefreshing(true)
    const result = await fetchEntries(month, page)
    setEntries(result.entries)
    setHasMore(result.hasMore)
    if (!silent) setLoading(false)
    else setRefreshing(false)
  }, [month, page])

  useEffect(() => { load() }, [load])

  const toggleExpand = (id: string) => {
    setExpanded((prev) => {
      const next = new Set(prev)
      if (next.has(id)) next.delete(id)
      else next.add(id)
      return next
    })
  }

  return (
    <div className="space-y-3">
      {/* Header */}
      <div className="flex items-center gap-3 pb-3 border-b" style={{ borderColor: tieColor + "40" }}>
        <div
          className="p-3 rounded-xl"
          style={{ background: `linear-gradient(135deg, ${tieColor}20, ${tieColor}10)` }}
        >
          <Users className="w-6 h-6" style={{ color: tieColor }} />
        </div>
        <div className="flex-1">
          <h2 className="text-3xl font-bold" style={{ color: tieColor }}>
            Лог сотрудников
          </h2>
          <p className={`text-sm ${textMuted}`}>
            Добавление, удаление и изменение ролей
          </p>
        </div>
        <div className="ml-auto flex shrink-0 flex-wrap items-center justify-end gap-2">
          <label className={`flex items-center gap-2 text-xs ${textMuted}`}>
            <span className="sr-only">Месяц</span>
            <select value={month} onChange={(event) => { setMonth(event.target.value); setPage(1) }} className={`h-8 rounded-md border px-2 text-xs ${isDark ? "border-white/10 bg-white/5 text-white" : "border-gray-200 bg-white text-black"}`}>
              {monthOptions().map((value) => <option key={value} value={value}>{value}</option>)}
            </select>
          </label>
          <Button variant="outline" size="sm" onClick={() => setPage((value) => Math.max(1, value - 1))} disabled={page === 1 || loading} aria-label="Предыдущая страница"><ChevronLeft className="h-3 w-3" /></Button>
          <Button variant="outline" size="sm" onClick={() => setPage((value) => value + 1)} disabled={!hasMore || loading} aria-label="Следующая страница"><ChevronRight className="h-3 w-3" /></Button>
          <BugReportButton sectionLabel="staff-log" />
          <Button
          variant="outline"
          size="sm"
          onClick={() => load(true)}
          disabled={refreshing}
          className={`h-8 px-3 text-xs ${
            isDark
              ? "border-white/10 bg-transparent text-white hover:bg-white/5"
              : "border-gray-200 bg-transparent text-black hover:bg-gray-50"
          }`}
        >
          <RefreshCw className={`w-3 h-3 mr-1.5 ${refreshing ? "animate-spin" : ""}`} />
            Обновить
          </Button>
        </div>
      </div>

      {loading ? (
        <div className="space-y-2">
          {[1, 2, 3, 4].map((i) => (
            <div
              key={i}
              className={`h-14 rounded-xl animate-pulse ${isDark ? "bg-white/5" : "bg-gray-100"}`}
              style={{ opacity: 1 - i * 0.15 }}
            />
          ))}
        </div>
      ) : entries.length === 0 ? (
        <div className={`rounded-2xl border-2 border-dashed ${border} p-12 text-center ${textMuted}`}>
          <Users className="w-10 h-10 mx-auto mb-3 opacity-40" />
          <p className="text-sm">Записей пока нет</p>
        </div>
      ) : (
        <div className="space-y-2">
          {entries.map((entry) => {
            const meta = ACTION_META[entry.action] ?? {
              label: entry.action,
              icon: Users,
              color: "#888",
            }
            const ActionIcon = meta.icon
            const hasRoleInfo =
              (entry.old_role && entry.new_role) ||
              entry.new_role ||
              entry.old_role
            const isExp = expanded.has(entry.id)

            return (
              <div key={entry.id} className={`rounded-2xl border ${border} ${cardBg} p-3`}>
                <div className="flex items-start gap-3">
                  {/* Action badge */}
                  <div
                    className="w-8 h-8 rounded-xl flex items-center justify-center flex-shrink-0"
                    style={{ backgroundColor: meta.color + "20" }}
                  >
                    <ActionIcon className="w-4 h-4" />
                  </div>

                  <div className="flex-1 min-w-0">
                    <div className="flex items-start justify-between gap-2">
                      <div className="flex flex-wrap items-center gap-1.5">
                        {entry.target_nickname && (
                          <span
                            className="font-semibold text-sm"
                            style={{ color: isDark ? "#fff" : "#000" }}
                          >
                            {entry.target_nickname}
                          </span>
                        )}
                        <span
                          className="text-xs font-medium px-1.5 py-0.5 rounded-full"
                          style={{ backgroundColor: meta.color + "20", color: meta.color }}
                        >
                          {meta.label}
                        </span>
                      </div>
                      <span className={`text-xs flex-shrink-0 ${textMuted}`}>
                        {formatDate(entry.created_at)}
                      </span>
                    </div>

                    <div className={`text-xs mt-0.5 ${textMuted}`}>
                      <span>Кто: </span>
                      <span className="font-medium" style={{ color: tieColor }}>
                        {entry.actor_nickname}
                      </span>
                      <span className="ml-1">({entry.actor_role})</span>
                    </div>

                    {/* Role change details toggle */}
                    {hasRoleInfo && (
                      <button
                        onClick={() => toggleExpand(entry.id)}
                        className={`mt-1.5 flex items-center gap-1 text-xs ${textMuted} hover:opacity-80 transition-opacity`}
                      >
                        {isExp ? (
                          <ChevronUp className="w-3 h-3" />
                        ) : (
                          <ChevronDown className="w-3 h-3" />
                        )}
                        {isExp ? "Скрыть детали" : "Детали"}
                      </button>
                    )}

                    {isExp && hasRoleInfo && (
                      <div className={`mt-2 rounded-lg border ${border} p-2 text-xs space-y-1`}>
                        {entry.old_role && (
                          <div className={textMuted}>
                            <span className="text-red-400">- </span>
                            <span className="font-mono">{entry.old_role}</span>
                          </div>
                        )}
                        {entry.new_role && (
                          <div className={isDark ? "text-white/80" : "text-black/70"}>
                            <span className="text-green-400">+ </span>
                            <span className="font-mono">{entry.new_role}</span>
                          </div>
                        )}
                      </div>
                    )}
                  </div>
                </div>
              </div>
            )
          })}
        </div>
      )}
    </div>
  )
}

// Helper to post an audit entry from the client side
export async function logStaffAction(
  action: StaffAuditEntry["action"],
  actor: { id: string; nickname: string; role: string },
  target?: { id: string; nickname: string },
  oldRole?: string,
  newRole?: string
) {
  try {
    await fetch("/api/staff-audit", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        action,
        actor_id: actor.id,
        actor_nickname: actor.nickname,
        actor_role: actor.role,
        target_id: target?.id ?? null,
        target_nickname: target?.nickname ?? null,
        old_role: oldRole ?? null,
        new_role: newRole ?? null,
      }),
    })
  } catch {
    // Non-critical — silently ignore logging failures
  }
}
