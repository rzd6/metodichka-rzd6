"use client"

import { useEffect, useMemo, useState } from "react"
import useSWR from "swr"
import { AlertTriangle, BadgeCheck, BookOpenCheck, ExternalLink, FileSearch, LoaderCircle, ShieldCheck } from "lucide-react"
import { toast } from "sonner"
import { useTheme } from "@/contexts/theme-context"
import { getThemeColor } from "@/lib/theme-utils"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardHeader } from "@/components/ui/card"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Textarea } from "@/components/ui/textarea"

type ReviewCheck = { criterion: string; status: "pass" | "fail" | "review"; details: string }
type Review = {
  id: string
  url: string
  topicDate?: string
  title: string
  reviewerId: string
  reviewerName: string
  createdAt: string
  isRzd: boolean
  ruleChecks: ReviewCheck[]
  ai: {
    firstPerson: "yes" | "no" | "uncertain"
    chronologicalCoherence: "yes" | "no" | "uncertain"
    railwayEducation: "yes" | "no" | "uncertain" | "not_applicable"
    findings: Array<{ severity: "critical" | "warning" | "note"; criterion: string; message: string; evidence: string }>
    summary: string
  }
}

const fetcher = async (url: string) => {
  const response = await fetch(url)
  const result = await response.json()
  if (!response.ok) throw new Error(result.error || "Не удалось загрузить список проверок")
  return result as { reviews: Review[] }
}

function statusLabel(status: ReviewCheck["status"]) {
  if (status === "pass") return "Найдено"
  if (status === "fail") return "Не найдено"
  return "Проверить"
}

function findingCriterionLabel(criterion: string) {
  if (/^(location|residence|current residence)$/i.test(criterion.trim())) return "Место проживания"
  return criterion
}

function isPositiveResidenceNote(finding: Review["ai"]["findings"][number]) {
  return /^(current residence specified correctly|location specified correctly)\.?$/i.test(finding.message.trim())
}


