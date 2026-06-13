import { useEffect, useState } from 'react'
import { supabase } from '../lib/supabase'
import { Plus, TrendingUp, TrendingDown, CheckSquare, Square } from 'lucide-react'

const emptyBiz = { name: '', description: '', status: 'active' }
const emptyTx = { date: '', type: 'income', amount: '', category: '', notes: '' }
const emptyTask = { title: '', status: 'todo', priority: 'medium', due_date: '' }

export default function Business() {
  const [businesses, setBusinesses] = useState([])
  const [selected, setSelected] = useState(null)
  const [transactions, setTransactions] = useState([])
  const [tasks, setTasks] = useState([])
  const [bizForm, setBizForm] = useState(emptyBiz)
  const [txForm, setTxForm] = useState(emptyTx)
  const [taskForm, setTaskForm] = useState(emptyTask)
  const [tab, setTab] = useState('finance')
  const [showNewBiz, setShowNewBiz] = useState(false)
  const [saving, setSaving] = useState(false)

  async function loadBusinesses() {
    const { data } = await supabase.from('businesses').select('*').order('created_at', { ascending: false })
    setBusinesses(data || [])
    if (!selected && data?.length) setSelected(data[0])
  }

  async function loadDetails(biz) {
    const [tx, tsk] = await Promise.all([
      supabase.from('business_finances').select('*').eq('business_id', biz.id).order('date', { ascending: false }).limit(50),
      supabase.from('business_tasks').select('*').eq('business_id', biz.id).order('created_at', { ascending: false }),
    ])
    setTransactions(tx.data || [])
    setTasks(tsk.data || [])
  }

  useEffect(() => { loadBusinesses() }, [])
  useEffect(() => { if (selected) loadDetails(selected) }, [selected])

  async function saveBiz(e) {
    e.preventDefault()
    setSaving(true)
    const { data } = await supabase.from('businesses').insert([bizForm]).select()
    setBizForm(emptyBiz)
    setShowNewBiz(false)
    await loadBusinesses()
    if (data?.[0]) setSelected(data[0])
    setSaving(false)
  }

  async function saveTx(e) {
    e.preventDefault()
    setSaving(true)
    await supabase.from('business_finances').insert([{ ...txForm, business_id: selected.id, amount: parseFloat(txForm.amount) }])
    setTxForm(emptyTx)
    await loadDetails(selected)
    setSaving(false)
  }

  async function saveTask(e) {
    e.preventDefault()
    setSaving(true)
    await supabase.from('business_tasks').insert([{ ...taskForm, business_id: selected.id }])
    setTaskForm(emptyTask)
    await loadDetails(selected)
    setSaving(false)
  }

  async function toggleTask(task) {
    const status = task.status === 'done' ? 'todo' : 'done'
    await supabase.from('business_tasks').update({ status }).eq('id', task.id)
    await loadDetails(selected)
  }

  const income = transactions.filter(t => t.type === 'income').reduce((s, t) => s + t.amount, 0)
  const expense = transactions.filter(t => t.type === 'expense').reduce((s, t) => s + t.amount, 0)
  const profit = income - expense

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-bold text-white">Business</h1>
        <button onClick={() => setShowNewBiz(!showNewBiz)} className="flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-medium text-white" style={{ background: '#4f46e5' }}>
          <Plus size={14} /> New Business
        </button>
      </div>

      {showNewBiz && (
        <form onSubmit={saveBiz} className="card p-5 grid grid-cols-2 gap-4">
          <div>
            <label className="text-xs text-slate-500 mb-1 block">Business Name</label>
            <input type="text" placeholder="Acme Inc." value={bizForm.name} onChange={e => setBizForm(f => ({ ...f, name: e.target.value }))} required />
          </div>
          <div>
            <label className="text-xs text-slate-500 mb-1 block">Status</label>
            <select value={bizForm.status} onChange={e => setBizForm(f => ({ ...f, status: e.target.value }))}>
              <option value="active">Active</option>
              <option value="planning">Planning</option>
              <option value="paused">Paused</option>
            </select>
          </div>
          <div className="col-span-2">
            <label className="text-xs text-slate-500 mb-1 block">Description</label>
            <input type="text" placeholder="What does this business do?" value={bizForm.description} onChange={e => setBizForm(f => ({ ...f, description: e.target.value }))} />
          </div>
          <div className="col-span-2">
            <button type="submit" disabled={saving} className="px-6 py-2.5 rounded-lg text-white font-medium" style={{ background: '#4f46e5' }}>
              {saving ? 'Saving...' : 'Create Business'}
            </button>
          </div>
        </form>
      )}

      {/* Business selector */}
      {businesses.length > 0 && (
        <div className="flex gap-2 flex-wrap">
          {businesses.map(biz => (
            <button key={biz.id} onClick={() => setSelected(biz)}
              className="px-4 py-2 rounded-xl text-sm font-medium transition-all"
              style={{ background: selected?.id === biz.id ? '#4f46e5' : '#1e1e2e', color: selected?.id === biz.id ? '#fff' : '#94a3b8' }}>
              {biz.name}
            </button>
          ))}
        </div>
      )}

      {selected && (
        <>
          <div className="grid grid-cols-3 gap-4">
            <div className="card p-4">
              <div className="text-xs text-slate-500 mb-1 flex items-center gap-1"><TrendingUp size={12} className="text-green-400" /> Revenue</div>
              <div className="text-xl font-bold text-green-400">${income.toLocaleString()}</div>
            </div>
            <div className="card p-4">
              <div className="text-xs text-slate-500 mb-1 flex items-center gap-1"><TrendingDown size={12} className="text-red-400" /> Expenses</div>
              <div className="text-xl font-bold text-red-400">${expense.toLocaleString()}</div>
            </div>
            <div className="card p-4">
              <div className="text-xs text-slate-500 mb-1">Net P&L</div>
              <div className={`text-xl font-bold ${profit >= 0 ? 'text-green-400' : 'text-red-400'}`}>${profit.toLocaleString()}</div>
            </div>
          </div>

          <div className="flex gap-2">
            {['finance', 'tasks'].map(t => (
              <button key={t} onClick={() => setTab(t)} className="px-4 py-2 rounded-lg text-sm font-medium capitalize"
                style={{ background: tab === t ? '#4f46e5' : '#1e1e2e', color: tab === t ? '#fff' : '#94a3b8' }}>
                {t}
              </button>
            ))}
          </div>

          {tab === 'finance' && (
            <>
              <form onSubmit={saveTx} className="card p-5 grid grid-cols-2 md:grid-cols-3 gap-4">
                <div>
                  <label className="text-xs text-slate-500 mb-1 block">Date</label>
                  <input type="date" value={txForm.date} onChange={e => setTxForm(f => ({ ...f, date: e.target.value }))} required />
                </div>
                <div>
                  <label className="text-xs text-slate-500 mb-1 block">Type</label>
                  <select value={txForm.type} onChange={e => setTxForm(f => ({ ...f, type: e.target.value }))}>
                    <option value="income">Income</option>
                    <option value="expense">Expense</option>
                  </select>
                </div>
                <div>
                  <label className="text-xs text-slate-500 mb-1 block">Amount ($)</label>
                  <input type="number" step="0.01" placeholder="1000" value={txForm.amount} onChange={e => setTxForm(f => ({ ...f, amount: e.target.value }))} required />
                </div>
                <div>
                  <label className="text-xs text-slate-500 mb-1 block">Category</label>
                  <input type="text" placeholder="Sales, Marketing, Tools..." value={txForm.category} onChange={e => setTxForm(f => ({ ...f, category: e.target.value }))} />
                </div>
                <div>
                  <label className="text-xs text-slate-500 mb-1 block">Notes</label>
                  <input type="text" value={txForm.notes} onChange={e => setTxForm(f => ({ ...f, notes: e.target.value }))} />
                </div>
                <div className="flex items-end">
                  <button type="submit" disabled={saving} className="w-full px-4 py-2.5 rounded-lg text-white font-medium" style={{ background: '#16a34a' }}>
                    {saving ? '...' : 'Add Transaction'}
                  </button>
                </div>
              </form>

              <div className="card overflow-hidden">
                {transactions.map(tx => (
                  <div key={tx.id} className="px-5 py-3.5 flex items-center justify-between border-b border-slate-800/30 last:border-0">
                    <div>
                      <span className="text-sm text-white">{tx.category || tx.notes || '—'}</span>
                      <span className="text-xs text-slate-600 ml-2">{tx.date}</span>
                    </div>
                    <span className={`text-sm font-semibold ${tx.type === 'income' ? 'text-green-400' : 'text-red-400'}`}>
                      {tx.type === 'income' ? '+' : '-'}${tx.amount?.toLocaleString()}
                    </span>
                  </div>
                ))}
              </div>
            </>
          )}

          {tab === 'tasks' && (
            <>
              <form onSubmit={saveTask} className="card p-5 grid grid-cols-2 md:grid-cols-4 gap-4">
                <div className="col-span-2">
                  <label className="text-xs text-slate-500 mb-1 block">Task</label>
                  <input type="text" placeholder="What needs to be done?" value={taskForm.title} onChange={e => setTaskForm(f => ({ ...f, title: e.target.value }))} required />
                </div>
                <div>
                  <label className="text-xs text-slate-500 mb-1 block">Priority</label>
                  <select value={taskForm.priority} onChange={e => setTaskForm(f => ({ ...f, priority: e.target.value }))}>
                    <option value="high">High</option>
                    <option value="medium">Medium</option>
                    <option value="low">Low</option>
                  </select>
                </div>
                <div>
                  <label className="text-xs text-slate-500 mb-1 block">Due Date</label>
                  <input type="date" value={taskForm.due_date} onChange={e => setTaskForm(f => ({ ...f, due_date: e.target.value }))} />
                </div>
                <div className="col-span-2 md:col-span-4">
                  <button type="submit" disabled={saving} className="px-6 py-2.5 rounded-lg text-white font-medium" style={{ background: '#4f46e5' }}>
                    {saving ? '...' : 'Add Task'}
                  </button>
                </div>
              </form>

              <div className="card overflow-hidden space-y-0">
                {tasks.map(task => (
                  <div key={task.id} className="px-5 py-3.5 flex items-center gap-3 border-b border-slate-800/30 last:border-0">
                    <button onClick={() => toggleTask(task)} className="text-slate-500 hover:text-green-400 shrink-0">
                      {task.status === 'done' ? <CheckSquare size={16} className="text-green-400" /> : <Square size={16} />}
                    </button>
                    <span className={`text-sm flex-1 ${task.status === 'done' ? 'line-through text-slate-500' : 'text-white'}`}>{task.title}</span>
                    {task.due_date && <span className="text-xs text-slate-600">{task.due_date}</span>}
                    <span className="text-xs px-2 py-0.5 rounded-full" style={{ background: priorityColor(task.priority) + '22', color: priorityColor(task.priority) }}>{task.priority}</span>
                  </div>
                ))}
              </div>
            </>
          )}
        </>
      )}

      {businesses.length === 0 && (
        <div className="card p-10 text-center text-slate-500">
          <p className="text-sm">No businesses yet. Create your first one above.</p>
        </div>
      )}
    </div>
  )
}

function priorityColor(p) {
  return p === 'high' ? '#f87171' : p === 'medium' ? '#fbbf24' : '#34d399'
}
