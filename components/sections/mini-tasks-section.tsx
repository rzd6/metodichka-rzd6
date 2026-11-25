"use client"

import { useEffect, useState } from "react"
import { Check, Clock, Copy, MapPin, Train, Truck, Users } from "lucide-react"
import { Accordion, AccordionContent, AccordionItem, AccordionTrigger } from "@/components/ui/accordion"
import { Card } from "@/components/ui/card"
import { Field, FieldDescription, FieldGroup, FieldLabel } from "@/components/ui/field"
import { Input } from "@/components/ui/input"
import { Skeleton } from "@/components/ui/skeleton"
import { useTheme } from "@/contexts/theme-context"
import { getMiniTaskTemplate, LOADING_UNLOADING_PHOTO, MINI_TASKS, MINI_TASK_RULES, type MiniTask } from "@/data/mini-tasks"
import { getEffectiveReportTag } from "@/data/users"
import { clipboardCopy } from "@/lib/clipboard"
import { getThemeColor } from "@/lib/theme-utils"
import { cn } from "@/lib/utils"

const REPORT_HEADINGS = new Set([
  "Отправление:",
  "Прибытие на место загрузки:",
  "Погрузка:",
  "Возвращение:",
  "Разгрузка:",
  "Прибытие в РЖД:",
])

function MiniTaskGuides({ accent, isDark }: { accent: string; isDark: boolean }) {
  const [photoState, setPhotoState] = useState<"loading" | "loaded" | "error">("loading")
  const textColor = isDark ? "text-white" : "text-gray-900"
  const mutedColor = isDark ? "text-white/70" : "text-gray-600"

  return (
    <Accordion type="single" collapsible className="flex flex-col gap-3">
      <AccordionItem value="rules" className={cn("overflow-hidden rounded-2xl border-2", isDark ? "border-white/10 bg-[#0f1419]/50" : "border-gray-200 bg-white")}>
        <AccordionTrigger className="px-5 py-4 hover:no-underline sm:px-6">
          <span className="flex items-center gap-3 text-left">
            <Users className="size-5 shrink-0" style={{ color: accent }} aria-hidden="true" />
            <span className={cn("font-bold", textColor)}>Правила выполнения</span>
          </span>
        </AccordionTrigger>
        <AccordionContent className="border-t px-5 pb-5 pt-4 sm:px-6" style={{ borderColor: `${accent}30` }}>
          <ul className={cn("grid gap-3 text-sm sm:grid-cols-2", mutedColor)}>
            {MINI_TASK_RULES.map((rule, index) => (
              <li key={rule} className={cn("flex items-start gap-3 rounded-xl border p-4", isDark ? "border-white/10 bg-[#0f1419]/70" : "border-gray-200 bg-gray-50")}>
                <span className="flex size-6 shrink-0 items-center justify-center rounded-full text-xs font-bold text-white" style={{ backgroundColor: accent }}>{index + 1}</span>
                <span className="min-w-0 break-words">{rule}</span>
              </li>
            ))}
          </ul>
          <p className={cn("mt-4 flex items-start gap-2 rounded-xl p-3 text-sm", mutedColor)} style={{ backgroundColor: `${accent}10` }}>
            <Clock className="mt-0.5 size-4 shrink-0" style={{ color: accent }} aria-hidden="true" />
            <span>Лимит — 3 задания в неделю; время на загрузке — не более 3 минут.</span>
          </p>
        </AccordionContent>
      </AccordionItem>

      <AccordionItem value="loading-place" className={cn("overflow-hidden rounded-2xl border-2", isDark ? "border-white/10 bg-[#0f1419]/50" : "border-gray-200 bg-white")}>
        <AccordionTrigger className="px-5 py-4 hover:no-underline sm:px-6">
          <span className="flex items-center gap-3 text-left">
            <MapPin className="size-5 shrink-0" style={{ color: accent }} aria-hidden="true" />
            <span className="min-w-0">
              <span className={cn("block font-bold", textColor)}>Место загрузки и разгрузки</span>
              <span className={cn("mt-1 block text-sm font-normal", mutedColor)}>Фото-ориентир для выполнения поставки</span>
            </span>
          </span>
        </AccordionTrigger>
        <AccordionContent className="border-t px-5 pb-5 pt-4 sm:px-6" style={{ borderColor: `${accent}30` }}>
          <a href={LOADING_UNLOADING_PHOTO} target="_blank" rel="noopener noreferrer" className={cn("relative block min-h-52 overflow-hidden rounded-xl border focus-visible:outline-none focus-visible:ring-2", isDark ? "border-white/10 bg-white/[0.03]" : "border-gray-200 bg-gray-50")}>
            {photoState === "loading" && <Skeleton className="absolute inset-0 h-full w-full rounded-none" />}
            {photoState === "error" ? (
              <span className={cn("flex min-h-52 items-center justify-center px-4 text-sm", mutedColor)} role="status">Не удалось загрузить фото. Нажмите, чтобы открыть источник.</span>
            ) : (
              <img src={LOADING_UNLOADING_PHOTO} alt="Место загрузки и разгрузки для мини-заданий" className={cn("max-h-[420px] w-full object-contain transition-opacity duration-300", photoState === "loaded" ? "opacity-100" : "opacity-0")} loading="lazy" onLoad={() => setPhotoState("loaded")} onError={() => setPhotoState("error")} />
            )}
          </a>
          <a href={LOADING_UNLOADING_PHOTO} target="_blank" rel="noopener noreferrer" className="mt-3 inline-flex text-sm underline underline-offset-4" style={{ color: accent }}>Открыть фото в полном размере</a>
        </AccordionContent>
      </AccordionItem>
    </Accordion>
  )
}

