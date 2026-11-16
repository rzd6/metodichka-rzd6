"use client"

import { useState } from "react"
import { Check, Clipboard, Clock3, ImageIcon, ShieldCheck, Truck } from "lucide-react"
import { Card, CardContent, CardHeader } from "@/components/ui/card"
import { useTheme } from "@/contexts/theme-context"
import { getThemeColor } from "@/lib/theme-utils"
import { getMiniTaskTemplate, LOADING_UNLOADING_PHOTO, MINI_TASKS, MINI_TASK_RULES } from "@/data/mini-tasks"

export function MiniTasksSection() {
  const { theme } = useTheme()
  const tieColor = getThemeColor(theme.colorTheme)
  const isDark = theme.mode === "dark"
  const [copiedTask, setCopiedTask] = useState<string | null>(null)
  const textColor = isDark ? "text-white" : "text-gray-900"
  const mutedColor = isDark ? "text-white/65" : "text-gray-600"
  const surface = isDark ? "border-white/10 bg-[#0f1419]/60" : "border-gray-200 bg-white/90"

  const copyTemplate = async (taskId: string, template: string) => {
    try {
      await navigator.clipboard.writeText(template)
      setCopiedTask(taskId)
      window.setTimeout(() => setCopiedTask((current) => current === taskId ? null : current), 1800)
    } catch {
      setCopiedTask(`error-${taskId}`)
      window.setTimeout(() => setCopiedTask(null), 2500)
    }
  }

  return (
    <section className="space-y-5" aria-labelledby="mini-tasks-heading">
      <header className="flex items-center gap-3 border-b pb-4" style={{ borderColor: `${tieColor}55` }}>
        <div className="rounded-xl p-3" style={{ backgroundColor: `${tieColor}20` }}>
          <Truck className="size-6" style={{ color: tieColor }} aria-hidden="true" />
        </div>
        <div>
          <h1 id="mini-tasks-heading" className="text-2xl font-bold sm:text-3xl" style={{ color: tieColor }}>Мини-задания</h1>
          <p className={`mt-1 text-sm ${mutedColor}`}>Поставка материалов для нужд ОАО «РЖД»</p>
        </div>
      </header>

      <Card className={`rounded-2xl ${surface}`}>
        <CardHeader className="pb-2">
          <h2 className={`flex items-center gap-2 text-lg font-semibold ${textColor}`}>
            <ShieldCheck className="size-5" style={{ color: tieColor }} aria-hidden="true" />
            Правила выполнения
          </h2>
        </CardHeader>
        <CardContent>
          <ul className={`grid gap-3 text-sm sm:grid-cols-2 ${mutedColor}`}>
            {MINI_TASK_RULES.map((rule, index) => (
              <li key={rule} className={`flex items-start gap-2.5 rounded-xl border p-3 ${isDark ? "border-white/10" : "border-black/10"}`}>
                <span className="mt-0.5 flex size-5 shrink-0 items-center justify-center rounded-full text-xs font-bold text-white" style={{ backgroundColor: tieColor }}>{index + 1}</span>
                <span>{rule}</span>
              </li>
            ))}
          </ul>
          <div className={`mt-4 flex items-center gap-2 text-sm ${mutedColor}`}>
            <Clock3 className="size-4 shrink-0" style={{ color: tieColor }} aria-hidden="true" />
            <span>Лимит — 3 задания в неделю; время на загрузке — не более 3 минут.</span>
          </div>
        </CardContent>
      </Card>

      <Card className={`overflow-hidden rounded-2xl ${surface}`}>
        <CardHeader className="pb-2">
          <h2 className={`flex items-center gap-2 text-lg font-semibold ${textColor}`}>
            <ImageIcon className="size-5" style={{ color: tieColor }} aria-hidden="true" />
            Место загрузки и разгрузки
          </h2>
          <p className={`text-sm ${mutedColor}`}>Фото для ориентира при выполнении задания.</p>
        </CardHeader>
        <CardContent>
          <a href={LOADING_UNLOADING_PHOTO} target="_blank" rel="noopener noreferrer" className={`block overflow-hidden rounded-xl border focus-visible:outline-none focus-visible:ring-2 ${isDark ? "border-white/10" : "border-black/10"}`} style={{ outlineColor: tieColor }}>
            <img src={LOADING_UNLOADING_PHOTO} alt="Место загрузки и разгрузки для мини-заданий" className="max-h-[420px] w-full object-contain" loading="lazy" />
          </a>
          <a href={LOADING_UNLOADING_PHOTO} target="_blank" rel="noopener noreferrer" className="mt-2 inline-flex text-sm underline underline-offset-4" style={{ color: tieColor }}>
            Открыть фото в полном размере
          </a>
        </CardContent>
      </Card>

      <div className="space-y-3">
        <div>
          <h2 className={`text-xl font-bold ${textColor}`}>Список мини-заданий</h2>
          <p className={`mt-1 text-sm ${mutedColor}`}>Выберите поставку, чтобы открыть маршрут и RP-шаблон.</p>
        </div>
        {MINI_TASKS.map((task, index) => {
          const template = getMiniTaskTemplate(task)
          const copied = copiedTask === task.id
          const copyError = copiedTask === `error-${task.id}`
          return (
            <details key={task.id} className={`group overflow-hidden rounded-2xl border ${surface}`}>
              <summary className="flex cursor-pointer list-none items-center gap-3 p-4 focus-visible:outline-none focus-visible:ring-2" style={{ outlineColor: tieColor }}>
                <span className="flex size-9 shrink-0 items-center justify-center rounded-xl text-sm font-bold text-white" style={{ backgroundColor: tieColor }}>{index + 1}</span>
                <span className="min-w-0 flex-1">
                  <span className={`block font-semibold ${textColor}`}>{task.title}</span>
                  <span className={`mt-0.5 block text-xs ${mutedColor}`}>{task.cargo} · {task.destination}</span>
                </span>
                <span className={`text-xs ${mutedColor} group-open:hidden`}>Показать</span>
                <span className={`hidden text-xs ${mutedColor} group-open:inline`}>Скрыть</span>
              </summary>
              <div className="border-t border-white/10 p-4" style={{ borderColor: `${tieColor}30` }}>
                <div className="flex flex-wrap items-start justify-between gap-3">
                  <div>
                    <h3 className={`font-semibold ${textColor}`}>Порядок выполнения</h3>
                    <p className={`mt-1 text-sm ${mutedColor}`}>Отправление → загрузка → возвращение → разгрузка → прибытие в РЖД.</p>
                  </div>
                  <button type="button" onClick={() => copyTemplate(task.id, template)} className="inline-flex min-h-10 items-center gap-2 rounded-lg px-3 py-2 text-sm font-medium text-white focus-visible:outline-none focus-visible:ring-2 disabled:opacity-60" style={{ backgroundColor: tieColor }}>
                    {copied ? <Check className="size-4" aria-hidden="true" /> : <Clipboard className="size-4" aria-hidden="true" />}
                    {copied ? "Скопировано" : "Скопировать RP-шаблон"}
                  </button>
                </div>
                {copyError && <p role="status" className="mt-2 text-sm text-amber-500">Не удалось скопировать. Разрешите доступ к буферу обмена и попробуйте ещё раз.</p>}
                <pre className={`mt-4 max-h-[460px] overflow-auto whitespace-pre-wrap rounded-xl border p-4 font-mono text-xs leading-6 ${isDark ? "border-white/10 bg-black/30 text-white/80" : "border-gray-200 bg-gray-50 text-gray-800"}`}>{template}</pre>
                <p role="status" aria-live="polite" className="sr-only">{copied ? "RP-шаблон скопирован" : ""}</p>
              </div>
            </details>
          )
        })}
      </div>
    </section>
  )
}
