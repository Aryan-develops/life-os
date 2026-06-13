import { useEffect, useState } from 'react'
import { supabase } from '../lib/supabase'
import { Plus, TrendingUp, TrendingDown, CheckSquare, Square, Briefcase } from 'lucide-react'

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
  const [showTxForm, setShowTxForm] = useState(false)
  const [showTaskForm, setShowTaskForm] = useState(false)
  const [saving, setSaving] = useState(false)

  async function loadBiz() {
    const { data } = await supabase.from('businesses').select('*').order('created_at', { ascending: false })
    setBusinesses(data || [])
    if (!selected && data?.length) setSelected(data[0])
  }
  async function loadDetails(biz) {
    const [tx, tsk] = await Promise.all([
      supabase.from('business_finances').select('*').eq('business_id', biz.id).order('date',{ascending:false}).limit(100),
      supabase.from('business_tasks').select('*').eq('business_id', biz.id).order('created_at',{ascending:false}),
    ])
    setTransactions(tx.data||[]); setTasks(tsk.data||[])
  }

  useEffect(()=>{ loadBiz() },[])
  useEffect(()=>{ if(selected) loadDetails(selected) },[selected])

  async function saveBiz(e) {
    e.preventDefault(); setSaving(true)
    const { data } = await supabase.from('businesses').insert([bizForm]).select()
    setBizForm(emptyBiz); setShowNewBiz(false); await loadBiz()
    if(data?.[0]) setSelected(data[0])
    setSaving(false)
  }
  async function saveTx(e) {
    e.preventDefault(); setSaving(true)
    await supabase.from('business_finances').insert([{...txForm,business_id:selected.id,amount:parseFloat(txForm.amount)}])
    setTxForm(emptyTx); setShowTxForm(false); await loadDetails(selected); setSaving(false)
  }
  async function saveTask(e) {
    e.preventDefault(); setSaving(true)
    await supabase.from('business_tasks').insert([{...taskForm,business_id:selected.id}])
    setTaskForm(emptyTask); setShowTaskForm(false); await loadDetails(selected); setSaving(false)
  }
  async function toggleTask(task) {
    const status = task.status==='done'?'todo':'done'
    await supabase.from('business_tasks').update({status}).eq('id',task.id)
    setTasks(t=>t.map(x=>x.id===task.id?{...x,status}:x))
  }

  const income = transactions.filter(t=>t.type==='income').reduce((s,t)=>s+t.amount,0)
  const expense = transactions.filter(t=>t.type==='expense').reduce((s,t)=>s+t.amount,0)
  const profit = income - expense

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 24 }}>
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
          <div style={{ width: 36, height: 36, borderRadius: 10, background: 'rgba(192,132,252,0.15)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
            <Briefcase size={17} color="#c084fc" />
          </div>
          <h1 className="page-title">Business</h1>
        </div>
        <button className="btn btn-primary" onClick={()=>setShowNewBiz(v=>!v)}><Plus size={13} /> New Business</button>
      </div>

      {showNewBiz && (
        <form onSubmit={saveBiz} className="card animate-fade-in" style={{ padding: 22 }}>
          <div style={{ fontSize: 14, fontWeight: 700, color: '#fff', marginBottom: 18 }}>Add Business</div>
          <div style={{ display: 'grid', gridTemplateColumns: '2fr 1fr', gap: 14, marginBottom: 14 }}>
            <div><label className="label">Business Name</label><input type="text" placeholder="My Company" value={bizForm.name} onChange={e=>setBizForm(f=>({...f,name:e.target.value}))} required /></div>
            <div><label className="label">Status</label>
              <select value={bizForm.status} onChange={e=>setBizForm(f=>({...f,status:e.target.value}))}>
                <option value="active">Active</option><option value="planning">Planning</option><option value="paused">Paused</option>
              </select>
            </div>
            <div className="col-span-2"><label className="label">Description</label><input type="text" placeholder="What does this business do?" value={bizForm.description} onChange={e=>setBizForm(f=>({...f,description:e.target.value}))} /></div>
          </div>
          <div style={{ display: 'flex', gap: 10 }}>
            <button type="submit" disabled={saving} className="btn btn-primary">{saving?'...':'Create Business'}</button>
            <button type="button" className="btn btn-ghost" onClick={()=>setShowNewBiz(false)}>Cancel</button>
          </div>
        </form>
      )}

      {/* Business selector */}
      {businesses.length > 0 && (
        <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
          {businesses.map(biz=>(
            <button key={biz.id} onClick={()=>setSelected(biz)} className="btn" style={{
              background: selected?.id===biz.id ? 'linear-gradient(135deg,#6366f1,#8b5cf6)' : 'rgba(255,255,255,0.05)',
              color: selected?.id===biz.id ? '#fff' : '#64748b',
              border: selected?.id===biz.id ? 'none' : '1px solid rgba(255,255,255,0.07)',
              boxShadow: selected?.id===biz.id ? '0 4px 15px rgba(99,102,241,0.3)' : 'none',
            }}>
              {biz.name}
              <span style={{ fontSize: 10, padding: '2px 6px', borderRadius: 99, background: selected?.id===biz.id?'rgba(255,255,255,0.15)':'rgba(255,255,255,0.06)', marginLeft: 4 }}>{biz.status}</span>
            </button>
          ))}
        </div>
      )}

      {selected && (
        <>
          {/* P&L Cards */}
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: 12 }}>
            <div className="card" style={{ padding: '20px 22px' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: 6, marginBottom: 10 }}><TrendingUp size={14} color="#22c55e"/><span className="section-title">Revenue</span></div>
              <div style={{ fontSize: 26, fontWeight: 800, color: '#22c55e', letterSpacing: '-0.02em' }}>${income.toLocaleString()}</div>
            </div>
            <div className="card" style={{ padding: '20px 22px' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: 6, marginBottom: 10 }}><TrendingDown size={14} color="#f87171"/><span className="section-title">Expenses</span></div>
              <div style={{ fontSize: 26, fontWeight: 800, color: '#f87171', letterSpacing: '-0.02em' }}>${expense.toLocaleString()}</div>
            </div>
            <div className="card" style={{ padding: '20px 22px' }}>
              <div className="section-title" style={{ marginBottom: 10 }}>Net P&L</div>
              <div style={{ fontSize: 26, fontWeight: 800, color: profit>=0?'#22c55e':'#f87171', letterSpacing: '-0.02em' }}>${profit.toLocaleString()}</div>
            </div>
          </div>

          <div className="tabs">
            <button className={`tab${tab==='finance'?' active':''}`} onClick={()=>{setTab('finance');setShowTxForm(false);setShowTaskForm(false)}}>Finance</button>
            <button className={`tab${tab==='tasks'?' active':''}`} onClick={()=>{setTab('tasks');setShowTxForm(false);setShowTaskForm(false)}}>Tasks</button>
          </div>

          {tab==='finance' && (
            <>
              <div style={{ display: 'flex', justifyContent: 'flex-end' }}>
                <button className="btn btn-green btn-sm" onClick={()=>setShowTxForm(v=>!v)}><Plus size={12}/> Add Transaction</button>
              </div>
              {showTxForm && (
                <form onSubmit={saveTx} className="card animate-fade-in" style={{ padding: 22 }}>
                  <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: 14, marginBottom: 14 }}>
                    <div><label className="label">Date</label><input type="date" value={txForm.date} onChange={e=>setTxForm(f=>({...f,date:e.target.value}))} required /></div>
                    <div><label className="label">Type</label><select value={txForm.type} onChange={e=>setTxForm(f=>({...f,type:e.target.value}))}><option value="income">Income</option><option value="expense">Expense</option></select></div>
                    <div><label className="label">Amount ($)</label><input type="number" step="0.01" placeholder="1000" value={txForm.amount} onChange={e=>setTxForm(f=>({...f,amount:e.target.value}))} required /></div>
                    <div><label className="label">Category</label><input type="text" placeholder="Sales, Marketing..." value={txForm.category} onChange={e=>setTxForm(f=>({...f,category:e.target.value}))} /></div>
                    <div><label className="label">Notes</label><input type="text" value={txForm.notes} onChange={e=>setTxForm(f=>({...f,notes:e.target.value}))} /></div>
                  </div>
                  <div style={{ display:'flex',gap:10 }}>
                    <button type="submit" disabled={saving} className="btn btn-green">{saving?'...':'Add'}</button>
                    <button type="button" className="btn btn-ghost" onClick={()=>setShowTxForm(false)}>Cancel</button>
                  </div>
                </form>
              )}
              <div className="card" style={{ overflow: 'hidden' }}>
                {transactions.length===0 && <div style={{padding:'32px 20px',textAlign:'center',color:'#3d4560',fontSize:13}}>No transactions yet.</div>}
                {transactions.map(tx=>(
                  <div key={tx.id} className="table-row">
                    <div>
                      <div style={{fontSize:13,color:'#e2e8f0',fontWeight:500}}>{tx.category||tx.notes||'—'}</div>
                      {tx.notes&&tx.category&&<div style={{fontSize:11,color:'#3d4560'}}>{tx.notes}</div>}
                      <div style={{fontSize:11,color:'#3d4560'}}>{tx.date}</div>
                    </div>
                    <span style={{fontSize:16,fontWeight:800,color:tx.type==='income'?'#22c55e':'#f87171'}}>
                      {tx.type==='income'?'+':'-'}${tx.amount?.toLocaleString()}
                    </span>
                  </div>
                ))}
              </div>
            </>
          )}

          {tab==='tasks' && (
            <>
              <div style={{ display: 'flex', justifyContent: 'flex-end' }}>
                <button className="btn btn-primary btn-sm" onClick={()=>setShowTaskForm(v=>!v)}><Plus size={12}/> Add Task</button>
              </div>
              {showTaskForm && (
                <form onSubmit={saveTask} className="card animate-fade-in" style={{ padding: 22 }}>
                  <div style={{ display: 'grid', gridTemplateColumns: '2fr 1fr 1fr', gap: 14, marginBottom: 14 }}>
                    <div><label className="label">Task</label><input type="text" placeholder="What needs to be done?" value={taskForm.title} onChange={e=>setTaskForm(f=>({...f,title:e.target.value}))} required /></div>
                    <div><label className="label">Priority</label><select value={taskForm.priority} onChange={e=>setTaskForm(f=>({...f,priority:e.target.value}))}><option value="high">High</option><option value="medium">Medium</option><option value="low">Low</option></select></div>
                    <div><label className="label">Due Date</label><input type="date" value={taskForm.due_date} onChange={e=>setTaskForm(f=>({...f,due_date:e.target.value}))} /></div>
                  </div>
                  <div style={{display:'flex',gap:10}}>
                    <button type="submit" disabled={saving} className="btn btn-primary">{saving?'...':'Add Task'}</button>
                    <button type="button" className="btn btn-ghost" onClick={()=>setShowTaskForm(false)}>Cancel</button>
                  </div>
                </form>
              )}
              <div className="card" style={{ overflow: 'hidden' }}>
                {tasks.length===0 && <div style={{padding:'32px 20px',textAlign:'center',color:'#3d4560',fontSize:13}}>No tasks yet.</div>}
                {tasks.map(task=>(
                  <div key={task.id} className="table-row" style={{ gap: 12 }}>
                    <button onClick={()=>toggleTask(task)} style={{background:'none',border:'none',cursor:'pointer',padding:0,flexShrink:0}}>
                      {task.status==='done' ? <CheckSquare size={16} color="#22c55e"/> : <Square size={16} color="#3d4560"/>}
                    </button>
                    <div style={{ flex: 1 }}>
                      <div style={{fontSize:13,fontWeight:500,color:task.status==='done'?'#3d4560':'#e2e8f0',textDecoration:task.status==='done'?'line-through':'none'}}>{task.title}</div>
                      {task.due_date && <div style={{fontSize:11,color:'#3d4560',marginTop:2}}>{task.due_date}</div>}
                    </div>
                    <span className="badge" style={{background:pColor(task.priority)+'18',color:pColor(task.priority)}}>{task.priority}</span>
                  </div>
                ))}
              </div>
            </>
          )}
        </>
      )}

      {businesses.length===0 && !showNewBiz && (
        <div className="card" style={{padding:'48px 20px',textAlign:'center'}}>
          <div style={{fontSize:36,marginBottom:12}}>💼</div>
          <div style={{fontSize:14,color:'#475569',marginBottom:4}}>No businesses yet</div>
          <div style={{fontSize:12,color:'#3d4560'}}>Click "New Business" to get started</div>
        </div>
      )}
    </div>
  )
}
function pColor(p) { return p==='high'?'#f87171':p==='medium'?'#fbbf24':'#34d399' }
