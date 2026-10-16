"use client"

import { useEffect, useMemo, useState } from "react"
import type { UserRole } from "@/data/users"

interface OnboardingTourProps {
  user: { id: string; role: UserRole; nickname: string }
}

const ROLE_SECTIONS: Record<string, string[]> = {
  "ПТО": ["Содержимое", "Информация", "Доклады в рацию", "Составитель докладов", "График дежурств"],
  "ЦдУД": ["Содержимое", "Информация", "Доклады в рацию", "Составитель докладов", "Рейсы и опоздания", "График дежурств"],
  "Старший Состав": ["Содержимое", "Лекции и тренировки", "Информация", "Доклады в рацию", "Составитель докладов", "Управление"],
  "Заместитель": ["Все разделы старшего состава", "Управление", "Настройки и доступы"],
  "Руководство": ["Все разделы приложения", "Управление сотрудниками", "Настройки и доступы", "Отчёты и контроль"],
  "Тех. Администратор": ["Все разделы приложения", "Редактор разделов", "Настройки и режимы", "Управление сотрудниками"],
}

export function OnboardingTour({ user }: OnboardingTourProps) {
  const key = `rzd-onboarding-${user.id}`
  const roleRank = ["ПТО", "ЦдУД", "Старший Состав", "Заместитель", "Руководство", "Тех. Администратор"]
  const roleIndex = roleRank.indexOf(user.role)
  const [open, setOpen] = useState(false)
  const [step, setStep] = useState(0)
  const [mode, setMode] = useState<"new" | "promotion">("new")

  const sections = useMemo(() => ROLE_SECTIONS[user.role] ?? ROLE_SECTIONS["ПТО"], [user.role])

  useEffect(() => {
    const saved = localStorage.getItem(key)
    const previousRole = Number(localStorage.getItem(`${key}-role`))
    if (!saved) {
      setMode("new")
      setOpen(true)
    } else if (Number.isFinite(previousRole) && roleIndex > previousRole) {
      setMode("promotion")
      setOpen(true)
    }
    localStorage.setItem(`${key}-role`, String(roleIndex))
  }, [key, roleIndex])

  if (!open) return null

  const finish = () => {
    localStorage.setItem(key, "done")
    setOpen(false)
  }

  return (
    <div className="fixed inset-0 z-[110] flex items-center justify-center bg-black/70 p-4 backdrop-blur-sm" role="dialog" aria-modal="true" aria-labelledby="onboarding-title">
      <div className="w-full max-w-lg rounded-2xl border border-white/15 bg-[#11161c] p-6 text-white shadow-2xl">
        <div className="flex items-start justify-between gap-4">
          <div>
            <p className="text-xs uppercase tracking-[0.2em] text-white/45">Методичка</p>
            <h2 id="onboarding-title" className="mt-2 text-2xl font-semibold">{mode === "new" ? `Добро пожаловать, ${user.nickname}` : "Обновление обучения"}</h2>
            <p className="mt-2 text-sm text-white/65">{mode === "new" ? "Показать короткое обучение по доступным разделам?" : `Ваша роль изменилась на «${user.role}». Покажем новые возможности.`}</p>
          </div>
          <button type="button" onClick={finish} className="rounded-lg p-2 text-white/60 hover:bg-white/10 hover:text-white" aria-label="Пропустить обучение">×</button>
        </div>
        <div className="mt-6 rounded-xl border border-white/10 bg-white/5 p-4">
          <p className="text-sm font-medium">{mode === "new" ? "Вам доступны:" : "Новые или изменённые возможности:"}</p>
          <ul className="mt-3 space-y-2 text-sm text-white/75">
            {sections.slice(mode === "promotion" ? 1 : 0).map((section) => <li key={section} className="flex gap-2"><span className="text-white/40">•</span><span>{section}</span></li>)}
          </ul>
        </div>
        <div className="mt-6 flex items-center justify-between gap-3">
          <span className="text-xs text-white/40">Шаг {step + 1} из 1</span>
          <div className="flex gap-3">
            <button type="button" onClick={finish} className="rounded-xl border border-white/15 px-4 py-2 text-sm hover:bg-white/10">Пропустить</button>
            <button type="button" onClick={finish} className="rounded-xl bg-white px-4 py-2 text-sm font-semibold text-black hover:bg-white/90">Начать работу</button>
          </div>
        </div>
      </div>
    </div>
  )
}
