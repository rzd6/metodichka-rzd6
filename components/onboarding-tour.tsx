"use client"

import { useEffect, useMemo, useState } from "react"
import type { UserRole } from "@/data/users"

interface OnboardingTourProps {
  user: { id: string; role: UserRole; nickname: string }
}

type TourStep = { target?: string; title: string; text: string; waitForClick?: boolean }

const BASE_STEPS: TourStep[] = [
  { target: '[data-tour="notifications"]', title: "Кнопка уведомлений", text: "Найдите внизу меню кнопку с колокольчиком и нажмите её. Откроется список уведомлений.", waitForClick: true },
  { title: "Уведомления от руководства", text: "Здесь появляются сообщения от старшего и руководящего состава. Прочитайте их, затем закройте окно крестиком, чтобы вернуться в методичку." },
  { target: '[data-tour="settings"]', title: "Откройте настройки", text: "Теперь нажмите кнопку с шестерёнкой внизу меню. Откроется окно настроек.", waitForClick: true },
  { title: "Внешний вид", text: "Во вкладке «Внешний вид» можно загрузить свой фон, выбрать готовый фон, сменить тему и цвет интерфейса." },
  { title: "Профиль и доклады", text: "Во вкладке «Аккаунт» можно сменить пол для докладов и пароль. После изменения пароля обязательно сохраните форму." },
  { title: "Разделы методички", text: "В левом меню откройте нужный раздел: «Информация», «Лекции», «Доклады» или «Составитель докладов». Набор разделов зависит от вашей роли." },
]

const ROLE_ADDITIONS: Partial<Record<UserRole, TourStep[]>> = {
  "ЦдУД": [{ target: '[data-tour="report-compilers"]', title: "Подключение к рейсу", text: "Откройте «Составитель докладов», введите номер рейса машиниста и выберите подключение. После этого диспетчер сможет самостоятельно выставить опоздание." }],
  "Старший Состав": [{ target: '[data-tour="admin"]', title: "Просмотр управления", text: "Откройте «Управление», чтобы просматривать список сотрудников и их данные. Изменение аккаунтов для этой роли недоступно." }],
  "Заместитель": [{ target: '[data-tour="admin"]', title: "Управление сотрудниками", text: "В разделе «Управление» можно просматривать сотрудников и контролировать рабочие данные согласно полномочиям роли." }],
  "Руководство": [{ target: '[data-tour="admin"]', title: "Управление сотрудниками", text: "Откройте «Управление», чтобы просматривать сотрудников и доступные руководству инструменты контроля." }],
}

