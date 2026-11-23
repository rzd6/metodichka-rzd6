import { NextRequest, NextResponse } from "next/server"
import { groq } from "@ai-sdk/groq"
import { generateText, Output } from "ai"
import { z } from "zod"
import { getSupabaseServer } from "@/lib/supabase-server"
import { normalizeStoredRole } from "@/data/roles"
import { DEV_LOGIN, isDevAccount } from "@/lib/dev-account"

export const dynamic = "force-dynamic"

const REVIEW_KEY_PREFIX = "rp_bio_review:"
const MAX_REVIEWS = 100
const allowedCities = ["Приволжск", "Мирный", "Невский", "Жуковский", "Волчанск", "Горная", "Водино", "Азино"]
const fields = [
  "Имя Фамилия",
  "Пол",
  "Национальность",
  "Возраст",
  "Дата и место рождения",
  "Семья",
  "Место текущего проживания",
  "Описание внешности",
  "Особенности характера",
  "Детство",
  "Юность и взрослая жизнь",
  "Настоящее время",
  "Хобби",
]

const analysisSchema = z.object({
  firstPerson: z.enum(["yes", "no", "uncertain"]),
  chronologicalCoherence: z.enum(["yes", "no", "uncertain"]),
  railwayEducation: z.enum(["yes", "no", "uncertain", "not_applicable"]),
  findings: z.array(z.object({
    severity: z.enum(["critical", "warning", "note"]),
    criterion: z.string(),
    message: z.string(),
    evidence: z.string(),
  })).max(12),
  summary: z.string(),
})

function normalizeForumUrl(value: unknown): URL {
  if (typeof value !== "string" || value.length > 500) throw new Error("Укажите ссылку на тему форума")
  const url = new URL(value)
  if (url.protocol !== "https:" || url.hostname !== "forum.gtaprovince.ru" || url.port || url.username || url.password) {
    throw new Error("Допускаются только HTTPS-ссылки с forum.gtaprovince.ru")
  }
  if (!/^\/topic\/\d+(?:-[a-z0-9-]+)?\/?$/i.test(url.pathname)) {
    throw new Error("Ссылка должна вести на тему форума с биографией")
  }
  return url
}

