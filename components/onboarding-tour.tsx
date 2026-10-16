"use client"

import { useEffect, useMemo, useState } from "react"
import type { UserRole } from "@/data/users"

interface OnboardingTourProps {
  user: { id: string; role: UserRole; nickname: string }
}

type TourStep = { target?: string; title: string; text: string; waitForClick?: boolean }

const BASE_STEPS: TourStep[] = [
  { target: '[data-tour="notifications"]', title: "Уведомления", text: "Это кнопка уведомлений. Нажмите её, чтобы открыть сообщения от старшего и руководящего состава.", waitForClick: true },
  { title: "Сообщения", text: "В открывшемся окне отображаются важные уведомления. Закройте окно уведомлений и продолжим знакомство." },
  { target: '[data-tour="settings"]', title: "Настройки", text: "Откройте настройки — здесь можно загрузить свой фон, выбрать готовый фон, сменить тему и цвет интерфейса, пол для докладов и пароль.", waitForClick: true },
  { title: "Разделы методички", text: "В боковом меню находятся доступные вам разделы: содержание, информация, лекции, доклады, составитель докладов и другие инструменты вашей роли." },
  { title: "Готово", text: "Теперь вы знаете, где находятся основные возможности. Обучение можно открыть повторно после повышения роли — новые шаги покажут появившиеся разделы и кнопки." },
]

const ROLE_ADDITIONS: Partial<Record<UserRole, TourStep[]>> = {
  "ЦдУД": [{ title: "Рейсы и опоздания", text: "В составителе докладов диспетчер может подключиться к рейсу машиниста по его номеру и самостоятельно указать опоздание." }],
  "Старший Состав": [{ title: "Управление", text: "Вам доступен просмотр управления сотрудниками и контроль рабочих процессов согласно вашей роли." }],
  "Заместитель": [{ title: "Расширенные разделы", text: "После повышения вам доступны дополнительные разделы и возможности контроля, которые появятся в меню автоматически." }],
  "Руководство": [{ title: "Контроль и управление", text: "Руководству доступны расширенные разделы контроля и управления сотрудниками." }],
}

export function OnboardingTour({ user }: OnboardingTourProps) {
  const key = `rzd-onboarding-${user.id}`
  const roleRank = ["ПТО", "ЦдУД", "Старший Состав", "Заместитель", "Руководство", "Тех. Администратор"]
  const roleIndex = roleRank.indexOf(user.role)
  const [open, setOpen] = useState(false)
  const [step, setStep] = useState(0)
  const [mode, setMode] = useState<"new" | "promotion">("new")
  const [targetRect, setTargetRect] = useState<DOMRect | null>(null)

  const steps = useMemo(() => mode === "promotion" ? (ROLE_ADDITIONS[user.role] ?? []) : BASE_STEPS, [mode, user.role])
  const current = steps[step]

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
  const next = () => step >= steps.length - 1 ? finish() : setStep((value) => value + 1)
  const tooltipStyle = targetRect ? { top: Math.min(targetRect.bottom + 16, window.innerHeight - 250), left: Math.max(16, Math.min(targetRect.left, window.innerWidth - 400)) } : undefined

  return (
    <div className="fixed inset-0 z-[110]" role="dialog" aria-modal="true" aria-labelledby="onboarding-title">
      <div className="absolute inset-0 bg-black/65" />
      {targetRect && <div className="pointer-events-none absolute rounded-xl border-2 shadow-[0_0_0_9999px_rgba(0,0,0,0.65)]" style={{ top: targetRect.top - 6, left: targetRect.left - 6, width: targetRect.width + 12, height: targetRect.height + 12, borderColor: "var(--theme-color, #d89b2b)" }} />}
      <div className="absolute w-[min(380px,calc(100vw-32px))] rounded-2xl border border-white/15 bg-[#151a20] p-5 text-white shadow-2xl" style={tooltipStyle ?? { top: "50%", left: "50%", transform: "translate(-50%, -50%)" }}>
        <div className="mb-3 flex items-center justify-between"><span className="text-xs font-semibold uppercase tracking-[0.18em] text-white/45">Методичка · обучение</span><button type="button" onClick={finish} className="rounded-lg px-2 text-xl text-white/55 hover:bg-white/10 hover:text-white" aria-label="Пропустить обучение">×</button></div>
        <h2 id="onboarding-title" className="text-xl font-bold">{current.title}</h2>
        <p className="mt-2 text-sm leading-6 text-white/75">{current.text}</p>
        <div className="mt-5 flex items-center justify-between gap-3"><span className="text-xs text-white/45">Шаг {step + 1} из {steps.length}</span><div className="flex gap-2"><button type="button" onClick={finish} className="rounded-xl border border-white/15 px-3 py-2 text-sm text-white/70 hover:bg-white/10">Пропустить</button>{current.waitForClick ? <span className="rounded-xl px-3 py-2 text-sm font-semibold text-black" style={{ backgroundColor: "var(--theme-color, #d89b2b)" }}>Нажмите кнопку</span> : <button type="button" onClick={next} className="rounded-xl px-4 py-2 text-sm font-semibold text-black" style={{ backgroundColor: "var(--theme-color, #d89b2b)" }}>{step === steps.length - 1 ? "Завершить" : "Далее"}</button>}</div></div>
      </div>
    </div>
  )
}