export function OnboardingTour({ user }: OnboardingTourProps) {
  const key = `rzd-onboarding-${user.id}`
  const roleRank = ["ПТО", "ЦдУД", "Старший Состав", "Заместитель", "Руководство", "Тех. Администратор"]
  const roleIndex = roleRank.indexOf(user.role)
  const [open, setOpen] = useState(false)
  const [step, setStep] = useState(0)
  const [mode, setMode] = useState<"new" | "promotion">("new")
  const [targetRect, setTargetRect] = useState<DOMRect | null>(null)
  const [sectionSteps, setSectionSteps] = useState<TourStep[]>([])

  useEffect(() => {
    if (!open || mode !== "new") return
    const discovered = Array.from(document.querySelectorAll<HTMLElement>("[data-tour-section]"))
      .filter((element) => element.offsetParent !== null)
      .map((element) => ({
        target: `[data-tour-section="${element.dataset.tourSection}"]`,
        title: `Раздел «${element.dataset.tourSection}»`,
        text: `Нажмите на этот раздел. Здесь собраны материалы и инструменты, доступные вашей роли. Откройте его, осмотрите содержимое и вернитесь в меню для продолжения.`,
        waitForClick: true,
      }))
    setSectionSteps(discovered)
  }, [open, mode, user.role])

  const steps = useMemo(() => mode === "promotion" ? (ROLE_ADDITIONS[user.role] ?? []) : [...BASE_STEPS, ...sectionSteps], [mode, user.role, sectionSteps])
  const current = steps[step]

  useEffect(() => {
    const restart = () => {
      localStorage.removeItem(key)
      setMode("new")
      setStep(0)
      setOpen(true)
    }
    window.addEventListener("restartOnboarding", restart)
    return () => window.removeEventListener("restartOnboarding", restart)
  }, [key])

  useEffect(() => {
    const saved = localStorage.getItem(key)
    const previousRole = Number(localStorage.getItem(`${key}-role`))
    if (!saved) setOpen(true)
    else if (Number.isFinite(previousRole) && roleIndex > previousRole) { setMode("promotion"); setOpen(true) }
    localStorage.setItem(`${key}-role`, String(roleIndex))
  }, [key, roleIndex])

  useEffect(() => {
    if (!open || !current?.target) { setTargetRect(null); return }
    const selector = current.target
    const update = () => setTargetRect(selector ? document.querySelector(selector)?.getBoundingClientRect() ?? null : null)
    update()
    window.addEventListener("resize", update)
    window.addEventListener("scroll", update, true)
    const target = current.target ? document.querySelector(current.target) : null
    const advance = () => setStep((value) => value + 1)
    if (target && current.waitForClick) target.addEventListener("click", advance, { once: true })
    return () => {
      window.removeEventListener("resize", update)
      window.removeEventListener("scroll", update, true)
      target?.removeEventListener("click", advance)
    }
  }, [open, current])

  if (!open || !current) return null
  const finish = () => { localStorage.setItem(key, "done"); setOpen(false) }
  const next = () => {
    if (current.title === "Уведомления от руководства") window.dispatchEvent(new Event("closeNotificationsForOnboarding"))
    step >= steps.length - 1 ? finish() : setStep((value) => value + 1)
  }
  const canSkip = step === 0
  const canAdvance = !current.waitForClick
  const tooltipStyle = targetRect ? {
    top: Math.max(16, Math.min(targetRect.top, window.innerHeight - 250)),
    left: targetRect.right + 24 + 380 <= window.innerWidth ? targetRect.right + 24 : Math.max(16, targetRect.left - 404),
  } : undefined
  const hole = targetRect ? { top: targetRect.top - 8, left: targetRect.left - 8, right: targetRect.right + 8, bottom: targetRect.bottom + 8 } : null

  return (
    <div className="pointer-events-none fixed inset-0 z-[110]" role="dialog" aria-modal="true" aria-labelledby="onboarding-title">
      {hole ? <>
        <div className="pointer-events-auto absolute inset-x-0 top-0 bg-black/65" style={{ height: hole.top }} />
        <div className="pointer-events-auto absolute bottom-0 left-0 bg-black/65" style={{ top: hole.bottom, right: 0 }} />
        <div className="pointer-events-auto absolute left-0 bg-black/65" style={{ top: hole.top, width: hole.left, height: hole.bottom - hole.top }} />
        <div className="pointer-events-auto absolute right-0 bg-black/65" style={{ top: hole.top, left: hole.right, height: hole.bottom - hole.top }} />
        <div className="pointer-events-none absolute rounded-xl border-2" style={{ top: hole.top, left: hole.left, width: hole.right - hole.left, height: hole.bottom - hole.top, borderColor: "var(--theme-color)" }} />
      </> : <div className="pointer-events-auto absolute inset-0 bg-black/65" />}
      <div className="pointer-events-auto absolute w-[min(380px,calc(100vw-32px))] rounded-2xl border border-white/15 bg-background p-5 text-foreground shadow-2xl" style={tooltipStyle ?? { top: "50%", left: "50%", transform: "translate(-50%, -50%)" }}>
        <div className="mb-3 flex items-center justify-between"><span className="text-xs font-semibold uppercase tracking-[0.18em] text-muted-foreground">Методичка · обучение</span>{canSkip && <button type="button" onClick={finish} className="rounded-lg px-2 text-xl text-muted-foreground hover:bg-muted hover:text-foreground" aria-label="Пропустить обучение">×</button>}</div>
        <h2 id="onboarding-title" className="text-xl font-bold">{current.title}</h2>
        <p className="mt-2 text-sm leading-6 text-muted-foreground">{current.text}</p>
        <div className="mt-5 flex items-center justify-between gap-3"><span className="text-xs text-muted-foreground">Шаг {step + 1} из {steps.length}</span><div className="flex gap-2">{canSkip && <button type="button" onClick={finish} className="rounded-xl border border-border px-3 py-2 text-sm text-muted-foreground hover:bg-muted">Пропустить обучение</button>}{current.waitForClick ? <span className="rounded-xl px-3 py-2 text-sm font-semibold text-primary-foreground" style={{ backgroundColor: "var(--theme-color)" }}>Нажмите кнопку</span> : <button type="button" onClick={next} className="rounded-xl px-4 py-2 text-sm font-semibold text-primary-foreground" style={{ backgroundColor: "var(--theme-color)" }}>{step === steps.length - 1 ? "Понятно" : "Далее"}</button>}</div></div>
      </div>
    </div>
  )
}