function MiniTaskSettings({
  isDark,
  reportTag,
  port,
  helperName,
  onPortChange,
  onHelperNameChange,
}: {
  isDark: boolean
  reportTag: string
  port: string
  helperName: string
  onPortChange: (value: string) => void
  onHelperNameChange: (value: string) => void
}) {
  const mutedColor = isDark ? "text-white/70" : "text-gray-600"

  return (
    <Card className={cn("rounded-2xl border-2 p-4", isDark ? "border-white/10 bg-[#0f1419]/60" : "border-gray-200 bg-white")}>
      <FieldGroup className="grid gap-4 sm:grid-cols-2">
        <Field className="gap-1.5">
          <FieldLabel htmlFor="mini-task-port">Порт для поставки формы</FieldLabel>
          <select id="mini-task-port" value={port} onChange={(event) => onPortChange(event.target.value)} className={cn("w-full rounded-lg border px-3 py-2", isDark ? "border-white/15 bg-[#111820]" : "border-gray-300 bg-white")}>
            <option value="Невского">Невского</option>
            <option value="Приволжска">Приволжска</option>
          </select>
        </Field>
        <Field className="gap-1.5">
          <FieldLabel htmlFor="mini-task-helper">Имя и фамилия помощника</FieldLabel>
          <Input id="mini-task-helper" value={helperName} onChange={(event) => onHelperNameChange(event.target.value)} placeholder="Например, Иван Иванов" />
          <FieldDescription className={cn("text-xs", mutedColor)}>Необязательно. Подставляется в шаблон доклада.</FieldDescription>
        </Field>
      </FieldGroup>
      <p className={cn("mt-3 text-xs", mutedColor)}>Тэг рации подставляется автоматически: <code className="font-mono">{reportTag}</code>. Нажмите строку шаблона, чтобы скопировать её.</p>
    </Card>
  )
}

function ReportLine({
  line,
  accent,
  isDark,
  isCopied,
  isNext,
  onCopy,
}: {
  line: string
  accent: string
  isDark: boolean
  isCopied: boolean
  isNext: boolean
  onCopy: () => void
}) {
  const surface = isCopied
    ? isDark ? "border-green-500/60 bg-green-900/30" : "border-green-400 bg-green-50"
    : isNext
      ? isDark ? "border-white/40 bg-[#0f1419]/80 shadow-md" : "border-gray-400 bg-white shadow-md"
      : isDark ? "border-white/10 bg-[#0f1419]/70 hover:border-white/30" : "border-gray-200 bg-gray-50 hover:border-gray-300"

  return (
    <button type="button" onClick={onCopy} aria-label={`${isCopied ? "Скопировано:" : "Скопировать строку:"} ${line}`} className={cn("mb-2 w-full rounded-xl border-2 p-4 text-left transition-colors duration-200 focus-visible:outline-none focus-visible:ring-2", surface)} style={{ borderLeftWidth: 4, borderLeftColor: isCopied ? "#22c55e" : accent }}>
      <span className="flex min-w-0 items-start justify-between gap-3">
        <span className={cn("min-w-0 flex-1 whitespace-pre-wrap break-words text-sm [overflow-wrap:anywhere]", isCopied ? "text-green-500" : isDark ? "text-white/90" : "text-gray-900", isNext && "font-medium")}>{line}</span>
        <span className="flex size-8 shrink-0 items-center justify-center rounded-lg" style={{ backgroundColor: isCopied ? "#22c55e20" : `${accent}20` }}>
          {isCopied ? <Check className="size-4 text-green-500" aria-hidden="true" /> : <Copy className="size-4" style={{ color: accent }} aria-hidden="true" />}
        </span>
      </span>
    </button>
  )
}

