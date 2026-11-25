"use client"

import Image from "next/image"
import { useState } from "react"
import {
  Accordion,
  AccordionContent,
  AccordionItem,
  AccordionTrigger,
} from "@/components/ui/accordion"
import {
  Field,
  FieldLabel,
} from "@/components/ui/field"
import { Input } from "@/components/ui/input"
import {
  Select,
  SelectContent,
  SelectGroup,
  SelectItem,
  SelectLabel,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"
import {
  CalendarDays,
  Camera,
  Check,
  Copy,
  MapPin,
  PackageOpen,
  ShieldCheck,
  Truck,
  UserRound,
} from "lucide-react"
import { useTheme } from "@/contexts/theme-context"
import { getThemeColor } from "@/lib/theme-utils"
import {
  LOADING_UNLOADING_PHOTO,
  MINI_TASK_RULES,
  MINI_TASKS,
  getMiniTaskTemplate,
  type MiniTaskStage,
} from "@/data/mini-tasks"

interface MiniTasksSectionProps {
  userReportTag?: string
}

interface CopyableStageProps {
  taskId: string
  stage: MiniTaskStage
  copiedLineId: string | null
  isDark: boolean
  accentColor: string
  onCopy: (text: string, id: string) => void
}

function CopyableStage({
  taskId,
  stage,
  copiedLineId,
  isDark,
  accentColor,
  onCopy,
}: CopyableStageProps) {
  const stagePrefix = `${taskId}:${stage.id}:`
  const lastCopiedIndex = copiedLineId?.startsWith(stagePrefix)
    ? Number(copiedLineId.slice(stagePrefix.length))
    : -1

  return (
    <section
      aria-label={stage.title}
      className={`rounded-xl border p-4 ${isDark ? "border-white/10 bg-[#0f1419]/50" : "border-gray-200 bg-gray-50/80"}`}
    >
      <h4
        className="mb-3 text-xs font-semibold uppercase tracking-[0.14em]"
        style={{ color: accentColor }}
      >
        {stage.title}
      </h4>
      <div className="flex flex-col gap-2">
        {stage.lines.map((line, index) => {
          const lineId = `${stagePrefix}${index}`
          const isCopied = copiedLineId === lineId
          const isNext = lastCopiedIndex >= 0 && index === lastCopiedIndex + 1

          return (
            <button
              key={lineId}
              type="button"
              onClick={() => onCopy(line, lineId)}
              aria-label={`${isCopied ? "Скопировано" : "Скопировать"}: ${line}`}
              className={`group flex w-full items-start justify-between gap-3 rounded-lg border p-3 text-left transition-colors ${
                isCopied
                  ? isDark
                    ? "border-green-500/50 bg-green-950/40 text-green-200"
                    : "border-green-400 bg-green-50 text-green-800"
                  : isNext
                    ? isDark
                      ? "border-white/30 bg-white/10 text-white"
                      : "border-gray-400 bg-white text-gray-950"
                    : isDark
                      ? "border-white/5 bg-black/20 text-white/85 hover:border-white/20 hover:bg-white/5"
                      : "border-gray-200 bg-white text-gray-800 hover:border-gray-300"
              }`}
              style={{
                borderLeftWidth: 3,
                borderLeftColor: isCopied ? "#22c55e" : accentColor,
                boxShadow: isNext ? `0 0 0 1px ${accentColor}50` : undefined,
              }}
            >
              <span className="min-w-0 flex-1 break-words whitespace-pre-wrap text-sm leading-relaxed">
                {line}
              </span>
              <span
                aria-hidden="true"
                className="flex size-8 shrink-0 items-center justify-center rounded-lg"
                style={{ backgroundColor: isCopied ? "#22c55e20" : `${accentColor}20` }}
              >
                {isCopied ? (
                  <Check className="size-4 text-green-500" />
                ) : (
                  <Copy className="size-4 opacity-70 group-hover:opacity-100" style={{ color: accentColor }} />
                )}
              </span>
            </button>
          )
        })}
      </div>
    </section>
  )
}

export function MiniTasksSection({ userReportTag }: MiniTasksSectionProps) {
  const { theme } = useTheme()
  const accentColor = getThemeColor(theme.colorTheme)
  const isDark = theme.mode === "dark"
  const [helperName, setHelperName] = useState("")
  const [port, setPort] = useState<"Невского" | "Приволжска">("Невского")
  const reportTag = userReportTag?.trim() || "[ТЭГ]"
  const [copiedLineId, setCopiedLineId] = useState<string | null>(null)
  const [copyStatus, setCopyStatus] = useState("")

  const copyToClipboard = async (text: string, id: string) => {
    try {
      await navigator.clipboard.writeText(text)
      setCopiedLineId(id)
      setCopyStatus("Строка скопирована в буфер обмена.")
    } catch {
      setCopiedLineId(null)
      setCopyStatus("Не удалось скопировать строку. Проверьте разрешение браузера на буфер обмена.")
    }
  }

  const summaryCards = [
    { icon: CalendarDays, label: "Лимит", value: "До 3 раз в неделю" },
    { icon: ShieldCheck, label: "Доступ", value: "От ранга 2 — «Монтёр пути»" },
    { icon: Truck, label: "Основной транспорт", value: "ЗИЛ-131" },
    { icon: Camera, label: "Если ЗИЛа нет", value: "УАЗ-3309 «Буханка» + скриншот" },
  ]

  return (
    <section aria-labelledby="mini-tasks-heading" className="flex flex-col gap-6 opacity-95">
      <header
        className="flex items-center gap-3 border-b pb-4 pr-12"
        style={{ borderColor: `${accentColor}40` }}
      >
        <div
          aria-hidden="true"
          className="rounded-xl p-3"
          style={{ background: `linear-gradient(135deg, ${accentColor}25, ${accentColor}10)` }}
        >
          <PackageOpen className="size-6" style={{ color: accentColor }} />
        </div>
        <div>
          <h2 id="mini-tasks-heading" className="text-2xl font-bold sm:text-3xl" style={{ color: accentColor }}>
            Мини-задания
          </h2>
          <p className={`text-sm ${isDark ? "text-white/70" : "text-gray-600"}`}>
            Поставки для нужд РЖД: правила, РП-шаблоны и места загрузки
          </p>
        </div>
      </header>

      <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 xl:grid-cols-4">
        {summaryCards.map(({ icon: Icon, label, value }) => (
          <div
            key={label}
            className={`flex min-w-0 items-start gap-3 rounded-xl border p-4 ${isDark ? "border-white/10 bg-[#0f1419]/60" : "border-gray-200 bg-white/85"}`}
          >
            <Icon className="mt-0.5 size-5 shrink-0" style={{ color: accentColor }} aria-hidden="true" />
            <div className="min-w-0">
              <p className={`text-xs font-medium ${isDark ? "text-white/55" : "text-gray-500"}`}>{label}</p>
              <p className={`mt-1 text-sm font-semibold ${isDark ? "text-white" : "text-gray-900"}`}>{value}</p>
            </div>
          </div>
        ))}
      </div>

      <Accordion type="single" collapsible defaultValue="rules" className="flex flex-col gap-4">
        <AccordionItem
          value="rules"
          className={`overflow-hidden rounded-2xl border-2 ${isDark ? "border-white/10 bg-[#0f1419]/50" : "border-gray-200 bg-white"}`}
        >
          <AccordionTrigger className="px-5 py-4 text-left hover:no-underline sm:px-6">
            <span className="flex items-center gap-3">
              <ShieldCheck className="size-5 shrink-0" style={{ color: accentColor }} aria-hidden="true" />
              <span className={`font-bold ${isDark ? "text-white" : "text-gray-900"}`}>
                Правила выполнения мини-заданий
              </span>
            </span>
          </AccordionTrigger>
          <AccordionContent className="px-5 pb-5 sm:px-6">
            <ol className="grid grid-cols-1 gap-3 md:grid-cols-2">
              {MINI_TASK_RULES.map((rule, index) => (
                <li
                  key={rule}
                  className={`flex items-start gap-3 rounded-xl border p-4 ${isDark ? "border-white/10 bg-black/20 text-white/80" : "border-gray-200 bg-gray-50 text-gray-700"}`}
                  style={{ borderLeftWidth: 3, borderLeftColor: accentColor }}
                >
                  <span
                    aria-hidden="true"
                    className="flex size-7 shrink-0 items-center justify-center rounded-full text-xs font-bold"
                    style={{ backgroundColor: `${accentColor}20`, color: accentColor }}
                  >
                    {index + 1}
                  </span>
                  <span className="text-sm leading-relaxed">{rule}</span>
                </li>
              ))}
            </ol>
          </AccordionContent>
        </AccordionItem>

        <section
          aria-labelledby="mini-task-settings-heading"
          className={`rounded-2xl border-2 p-4 sm:p-5 ${isDark ? "border-white/10 bg-[#0f1419]/50" : "border-gray-200 bg-white/85"}`}
        >
          <div className="mb-4 flex items-center gap-3">
            <UserRound className="size-5 shrink-0" style={{ color: accentColor }} aria-hidden="true" />
            <div>
              <h3 id="mini-task-settings-heading" className={`font-semibold ${isDark ? "text-white" : "text-gray-900"}`}>
                Имя напарника
              </h3>
              <p className={`text-sm ${isDark ? "text-white/65" : "text-gray-600"}`}>
                Необязательно. Если напарника нет, строка о нём не добавляется.
              </p>
            </div>
          </div>
          <Field className="max-w-md">
            <FieldLabel htmlFor="mini-task-helper-name">Имя Фамилия</FieldLabel>
            <Input
              id="mini-task-helper-name"
              autoComplete="off"
              value={helperName}
              onChange={(event) => setHelperName(event.target.value)}
              placeholder="Имя Фамилия"
            />
          </Field>
        </section>

        {MINI_TASKS.map((task, taskIndex) => {
          const stages = getMiniTaskTemplate(task, { reportTag, port, helperName })

          return (
            <AccordionItem
              key={task.id}
              value={task.id}
              className={`overflow-hidden rounded-2xl border-2 ${isDark ? "border-white/10 bg-[#0f1419]/50" : "border-gray-200 bg-white"}`}
            >
              <AccordionTrigger className="px-5 py-4 text-left hover:no-underline sm:px-6">
                <span className="flex min-w-0 items-start gap-3">
                  <span
                    aria-hidden="true"
                    className="mt-0.5 flex size-8 shrink-0 items-center justify-center rounded-lg"
                    style={{ backgroundColor: `${accentColor}20`, color: accentColor }}
                  >
                    <Truck className="size-4" />
                  </span>
                  <span className="min-w-0">
                    <span className={`block font-bold ${isDark ? "text-white" : "text-gray-900"}`}>
                      {taskIndex + 1}. {task.title}
                    </span>
                    <span className={`mt-1 block text-sm font-normal ${isDark ? "text-white/60" : "text-gray-600"}`}>
                      {task.portChoice ? `городской порт ${port}` : task.destination}
                    </span>
                  </span>
                </span>
              </AccordionTrigger>
              <AccordionContent className="px-4 pb-5 sm:px-6">
                <div className="flex flex-col gap-3">
                  {task.portChoice && (
                    <Field className={`rounded-xl border p-4 ${isDark ? "border-white/10 bg-black/20" : "border-gray-200 bg-gray-50"}`}>
                      <FieldLabel htmlFor="mini-task-port">Город для поставки формы</FieldLabel>
                      <Select value={port} onValueChange={(value) => setPort(value as "Невского" | "Приволжска")}>
                        <SelectTrigger id="mini-task-port" className="w-full">
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectGroup>
                            <SelectLabel>Городской порт</SelectLabel>
                            <SelectItem value="Невского">Невского</SelectItem>
                            <SelectItem value="Приволжска">Приволжска</SelectItem>
                          </SelectGroup>
                        </SelectContent>
                      </Select>
                    </Field>
                  )}
                  {stages.map((stage) => (
                    <div key={stage.id} className="flex flex-col gap-2">
                      <CopyableStage
                        taskId={task.id}
                        stage={stage}
                        copiedLineId={copiedLineId}
                        isDark={isDark}
                        accentColor={accentColor}
                        onCopy={copyToClipboard}
                      />
                      {({
                        departure: "Сделайте скриншот отправления из РЖД.",
                        arrival: "Сделайте скриншот прибытия на место назначения.",
                        loading: "Сделайте скриншот РП-отыгровки погрузки.",
                        unloading: "Сделайте скриншот РП-отыгровки разгрузки.",
                        finish: "Сделайте скриншот прибытия в РЖД.",
                      } as Record<string, string>)[stage.id] && (
                        <p className={`flex items-center gap-2 px-2 text-xs ${isDark ? "text-white/55" : "text-gray-500"}`}>
                          <Camera className="size-3.5 shrink-0" aria-hidden="true" />
                          {({
                            departure: "Сделайте скриншот отправления из РЖД.",
                            arrival: "Сделайте скриншот прибытия на место назначения.",
                            loading: "Сделайте скриншот РП-отыгровки погрузки.",
                            unloading: "Сделайте скриншот РП-отыгровки разгрузки.",
                            finish: "Сделайте скриншот прибытия в РЖД.",
                          } as Record<string, string>)[stage.id]}
                        </p>
                      )}
                    </div>
                  ))}
                </div>
              </AccordionContent>
            </AccordionItem>
          )
        })}

        <AccordionItem
          value="locations"
          className={`overflow-hidden rounded-2xl border-2 ${isDark ? "border-white/10 bg-[#0f1419]/50" : "border-gray-200 bg-white"}`}
        >
          <AccordionTrigger className="px-5 py-4 text-left hover:no-underline sm:px-6">
            <span className="flex items-center gap-3">
              <MapPin className="size-5 shrink-0" style={{ color: accentColor }} aria-hidden="true" />
              <span className={`font-bold ${isDark ? "text-white" : "text-gray-900"}`}>
                Места загрузки и разгрузки
              </span>
            </span>
          </AccordionTrigger>
          <AccordionContent className="px-4 pb-5 sm:px-6">
            <div className="flex flex-col gap-3">
              <p className={`text-sm ${isDark ? "text-white/70" : "text-gray-600"}`}>
                Карта точек загрузки для пяти поставок и общей точки разгрузки в здании РЖД.
              </p>
              <div className="overflow-hidden rounded-xl border" style={{ borderColor: `${accentColor}40` }}>
                <Image
                  src={LOADING_UNLOADING_PHOTO}
                  alt="Схема мест загрузки: форма, запчасти, башмаки, уголь и дизель; место разгрузки — РЖД"
                  width={1920}
                  height={1080}
                  sizes="(max-width: 768px) 100vw, 900px"
                  className="h-auto w-full"
                />
              </div>
            </div>
          </AccordionContent>
        </AccordionItem>
      </Accordion>
      <p role="status" aria-live="polite" className="sr-only">
        {copyStatus}
      </p>
    </section>
  )
}
