'use client'
import { useState, useEffect, useTransition } from 'react'
import { authClient } from '@/lib/auth-client'
import {
  getCategories,
  getMonthlySummary,
  getExpenses,
  addExpense,
  deleteExpense,
  seedCategoriesIfEmpty,
} from './actions'

/* ── Helpers ────────────────────────────────────────────────── */
function fmtCurrency(n) {
  return new Intl.NumberFormat('en-US', {
    style: 'currency',
    currency: 'USD',
    minimumFractionDigits: 2,
  }).format(n)
}

function currentMonth() {
  const d = new Date()
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`
}

function monthLabel(ym) {
  const [y, m] = ym.split('-')
  return new Date(Number(y), Number(m) - 1, 1).toLocaleDateString('en-US', {
    month: 'long',
    year: 'numeric',
  })
}

function formatDate(str) {
  // str = 'YYYY-MM-DD'
  return new Date(`${str}T00:00:00`).toLocaleDateString('en-US', {
    month: 'short',
    day: 'numeric',
  })
}

/* ── Donut SVG chart ────────────────────────────────────────── */
function DonutChart({ data, total }) {
  const r  = 68
  const cx = 90
  const cy = 90
  const C  = 2 * Math.PI * r

  let accumulated = 0
  const active = data.filter(d => Number(d.total) > 0)

  return (
    <svg
      viewBox="0 0 180 180"
      width="180"
      height="180"
      aria-label="Spending breakdown chart"
      role="img"
    >
      <g transform={`rotate(-90 ${cx} ${cy})`}>
        {total > 0 ? (
          active.map(seg => {
            const len    = (Number(seg.total) / total) * C
            const offset = -accumulated
            accumulated += len
            return (
              <circle
                key={seg.id}
                cx={cx}
                cy={cy}
                r={r}
                fill="none"
                stroke={seg.color}
                strokeWidth={22}
                strokeDasharray={`${len} ${C}`}
                strokeDashoffset={offset}
              />
            )
          })
        ) : (
          <circle
            cx={cx}
            cy={cy}
            r={r}
            fill="none"
            stroke="var(--line)"
            strokeWidth={22}
          />
        )}
      </g>
      {/* inner mask circle */}
      <circle cx={cx} cy={cy} r={r - 14} fill="var(--card)" />
    </svg>
  )
}

/* ── Main component ─────────────────────────────────────────── */
export default function AppPage() {
  const { data: session } = authClient.useSession()

  const [month,      setMonth]      = useState(currentMonth)
  const [categories, setCategories] = useState([])
  const [summary,    setSummary]    = useState([])
  const [expenses,   setExpenses]   = useState([])
  const [loading,    setLoading]    = useState(true)
  const [error,      setError]      = useState('')

  // form state
  const [amount,      setAmount]      = useState('')
  const [description, setDescription] = useState('')
  const [categoryId,  setCategoryId]  = useState('')
  const [spentOn,     setSpentOn]     = useState(
    new Date().toISOString().slice(0, 10)
  )

  const [isPending, startTransition] = useTransition()

  async function load() {
    setLoading(true)
    setError('')
    try {
      await seedCategoriesIfEmpty()
      const [cats, sum, exps] = await Promise.all([
        getCategories(),
        getMonthlySummary(month),
        getExpenses(month),
      ])
      setCategories(cats)
      setSummary(sum)
      setExpenses(exps)
      // default category selection
      if (cats.length > 0) {
        setCategoryId(prev => prev || cats[0].id)
      }
    } catch (err) {
      setError(err.message)
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => { load() }, [month]) // eslint-disable-line react-hooks/exhaustive-deps

  function changeMonth(delta) {
    const [y, m] = month.split('-').map(Number)
    const d = new Date(y, m - 1 + delta, 1)
    setMonth(
      `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`
    )
  }

  async function handleAdd(e) {
    e.preventDefault()
    setError('')
    const fd = new FormData()
    fd.append('amount',      amount)
    fd.append('description', description)
    fd.append('categoryId',  categoryId)
    fd.append('spentOn',     spentOn)

    startTransition(async () => {
      try {
        await addExpense(fd)
        setAmount('')
        setDescription('')
        await load()
      } catch (err) {
        setError(err.message)
      }
    })
  }

  async function handleDelete(id) {
    startTransition(async () => {
      try {
        await deleteExpense(id)
        // optimistic update for list; reload summary
        setExpenses(prev => prev.filter(e => e.id !== id))
        const sum = await getMonthlySummary(month)
        setSummary(sum)
      } catch (err) {
        setError(err.message)
      }
    })
  }

  async function signOut() {
    await authClient.signOut()
    window.location.href = '/'
  }

  const total     = summary.reduce((s, c) => s + Number(c.total), 0)
  const totalStr  = fmtCurrency(total)
  const dollars   = totalStr.replace(/\.\d+$/, '').replace(/^\$/, '')
  const cents     = totalStr.match(/\.\d+$/)?.[0] ?? '.00'

  return (
    <div className="app-shell">
      {/* ── Top bar ────────────────────────────────────────── */}
      <header className="app-topbar">
        <div className="topbar-brand">
          <span className="hex">⬡</span>
          Ledger
        </div>

        <nav className="month-nav" aria-label="Month navigation">
          <button className="nav-btn" onClick={() => changeMonth(-1)} aria-label="Previous month">
            ←
          </button>
          <span className="month-label">{monthLabel(month)}</span>
          <button className="nav-btn" onClick={() => changeMonth(1)} aria-label="Next month">
            →
          </button>
        </nav>

        <div className="topbar-right">
          <span className="user-chip">{session?.user?.email}</span>
          <button className="signout-btn" onClick={signOut}>Sign out</button>
        </div>
      </header>

      {error && <div className="error-strip">⚠ {error}</div>}

      <div className="app-body">
        {/* ── Left sidebar: summary + chart ──────────────── */}
        <aside className="summary-sidebar anim-1">
          {/* Total */}
          <div className="total-hero">
            <p className="total-eyebrow">Total spent</p>
            <div className="total-figure" aria-label={totalStr}>
              <span className="currency">$</span>
              {dollars}
              <span style={{ fontSize: '28px', fontWeight: 400, color: 'var(--muted)' }}>
                {cents}
              </span>
            </div>
            <p className="total-sub">{monthLabel(month)}</p>
          </div>

          {/* Donut chart */}
          <div className="chart-section">
            <div className="donut-wrap">
              <DonutChart data={summary} total={total} />
            </div>
          </div>

          {/* Category breakdown */}
          <ul className="cat-list" aria-label="Spending by category">
            {summary
              .filter(c => Number(c.total) > 0)
              .map(cat => (
                <li key={cat.id} className="cat-item">
                  <span
                    className="cat-swatch"
                    style={{ background: cat.color }}
                  />
                  <span className="cat-emoji">{cat.icon}</span>
                  <span className="cat-name-text">{cat.name}</span>
                  <span className="cat-pct">
                    {total > 0
                      ? Math.round((Number(cat.total) / total) * 100)
                      : 0}%
                  </span>
                  <span className="cat-amount">{fmtCurrency(cat.total)}</span>
                </li>
              ))}

            {!loading && summary.every(c => Number(c.total) === 0) && (
              <li className="cat-empty-note">No spending recorded yet.</li>
            )}
          </ul>
        </aside>

        {/* ── Right panel: add form + transactions ───────── */}
        <section className="expense-panel">
          {/* Add expense */}
          <div className="add-expense-card anim-2">
            <h2 className="section-title">Add Expense</h2>
            <form className="add-form" onSubmit={handleAdd}>
              <div className="form-row">
                <label className="form-field w-auto">
                  <span>Amount ($)</span>
                  <input
                    type="number"
                    step="0.01"
                    min="0.01"
                    placeholder="0.00"
                    value={amount}
                    onChange={e => setAmount(e.target.value)}
                    required
                    style={{ width: '130px' }}
                  />
                </label>

                <label className="form-field">
                  <span>Category</span>
                  <select
                    value={categoryId}
                    onChange={e => setCategoryId(e.target.value)}
                    required
                  >
                    {categories.map(c => (
                      <option key={c.id} value={c.id}>
                        {c.icon} {c.name}
                      </option>
                    ))}
                  </select>
                </label>

                <label className="form-field w-auto">
                  <span>Date</span>
                  <input
                    type="date"
                    value={spentOn}
                    onChange={e => setSpentOn(e.target.value)}
                    required
                  />
                </label>
              </div>

              <div className="form-row">
                <label className="form-field">
                  <span>Description (optional)</span>
                  <input
                    type="text"
                    placeholder="e.g. Lunch at Blue Bottle, Uber to airport…"
                    maxLength={255}
                    value={description}
                    onChange={e => setDescription(e.target.value)}
                  />
                </label>

                <div style={{ display: 'flex', alignItems: 'flex-end' }}>
                  <button
                    type="submit"
                    className="add-submit"
                    disabled={isPending || loading}
                  >
                    {isPending ? 'Adding…' : '+ Add'}
                  </button>
                </div>
              </div>
            </form>
          </div>

          {/* Transaction list */}
          <div className="tx-section anim-3">
            <div className="section-title-row">
              <h2 className="section-title" style={{ marginBottom: 0 }}>
                Transactions
              </h2>
              <span className="tx-badge">{expenses.length}</span>
            </div>

            {loading && <p className="loading-msg">Loading transactions…</p>}

            {!loading && expenses.length === 0 && (
              <div className="empty-state">
                <span className="empty-icon">◎</span>
                <p>No transactions this month. Add your first expense above.</p>
              </div>
            )}

            <ul className="tx-list" aria-label="Transaction list">
              {expenses.map(exp => (
                <li key={exp.id} className="tx-row">
                  <div
                    className="tx-icon-badge"
                    style={{
                      background: exp.color + '22',
                    }}
                    aria-hidden="true"
                  >
                    {exp.icon}
                  </div>

                  <div className="tx-body">
                    <span className="tx-desc">
                      {exp.description || exp.category_name}
                    </span>
                    <span className="tx-meta">
                      {exp.category_name} · {formatDate(exp.spent_on)}
                    </span>
                  </div>

                  <span className="tx-amount-col">{fmtCurrency(exp.amount)}</span>

                  <button
                    className="tx-delete"
                    onClick={() => handleDelete(exp.id)}
                    aria-label={`Delete expense: ${exp.description || exp.category_name}`}
                    disabled={isPending}
                  >
                    ✕
                  </button>
                </li>
              ))}
            </ul>
          </div>
        </section>
      </div>
    </div>
  )
}
