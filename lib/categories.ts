import { sql } from '@/lib/db'

type CategoryType = 'income' | 'expense'

/**
 * Дефолтные категории, которые предлагаем при первом заполнении формы
 * «Доход» / «Расход». Имена выровнены так, чтобы не пересекаться между типами:
 * на стороне расходов — это всегда выплата работнику («Зарплата работникам»),
 * на стороне доходов — поступление человеку («Зарплата»). Раньше встречались
 * парные `ЗП` / `Зарплата`, и в селекте появлялось «два варианта одного и того же».
 */
const INCOME_DEFAULTS: readonly string[] = [
  'Зарплата',
  'Аванс',
  'Премия',
  'Фриланс',
  'Подработка',
  'Инвестиции',
  'Дивиденды',
  'Возврат',
  'Бонус',
  'Подарок',
  'Аренда',
  'Продажа',
  'Крипта',
  'Другое',
]

const EXPENSE_DEFAULTS: readonly string[] = [
  'Материалы',
  'Зарплата работникам',
  'Аванс работникам',
  'Премия работникам',
  'Подрядчики',
  'Откат',
  'Инструмент',
  'Аренда',
  'Транспорт',
  'Топливо',
  'Доставка',
  'Связь и интернет',
  'Реклама',
  'Налоги и сборы',
  'Еда',
  'Хозтовары',
  'Квартира и ЖКХ',
  'Крипта',
  'Другое',
]

/**
 * Переименования старых категорий → новых. Применяются один раз на запуске
 * процесса. Если целевое имя уже существует — старая запись не теряется,
 * её переносят как FK-указатель на канонический id (см. этап dedupe ниже).
 */
const RENAMES: ReadonlyArray<{ type: CategoryType; from: string; to: string }> = [
  { type: 'expense', from: 'Квартира и коммуналка', to: 'Квартира и ЖКХ' },
  { type: 'expense', from: 'ЗП', to: 'Зарплата работникам' },
  { type: 'expense', from: 'Аванс', to: 'Аванс работникам' },
  { type: 'expense', from: 'Премия', to: 'Премия работникам' },
]

/**
 * Кэш «миграция уже отработала в этом процессе». На Vercel каждая лямбда живёт
 * какое-то время — за этот период мы не повторяем тяжёлую часть (rename + dedupe
 * + индекс). Сами `ensureDefault*` всё равно идут через ON CONFLICT, так что
 * это просто экономия на боковой работе.
 */
let migrationDone = false

async function runOneTimeMigration(): Promise<void> {
  if (migrationDone) return

  // 1. Переименования. Если целевого имени ещё нет — просто меняем имя у
  //    существующей записи. Если есть — оставляем разруху для следующего шага,
  //    он перенесёт FK и удалит дубль.
  for (const r of RENAMES) {
    await sql`
      UPDATE categories
      SET name = ${r.to}
      WHERE type = ${r.type}
        AND name = ${r.from}
        AND NOT EXISTS (
          SELECT 1 FROM categories c2 WHERE c2.type = ${r.type} AND c2.name = ${r.to}
        )
    `

    // Если после первого UPDATE строка-старое-имя всё ещё есть, значит «to»
    // уже существовала. Переносим FK ссылок (transactions, partner_requests)
    // на канонический id и удаляем устаревшую строку.
    await sql`
      WITH src AS (
        SELECT id FROM categories WHERE type = ${r.type} AND name = ${r.from}
      ),
      dst AS (
        SELECT id FROM categories WHERE type = ${r.type} AND name = ${r.to}
      )
      UPDATE transactions t
      SET category_id = d.id
      FROM src s, dst d
      WHERE t.category_id = s.id
    `
    await sql`
      WITH src AS (
        SELECT id FROM categories WHERE type = ${r.type} AND name = ${r.from}
      ),
      dst AS (
        SELECT id FROM categories WHERE type = ${r.type} AND name = ${r.to}
      )
      UPDATE partner_requests pr
      SET category_id = d.id
      FROM src s, dst d
      WHERE pr.category_id = s.id
    `
    await sql`DELETE FROM categories WHERE type = ${r.type} AND name = ${r.from}`
  }

  // 2. Дедуп оставшихся одноимённых записей: переносим FK на минимальный id
  //    в группе (name, type), потом сносим хвосты. Идемпотентно: если уже всё
  //    чисто — обе операции просто ничего не сделают.
  await sql`
    WITH dups AS (
      SELECT id, MIN(id) OVER (PARTITION BY name, type) AS canonical
      FROM categories
    )
    UPDATE transactions t
    SET category_id = dups.canonical
    FROM dups
    WHERE t.category_id = dups.id AND dups.id <> dups.canonical
  `
  await sql`
    WITH dups AS (
      SELECT id, MIN(id) OVER (PARTITION BY name, type) AS canonical
      FROM categories
    )
    UPDATE partner_requests pr
    SET category_id = dups.canonical
    FROM dups
    WHERE pr.category_id = dups.id AND dups.id <> dups.canonical
  `
  await sql`
    DELETE FROM categories c
    WHERE c.id <> (
      SELECT MIN(c2.id) FROM categories c2 WHERE c2.name = c.name AND c2.type = c.type
    )
  `

  // 3. Уникальный индекс — гарантирует, что любой будущий дубль будет отбит
  //    на уровне БД. После этого можно безопасно использовать ON CONFLICT.
  await sql`CREATE UNIQUE INDEX IF NOT EXISTS categories_name_type_key ON categories (name, type)`

  migrationDone = true
}

/** Создать категорию, если её ещё нет. Полностью идемпотентная операция. */
async function ensureCategory(name: string, type: CategoryType): Promise<void> {
  await sql`
    INSERT INTO categories (name, type)
    VALUES (${name}, ${type})
    ON CONFLICT (name, type) DO NOTHING
  `
}

/**
 * Найти id категории по имени/типу или создать новую. Используется, когда
 * пользователь сам вводит имя (например, из формы заявки партнёра) и нам
 * нужно вернуть конкретный category_id для FK.
 */
export async function findOrCreateCategory(
  name: string,
  type: CategoryType,
): Promise<number> {
  await runOneTimeMigration()
  // ON CONFLICT DO UPDATE — единственный способ получить RETURNING id и при
  // вставке, и при попадании в существующую запись. SET name = EXCLUDED.name
  // — это «no-op», который заставляет Postgres вернуть строку.
  const rows = await sql`
    INSERT INTO categories (name, type)
    VALUES (${name}, ${type})
    ON CONFLICT (name, type) DO UPDATE SET name = EXCLUDED.name
    RETURNING id
  `
  return Number(rows[0].id)
}

export async function ensureDefaultExpenseCategories(): Promise<void> {
  await runOneTimeMigration()
  for (const name of EXPENSE_DEFAULTS) {
    await ensureCategory(name, 'expense')
  }
}

export async function ensureDefaultIncomeCategories(): Promise<void> {
  await runOneTimeMigration()
  for (const name of INCOME_DEFAULTS) {
    await ensureCategory(name, 'income')
  }
}