function DeliveryCard({
  task,
  reportTag,
  port,
  helperName,
  copiedLine,
  accent,
  isDark,
  onCopy,
}: {
  task: MiniTask
  reportTag: string
  port: string
  helperName: string
  copiedLine: string | null
  accent: string
  isDark: boolean
  onCopy: (lineId: string, line: string) => void
}) {
  const textColor = isDark ? "text-white" : "text-gray-900"
  const mutedColor = isDark ? "text-white/70" : "text-gray-600"
  const lines = getMiniTaskTemplate(task, { reportTag, port, helperName }).split("\n")
  const destination = task.id === "uniform" ? `городской порт ${port}` : task.destination
  const copiedIndex = copiedLine?.startsWith(`${task.id}-`) ? Number.parseInt(copiedLine.slice(task.id.length + 1), 10) : -1

  return (
    <AccordionItem value={task.id} className={cn("overflow-hidden rounded-2xl border-2", isDark ? "border-white/10 bg-[#0f1419]/50" : "border-gray-200 bg-white")}>
      <AccordionTrigger className="items-center px-5 py-4 hover:no-underline sm:px-6">
        <span className="flex min-w-0 items-center gap-3">
          <Truck className="size-5 shrink-0" style={{ color: accent }} aria-hidden="true" />
          <span className="min-w-0 text-left">
            <span className={cn("block break-words font-bold", textColor)}>{task.title}</span>
            <span className={cn("mt-1 block break-words text-sm", mutedColor)}>{task.cargo} · {destination}</span>
          </span>
        </span>
      </AccordionTrigger>
      <AccordionContent className="max-h-[min(70dvh,42rem)] overflow-y-auto overscroll-contain p-0 [scrollbar-gutter:stable]">
        <div className={cn("border-t px-4 pb-5 pt-3 sm:px-6", isDark ? "bg-[#0f1419]/50" : "bg-white")} style={{ borderColor: `${accent}30` }}>
          <div className="flex flex-col gap-1">
            {lines.map((line, index) => {
              if (!line) return <div key={`${task.id}-${index}`} className="h-2" aria-hidden="true" />
              if (REPORT_HEADINGS.has(line)) return <h3 key={`${task.id}-${index}`} className={cn("pb-1 pt-3 font-semibold", textColor)}>{line}</h3>

              const lineId = `${task.id}-${index}`
              const isCopied = copiedLine === lineId
              const isNext = copiedIndex >= 0 && index === copiedIndex + 1

              return <ReportLine key={lineId} line={line} accent={accent} isDark={isDark} isCopied={isCopied} isNext={isNext} onCopy={() => onCopy(lineId, line)} />
            })}
          </div>
          <p role="status" aria-live="polite" className="sr-only">{copiedLine?.startsWith(`${task.id}-`) ? "Строка доклада скопирована" : ""}</p>
        </div>
      </AccordionContent>
    </AccordionItem>
  )
}

export function MiniTasksSection() {
  const { theme } = useTheme()
  const accent = getThemeColor(theme.colorTheme)
  const isDark = theme.mode === "dark"
  const [copiedLine, setCopiedLine] = useState<string | null>(null)
  const [reportTag, setReportTag] = useState("[ТЭГ]")
  const [port, setPort] = useState("Невского")
  const [helperName, setHelperName] = useState("")

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

  const textColor = isDark ? "text-white" : "text-gray-900"
  const mutedColor = isDark ? "text-white/70" : "text-gray-600"

  return (
    <section className="flex flex-col gap-6" aria-labelledby="mini-tasks-heading">
      <header className="flex items-center gap-3 border-b pb-4" style={{ borderColor: `${accent}40` }}>
        <div className="rounded-xl p-3" style={{ background: `linear-gradient(135deg, ${accent}20, ${accent}10)` }}>
          <Train className="size-6" style={{ color: accent }} aria-hidden="true" />
        </div>
        <div className="min-w-0">
          <h1 id="mini-tasks-heading" className="text-3xl font-bold" style={{ color: accent }}>Мини-задания</h1>
          <p className={cn("text-sm", mutedColor)}>Поставка материалов для нужд ОАО «РЖД»</p>
        </div>
      </header>

      <MiniTaskGuides accent={accent} isDark={isDark} />

      <section className="flex flex-col gap-4" aria-labelledby="mini-task-list-heading">
        <div>
          <h2 id="mini-task-list-heading" className={cn("text-xl font-bold", textColor)}>Список мини-заданий</h2>
          <p className={cn("mt-1 text-sm", mutedColor)}>Выберите поставку, чтобы открыть маршрут и шаблон доклада.</p>
        </div>

        <MiniTaskSettings isDark={isDark} reportTag={reportTag} port={port} helperName={helperName} onPortChange={setPort} onHelperNameChange={setHelperName} />

        <Accordion type="single" collapsible className="flex flex-col gap-4">
          {MINI_TASKS.map((task) => (
            <DeliveryCard key={task.id} task={task} reportTag={reportTag} port={port} helperName={helperName} copiedLine={copiedLine} accent={accent} isDark={isDark} onCopy={copyLine} />
          ))}
        </Accordion>
      </section>
    </section>
  )
}