function extractPostContent(html: string): string {
  const marker = html.search(/<[^>]*data-role=["']commentContent["'][^>]*>/i)
  if (marker < 0) return html
  const openingEnd = html.indexOf(">", marker) + 1
  const tags = /<\/?div\b[^>]*>/gi
  tags.lastIndex = marker
  let depth = 0
  let match: RegExpExecArray | null
  while ((match = tags.exec(html))) {
    if (/^<\//.test(match[0])) depth -= 1
    else depth += 1
    if (depth === 0) return html.slice(openingEnd, match.index)
  }
  return html.slice(openingEnd)
}

function htmlToText(html: string): string {
  const content = extractPostContent(html)
  return content
    .replace(/<(script|style|noscript)[^>]*>[\s\S]*?<\/\1>/gi, " ")
    .replace(/<br\s*\/?>|<\/p>|<\/li>|<\/h[1-6]>/gi, "\n")
    .replace(/<[^>]+>/g, " ")
    .replace(/&#(\d+);/g, (_, n: string) => String.fromCodePoint(Number(n)))
    .replace(/&#x([\da-f]+);/gi, (_, n: string) => String.fromCodePoint(Number.parseInt(n, 16)))
    .replace(/&nbsp;/gi, " ").replace(/&amp;/gi, "&").replace(/&quot;/gi, '"')
    .replace(/&lt;/gi, "<").replace(/&gt;/gi, ">")
    .replace(/[\t\u00a0 ]+/g, " ").replace(/\n\s*\n+/g, "\n").trim()
    .slice(0, 60_000)
}

function buildRuleChecks(text: string, isRzd: boolean, createdAt: Date, hasTopicDate: boolean, title: string) {
  const checks: Array<{ criterion: string; status: "pass" | "fail" | "review"; details: string }> = []
  const titleMatches = /^Биография\s+[\p{L}-]+\s+[\p{L}-]+$/u.test(title)
  checks.push({ criterion: "Заголовок темы «Биография Имя Фамилия»", status: !title ? "review" : titleMatches ? "pass" : "fail", details: !title ? "Заголовок не удалось получить автоматически; сверьте формат вручную." : titleMatches ? "Заголовок соответствует указанному в правилах формату." : "Проверьте формат «Биография Имя Фамилия», без подчёркиваний." })
  for (const field of fields) {
    const labelPattern = field === "Возраст" ? "возв?раст|возрост" : field
    const present = new RegExp(`(?:^|\\n)\\s*\\d*\\.?\\s*(?:${labelPattern}):`, "im").test(text)
    checks.push({ criterion: `Поле «${field}»`, status: present ? "pass" : "fail", details: present ? "Поле найдено в биографии; учтены очевидные опечатки в названии." : "Не найдено обязательное поле формы." })
  }

  const residenceLine = text.match(/(?:место\s+(?:текущего\s+)?проживания|прожива(?:ю|ет|ют|ем|ете))\s*:?\s*([^\n]{0,200})/iu)?.[1] ?? ""
  const cityFound = allowedCities.find((city) => new RegExp(city, "i").test(residenceLine))
  checks.push({
    criterion: "Место проживания в Республике Провинция",
    status: cityFound ? "pass" : residenceLine ? "fail" : "review",
    details: cityFound ? `В строке проживания найден населённый пункт: ${cityFound}.` : residenceLine ? "В строке проживания не найден населённый пункт из перечня правил." : "Строка проживания не распознана; проверьте вручную.",
  })

  const firstPersonFound = /(?:^|[^\p{L}])(?:я|мне|меня|мой|моя|моё|мои|мы|наш|наша|наше|наши)(?=$|[^\p{L}])/iu.test(text)
  checks.push({ criterion: "Повествование от первого лица", status: firstPersonFound ? "review" : "review", details: firstPersonFound ? "Есть признаки первого лица; грамматическую форму оценит ИИ." : "Автоматически не найдены явные местоимения первого лица; проверьте текст вручную." })

  const dobLine = text.match(/(?:Дата и место рождения|Дата рождения)\s*:?\s*([^\n]+)/i)?.[1] ?? ""
  const ageLine = text.match(/(?:Возв?раст|Возрост)\s*:?\s*([^\n]+)/i)?.[1] ?? ""
  const dobMatch = dobLine.match(/(\d{1,2})[./-](\d{1,2})[./-](\d{4})/)
  const ageMatch = ageLine.match(/\b(\d{1,3})\b/)
  let ageStatus: "pass" | "fail" | "review" = "review"
  let ageDetails = "Не удалось автоматически сопоставить возраст и дату рождения; сверьте возраст на дату создания темы."
  if (dobMatch && ageMatch && hasTopicDate) {
    const [, day, month, year] = dobMatch
    const calculated = createdAt.getFullYear() - Number(year) - (createdAt.getMonth() + 1 < Number(month) || (createdAt.getMonth() + 1 === Number(month) && createdAt.getDate() < Number(day)) ? 1 : 0)
    if (calculated === Number(ageMatch[1])) {
      ageStatus = "pass"
      ageDetails = `Возраст ${ageMatch[1]} совпадает с датой рождения на дату создания темы (${createdAt.toLocaleDateString("ru-RU")}).`
    } else {
      ageStatus = "fail"
      ageDetails = `На дату создания темы получается ${calculated} лет, в биографии указано ${ageMatch[1]}. Проверьте корректность даты рождения или указанного возраста.`
    }
  }
  checks.push({ criterion: "Возраст соответствует дате рождения", status: ageStatus, details: ageDetails })

  if (isRzd) {
    const railwayStudy = /(?:университет|институт|колледж|техникум|училищ|образован|поступил|окончил|диплом)[^\n]{0,180}(?:железн|путей сообщения|локомотив|машинист|железнодорож|ржд)|(?:железн|путей сообщения|локомотив|машинист|железнодорож)[^\n]{0,180}(?:университет|институт|колледж|техникум|училищ|специальност|образован|диплом)/i.test(text)
    const recognizedTechnicalEducation = /Мирнинск(?:ий|ого)\s+Техническ(?:ий|ого)\s+университет[\s\S]{0,240}(?:получил\w*|высш\w*|диплом|окончил\w*|закончил\w*)/iu.test(text)
    checks.push({
      criterion: "Железнодорожное образование для РЖД",
      status: recognizedTechnicalEducation ? "pass" : railwayStudy ? "review" : "fail",
      details: recognizedTechnicalEducation ? "Найдено обучение в Мирнинском Техническом университете и указано получение высшего технического образования." : railwayStudy ? "Похоже, упомянуто профильное обучение; проверьте название специальности и учебного заведения." : "Не найдено обучение по железнодорожной специальности или в профильном учебном заведении.",
    })
  }
  return checks
}

async function authorize(reviewerId: string | null) {
  if (!reviewerId || reviewerId.length > 100) return null
  if (process.env.NODE_ENV !== "production" && isDevAccount({ id: reviewerId })) {
    return { id: reviewerId, nickname: DEV_LOGIN }
  }
  const { data, error } = await getSupabaseServer().from("users").select("id, username, position, secondary_role").eq("id", reviewerId).maybeSingle()
  if (error) throw error
  if (!data) return null
  const role = normalizeStoredRole(String(data.position ?? ""))
  const techAdmin = role === "Тех. Администратор" || data.secondary_role === "Тех. Администратор"
  if (role !== "Руководство" && !techAdmin) return null
  return { id: String(data.id), nickname: String(data.username ?? "Руководитель") }
}

function responseError(error: unknown, status = 400) {
  return NextResponse.json({ error: error instanceof Error ? error.message : "Не удалось выполнить запрос" }, { status })
}

function providerStatusCode(error: unknown): number | undefined {
  if (!error || typeof error !== "object" || !("statusCode" in error)) return undefined
  const statusCode = Number(error.statusCode)
  return Number.isFinite(statusCode) ? statusCode : undefined
}

async function generateBioReview(system: string, prompt: string): Promise<z.infer<typeof analysisSchema>> {
  for (let attempt = 0; attempt < 2; attempt += 1) {
    try {
      const result = await generateText({
        model: groq("openai/gpt-oss-20b"),
        output: Output.object({ schema: analysisSchema }),
        system,
        prompt,
        maxRetries: 1,
      })
      return result.output
    } catch (error) {
      const statusCode = providerStatusCode(error)
      const isPermanentFailure = statusCode === 429 || (statusCode !== undefined && statusCode < 500)
      if (attempt === 1 || isPermanentFailure) throw error
      await new Promise((resolve) => setTimeout(resolve, 500))
    }
  }
  throw new Error("Не удалось получить результат проверки")
}

export async function GET(request: NextRequest) {
  try {
    const reviewer = await authorize(request.nextUrl.searchParams.get("reviewerId"))
    if (!reviewer) return responseError(new Error("Доступ только для руководства"), 403)
    const { data, error } = await getSupabaseServer().from("app_settings").select("key, value, updated_at").like("key", `${REVIEW_KEY_PREFIX}%`).order("updated_at", { ascending: false }).limit(MAX_REVIEWS)
    if (error) throw error
    const reviews = (data ?? []).flatMap((row: { key: string; value: string }) => {
      try { return [JSON.parse(row.value)] } catch { return [] }
    })
    return NextResponse.json({ reviews })
  } catch (error) {
    return responseError(error, 500)
  }
}

export async function POST(request: NextRequest) {
  try {
    const body = await request.json()
    const reviewer = await authorize(typeof body.reviewerId === "string" ? body.reviewerId : null)
    if (!reviewer) return responseError(new Error("Доступ только для руководства"), 403)
    let url: URL
    try { url = normalizeForumUrl(body.url) } catch (error) { return responseError(error, 400) }
    const pastedText = typeof body.bioText === "string" ? body.bioText.trim().slice(0, 60_000) : ""
    let pageHtml = ""
    if (!pastedText) {
      let forumResponse: Response
      try {
        forumResponse = await fetch(url, { headers: { "User-Agent": "Mozilla/5.0 (compatible; RZD-BioReview/1.0)" }, signal: AbortSignal.timeout(12_000), redirect: "manual" })
      } catch {
        return responseError(new Error("Не удалось загрузить тему с форума. Вставьте текст биографии в поле ниже и повторите проверку."), 502)
      }
      if (!forumResponse.ok) return responseError(new Error(`Форум не открыл тему (HTTP ${forumResponse.status}). Вставьте текст биографии в поле ниже и повторите проверку.`), 422)
      pageHtml = await forumResponse.text()
    }
    const text = pastedText || htmlToText(pageHtml)
    if (text.length < 80 || !/биограф|имя фамилия|дата и место рождения/i.test(text)) {
      return responseError(new Error("Не удалось получить текст биографии. Форум может ограничивать автоматический доступ — вставьте текст темы в поле ниже."), 422)
    }

    const isRzd = body.isRzd === true
    const topicDateValue = pageHtml.match(/<time[^>]*datetime=["']([^"']+)["']/i)?.[1]
    const topicCreatedAt = topicDateValue && !Number.isNaN(new Date(topicDateValue).getTime()) ? new Date(topicDateValue) : new Date()
    const title = (typeof body.topicTitle === "string" ? body.topicTitle : pageHtml.match(/<title[^>]*>([\s\S]*?)<\/title>/i)?.[1] ?? "")
      .replace(/<[^>]+>/g, "").replace(/&amp;/gi, "&").split(" - ")[0].trim().slice(0, 200)
    const ruleChecks = buildRuleChecks(text, isRzd, topicCreatedAt, Boolean(topicDateValue), title)
    if (!process.env.GROQ_API_KEY) {
      return responseError(new Error("Не настроен ключ Groq API. Добавьте GROQ_API_KEY в переменные окружения проекта."), 503)
    }

    let output: z.infer<typeof analysisSchema>
    try {
      const system = [
        "Ты помощник руководителя для проверки RP-биографий на соответствие правилам форума MTA Province. Ты не одобряешь и не отклоняешь биографии. Не выдумывай факты и приводи короткое дословное подтверждение из текста.",
        "Проверяй форму, повествование от первого лица, дату и место рождения, семью, карьеру, хронологию, нынешнее проживание, характер, хобби и уникальные детали; учитывай требования к городам Республики Провинция и правила о суперспособностях, плагиате и пропаганде.",
        "Все текстовые значения ответа — summary, criterion, message и evidence — пиши только по-русски. Выводи только реальные замечания; корректный пункт не оформляй как замечание. Объясняй каждый пункт конкретно и простыми словами, указывай дословную короткую цитату из биографии.",
        "Учитывай очевидные опечатки в заголовках полей: например, «Возвраст» означает «Возраст». Фраза «Проживаю в Республике Провинция, в городе Приволжск» — корректное указание места проживания; не отмечай её как ошибку.",
        "Если цель проверки РЖД, проверяй профильное образование и специальность. Упоминание Мирнинского Технического университета вместе с получением высшего технического образования считай подтверждением образования для этого критерия; не требуй буквального слова «железнодорожный» в такой формулировке.",
        "Проверяй возраст только при наличии даты публикации и даты рождения. ИИ не доказывает плагиат или генерацию текста; не обвиняй без доказательств. При сомнении прямо обозначь, что нужен ручной просмотр.",
      ].join(" ")
      output = await generateBioReview(
        system,
        `Ссылка на тему: ${url.href}\nЦель проверки РЖД: ${isRzd ? "да" : "нет"}\n\nТекст темы:\n${text}`,
      )
    } catch (error) {
      const statusCode = error && typeof error === "object" && "statusCode" in error
        ? Number(error.statusCode)
        : undefined
      if (statusCode === 429) {
        return responseError(new Error("Groq временно ограничил запрос по бесплатному лимиту. Попробуйте повторить позже."), 429)
      }
      if (statusCode === 401 || statusCode === 403) {
        return responseError(new Error("Groq отклонил API-ключ. Проверьте значение GROQ_API_KEY в настройках проекта."), 502)
      }
      return responseError(new Error("Не удалось выполнить AI-проверку через Groq. Попробуйте позже."), 502)
    }

    const id = crypto.randomUUID()
    const createdAt = new Date().toISOString()
    const review = {
      id,
      url: url.href,
      title,
      reviewerId: reviewer.id,
      reviewerName: reviewer.nickname,
      createdAt,
      isRzd,
      ruleChecks,
      ai: output,
    }
    const { error } = await getSupabaseServer().from("app_settings").upsert({ key: `${REVIEW_KEY_PREFIX}${id}`, value: JSON.stringify(review), updated_at: createdAt }, { onConflict: "key" })
    if (error) throw error
    return NextResponse.json({ review })
  } catch (error) {
    return responseError(error, 500)
  }
}
