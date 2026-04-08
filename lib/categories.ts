import { sql } from '@/lib/db'

type CategoryType = 'income' | 'expense'

async function ensureCategory(name: string, type: CategoryType) {
  // В схеме нет UNIQUE по (name,type), поэтому защищаемся через WHERE NOT EXISTS.
  await sql`
    INSERT INTO categories (name, type)
    SELECT ${name}, ${type}
    WHERE NOT EXISTS (
      SELECT 1 FROM categories WHERE name = ${name} AND type = ${type}
    )
  `
}

export async function ensureDefaultExpenseCategories() {
  await ensureCategory('Крипта', 'expense')
  // Переименование старой категории, если она уже успела попасть в БД
  await sql`
    UPDATE categories
    SET name = 'Квартира и ЖКХ'
    WHERE type = 'expense' AND name = 'Квартира и коммуналка'
  `
  await ensureCategory('Квартира и ЖКХ', 'expense')
}

export async function ensureDefaultIncomeCategories() {
  await ensureCategory('Крипта', 'income')
}

