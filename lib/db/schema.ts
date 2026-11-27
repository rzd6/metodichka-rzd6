import { pgTable, primaryKey, text, timestamp } from "drizzle-orm/pg-core"

export const notificationReads = pgTable(
  "user_notification_reads",
  {
    userId: text("user_id").notNull(),
    articleId: text("article_id").notNull(),
    createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
  },
  (table) => ({
    userArticlePk: primaryKey({ columns: [table.userId, table.articleId] }),
  }),
)
