'use server'
import { auth } from '@/lib/auth'
import { headers } from 'next/headers'
import { sql } from '@/lib/db'

async function requireUser() {
  const session = await auth.api.getSession({ headers: await headers() })
  if (!session?.user) throw new Error('Unauthorized')
  return session.user
}

export async function seedCategoriesIfEmpty() {
  const user = await requireUser()
  const existing = await sql`SELECT id FROM categories WHERE owner_id = ${user.id} LIMIT 1`
  if (existing.length > 0) return

  await sql`
    INSERT INTO categories (owner_id, name, color, icon) VALUES
      (${user.id}, 'Food & Drink',   '#f97316', '🍔'),
      (${user.id}, 'Transport',      '#3b82f6', '🚗'),
      (${user.id}, 'Shopping',       '#a855f7', '🛍️'),
      (${user.id}, 'Entertainment',  '#ec4899', '🎬'),
      (${user.id}, 'Health',         '#22c55e', '💊'),
      (${user.id}, 'Bills',          '#64748b', '📋'),
      (${user.id}, 'Other',          '#94a3b8', '💳')
  `
}

export async function getCategories() {
  const user = await requireUser()
  return sql`
    SELECT id, name, color, icon
    FROM categories
    WHERE owner_id = ${user.id}
    ORDER BY name
  `
}

export async function getMonthlySummary(month) {
  const user = await requireUser()
  const monthDate = `${month}-01`
  return sql`
    SELECT
      c.id,
      c.name,
      c.color,
      c.icon,
      COALESCE(SUM(e.amount), 0)::float AS total,
      COUNT(e.id)::int                   AS tx_count
    FROM categories c
    LEFT JOIN expenses e
      ON e.category_id = c.id
      AND DATE_TRUNC('month', e.spent_on) = DATE_TRUNC('month', ${monthDate}::date)
    WHERE c.owner_id = ${user.id}
    GROUP BY c.id, c.name, c.color, c.icon
    ORDER BY total DESC, c.name
  `
}

export async function getExpenses(month) {
  const user = await requireUser()
  const monthDate = `${month}-01`
  return sql`
    SELECT
      e.id,
      e.amount::float AS amount,
      e.description,
      e.spent_on::text AS spent_on,
      c.name  AS category_name,
      c.color AS color,
      c.icon  AS icon
    FROM expenses e
    JOIN categories c ON c.id = e.category_id
    WHERE e.owner_id = ${user.id}
      AND e.spent_on >= DATE_TRUNC('month', ${monthDate}::date)
      AND e.spent_on <  DATE_TRUNC('month', ${monthDate}::date) + INTERVAL '1 month'
    ORDER BY e.spent_on DESC, e.created_at DESC
  `
}

export async function addExpense(formData) {
  const user = await requireUser()

  const amount     = parseFloat(formData.get('amount'))
  const description = (formData.get('description') || '').trim()
  const categoryId  = formData.get('categoryId')
  const spentOn     = formData.get('spentOn') || new Date().toISOString().slice(0, 10)

  if (!amount || amount <= 0) throw new Error('Amount must be greater than zero.')
  if (!categoryId)            throw new Error('Please select a category.')

  await sql`
    INSERT INTO expenses (owner_id, category_id, amount, description, spent_on)
    VALUES (${user.id}, ${categoryId}, ${amount}, ${description}, ${spentOn}::date)
  `
}

export async function deleteExpense(id) {
  const user = await requireUser()
  await sql`
    DELETE FROM expenses
    WHERE id = ${id}::uuid
      AND owner_id = ${user.id}
  `
}
