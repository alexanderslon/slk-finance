'use client'

import { useEffect, useLayoutEffect, useMemo, useRef, useState, useCallback, type ReactNode } from 'react'
import { usePathname, useRouter, useSearchParams } from 'next/navigation'
import { toJpeg } from 'html-to-image'
import { saveAs } from 'file-saver'
import { Button } from '@/components/ui/button'
import { Checkbox } from '@/components/ui/checkbox'
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from '@/components/ui/alert-dialog'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import type { DocState, HeaderData, RowData, SmetaStage } from '@/lib/smeta-types'
import {
  ADDITIONAL_WORK_STAGE,
  MATERIALS_STAGE,
  SMETA_EMPTY_ROWS,
  SMETA_INITIAL_ROWS,
  SMETA_MAIN_STAGES,
  SMETA_STAGE_ORDER,
  blankHeader,
  defaultHeader,
  firstEnabledStage,
  nextRowIdFromRows,
  normalizeEnabledStages,
  normalizeSmetaStage,
  stageLabel,
  stageSubtotalLabel,
} from '@/lib/smeta-types'
import { buildSmetaPersistBody } from '@/lib/smeta-api-body'
import { Trash2 } from 'lucide-react'

const PREVIEW_STORAGE_PREFIX = "smeta_doc:";

function makePreviewKey(): string {
  const id =
    typeof crypto !== "undefined" && "randomUUID" in crypto
      ? crypto.randomUUID()
      : `${Date.now()}_${Math.random().toString(16).slice(2)}`;
  return `${PREVIEW_STORAGE_PREFIX}${id}`;
}

function safeFilename(s: string): string {
  return s.replace(/[^\w\-]+/g, "_").replace(/_+/g, "_").replace(/^_+|_+$/g, "");
}

/** Ширина A4 в CSS-пикселях (~210 mm при 96 DPI). Без этого на телефоне в JPEG попадает узкая колонка экрана. */
const A4_EXPORT_WIDTH_PX = 794;

async function withA4PageWidthForExport<T>(el: HTMLElement, run: () => Promise<T>): Promise<T> {
  const prevWidth = el.style.width;
  const prevMaxWidth = el.style.maxWidth;
  const prevMinWidth = el.style.minWidth;
  const prevBoxSizing = el.style.boxSizing;
  el.style.boxSizing = "border-box";
  el.style.width = `${A4_EXPORT_WIDTH_PX}px`;
  el.style.maxWidth = `${A4_EXPORT_WIDTH_PX}px`;
  el.style.minWidth = `${A4_EXPORT_WIDTH_PX}px`;
  void el.offsetHeight;
  try {
    return await run();
  } finally {
    el.style.width = prevWidth;
    el.style.maxWidth = prevMaxWidth;
    el.style.minWidth = prevMinWidth;
    el.style.boxSizing = prevBoxSizing;
  }
}

/** iPhone / iPad / iPod; iPadOS 13+ в режиме «десктоп» часто маскируется под Mac. */
function isIOS(): boolean {
  if (typeof navigator === "undefined") return false;
  if (/iPhone|iPad|iPod/i.test(navigator.userAgent)) return true;
  if (navigator.platform === "MacIntel" && navigator.maxTouchPoints > 1) return true;
  return false;
}

/** Встроенные браузеры (Telegram, Instagram, …) часто блокируют blob, печать и загрузки. */
function isEmbeddedInAppBrowser(): boolean {
  if (typeof navigator === "undefined") return false;
  const ua = navigator.userAgent || "";
  return (
    /Telegram|Instagram|FBAN|FBAV|FB_IAB|Line\//i.test(ua) ||
    /VKWebApp|MicroMessenger|Snapchat/i.test(ua)
  );
}

function toNumber(v: unknown): number {
  if (typeof v === "number") return Number.isFinite(v) ? v : 0;
  if (typeof v === "string") {
    const cleaned = v
      .replace(/\u00A0/g, " ")
      .replace(/\s+/g, "")
      .replace(",", ".");
    const n = parseFloat(cleaned);
    return Number.isFinite(n) ? n : 0;
  }
  return 0;
}

function fmt(n: number): string {
  const safe = Number.isFinite(n) ? n : 0;
  if (safe === 0) return "0";
  return safe.toLocaleString("ru-RU", { maximumFractionDigits: 2 });
}

/** Сумма для списка сохранённых смет (API может вернуть string из numeric). */
function fmtMoneyOrDash(value: unknown): string {
  if (value === null || value === undefined) return '—'
  const n =
    typeof value === 'number'
      ? value
      : typeof value === 'string'
        ? parseFloat(value.replace(/\s/g, '').replace(',', '.'))
        : Number(value)
  if (!Number.isFinite(n)) return '—'
  return `${fmt(n)} ₽`
}

function EditableCell({
  value,
  onChange,
  isNumber,
  className,
  staticDisplay,
  multiline,
  emptyWhenZero,
}: {
  value: string;
  onChange: (val: string) => void;
  isNumber?: boolean;
  className?: string;
  /** Предпросмотр / печать: не `<input>` (одна строка), а многострочный текст с переносом. */
  staticDisplay?: boolean;
  /** Редактирование: длинные наименования — `textarea` с переносами. */
  multiline?: boolean;
  /** Для числовых полей: показывать пусто, если значение 0 (удобнее для новой строки). */
  emptyWhenZero?: boolean;
}) {
  const [draft, setDraft] = useState(value);
  const skipBlurCommitRef = useRef(false);
  const multilineRef = useRef<HTMLTextAreaElement>(null);

  useEffect(() => {
    if (isNumber && emptyWhenZero && toNumber(value) === 0) {
      setDraft('');
      return;
    }
    setDraft(value);
  }, [value]);

  const minMultilineHeightPx = 28;

  const adjustMultilineHeight = useCallback(() => {
    const el = multilineRef.current
    if (!el) return
    el.style.height = "auto"
    el.style.height = `${Math.max(minMultilineHeightPx, el.scrollHeight)}px`
  }, [])

  useLayoutEffect(() => {
    if (staticDisplay || !multiline || isNumber) return
    adjustMultilineHeight()
  }, [draft, value, staticDisplay, multiline, isNumber, adjustMultilineHeight])

  const commit = () => {
    if (isNumber) {
      if (String(draft).trim() === '') {
        onChange('0');
        if (emptyWhenZero) setDraft('');
        return;
      }
      const parsed = toNumber(draft);
      onChange(String(parsed));
      setDraft(String(parsed));
    } else {
      onChange(draft);
    }
  };

  if (staticDisplay) {
    const text = isNumber ? fmt(toNumber(value)) : value
    return (
      <div
        className={`min-h-[24px] w-full min-w-0 max-w-full whitespace-pre-wrap break-words [overflow-wrap:anywhere] px-2 py-1 text-zinc-900 ${className ?? ''}`}
      >
        {text}
      </div>
    );
  }

  if (multiline && !isNumber) {
    return (
      <textarea
        ref={multilineRef}
        autoComplete="off"
        draggable={false}
        rows={1}
        className={`box-border w-full min-h-[28px] max-w-full resize-none overflow-hidden border border-transparent bg-transparent px-2 py-1 text-zinc-900 leading-normal rounded outline-none transition-colors hover:bg-blue-50/70 focus:border-blue-400 focus:bg-white focus:ring-0 whitespace-pre-wrap break-words [overflow-wrap:anywhere] ${className ?? ''}`}
        value={draft}
        onChange={(e) => {
          setDraft(e.target.value)
        }}
        onDragStart={(e) => e.preventDefault()}
        onBlur={() => {
          if (skipBlurCommitRef.current) {
            skipBlurCommitRef.current = false;
            return;
          }
          commit();
        }}
        onKeyDown={(e) => {
          if (e.key === 'Escape') {
            e.preventDefault();
            skipBlurCommitRef.current = true;
            setDraft(value);
            ;(e.currentTarget as HTMLTextAreaElement).blur();
          }
        }}
      />
    );
  }

  return (
    <input
      type="text"
      inputMode={isNumber ? 'decimal' : undefined}
      autoComplete="off"
      draggable={false}
      className={`w-full min-h-[28px] max-w-full border border-transparent bg-transparent px-2 py-1 text-zinc-900 rounded outline-none transition-colors hover:bg-blue-50/70 focus:border-blue-400 focus:bg-white focus:ring-0 ${className ?? ''}`}
      value={draft}
      onChange={(e) => setDraft(e.target.value)}
      onDragStart={(e) => {
        // Текст в инпутах не должен запускать dnd строки при выделении.
        e.preventDefault()
      }}
      onBlur={() => {
        if (skipBlurCommitRef.current) {
          skipBlurCommitRef.current = false;
          return;
        }
        commit();
      }}
      onKeyDown={(e) => {
        if (e.key === 'Enter') {
          e.preventDefault();
          ;(e.currentTarget as HTMLInputElement).blur();
        }
        if (e.key === 'Escape') {
          e.preventDefault();
          skipBlurCommitRef.current = true;
          setDraft(value);
          ;(e.currentTarget as HTMLInputElement).blur();
        }
      }}
    />
  );
}

