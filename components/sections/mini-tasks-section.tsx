"use client"

import { useEffect, useState } from "react"
import { Check, Clipboard, Clock3, ImageIcon, ShieldCheck, Truck } from "lucide-react"
import { clipboardCopy } from "@/lib/clipboard"
import { Card, CardContent, CardHeader } from "@/components/ui/card"
import { useTheme } from "@/contexts/theme-context"
import { getThemeColor } from "@/lib/theme-utils"
import { getMiniTaskTemplate, LOADING_UNLOADING_PHOTO, MINI_TASKS, MINI_TASK_RULES } from "@/data/mini-tasks"
import { getEffectiveReportTag } from "@/data/users"
import { Input } from "@/components/ui/input"
import { Accordion, AccordionContent, AccordionItem, AccordionTrigger } from "@/components/ui/accordion"
import { Skeleton } from "@/components/ui/skeleton"

export function MiniTasksSection() {
  const { theme } = useTheme()
  const tieColor = getThemeColor(theme.colorTheme)
  const isDark = theme.mode === "dark"
  const [copiedLine, setCopiedLine] = useState<string | null>(null)
  const [reportTag, setReportTag] = useState("[ТЭГ]")
  const [port, setPort] = useState("Невского")
  const [helperName, setHelperName] = useState("")
  const [photoState, setPhotoState] = useState<"loading" | "loaded" | "error">("loading")
  const textColor = isDark ? "text-white" : "text-gray-900"
  const mutedColor = isDark ? "text-white/65" : "text-gray-600"
  const surface = isDark ? "border-white/10 bg-[#0f1419]/60" : "border-gray-200 bg-white/90"

  useEffect(() => {
    try {
      const userData = JSON.parse(localStorage.getItem("currentUser") || "null")
      if (userData) setReportTag(getEffectiveReportTag(userData))
    } catch {
      setReportTag("[ТЭГ]")
    }
  }, [])

  const copyLine = (lineId: string, line: string) => {
    clipboardCopy(line)
    setCopiedLine(lineId)
    window.setTimeout(() => setCopiedLine((current) => current === lineId ? null : current), 1800)
  }

  return (
    <section className="space-y-5" aria-labelledby="mini-tasks-heading">
      <header className="flex items-center gap-3 border-b pb-4" style={{ borderColor: `${tieColor}55` }}>
        <div className="rounded-xl p-3" style={{ background: `linear-gradient(135deg, ${tieColor}20, ${tieColor}10)` }}>
          <Truck className="size-6" style={{ color: tieColor }} aria-hidden="true" />
        </div>
        <div>
          <h1 id="mini-tasks-heading" className="text-3xl font-bold" style={{ color: tieColor }}>Мини-задания</h1>
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
          <a href={LOADING_UNLOADING_PHOTO} target="_blank" rel="noopener noreferrer" className={`relative block min-h-52 overflow-hidden rounded-xl border focus-visible:outline-none focus-visible:ring-2 ${isDark ? "border-white/10 bg-white/[0.03]" : "border-black/10 bg-black/[0.03]"}`} style={{ outlineColor: tieColor }}>
            {photoState === "loading" && <Skeleton className="absolute inset-0 h-full w-full rounded-none" />}
            {photoState === "error" ? (
              <span className={`flex min-h-52 items-center justify-center px-4 text-sm ${mutedColor}`} role="status">Не удалось загрузить фото. Нажмите, чтобы открыть источник.</span>
            ) : (
              <img
                src={LOADING_UNLOADING_PHOTO}
                alt="Место загрузки и разгрузки для мини-заданий"
                className={`max-h-[420px] w-full object-contain transition-opacity duration-300 ${photoState === "loaded" ? "opacity-100" : "opacity-0"}`}
                loading="lazy"
                onLoad={() => setPhotoState("loaded")}
                onError={() => setPhotoState("error")}
              />
            )}
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
        <Card className={`rounded-2xl p-4 ${surface}`}>
          <div className="grid gap-4 sm:grid-cols-2">
            <label className={`space-y-1.5 text-sm font-medium ${textColor}`}>
              Порт для поставки формы
              <select value={port} onChange={(event) => setPort(event.target.value)} className={`w-full rounded-lg border px-3 py-2 ${isDark ? "border-white/15 bg-[#111820]" : "border-gray-300 bg-white"}`}>
                <option value="Невского">Невского</option>
                <option value="Приволжска">Приволжска</option>
              </select>
            </label>
            <label className={`space-y-1.5 text-sm font-medium ${textColor}`}>
              Имя и фамилия помощника <span className={`font-normal ${mutedColor}`}>(необязательно)</span>
              <Input value={helperName} onChange={(event) => setHelperName(event.target.value)} placeholder="Например, Иван Иванов" />
            </label>
          </div>
          <p className={`mt-3 text-xs ${mutedColor}`}>Тэг рации подставляется автоматически: <code className="font-mono">{reportTag}</code>. Строки шаблона можно нажимать для копирования.</p>
        </Card>
        <Accordion type="single" collapsible className="flex flex-col gap-4">
          {MINI_TASKS.map((task) => {
            const templateLines = getMiniTaskTemplate(task, { reportTag, port, helperName }).split("\n")
            const sectionHeadings = new Set(["Отправление:", "Прибытие на место загрузки:", "Погрузка:", "Возвращение:", "Разгрузка:", "Прибытие в РЖД:"])
            const destination = task.id === "uniform" ? `городской порт ${port}` : task.destination
            const lastCopiedIndex = copiedLine?.startsWith(`${task.id}-`)
              ? Number.parseInt(copiedLine.slice(task.id.length + 1), 10)
              : -1

            return (
              <AccordionItem
                key={task.id}
                value={task.id}
                className={`overflow-hidden rounded-2xl border-2 ${isDark ? "border-white/10 bg-[#0f1419]/50" : "border-gray-200 bg-white"}`}
              >
                <AccordionTrigger className="px-6 py-4 hover:no-underline">
                  <span className="flex min-w-0 items-center gap-3 text-left">
                    <Truck className="size-5 shrink-0" style={{ color: tieColor }} aria-hidden="true" />
                    <span className="min-w-0">
                      <span className={`block font-bold ${textColor}`}>{task.title}</span>
                      <span className={`mt-1 block text-sm ${mutedColor}`}>{task.cargo} · {destination}</span>
                    </span>
                  </span>
                </AccordionTrigger>
                <AccordionContent
                  className={`max-h-[min(70dvh,42rem)] overflow-x-hidden overflow-y-auto overscroll-contain px-6 pb-6 [scrollbar-gutter:stable] ${isDark ? "bg-[#0f1419]/50" : "bg-white"}`}
                  style={{ borderColor: `${tieColor}30` }}
                >
                  <div className="flex flex-col gap-1">
                    {templateLines.map((line, lineIndex) => {
                      if (!line) return <div key={`${task.id}-${lineIndex}`} className="h-2" aria-hidden="true" />
                      if (sectionHeadings.has(line)) {
                        return (
                          <h3 key={`${task.id}-${lineIndex}`} className={`pt-3 pb-1 font-semibold ${textColor}`}>
                            {line}
                          </h3>
                        )
                      }

                      const lineId = `${task.id}-${lineIndex}`
                      const isCopied = copiedLine === lineId
                      const isNext = lastCopiedIndex >= 0 && lineIndex === lastCopiedIndex + 1

                      return (
                        <button
                          key={lineId}
                          type="button"
                          onClick={() => copyLine(lineId, line)}
                          aria-label={`${isCopied ? "Скопировано:" : "Скопировать строку:"} ${line}`}
                          className={`group mb-2 w-full rounded-xl border-2 p-4 text-left transition-all duration-200 focus-visible:outline-none focus-visible:ring-2 ${isCopied
                            ? isDark ? "border-green-500/60 bg-gradient-to-r from-green-900/40 to-green-900/20" : "border-green-400 bg-gradient-to-r from-green-50 to-green-50/60"
                            : isNext
                              ? isDark ? "border-white/40 bg-gradient-to-r from-[#0f1419]/80 to-[#0f1419]/60 shadow-md" : "border-gray-400 bg-gradient-to-r from-white to-gray-50/60 shadow-md"
                              : isDark ? "border-white/10 bg-gradient-to-r from-[#0f1419]/80 to-[#0f1419]/60 hover:border-white/30" : "border-gray-200 bg-gradient-to-r from-white/80 to-gray-50/60 hover:border-gray-300"}`}
                          style={{
                            borderLeftWidth: "4px",
                            borderLeftColor: isCopied ? "#22c55e" : tieColor,
                            boxShadow: isNext ? `0 0 0 2px ${tieColor}40` : undefined,
                          }}
                        >
                          <span className="flex min-w-0 items-start justify-between gap-4">
                            <span className={`min-w-0 flex-1 whitespace-pre-wrap break-words [overflow-wrap:anywhere] text-sm ${isCopied ? "text-green-500" : isNext ? `${textColor} font-medium` : isDark ? "text-white/90" : "text-gray-900"}`}>
                              {line}
                            </span>
                            <span
                              className="flex size-8 shrink-0 items-center justify-center rounded-lg transition-all duration-200"
                              style={{ backgroundColor: isCopied ? "#22c55e20" : `${tieColor}20` }}
                            >
                              {isCopied ? (
                                <Check className="size-4 text-green-500" aria-hidden="true" />
                              ) : (
                                <Clipboard className="size-4 opacity-60 transition-opacity group-hover:opacity-100" style={{ color: tieColor }} aria-hidden="true" />
                              )}
                            </span>
                          </span>
                        </button>
                      )
                    })}
                  </div>
                  <p role="status" aria-live="polite" className="sr-only">
                    {copiedLine?.startsWith(`${task.id}-`) ? "Строка доклада скопирована" : ""}
                  </p>
                </AccordionContent>
              </AccordionItem>
            )
          })}
        </Accordion>
      </div>
    </section>
  )
}