export function RpBioCheckSection() {
  const { theme } = useTheme()
  const color = getThemeColor(theme.colorTheme)
  const dark = theme.mode === "dark"
  const [reviewerId, setReviewerId] = useState("")
  useEffect(() => {
    try { setReviewerId(String(JSON.parse(localStorage.getItem("currentUser") || "{}").id ?? "")) } catch { setReviewerId("") }
  }, [])
  const { data, error, isLoading, mutate } = useSWR<{ reviews: Review[] }>(
    reviewerId ? `/api/rp-bio-reviews?reviewerId=${encodeURIComponent(reviewerId)}` : null,
    fetcher,
  )
  const reviews = useMemo(() => data?.reviews ?? [], [data])
  const [selectedId, setSelectedId] = useState("")
  const selected = reviews.find((review) => review.id === selectedId) ?? reviews[0]
  const [topicTitle, setTopicTitle] = useState("")
  const [topicDate, setTopicDate] = useState("")
  const [bioText, setBioText] = useState("")
  const [formError, setFormError] = useState("")
  const [isRzd, setIsRzd] = useState(true)
  const [busy, setBusy] = useState(false)

  async function runCheck(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault()
    if (!reviewerId || !topicTitle.trim() || !topicDate || !bioText.trim()) return
    setBusy(true)
    setFormError("")
    try {
      const response = await fetch("/api/rp-bio-reviews", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ reviewerId, topicTitle: topicTitle.trim(), topicDate, bioText: bioText.trim(), isRzd }),
      })
      const result = await response.json()
      if (!response.ok) throw new Error(result.error || "Проверка не выполнена")
      setTopicTitle("")
      setTopicDate("")
      setBioText("")
      setSelectedId(result.review.id)
      await mutate()
      toast.success("Проверка биографии завершена")
    } catch (cause) {
      const message = cause instanceof Error ? cause.message : "Проверка не выполнена"
      setFormError(message)
      toast.error(message)
    } finally {
      setBusy(false)
    }
  }

  const surface = dark ? "border-white/10 bg-[#0e1318]/85" : "border-black/10 bg-white/90"
  const muted = dark ? "text-white/60" : "text-gray-600"

  return (
    <section className="flex flex-col gap-5" aria-labelledby="rp-bio-heading">
      <header className="flex items-center gap-3 border-b pb-4" style={{ borderColor: `${color}55` }}>
        <div className="rounded-xl p-3" style={{ backgroundColor: `${color}18` }}>
          <FileSearch className="size-6" style={{ color }} aria-hidden="true" />
        </div>
        <div>
          <h1 id="rp-bio-heading" className="text-2xl font-bold sm:text-3xl" style={{ color }}>Проверка RP-биографий</h1>
          <p className={`mt-1 text-sm ${muted}`}>Предварительная сверка с правилами форума и требованиями РЖД</p>
        </div>
      </header>

      <Card className={`rounded-2xl ${surface}`}>
        <CardHeader className="pb-3">
          <h2 className="flex items-center gap-2 text-lg font-semibold"><ShieldCheck className="size-5" style={{ color }} aria-hidden="true" />Новая проверка</h2>
          <p className={`text-sm ${muted}`}>Укажите заголовок и дату публикации, затем вставьте текст биографии для проверки.</p>
        </CardHeader>
        <CardContent>
          <form className="flex flex-col gap-4" onSubmit={runCheck}>
            <div className="flex flex-col gap-2">
              <Label htmlFor="bio-title">Заголовок темы</Label>
              <Input id="bio-title" required maxLength={200} placeholder="Биография Имя Фамилия" value={topicTitle} onChange={(event) => setTopicTitle(event.target.value)} />
            </div>
            <div className="flex flex-col gap-2">
              <Label htmlFor="bio-date">Дата публикации</Label>
              <Input id="bio-date" type="date" required value={topicDate} onChange={(event) => setTopicDate(event.target.value)} />
            </div>
            <div className="flex flex-col gap-2">
              <Label htmlFor="bio-text">Текст биографии</Label>
              <Textarea id="bio-text" required maxLength={60000} rows={7} placeholder="Вставьте текст первого сообщения темы форума." value={bioText} onChange={(event) => setBioText(event.target.value)} />
            </div>
            {formError && <p className="rounded-lg border border-red-500/30 bg-red-500/[0.06] p-3 text-sm text-red-400" role="alert">{formError}</p>}
            <label className={`flex cursor-pointer items-start gap-3 rounded-xl border p-3 text-sm ${dark ? "border-white/10" : "border-black/10"}`}>
              <input type="checkbox" className="mt-1 accent-current" style={{ accentColor: color }} checked={isRzd} onChange={(event) => setIsRzd(event.target.checked)} />
              <span><span className="block font-medium">Проверка для РЖД</span><span className={`mt-0.5 block ${muted}`}>Отдельно проверить профильное железнодорожное образование и специальность в биографии.</span></span>
            </label>
            <div className="flex flex-col gap-3 rounded-xl border border-amber-500/25 bg-amber-500/[0.06] p-3 text-sm sm:flex-row sm:items-start">
              <AlertTriangle className="mt-0.5 size-4 shrink-0 text-amber-500" aria-hidden="true" />
              <p className={muted}>Результат ИИ — предварительная подсказка: сверьте замечания и цитаты с текстом биографии. ИИ не может достоверно доказать плагиат или авторство текста.</p>
            </div>
            <Button type="submit" disabled={busy || !reviewerId} style={{ backgroundColor: color }} className="w-fit text-black hover:opacity-90">
              {busy ? <LoaderCircle className="animate-spin" data-icon="inline-start" /> : <BookOpenCheck data-icon="inline-start" />}
              {busy ? "Проверяем тему…" : "Проверить биографию"}
            </Button>
          </form>
        </CardContent>
      </Card>

      <div className="grid gap-5 xl:grid-cols-[minmax(250px,0.8fr)_minmax(0,1.7fr)]">
        <Card className={`rounded-2xl ${surface}`}>
          <CardHeader className="pb-3">
            <h2 className="text-lg font-semibold">История проверок</h2>
            <p className={`text-sm ${muted}`}>Последние сохранённые проверки</p>
          </CardHeader>
          <CardContent className="flex flex-col gap-2">
            {isLoading && <p className={`py-4 text-sm ${muted}`} role="status">Загружаем историю…</p>}
            {error && <p className="py-3 text-sm text-red-400" role="alert">{error.message}</p>}
            {!isLoading && !error && reviews.length === 0 && <p className={`py-4 text-sm ${muted}`}>Пока нет проверок. Заполните данные биографии выше, чтобы начать.</p>}
            {reviews.map((review) => (
              <button key={review.id} type="button" onClick={() => setSelectedId(review.id)} className={`flex w-full flex-col gap-1 rounded-xl border p-3 text-left transition-colors ${selected?.id === review.id ? "border-current bg-white/[0.06]" : dark ? "border-white/10 hover:bg-white/[0.04]" : "border-black/10 hover:bg-black/[0.03]"}`} style={selected?.id === review.id ? { borderColor: color } : undefined}>
                <span className="line-clamp-2 text-sm font-medium">{review.title}</span>
                <span className={`text-xs ${muted}`}>{new Date(review.createdAt).toLocaleString("ru-RU")}</span>
              </button>
            ))}
          </CardContent>
        </Card>

        {selected ? (
          <Card className={`rounded-2xl ${surface}`}>
            <CardHeader className="gap-2 pb-3 sm:flex-row sm:items-start sm:justify-between">
              <div className="min-w-0">
                <h2 className="text-lg font-semibold">Результаты проверки</h2>
                <p className={`mt-1 text-sm ${muted}`}>Дата публикации: {selected.topicDate ? new Date(`${selected.topicDate}T12:00:00`).toLocaleDateString("ru-RU") : "не указана"} · Проверил(а): {selected.reviewerName} · {new Date(selected.createdAt).toLocaleString("ru-RU")}</p>
              </div>
              {selected.url && <a href={selected.url} target="_blank" rel="noopener noreferrer" className="inline-flex shrink-0 items-center gap-1 text-sm underline underline-offset-4" style={{ color }}>
                Открыть тему <ExternalLink className="size-3.5" aria-hidden="true" />
              </a>}
            </CardHeader>
            <CardContent className="flex flex-col gap-5">
              <div className={`rounded-xl border p-4 ${dark ? "border-white/10 bg-white/[0.03]" : "border-black/10 bg-black/[0.02]"}`}>
                <div className="mb-2 flex items-center gap-2 font-semibold"><BadgeCheck className="size-4" style={{ color }} aria-hidden="true" />Сводка ИИ</div>
                <p className={`text-sm leading-relaxed ${muted}`}>{selected.ai.summary}</p>
                <div className={`mt-3 flex flex-wrap gap-x-4 gap-y-1 text-xs ${muted}`}>
                  <span>1-е лицо: {selected.ai.firstPerson === "yes" ? "похоже, да" : selected.ai.firstPerson === "no" ? "есть замечания" : "нужна ручная проверка"}</span>
                  <span>Хронология: {selected.ai.chronologicalCoherence === "yes" ? "логична" : selected.ai.chronologicalCoherence === "no" ? "есть несостыковки" : "неоднозначна"}</span>
                  {selected.isRzd && <span>Ж/д образование: {selected.ai.railwayEducation === "yes" ? "упоминается" : selected.ai.railwayEducation === "no" ? "не найдено" : "проверьте вручную"}</span>}
                </div>
              </div>

              <div>
                <h3 className="mb-2 font-semibold">Форма и требования</h3>
                <ul className="flex flex-col divide-y divide-white/10">
                  {selected.ruleChecks.map((check) => (
                    <li key={check.criterion} className="flex flex-col gap-1 py-2.5 sm:flex-row sm:items-start sm:justify-between sm:gap-4">
                      <span className="text-sm">{check.criterion}</span>
                      <span className={`shrink-0 text-xs font-medium ${check.status === "pass" ? "text-emerald-500" : check.status === "fail" ? "text-red-400" : "text-amber-500"}`}>{statusLabel(check.status)} · {check.details}</span>
                    </li>
                  ))}
                </ul>
              </div>

              {selected.ai.findings.filter((finding) => !isPositiveResidenceNote(finding)).length > 0 && <div>
                <h3 className="mb-2 font-semibold">Пояснения по биографии</h3>
                <ul className="flex flex-col gap-2">
                  {selected.ai.findings.filter((finding) => !isPositiveResidenceNote(finding)).map((finding, index) => (
                    <li key={`${finding.criterion}-${index}`} className={`rounded-xl border p-3 text-sm ${finding.severity === "critical" ? "border-red-500/25 bg-red-500/[0.05]" : finding.severity === "warning" ? "border-amber-500/25 bg-amber-500/[0.05]" : dark ? "border-white/10 bg-white/[0.02]" : "border-black/10 bg-black/[0.02]"}`}>
                      <div className="font-medium">{findingCriterionLabel(finding.criterion)}</div>
                      <p className={`mt-1 ${muted}`}>{finding.message}</p>
                      {finding.evidence && <blockquote className={`mt-2 border-l-2 pl-2 text-xs italic ${muted}`}>{finding.evidence}</blockquote>}
                    </li>
                  ))}
                </ul>
              </div>}
            </CardContent>
          </Card>
        ) : (
          <Card className={`rounded-2xl ${surface}`}>
            <CardContent className={`flex min-h-56 flex-col items-center justify-center gap-2 text-center ${muted}`}>
              <FileSearch className="size-8 opacity-60" aria-hidden="true" />
              <p>Выберите проверку из списка или заполните данные новой биографии.</p>
            </CardContent>
          </Card>
        )}
      </div>
    </section>
  )
}