type EstimateListItem = {
  id: number
  title: string
  document_number?: string | null
  total_amount?: number | string | null
  updated_at: string
  created_at: string
}

export function ConstructionSmetaCalculator() {
  const searchParams = useSearchParams()
  const pathname = usePathname()
  const router = useRouter()
  const isPreview = useMemo(() => searchParams.get('preview') === '1', [searchParams])
  const previewKey = useMemo(() => searchParams.get('doc') ?? '', [searchParams])

  const [header, setHeader] = useState<HeaderData>(() => defaultHeader())

  const [rows, setRows] = useState<RowData[]>(() => SMETA_INITIAL_ROWS.map((r) => ({ ...r })))
  const [prepayment, setPrepayment] = useState<string>('5000')
  const [laborer, setLaborer] = useState<string>('0')
  const [otkat, setOtkat] = useState<string>('5000')
  const [overheadPercent, setOverheadPercent] = useState<string>('0')
  const [enabledStages, setEnabledStages] = useState<SmetaStage[]>(() => [...SMETA_MAIN_STAGES])
  const nextIdRef = useRef(nextRowIdFromRows(SMETA_INITIAL_ROWS))
  const draggingRowIdRef = useRef<number | null>(null)
  const printContentRef = useRef<HTMLDivElement | null>(null)
  const [exporting, setExporting] = useState(false)
  const [lastExportError, setLastExportError] = useState<string>('')
  const [iosPrintHelpOpen, setIosPrintHelpOpen] = useState(false)

  const [estimateList, setEstimateList] = useState<EstimateListItem[]>([])
  const [estimateId, setEstimateId] = useState<number | null>(null)
  const [listSelect, setListSelect] = useState<string>('')
  const [saving, setSaving] = useState(false)
  const [deleting, setDeleting] = useState(false)
  const [deleteSavedOpen, setDeleteSavedOpen] = useState(false)
  const [pendingDeleteSavedId, setPendingDeleteSavedId] = useState<number | null>(null)
  const [pendingDeleteSavedLabel, setPendingDeleteSavedLabel] = useState<string>('')
  const [loadingList, setLoadingList] = useState(true)
  const [apiError, setApiError] = useState('')

  const applyDocState = useCallback((doc: DocState) => {
    if (doc.header) setHeader({ ...doc.header })
    if (doc.rows?.length) {
      setRows(
        doc.rows.map((r) => ({
          ...r,
          stage: normalizeSmetaStage((r as RowData).stage),
        })),
      )
      nextIdRef.current = nextRowIdFromRows(doc.rows)
    }
    if (typeof doc.prepayment === 'string') setPrepayment(doc.prepayment)
    if (typeof doc.laborer === 'string') setLaborer(doc.laborer)
    if (typeof doc.otkat === 'string') setOtkat(doc.otkat)
    if (typeof doc.overheadPercent === 'string') setOverheadPercent(doc.overheadPercent)
    else setOverheadPercent('0')
    setEnabledStages(normalizeEnabledStages(doc.enabledStages))
  }, [])

  const refreshList = useCallback(async () => {
    try {
      const res = await fetch('/api/smeta')
      const raw = await res.json().catch(() => ({}))
      if (!res.ok) {
        const err = raw as { error?: string }
        setApiError(typeof err.error === 'string' ? err.error : 'Не удалось загрузить список')
        return
      }
      setEstimateList(Array.isArray(raw) ? (raw as EstimateListItem[]) : [])
      setApiError('')
    } catch {
      setApiError('Ошибка сети при загрузке смет')
    } finally {
      setLoadingList(false)
    }
  }, [])

  useEffect(() => {
    if (isPreview) return
    void refreshList()
  }, [isPreview, refreshList])

  const visibleRows = useMemo(() => {
    const set = new Set(enabledStages)
    return rows.filter((r) => set.has(normalizeSmetaStage(r.stage)))
  }, [rows, enabledStages])

  const hiddenRowsCount = rows.length - visibleRows.length

  const totals = useMemo(() => {
    const worksSubtotal = visibleRows.reduce((s, r) => s + toNumber(r.quantity) * toNumber(r.upperPrice), 0)
    const overheadPct = Math.max(0, toNumber(overheadPercent))
    const overheadSpecified = overheadPercent.trim() !== '' && overheadPct > 0
    const overheadAmount = overheadSpecified ? worksSubtotal * (overheadPct / 100) : 0
    const totalUpperSum = worksSubtotal + overheadAmount
    const totalWorkerSum = visibleRows.reduce((s, r) => s + toNumber(r.quantity) * toNumber(r.workerPrice), 0)
    const prepaymentN = toNumber(prepayment)
    const laborerN = toNumber(laborer)
    const otkatN = toNumber(otkat)
    const totalExpenses = totalWorkerSum + laborerN + otkatN
    const myIncome = totalUpperSum - totalExpenses
    const toPay = totalUpperSum - prepaymentN
    return {
      worksSubtotal,
      overheadAmount,
      overheadPercent: overheadPct,
      overheadSpecified,
      totalUpperSum,
      totalWorkerSum,
      prepaymentN,
      laborerN,
      otkatN,
      totalExpenses,
      myIncome,
      toPay,
    }
  }, [visibleRows, prepayment, laborer, otkat, overheadPercent])

  const totalsByStage = useMemo(() => {
    const m: Record<SmetaStage, { upper: number; worker: number }> = {
      1: { upper: 0, worker: 0 },
      2: { upper: 0, worker: 0 },
      3: { upper: 0, worker: 0 },
      4: { upper: 0, worker: 0 },
      5: { upper: 0, worker: 0 },
      6: { upper: 0, worker: 0 },
    }
    for (const r of visibleRows) {
      const st = normalizeSmetaStage(r.stage)
      const q = toNumber(r.quantity)
      m[st].upper += q * toNumber(r.upperPrice)
      m[st].worker += q * toNumber(r.workerPrice)
    }
    return m
  }, [visibleRows])

  const handleSave = useCallback(async () => {
    setApiError('')
    setSaving(true)
    try {
      const body = buildSmetaPersistBody(
        header,
        rows,
        prepayment,
        laborer,
        otkat,
        overheadPercent,
        enabledStages,
        totals,
      )
      if (estimateId) {
        const res = await fetch(`/api/smeta/${estimateId}`, {
          method: 'PUT',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(body),
        })
        if (!res.ok) {
          const err = (await res.json().catch(() => ({}))) as { error?: string }
          setApiError(err.error || 'Не удалось сохранить')
          return
        }
      } else {
        const res = await fetch('/api/smeta', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(body),
        })
        const data = (await res.json().catch(() => ({}))) as { id?: number; error?: string }
        if (!res.ok) {
          setApiError(data.error || 'Не удалось создать смету')
          return
        }
        if (typeof data.id === 'number') {
          setEstimateId(data.id)
          setListSelect(String(data.id))
        }
      }
      await refreshList()
      if (estimateId) setListSelect(String(estimateId))
    } catch {
      setApiError('Ошибка сети при сохранении')
    } finally {
      setSaving(false)
    }
  }, [estimateId, enabledStages, header, laborer, otkat, overheadPercent, prepayment, refreshList, rows, totals])

  const handleNew = useCallback(() => {
    setEstimateId(null)
    setListSelect('')
    setHeader(blankHeader())
    setRows(SMETA_EMPTY_ROWS.map((r) => ({ ...r })))
    nextIdRef.current = nextRowIdFromRows(SMETA_EMPTY_ROWS)
    setPrepayment('')
    setLaborer('')
    setOtkat('')
    setOverheadPercent('')
    setEnabledStages([...SMETA_MAIN_STAGES])
    setApiError('')
  }, [])

  const handleNewEmpty = useCallback(() => {
    setEstimateId(null)
    setListSelect('')
    setHeader(blankHeader())
    setRows(SMETA_EMPTY_ROWS.map((r) => ({ ...r })))
    nextIdRef.current = nextRowIdFromRows(SMETA_EMPTY_ROWS)
    setPrepayment('')
    setLaborer('')
    setOtkat('')
    setOverheadPercent('')
    setEnabledStages([...SMETA_MAIN_STAGES])
    setApiError('')
  }, [])

  const toggleStageEnabled = useCallback((st: SmetaStage, checked: boolean) => {
    setEnabledStages((prev) => {
      if (checked) {
        if (prev.includes(st)) return prev
        return [...prev, st].sort(
          (a, b) => SMETA_STAGE_ORDER.indexOf(a) - SMETA_STAGE_ORDER.indexOf(b),
        )
      }
      if (prev.length <= 1) return prev
      return prev.filter((x) => x !== st)
    })
  }, [])

  const handleLoadSelected = useCallback(async () => {
    const id = Number(listSelect)
    if (!Number.isFinite(id) || id <= 0) return
    setApiError('')
    try {
      const res = await fetch(`/api/smeta/${id}`)
      const data = (await res.json().catch(() => ({}))) as {
        payload?: DocState | string
        error?: string
      }
      if (!res.ok) {
        setApiError(data.error || 'Не удалось открыть смету')
        return
      }
      let payload: DocState | null = null
      if (typeof data.payload === 'string') {
        try {
          payload = JSON.parse(data.payload) as DocState
        } catch {
          payload = null
        }
      } else if (data.payload && typeof data.payload === 'object') {
        payload = data.payload as DocState
      }
      if (payload) {
        applyDocState(payload)
        setEstimateId(id)
        setListSelect(String(id))
      }
    } catch {
      setApiError('Ошибка сети')
    }
  }, [applyDocState, listSelect])

  const requestDeleteSaved = useCallback(() => {
    const id = Number(listSelect)
    if (!Number.isFinite(id) || id <= 0) return
    const item = estimateList.find((e) => e.id === id)
    const label =
      item?.document_number?.trim() != null && item.document_number.trim() !== ''
        ? `№ ${item.document_number.trim()} · ${fmtMoneyOrDash(item.total_amount)}`
        : item?.title?.trim()
          ? `${item.title} · ${fmtMoneyOrDash(item?.total_amount)}`
          : `id ${id}`
    setPendingDeleteSavedId(id)
    setPendingDeleteSavedLabel(label)
    setDeleteSavedOpen(true)
  }, [estimateList, listSelect])

  const confirmDeleteSaved = useCallback(async () => {
    const id = pendingDeleteSavedId
    if (!Number.isFinite(id as number) || id == null || id <= 0) return
    setApiError('')
    setDeleting(true)
    try {
      const res = await fetch(`/api/smeta/${id}`, { method: 'DELETE' })
      const raw = (await res.json().catch(() => ({}))) as { error?: string }
      if (!res.ok) {
        setApiError(typeof raw.error === 'string' ? raw.error : 'Не удалось удалить смету')
        return
      }
      setDeleteSavedOpen(false)
      await refreshList()
      if (estimateId === id) {
        handleNew()
      } else {
        setListSelect('')
      }
    } catch {
      setApiError('Ошибка сети при удалении')
    } finally {
      setDeleting(false)
    }
  }, [estimateId, handleNew, pendingDeleteSavedId, refreshList])

  useEffect(() => {
    if (!isPreview) return;
    if (!previewKey) return;
    const raw = localStorage.getItem(previewKey);
    if (!raw) return;
    try {
      const parsed = JSON.parse(raw) as DocState;
      if (parsed?.header) setHeader(parsed.header);
      if (parsed?.rows) setRows(parsed.rows);
      if (typeof parsed?.prepayment === "string") setPrepayment(parsed.prepayment);
      if (typeof parsed?.laborer === "string") setLaborer(parsed.laborer);
      if (typeof parsed?.otkat === "string") setOtkat(parsed.otkat);
      if (typeof parsed?.overheadPercent === "string") setOverheadPercent(parsed.overheadPercent);
      setEnabledStages(normalizeEnabledStages(parsed?.enabledStages));
    } catch {
      // ignore malformed storage
    }
  }, [isPreview, previewKey]);

  const updateRow = useCallback((id: number, field: keyof RowData, value: string | number) => {
    const numericFields: ReadonlySet<keyof RowData> = new Set(["quantity", "workerPrice", "upperPrice"]);
    if (field === 'stage') {
      const newStage = normalizeSmetaStage(value)
      setRows((prev) => {
        const mapped = prev.map((r) => (r.id === id ? { ...r, stage: newStage } : r))
        const indexed = mapped.map((r, idx) => ({ r, idx }))
        indexed.sort((a, b) => {
          const sa = normalizeSmetaStage(a.r.stage)
          const sb = normalizeSmetaStage(b.r.stage)
          if (sa !== sb) {
            return SMETA_STAGE_ORDER.indexOf(sa) - SMETA_STAGE_ORDER.indexOf(sb)
          }
          return a.idx - b.idx
        })
        return indexed.map(({ r }) => r)
      })
      return
    }
    setRows((prev) =>
      prev.map((r) => {
        if (r.id !== id) return r;
        if (numericFields.has(field)) {
          return { ...r, [field]: toNumber(value) };
        }
        return { ...r, [field]: String(value) };
      })
    );
  }, []);

  const addRow = () => {
    const id = nextIdRef.current++
    setRows((prev) => {
      const set = new Set(enabledStages)
      const visible = prev.filter((r) => set.has(normalizeSmetaStage(r.stage)))
      const lastVisible = visible[visible.length - 1]
      const stage: SmetaStage = lastVisible
        ? normalizeSmetaStage(lastVisible.stage)
        : firstEnabledStage(enabledStages)
      return [
        ...prev,
        {
          id,
          stage,
          name: '',
          unit: 'шт.',
          quantity: 1,
          workerPrice: 0,
          upperPrice: 0,
          column1: '',
        },
      ]
    })
  }

  const deleteRow = (id: number) => {
    const row = rows.find((r) => r.id === id)
    const label = row?.name?.trim() ? `«${row.name.trim()}»` : `#${id}`
    if (!window.confirm(`Удалить позицию ${label} из сметы?`)) return
    setRows((prev) => prev.filter((r) => r.id !== id))
  }

  const reorderRows = useCallback((fromId: number, toId: number) => {
    if (fromId === toId) return;
    setRows((prev) => {
      const fromIdx = prev.findIndex((r) => r.id === fromId);
      const toIdx = prev.findIndex((r) => r.id === toId);
      if (fromIdx < 0 || toIdx < 0) return prev;
      const next = [...prev];
      const [item] = next.splice(fromIdx, 1);
      next.splice(toIdx, 0, item);
      return next;
    });
  }, []);

  const renderPrintDocument = () => (
    <>
      <div className="print-header mb-6">
        <div className="flex justify-between items-start mb-4">
          <div>
            <h1 className="text-2xl font-bold text-gray-900">СМЕТА НА СТРОИТЕЛЬНО-РЕМОНТНЫЕ РАБОТЫ</h1>
            <p className="text-sm text-gray-600 mt-1">
              Документ № {header.documentNumber} от {header.date}
            </p>
          </div>
          <div className="text-right text-sm text-gray-700">
            {header.city && <p>г. {header.city}</p>}
            {header.address && <p>{header.address}</p>}
          </div>
        </div>
        <div className="grid grid-cols-2 gap-x-8 gap-y-1 text-sm text-gray-800 border-t border-gray-300 pt-3">
          <div><span className="font-semibold">Заказчик:</span> {header.customerName || "—"}</div>
          <div><span className="font-semibold">Телефон:</span> {header.customerPhone || "—"}</div>
          <div><span className="font-semibold">Адрес объекта:</span> {header.address || "—"}</div>
          <div><span className="font-semibold">Площадь:</span> {header.squareMeters || "—"} м²</div>
        </div>
      </div>

      {renderTable(true)}

      <div className="mt-6">
        <div className="border-t-2 border-gray-400 pt-4 mt-4 space-y-2 text-sm text-gray-800">
          <div className="flex justify-between">
            <span>Итого по позициям:</span>
            <span className="font-semibold tabular-nums">{fmt(totals.worksSubtotal)} ₽</span>
          </div>
          {totals.overheadSpecified ? (
            <div className="flex justify-between text-gray-600">
              <span>Накладные ({fmt(totals.overheadPercent)}% от позиций):</span>
              <span className="font-semibold tabular-nums">{fmt(totals.overheadAmount)} ₽</span>
            </div>
          ) : null}
          <div className="flex justify-end pt-2">
            <div className="text-right">
              <div className="text-sm text-gray-600">Всего по работам (с накладными):</div>
              <div className="text-2xl font-extrabold text-gray-900 tabular-nums">{fmt(totals.totalUpperSum)} ₽</div>
            </div>
          </div>
        </div>

        <div className="mt-10 pt-6 border-t border-gray-300 grid grid-cols-2 gap-8 text-sm">
          <div className="text-center">
            <div className="border-t border-gray-800 pt-2 mt-8">Подпись заказчика</div>
          </div>
          <div className="text-center">
            <div className="border-t border-gray-800 pt-2 mt-8">Подпись подрядчика</div>
          </div>
        </div>
      </div>
    </>
  );

  const openPreview = useCallback(() => {
    const key = makePreviewKey()
    const state: DocState = {
      header,
      rows,
      prepayment,
      laborer,
      otkat,
      overheadPercent,
      enabledStages,
    }
    try {
      localStorage.setItem(key, JSON.stringify(state))
    } catch {
      setApiError('Не удалось записать предпросмотр в память браузера')
      return
    }

    const params = new URLSearchParams(searchParams.toString())
    params.set('preview', '1')
    params.set('doc', key)
    const nextPath = `${pathname}?${params.toString()}`

    // На телефонах window.open(..., _blank) часто блокируется или ведёт на пустую/левую вкладку.
    // Тогда срабатывал fallback location.assign — ощущение «выброса» из сметы. Надёжнее: client navigation.
    const mq =
      typeof window !== 'undefined' && typeof window.matchMedia === 'function'
        ? window.matchMedia.bind(window)
        : null
    const useSameTab =
      !!mq &&
      (mq('(hover: none)').matches ||
        mq('(max-width: 768px)').matches ||
        mq('(pointer: coarse)').matches)

    if (useSameTab) {
      router.push(nextPath)
      return
    }

    const absUrl = new URL(nextPath, window.location.origin).href
    const w = window.open(absUrl, '_blank', 'noopener,noreferrer')
    if (!w) {
      router.push(nextPath)
    }
  }, [
    enabledStages,
    header,
    laborer,
    otkat,
    overheadPercent,
    pathname,
    prepayment,
    rows,
    router,
    searchParams,
  ])

  /** Вернуться из предпросмотра: `window.close()` не работает после обычного `router.push` в той же вкладке. */
  const closePreview = useCallback(() => {
    const params = new URLSearchParams(searchParams.toString())
    params.delete('preview')
    params.delete('doc')
    const qs = params.toString()
    router.replace(qs ? `${pathname}?${qs}` : pathname)
  }, [pathname, router, searchParams])

  const runSystemPrint = useCallback(() => {
    const restore = () => {
      document.querySelectorAll<HTMLElement>(".no-print").forEach((node) => {
        node.style.removeProperty("display");
      });
    };
    document.querySelectorAll<HTMLElement>(".no-print").forEach((node) => {
      node.style.setProperty("display", "none", "important");
    });
    window.setTimeout(() => {
      window.print();
      window.setTimeout(restore, 500);
    }, 100);
  }, []);

  const handlePreviewPrint = useCallback(() => {
    if (isIOS()) {
      setIosPrintHelpOpen(true);
      return;
    }
    runSystemPrint();
  }, [runSystemPrint]);

  const downloadJpg = async () => {
    const el = printContentRef.current;
    if (!el) return;

    const baseName = safeFilename(`smeta-${header.documentNumber || "doc"}-${header.date || ""}`) || "smeta";
    try {
      setExporting(true);
      setLastExportError("");
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const fonts = (document as any).fonts;
      if (fonts?.ready) await fonts.ready;

      const dataUrl = await withA4PageWidthForExport(el, () =>
        toJpeg(el, {
          quality: 0.92,
          backgroundColor: "#ffffff",
          pixelRatio: 2,
          cacheBust: true,
        })
      );
      if (!dataUrl) throw new Error("Не удалось сформировать изображение");

      const filename = `${baseName}.jpg`;
      const blob = await (await fetch(dataUrl)).blob();
      saveAs(blob, filename);
    } catch (e) {
      console.error("JPG export failed", e);
      const msg = e instanceof Error ? e.message : String(e);
      setLastExportError(msg);
      alert(`Не получилось скачать JPG.\n\n${msg}`);
    } finally {
      setExporting(false);
    }
  };

  const headerField = (key: keyof HeaderData, label: string, placeholder: string) => (
    <div className="flex flex-col gap-1">
      <label className="text-xs font-semibold text-zinc-600 uppercase tracking-wide">{label}</label>
      <input
        className="border border-zinc-300 bg-white text-zinc-900 placeholder:text-zinc-400 rounded-lg px-3 py-2 text-sm focus:ring-2 focus:ring-blue-400 focus:border-blue-400 outline-none transition"
        placeholder={placeholder}
        value={header[key]}
        onChange={(e) => setHeader((h) => ({ ...h, [key]: e.target.value }))}
      />
    </div>
  )

  const renderTable = (printMode = false) => {
    const cellPad = printMode ? 'px-2 py-1' : 'px-0.5 py-1 sm:px-1'
    const textSize = printMode ? 'text-[11px]' : 'text-xs sm:text-sm'
    const tbodyNodes: ReactNode[] = []
    visibleRows.forEach((row, idx) => {
      const st = normalizeSmetaStage(row.stage)
      const prev = visibleRows[idx - 1]
      const next = visibleRows[idx + 1]
      const showStageHead = !prev || normalizeSmetaStage(prev.stage) !== st
      const showStageSub = !next || normalizeSmetaStage(next.stage) !== st
      const qty = toNumber(row.quantity)
      const workerPrice = toNumber(row.workerPrice)
      const upperPrice = toNumber(row.upperPrice)
      const wSum = qty * workerPrice
      const uSum = qty * upperPrice
      const stripe = idx % 2 === 0 ? 'bg-white' : 'bg-zinc-50'

      if (showStageHead) {
        tbodyNodes.push(
          <tr key={`stage-${row.id}-head`} className="bg-zinc-200/90 text-zinc-900">
            <td
              colSpan={printMode ? 6 : 10}
              className={`border border-zinc-400 ${cellPad} font-bold ${textSize}`}
            >
              {stageLabel(st)}
            </td>
          </tr>,
        )
      }

      tbodyNodes.push(
        <tr
          key={row.id}
          onDragOver={(e) => {
            if (printMode) return
            if (draggingRowIdRef.current == null) return
            e.preventDefault()
          }}
          onDrop={() => {
            if (printMode) return
            const fromId = draggingRowIdRef.current
            if (fromId == null) return
            reorderRows(fromId, row.id)
            draggingRowIdRef.current = null
          }}
          className={`${stripe} transition hover:bg-blue-50`}
        >
          <td className={`border border-zinc-300 ${cellPad} text-center font-medium text-zinc-700`}>
            <div className="flex items-center justify-center gap-1.5">
              {!printMode ? (
                <button
                  data-dnd-handle="1"
                  className="cursor-grab active:cursor-grabbing p-1 rounded hover:bg-gray-200 text-gray-500 hover:text-gray-700 transition"
                  title="Перетащите строку"
                  type="button"
                  draggable
                  onDragStart={() => {
                    draggingRowIdRef.current = row.id
                  }}
                  onDragEnd={() => {
                    draggingRowIdRef.current = null
                  }}
                  onClick={(e) => e.preventDefault()}
                >
                  <svg className="w-4 h-4" fill="currentColor" viewBox="0 0 20 20" aria-hidden="true">
                    <path d="M7 4a1 1 0 112 0 1 1 0 01-2 0zm4 0a1 1 0 112 0 1 1 0 01-2 0zM7 10a1 1 0 112 0 1 1 0 01-2 0zm4 0a1 1 0 112 0 1 1 0 01-2 0zM7 16a1 1 0 112 0 1 1 0 01-2 0zm4 0a1 1 0 112 0 1 1 0 01-2 0z" />
                  </svg>
                </button>
              ) : null}
              <span className="tabular-nums">{idx + 1}</span>
            </div>
          </td>
          {!printMode && (
            <td className={`border border-gray-300 ${cellPad} p-0.5`}>
              <Select
                value={String(st)}
                onValueChange={(v) => updateRow(row.id, 'stage', v)}
              >
                <SelectTrigger className="h-8 w-full min-w-[4.5rem] border-zinc-300 bg-white text-zinc-900 text-xs">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {enabledStages.map((es) => (
                    <SelectItem key={es} value={String(es)}>
                      {stageLabel(es)}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </td>
          )}
          <td
            className={`border border-gray-300 ${cellPad} min-w-0 ${
              printMode ? "align-top" : ""
            }`}
          >
            <EditableCell
              value={row.name}
              onChange={(v) => updateRow(row.id, 'name', v)}
              className={textSize}
              staticDisplay={printMode}
              multiline={!printMode}
            />
          </td>
          <td className={`border border-gray-300 ${cellPad} min-w-0 text-center`}>
            <EditableCell
              value={row.unit}
              onChange={(v) => updateRow(row.id, 'unit', v)}
              className={`${textSize} text-center`}
              staticDisplay={printMode}
            />
          </td>
          <td className={`border border-gray-300 ${cellPad} min-w-0 text-center`}>
            <EditableCell
              value={String(qty)}
              onChange={(v) => updateRow(row.id, 'quantity', v)}
              isNumber
              className={`${textSize} text-center`}
              staticDisplay={printMode}
            />
          </td>
          {!printMode && (
            <>
              <td className={`border border-gray-300 ${cellPad} text-center`}>
                <EditableCell
                  value={String(workerPrice)}
                  onChange={(v) => updateRow(row.id, 'workerPrice', v)}
                  isNumber
                  emptyWhenZero
                  className={`${textSize} text-right`}
                />
              </td>
              <td
                className={`border border-gray-300 ${cellPad} text-right font-medium ${wSum > 0 ? 'text-amber-700' : 'text-gray-400'}`}
              >
                {fmt(wSum)}
              </td>
            </>
          )}
          <td className={`border border-gray-300 ${cellPad} min-w-0 text-center`}>
            <EditableCell
              value={String(upperPrice)}
              onChange={(v) => updateRow(row.id, 'upperPrice', v)}
              isNumber
              emptyWhenZero
              className={`${textSize} text-right`}
              staticDisplay={printMode}
            />
          </td>
          <td className={`border border-gray-300 ${cellPad} text-right font-bold text-blue-800`}>
            {fmt(uSum)}
          </td>
          {!printMode && (
            <td className={`border border-gray-300 ${cellPad} text-center no-print`}>
              <div className="flex items-center justify-center gap-1">
                <button
                  onClick={() => deleteRow(row.id)}
                  className="p-1 rounded hover:bg-red-100 text-gray-400 hover:text-red-600 transition"
                  title="Удалить"
                  type="button"
                >
                  <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                  </svg>
                </button>
              </div>
            </td>
          )}
        </tr>,
      )

      if (showStageSub) {
        const sub = totalsByStage[st]
        tbodyNodes.push(
          <tr key={`stage-${row.id}-sub`} className="bg-sky-50/90 font-semibold text-zinc-800">
            {printMode ? (
              <>
                <td colSpan={4} className={`border border-zinc-400 ${cellPad} text-right`}>
                  {stageSubtotalLabel(st)}
                </td>
                <td className={`border border-zinc-400 ${cellPad} text-center text-zinc-400`}>—</td>
                <td className={`border border-zinc-400 ${cellPad} text-right text-blue-900`}>{fmt(sub.upper)}</td>
              </>
            ) : (
              <>
                <td colSpan={5} className={`border border-zinc-400 ${cellPad} text-right`}>
                  {stageSubtotalLabel(st)}
                </td>
                <td className={`border border-zinc-400 ${cellPad} text-center text-zinc-400`}>—</td>
                <td className={`border border-zinc-400 ${cellPad} text-right text-amber-800`}>{fmt(sub.worker)}</td>
                <td className={`border border-zinc-400 ${cellPad} text-center text-zinc-400`}>—</td>
                <td className={`border border-zinc-400 ${cellPad} text-right text-blue-900`}>{fmt(sub.upper)}</td>
                <td className={`border border-zinc-400 ${cellPad} no-print`} />
              </>
            )}
          </tr>,
        )
      }
    })

    if (visibleRows.length === 0) {
      tbodyNodes.push(
        <tr key="smeta-empty-visible">
          <td
            colSpan={printMode ? 6 : 10}
            className={`border border-zinc-300 ${cellPad} py-6 text-center text-sm text-zinc-500`}
          >
            Нет позиций на включённых этапах. Включите этап ниже или добавьте строку.
          </td>
        </tr>,
      )
    }

    return (
      <div
        className={
          printMode
            ? "w-full min-w-0"
            : "max-w-full overflow-x-auto [-webkit-overflow-scrolling:touch]"
        }
      >
        <table
          className={`w-full border-collapse print-table ${textSize} ${printMode ? "table-fixed smeta-print-capture" : "min-w-[780px]"}`}
          onDragStartCapture={(e) => {
            if (printMode) return
            const target = e.target as HTMLElement | null
            const isHandle = !!target?.closest?.('[data-dnd-handle="1"]')
            if (!isHandle) {
              // Запрещаем DnD из ячеек/инпутов: перенос только за хвостик слева.
              e.preventDefault()
              e.stopPropagation()
            }
          }}
        >
          <thead>
            <tr className="bg-gradient-to-r from-blue-600 to-blue-700 text-white">
              <th className={`border border-blue-700 ${cellPad} w-10 text-center`}>№</th>
              {!printMode && (
                <th className={`border border-blue-700 ${cellPad} w-[5.5rem] text-center`}>Этап</th>
              )}
              <th
                className={`border border-blue-700 ${cellPad} min-w-0 ${
                  printMode ? "w-[40%] align-top" : "min-w-[120px] sm:min-w-[200px]"
                }`}
              >
                Наименование работ
              </th>
              <th className={`border border-blue-700 ${cellPad} w-16 text-center`}>Ед. изм.</th>
              <th className={`border border-blue-700 ${cellPad} w-16 text-center`}>Кол-во</th>
              {!printMode && (
                <>
                  <th className={`border border-blue-700 ${cellPad} w-24 text-center`}>Цена работника</th>
                  <th className={`border border-blue-700 ${cellPad} w-24 text-center`}>Сумма работника</th>
                </>
              )}
              <th className={`border border-blue-700 ${cellPad} w-24 text-center`}>Цена, ₽</th>
              <th className={`border border-blue-700 ${cellPad} w-28 text-center`}>Сумма, ₽</th>
              {!printMode && <th className={`border border-blue-700 ${cellPad} w-28 text-center`}>Действия</th>}
            </tr>
          </thead>
          <tbody>{tbodyNodes}</tbody>
          <tfoot>
            <tr className="bg-blue-50 font-semibold">
              <td colSpan={printMode ? 4 : 5} className={`border border-gray-300 ${cellPad} text-right text-blue-900`}>
                Итого по позициям:
              </td>
              {!printMode && (
                <>
                  <td className={`border border-gray-300 ${cellPad} text-center text-zinc-400`}>—</td>
                  <td className={`border border-gray-300 ${cellPad} text-right text-amber-800`}>
                    {fmt(totals.totalWorkerSum)}
                  </td>
                  <td className={`border border-gray-300 ${cellPad} text-center text-zinc-400`}>—</td>
                </>
              )}
              {!printMode && (
                <td className={`border border-gray-300 ${cellPad} text-right text-blue-900`}>
                  {fmt(totals.worksSubtotal)}
                </td>
              )}
              {printMode && (
                <td className={`border border-gray-300 ${cellPad} text-right text-blue-900`}>
                  {fmt(totals.worksSubtotal)}
                </td>
              )}
              {!printMode && <td className={`border border-gray-300 ${cellPad} no-print`} />}
            </tr>
            {totals.overheadSpecified && (
              <tr className="bg-blue-50/80 font-semibold">
                <td colSpan={printMode ? 4 : 8} className={`border border-gray-300 ${cellPad} text-right text-zinc-700`}>
                  Накладные ({fmt(totals.overheadPercent)}%):
                </td>
                {printMode ? (
                  <>
                    <td className={`border border-gray-300 ${cellPad} text-center text-zinc-400`}>—</td>
                    <td className={`border border-gray-300 ${cellPad} text-right text-blue-900`}>
                      {fmt(totals.overheadAmount)}
                    </td>
                  </>
                ) : (
                  <>
                    <td className={`border border-gray-300 ${cellPad} text-right text-blue-900`}>
                      {fmt(totals.overheadAmount)}
                    </td>
                    <td className={`border border-gray-300 ${cellPad} no-print`} />
                  </>
                )}
              </tr>
            )}
            <tr className="bg-blue-100 font-bold">
              <td colSpan={printMode ? 4 : 8} className={`border border-gray-300 ${cellPad} text-right text-blue-950`}>
                Всего (с накладными):
              </td>
              {printMode ? (
                <>
                  <td className={`border border-gray-300 ${cellPad} text-center text-zinc-400`}>—</td>
                  <td className={`border border-gray-300 ${cellPad} text-right text-blue-950 text-base`}>
                    {fmt(totals.totalUpperSum)}
                  </td>
                </>
              ) : (
                <>
                  <td className={`border border-gray-300 ${cellPad} text-right text-blue-950 text-base`}>
                    {fmt(totals.totalUpperSum)}
                  </td>
                  <td className={`border border-gray-300 ${cellPad} no-print`} />
                </>
              )}
            </tr>
          </tfoot>
        </table>
      </div>
    )
  }

  if (isPreview) {
    return (
      <div className="smeta-calculator smeta-calculator-root min-h-screen w-full min-w-0 max-w-full bg-slate-100 text-zinc-900 [color-scheme:light]">
        {iosPrintHelpOpen && (
          <div
            className="no-print fixed inset-0 z-[100] flex items-center justify-center p-4 bg-black/60"
            role="dialog"
            aria-modal="true"
            aria-labelledby="ios-print-title"
            onClick={() => setIosPrintHelpOpen(false)}
          >
            <div
              className="bg-white rounded-2xl shadow-xl max-w-md w-full p-6"
              onClick={(e) => e.stopPropagation()}
            >
              <h2 id="ios-print-title" className="text-lg font-bold text-gray-900 mb-2">
                Печать на iPhone / iPad
              </h2>
              <p className="text-sm text-gray-600 mb-3">
                В Safari диалог печати часто недоступен. Можно сохранить смету как картинку и распечатать её:
              </p>
              <ol className="list-decimal pl-5 text-sm text-gray-700 space-y-1 mb-5">
                <li>Нажмите «Скачать JPG» ниже.</li>
                <li>Откройте файл в «Фото» / «Файлы».</li>
                <li>
                  «Поделиться» <span aria-hidden="true">↑</span> → «Печать».
                </li>
              </ol>
              <button
                type="button"
                className="w-full py-3 rounded-xl font-semibold text-white bg-blue-600 hover:bg-blue-700 transition mb-2"
                onClick={() => {
                  setIosPrintHelpOpen(false);
                  void downloadJpg();
                }}
              >
                Скачать JPG
              </button>
              <button
                type="button"
                className="w-full py-3 rounded-xl font-semibold bg-gray-100 text-gray-800 hover:bg-gray-200 transition mb-2"
                onClick={() => {
                  setIosPrintHelpOpen(false);
                  runSystemPrint();
                }}
              >
                Попробовать системную печать
              </button>
              <button
                type="button"
                className="w-full py-3 rounded-xl font-semibold text-gray-600 hover:bg-gray-50 transition"
                onClick={() => setIosPrintHelpOpen(false)}
              >
                Закрыть
              </button>
            </div>
          </div>
        )}

        <div className="no-print sticky top-0 z-50 bg-white border-b border-gray-200 px-4 py-3">
          <div className="max-w-[1200px] mx-auto space-y-3">
            {isEmbeddedInAppBrowser() && (
              <div className="rounded-lg border border-amber-400 bg-amber-50 px-3 py-2 text-sm text-amber-950 leading-snug">
                <span className="font-semibold">Открыто из мессенджера (Telegram и др.)</span> — встроенный
                браузер часто блокирует скачивание и печать. Открой эту страницу в{' '}
                <strong>Safari</strong> или <strong>Chrome</strong> (меню «⋯» → «Открыть в браузере» / «В
                Chrome»).
              </div>
            )}
            <div className="flex flex-wrap items-center gap-2 sm:gap-3">
              <button
                onClick={handlePreviewPrint}
                className="inline-flex items-center gap-2 bg-emerald-600 text-white px-4 py-2 rounded-lg font-semibold hover:bg-emerald-700 transition active:scale-95"
                type="button"
              >
                Печать / PDF
              </button>
              <button
                onClick={() => void downloadJpg()}
                className={`inline-flex items-center gap-2 px-4 py-2 rounded-lg font-semibold transition active:scale-95 ${exporting ? "bg-blue-400 text-white cursor-not-allowed" : "bg-blue-600 text-white hover:bg-blue-700"}`}
                type="button"
                disabled={exporting}
              >
                {exporting ? "Подождите..." : "Скачать JPG"}
              </button>
              <button
                onClick={closePreview}
                className="inline-flex items-center gap-2 bg-gray-100 text-gray-700 px-4 py-2 rounded-lg font-semibold hover:bg-gray-200 transition active:scale-95"
                type="button"
              >
                Закрыть
              </button>
              <span className="text-xs text-gray-500 ml-auto max-w-[280px] text-right leading-snug max-sm:ml-0 max-sm:basis-full max-sm:text-left">
                JPG сохраняется с шириной листа A4 (не узкая колонка экрана). «Печать / PDF» — системный диалог.
                Из Telegram откройте в браузере.
              </span>
            </div>
          </div>
        </div>

        {lastExportError && (
          <div className="max-w-[1200px] mx-auto px-4 pt-3">
            <div className="rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-800">
              <div className="font-bold">Ошибка экспорта</div>
              <div className="mt-1 break-words">{lastExportError}</div>
            </div>
          </div>
        )}

        <div className="max-w-[1200px] mx-auto p-4">
          <div ref={printContentRef} className="bg-white rounded-2xl shadow-md border border-gray-100 p-4">
            {renderPrintDocument()}
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="smeta-calculator smeta-calculator-root w-full min-w-0 max-w-full overflow-x-hidden bg-gradient-to-br from-slate-100 to-blue-50 text-zinc-900 [color-scheme:light]">
      <AlertDialog
        open={deleteSavedOpen}
        onOpenChange={(open) => {
          setDeleteSavedOpen(open)
          if (!open) {
            setPendingDeleteSavedId(null)
            setPendingDeleteSavedLabel('')
          }
        }}
      >
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Удалить смету?</AlertDialogTitle>
            <AlertDialogDescription>
              {pendingDeleteSavedLabel ? (
                <>
                  Смета: <span className="font-semibold text-foreground">{pendingDeleteSavedLabel}</span>
                  <br />
                </>
              ) : null}
              Действие необратимо — восстановить будет нельзя.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel disabled={deleting}>Отмена</AlertDialogCancel>
            <AlertDialogAction
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
              onClick={() => void confirmDeleteSaved()}
              disabled={deleting}
            >
              {deleting ? 'Удаление…' : 'Да, удалить'}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      <div data-print-root className="print-only">
        {renderPrintDocument()}
      </div>

      {/* ===== SCREEN LAYOUT ===== */}
      <div className="print-container mx-auto w-full min-w-0 max-w-[1400px] px-2 pb-4 pt-0 sm:px-3 sm:pb-6 md:px-6 md:py-6">
        {/* Header bar */}
        <div className="no-print mb-6">
          <div className="mb-3 rounded-2xl border border-zinc-200 bg-white p-2.5 shadow-sm sm:mb-4 sm:p-4">
            <div className="flex flex-col gap-2 sm:gap-3 lg:flex-row lg:items-stretch lg:justify-between">
              <div className="min-w-0 space-y-2 lg:flex-1">
                <p className="text-xs font-semibold uppercase tracking-wide text-zinc-500">Сохранённые сметы</p>
                <div className="flex min-w-0 flex-col gap-2 sm:flex-row sm:items-center">
                  <Select
                    value={listSelect || undefined}
                    onValueChange={setListSelect}
                    disabled={loadingList}
                  >
                    <SelectTrigger className="w-full border-zinc-300 bg-white text-zinc-900 sm:max-w-md [&_span]:text-zinc-900">
                      <SelectValue placeholder={loadingList ? 'Загрузка…' : 'Выберите смету'} />
                    </SelectTrigger>
                    <SelectContent>
                      {estimateList.map((e) => {
                        const docLabel = e.document_number?.trim()
                          ? `№ ${e.document_number.trim()}`
                          : `#${e.id}`
                        return (
                          <SelectItem key={e.id} value={String(e.id)}>
                            <span className="tabular-nums">
                              {docLabel} · {fmtMoneyOrDash(e.total_amount)}
                            </span>
                          </SelectItem>
                        )
                      })}
                    </SelectContent>
                  </Select>
                  <Button
                    type="button"
                    variant="secondary"
                    className="w-full shrink-0 sm:w-auto"
                    onClick={() => void handleLoadSelected()}
                    disabled={!listSelect}
                  >
                    Открыть
                  </Button>
                  <Button
                    type="button"
                    variant="outline"
                    className="w-full shrink-0 border-destructive/40 text-destructive hover:bg-destructive/10 hover:text-destructive sm:w-auto"
                    onClick={requestDeleteSaved}
                    disabled={!listSelect || deleting}
                    title="Удалить выбранную смету из базы"
                  >
                    <Trash2 className="mr-1.5 h-4 w-4" aria-hidden />
                    {deleting ? 'Удаление…' : 'Удалить'}
                  </Button>
                </div>
              </div>
              <div className="flex w-full min-w-0 flex-col gap-1.5 sm:gap-2 sm:w-auto sm:flex-row sm:flex-wrap sm:items-stretch">
                <Button
                  type="button"
                  className="w-full shrink-0 sm:w-auto"
                  onClick={() => void handleSave()}
                  disabled={saving}
                >
                  {saving ? 'Сохранение…' : estimateId ? 'Сохранить' : 'Сохранить как новую'}
                </Button>
                <Button type="button" variant="outline" className="w-full shrink-0 sm:w-auto" onClick={handleNew}>
                  Новая смета
                </Button>
                <Button
                  type="button"
                  variant="secondary"
                  className="w-full shrink-0 sm:w-auto"
                  onClick={handleNewEmpty}
                  title="Очистить форму: одна пустая позиция, без демо-таблицы"
                >
                  Пустой документ
                </Button>
              </div>
            </div>
            {estimateId ? (
              <p className="mt-2 text-xs text-muted-foreground">
                Текущая смета в базе: <span className="font-mono tabular-nums">id {estimateId}</span>
              </p>
            ) : null}
            {apiError ? (
              <p className="mt-2 text-sm text-destructive" role="alert">
                {apiError}
              </p>
            ) : null}
          </div>

          <div className="mb-6 flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
            <div className="min-w-0">
              <h1 className="text-2xl font-extrabold tracking-tight text-zinc-900 sm:text-3xl">
                📋 Смета на работы
              </h1>
              <p className="mt-1 text-sm text-zinc-600 sm:text-base">Управление позициями и расчёт стоимости</p>
            </div>
            <div className="flex shrink-0">
              <button
                onClick={openPreview}
                className="flex w-full items-center justify-center gap-2 rounded-xl bg-emerald-600 px-4 py-2.5 font-semibold text-white shadow-lg shadow-emerald-200 transition hover:bg-emerald-700 active:scale-95 sm:w-auto sm:px-5"
              >
                <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 17h2a2 2 0 002-2v-4a2 2 0 00-2-2H5a2 2 0 00-2 2v4a2 2 0 002 2h2m2 4h6a2 2 0 002-2v-4a2 2 0 00-2-2H9a2 2 0 00-2 2v4a2 2 0 002 2zm8-12V5a2 2 0 00-2-2H9a2 2 0 00-2 2v4h10z"/></svg>
                Предпросмотр
              </button>
            </div>
          </div>

          {/* Header fields card */}
          <div className="mb-6 rounded-2xl border border-zinc-200 bg-white p-4 shadow-md sm:p-5">
            <h2 className="mb-4 flex items-center gap-2 text-sm font-bold uppercase tracking-wider text-zinc-600">
              <span className="w-2 h-2 rounded-full bg-blue-500"></span>
              Реквизиты документа
            </h2>
            <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 sm:gap-4 md:grid-cols-3 lg:grid-cols-4">
              {headerField("documentNumber", "№ документа", "СМ-001")}
              {headerField("date", "Дата", "2024-01-01")}
              {headerField("city", "Город", "Москва")}
              {headerField("address", "Адрес объекта", "ул. Примерная, д. 1")}
              {headerField("customerName", "Заказчик", "Иванов И.И.")}
              {headerField("customerPhone", "Телефон заказчика", "+7 (999) 123-45-67")}
              {headerField("squareMeters", "Площадь (м²)", "135")}
            </div>
          </div>
        </div>

        {/* Main table card (screen) */}
        <div className="no-print mb-6 w-full min-w-0 rounded-2xl border border-zinc-200 bg-white p-2 shadow-md sm:p-4 md:p-5">
          <div className="mb-4 flex flex-col gap-3 rounded-xl border border-zinc-100 bg-white px-3 py-3 sm:px-4">
            <div>
              <p className="text-sm font-semibold text-zinc-800">Этапы в смете</p>
              <p className="text-xs text-zinc-500">
                Снимите галочку, чтобы скрыть этап из таблицы и суммы. Хотя бы один этап должен остаться включённым.
              </p>
            </div>
            <div className="flex flex-wrap gap-x-4 gap-y-2">
              {SMETA_MAIN_STAGES.map((st) => {
                const onlyOne = enabledStages.length === 1 && enabledStages[0] === st
                return (
                  <label
                    key={st}
                    className={`flex cursor-pointer items-center gap-2 rounded-lg border border-zinc-200 bg-zinc-50/90 px-2.5 py-1.5 text-sm text-zinc-800 hover:bg-zinc-100 ${onlyOne ? 'opacity-90' : ''}`}
                  >
                    <Checkbox
                      checked={enabledStages.includes(st)}
                      disabled={onlyOne}
                      onCheckedChange={(c) => toggleStageEnabled(st, c === true)}
                      aria-label={`Этап ${st}${onlyOne ? ', нельзя отключить последний' : ''}`}
                    />
                    <span>Этап {st}</span>
                  </label>
                )
              })}
              <label
                key={ADDITIONAL_WORK_STAGE}
                className={`flex cursor-pointer items-center gap-2 rounded-lg border border-zinc-200 bg-zinc-50/90 px-2.5 py-1.5 text-sm text-zinc-800 hover:bg-zinc-100 ${
                  enabledStages.length === 1 && enabledStages[0] === ADDITIONAL_WORK_STAGE ? 'opacity-90' : ''
                }`}
              >
                <Checkbox
                  checked={enabledStages.includes(ADDITIONAL_WORK_STAGE)}
                  disabled={enabledStages.length === 1 && enabledStages[0] === ADDITIONAL_WORK_STAGE}
                  onCheckedChange={(c) => toggleStageEnabled(ADDITIONAL_WORK_STAGE, c === true)}
                  aria-label={`Доп. работы${
                    enabledStages.length === 1 && enabledStages[0] === ADDITIONAL_WORK_STAGE
                      ? ', нельзя отключить последний этап'
                      : ''
                  }`}
                />
                <span>Доп. работы</span>
              </label>
              <label
                key={MATERIALS_STAGE}
                className={`flex cursor-pointer items-center gap-2 rounded-lg border border-zinc-200 bg-zinc-50/90 px-2.5 py-1.5 text-sm text-zinc-800 hover:bg-zinc-100 ${
                  enabledStages.length === 1 && enabledStages[0] === MATERIALS_STAGE ? 'opacity-90' : ''
                }`}
              >
                <Checkbox
                  checked={enabledStages.includes(MATERIALS_STAGE)}
                  disabled={enabledStages.length === 1 && enabledStages[0] === MATERIALS_STAGE}
                  onCheckedChange={(c) => toggleStageEnabled(MATERIALS_STAGE, c === true)}
                  aria-label={`Материалы${
                    enabledStages.length === 1 && enabledStages[0] === MATERIALS_STAGE
                      ? ', нельзя отключить последний этап'
                      : ''
                  }`}
                />
                <span>Материалы</span>
              </label>
            </div>
            {hiddenRowsCount > 0 ? (
              <p className="text-xs text-amber-800">
                Скрыто позиций на выключенных этапах: {hiddenRowsCount}. Включите этап снова, чтобы вернуть строки.
              </p>
            ) : null}
          </div>
          <div className="mb-4 flex flex-col gap-2 rounded-xl border border-zinc-100 bg-zinc-50/90 px-3 py-3 sm:flex-row sm:items-center sm:justify-between">
            <div>
              <p className="text-sm font-semibold text-zinc-800">Накладные расходы</p>
              <p className="text-xs text-zinc-500">Процент от суммы всех позиций (колонка «Сумма»). Добавляется к итогу.</p>
            </div>
            <div className="flex flex-wrap items-center gap-2">
              <input
                type="text"
                inputMode="decimal"
                className="w-24 rounded-lg border border-zinc-300 bg-white px-3 py-2 text-right font-semibold text-zinc-900 tabular-nums outline-none focus:border-blue-400 focus:ring-2 focus:ring-blue-400"
                value={overheadPercent}
                onChange={(e) => setOverheadPercent(e.target.value)}
                aria-label="Процент накладных расходов"
              />
              <span className="text-sm font-medium text-zinc-600">%</span>
              <span className="text-sm text-zinc-600">
                → <span className="font-semibold tabular-nums text-zinc-900">{fmt(totals.overheadAmount)}</span> ₽
              </span>
            </div>
          </div>
          <div className="-mx-0 min-w-0 overflow-x-auto overscroll-x-contain sm:mx-0">
            {renderTable(false)}
          </div>
          <div className="mt-4 flex justify-stretch sm:justify-end">
            <button
              onClick={addRow}
              className="inline-flex w-full items-center justify-center gap-2 rounded-xl bg-blue-600 px-4 py-2.5 font-semibold text-white shadow-lg shadow-blue-200 transition hover:bg-blue-700 active:scale-95 sm:w-auto sm:px-5"
            >
              <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 6v6m0 0v6m0-6h6m-6 0H6" />
              </svg>
              Добавить позицию
            </button>
          </div>
        </div>

        {/* Bottom cards */}
        <div className="no-print mb-6 grid min-w-0 grid-cols-1 gap-4 md:grid-cols-2 lg:grid-cols-3">
          {/* Prepayment */}
          <div className="bg-white rounded-2xl shadow-md border border-gray-100 p-5">
            <h3 className="mb-3 flex items-center gap-2 text-sm font-bold uppercase tracking-wider text-zinc-600">
              <span className="w-2 h-2 rounded-full bg-green-500"></span>
              Предоплата
            </h3>
            <div className="flex items-center gap-2">
              <input
                type="text"
                className="w-full rounded-lg border border-zinc-300 bg-white px-3 py-2 text-lg font-semibold text-zinc-900 outline-none focus:border-green-400 focus:ring-2 focus:ring-green-400"
                value={prepayment}
                onChange={(e) => setPrepayment(e.target.value)}
              />
              <span className="font-semibold text-zinc-600">₽</span>
            </div>
            <div className="mt-3 border-t border-zinc-100 pt-3">
              <div className="flex justify-between text-sm">
                <span className="text-zinc-600">Итого к оплате:</span>
                <span className="font-bold text-green-700 text-lg">{fmt(totals.toPay)} ₽</span>
              </div>
            </div>
          </div>

          {/* Worker expenses */}
          <div className="bg-white rounded-2xl shadow-md border border-gray-100 p-5">
            <h3 className="mb-3 flex items-center gap-2 text-sm font-bold uppercase tracking-wider text-zinc-600">
              <span className="w-2 h-2 rounded-full bg-amber-500"></span>
              Расходы на работников
            </h3>
            <div className="space-y-2">
              <div className="rounded-lg bg-amber-50 border border-amber-100 px-3 py-2">
                <div className="flex items-center justify-between gap-2">
                  <span className="text-sm text-gray-700">По таблице (сумма работника):</span>
                  <span className="font-extrabold text-amber-800">{fmt(totals.totalWorkerSum)} ₽</span>
                </div>
              </div>
              <div className="flex items-center gap-2">
                <label className="w-36 shrink-0 text-sm text-zinc-700">Разнорабочий:</label>
                <input
                  type="text"
                  className="w-full rounded-lg border border-zinc-300 bg-white px-3 py-1.5 text-sm text-zinc-900 outline-none focus:border-amber-400 focus:ring-2 focus:ring-amber-400"
                  value={laborer}
                  onChange={(e) => setLaborer(e.target.value)}
                />
              </div>
              <div className="flex items-center gap-2">
                <label className="w-36 shrink-0 text-sm text-zinc-700">Откат:</label>
                <input
                  type="text"
                  className="w-full rounded-lg border border-zinc-300 bg-white px-3 py-1.5 text-sm text-zinc-900 outline-none focus:border-amber-400 focus:ring-2 focus:ring-amber-400"
                  value={otkat}
                  onChange={(e) => setOtkat(e.target.value)}
                />
              </div>
            </div>
            <div className="mt-3 border-t border-zinc-100 pt-3">
              <div className="flex justify-between text-sm">
                <span className="text-zinc-600">Итого (работники + откат):</span>
                <span className="font-extrabold text-amber-700">{fmt(totals.totalExpenses)} ₽</span>
              </div>
            </div>
          </div>

          {/* My income */}
          <div className="bg-gradient-to-br from-blue-600 to-blue-700 rounded-2xl shadow-md p-5 text-white">
            <h3 className="text-sm font-bold text-blue-200 uppercase tracking-wider mb-3 flex items-center gap-2">
              <span className="w-2 h-2 rounded-full bg-white"></span>
              Мой доход
            </h3>
            <div className="space-y-2">
              <div className="flex justify-between text-blue-100 text-sm">
                <span>Сумма позиций:</span>
                <span className="font-semibold tabular-nums">{fmt(totals.worksSubtotal)} ₽</span>
              </div>
              {totals.overheadAmount > 0 ? (
                <div className="flex justify-between text-blue-100 text-sm">
                  <span>Накладные ({fmt(totals.overheadPercent)}%):</span>
                  <span className="font-semibold tabular-nums">{fmt(totals.overheadAmount)} ₽</span>
                </div>
              ) : null}
              <div className="flex justify-between text-blue-100 text-sm border-t border-blue-500/50 pt-1">
                <span>Итого (с накладными):</span>
                <span className="font-semibold tabular-nums">{fmt(totals.totalUpperSum)} ₽</span>
              </div>
              <div className="flex justify-between text-blue-100 text-sm">
                <span>Расходы:</span>
                <span className="font-semibold tabular-nums">{fmt(totals.totalExpenses)} ₽</span>
              </div>
              <div className="border-t border-blue-500 pt-2 mt-2">
                <div className="flex justify-between items-end">
                  <span className="text-blue-200">Доход:</span>
                  <span className="text-3xl font-extrabold">{fmt(totals.myIncome)} ₽</span>
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* Footer info */}
        <div className="no-print mt-4 border-t border-zinc-200 py-4 text-center text-xs text-zinc-500">
          Двойной клик по ячейке для редактирования · Корзина в таблице — удалить позицию в смете · «Удалить» у списка — удалить смету из базы
        </div>
      </div>
    </div>
  );
}
