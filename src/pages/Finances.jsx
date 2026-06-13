import { useEffect, useState } from 'react'
import { supabase } from '../lib/supabase'
import { BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer, Cell } from 'recharts'
import { Wallet, Plus, TrendingUp, TrendingDown, PiggyBank } from 'lucide-react'

const empty = { date: '', type: 'income', amount: '', category: '', notes: '' }
const CATS = { income: ['Salary','Freelance','Investment','Business','Other'], expense: ['Rent','Food','Transport','Health','Entertainment','Subscriptions','Shopping','Savings','Other'] }

export default function Finances() {
  const [txs, setTxs] = useState([])
  const [form, setForm] = useState(empty)
  const [saving, setSaving] = useState(false)
  const [showForm, setShowForm] = useState(false)
  const [month, setMonth] = useState(new Date().toISOString().slice(0,7))

  async function load() {
    const { data } = await supabase.from('personal_finances').select('*').order('date',{ascending:false}).limit(200)
    setTxs(data||[])
  }
  useEffect(()=>{ load() },[])

  async function save(e) {
    e.preventDefault(); setSaving(true)
    await supabase.from('personal_finances').insert([{...form,amount:parseFloat(form.amount)}])
    setForm(empty); setShowForm(false); await load(); setSaving(false)
  }

  const monthTxs = txs.filter(t=>t.date?.startsWith(month))
  const income = monthTxs.filter(t=>t.type==='income').reduce((s,t)=>s+t.amount,0)
  const expense = monthTxs.filter(t=>t.type==='expense').reduce((s,t)=>s+t.amount,0)
  const savings = income - expense

  const expByCategory = Object.entries(
    monthTxs.filter(t=>t.type==='expense').reduce((acc,t)=>{ acc[t.category||'Other']=(acc[t.category||'Other']||0)+t.amount; return acc },{})
  ).map(([cat,amt])=>({cat,amt})).sort((a,b)=>b.amt-a.amt)

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 24 }}>
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
          <div style={{ width: 36, height: 36, borderRadius: 10, background: 'rgba(74,222,128,0.15)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
            <Wallet size={17} color="#4ade80" />
          </div>
          <h1 className="page-title">Finances</h1>
        </div>
        <div style={{ display: 'flex', gap: 10, alignItems: 'center' }}>
          <input type="month" value={month} onChange={e=>setMonth(e.target.value)} style={{ width: 'auto', padding: '8px 12px' }} />
          <button className="btn btn-primary" onClick={()=>setShowForm(v=>!v)}><Plus size={13}/> Add Transaction</button>
        </div>
      </div>

      {/* Summary */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: 12 }}>
        {[
          { label: 'Income', value: `$${income.toLocaleString()}`, color: '#22c55e', icon: TrendingUp },
          { label: 'Expenses', value: `$${expense.toLocaleString()}`, color: '#f87171', icon: TrendingDown },
          { label: 'Savings', value: `$${savings.toLocaleString()}`, color: savings>=0?'#60a5fa':'#f87171', icon: PiggyBank },
        ].map(s=>(
          <div key={s.label} className="card" style={{ padding: '20px 22px' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 6, marginBottom: 10 }}>
              <s.icon size={13} color={s.color} />
              <span className="section-title">{s.label}</span>
            </div>
            <div style={{ fontSize: 26, fontWeight: 800, color: s.color, letterSpacing: '-0.02em' }}>{s.value}</div>
            <div style={{ fontSize: 11, color: '#3d4560', marginTop: 4 }}>{month}</div>
          </div>
        ))}
      </div>

      {showForm && (
        <form onSubmit={save} className="card animate-fade-in" style={{ padding: 22 }}>
          <div style={{ fontSize: 14, fontWeight: 700, color: '#fff', marginBottom: 18 }}>Add Transaction</div>
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: 14, marginBottom: 14 }}>
            <div><label className="label">Date</label><input type="date" value={form.date} onChange={e=>setForm(f=>({...f,date:e.target.value}))} required /></div>
            <div><label className="label">Type</label><select value={form.type} onChange={e=>setForm(f=>({...f,type:e.target.value,category:''}))}>
              <option value="income">Income</option><option value="expense">Expense</option>
            </select></div>
            <div><label className="label">Amount ($)</label><input type="number" step="0.01" placeholder="0.00" value={form.amount} onChange={e=>setForm(f=>({...f,amount:e.target.value}))} required /></div>
            <div><label className="label">Category</label><select value={form.category} onChange={e=>setForm(f=>({...f,category:e.target.value}))}>
              <option value="">Select...</option>{CATS[form.type].map(c=><option key={c}>{c}</option>)}
            </select></div>
            <div className="col-span-2"><label className="label">Notes</label><input type="text" placeholder="Description..." value={form.notes} onChange={e=>setForm(f=>({...f,notes:e.target.value}))} /></div>
          </div>
          <div style={{ display: 'flex', gap: 10 }}>
            <button type="submit" disabled={saving} className="btn btn-green">{saving?'Saving...':'Add'}</button>
            <button type="button" className="btn btn-ghost" onClick={()=>setShowForm(false)}>Cancel</button>
          </div>
        </form>
      )}

      {expByCategory.length > 0 && (
        <div className="card" style={{ padding: 22 }}>
          <div style={{ fontSize: 14, fontWeight: 700, color: '#fff', marginBottom: 18 }}>Expense Breakdown</div>
          <ResponsiveContainer width="100%" height={200}>
            <BarChart data={expByCategory} layout="vertical" margin={{top:0,right:10,bottom:0,left:0}}>
              <XAxis type="number" tick={{fill:'#2d3748',fontSize:10}} axisLine={false} tickLine={false} tickFormatter={v=>`$${v}`}/>
              <YAxis type="category" dataKey="cat" tick={{fill:'#94a3b8',fontSize:12}} axisLine={false} tickLine={false} width={90}/>
              <Tooltip contentStyle={{background:'#0e0e1a',border:'1px solid rgba(255,255,255,0.08)',borderRadius:10,fontSize:12}} formatter={v=>[`$${v}`,'Amount']}/>
              <Bar dataKey="amt" radius={6} maxBarSize={20}>
                {expByCategory.map((_,i)=><Cell key={i} fill={`hsl(${220+i*18},70%,62%)`}/>)}
              </Bar>
            </BarChart>
          </ResponsiveContainer>
        </div>
      )}

      <div className="card" style={{ overflow: 'hidden' }}>
        <div style={{ padding:'16px 20px',borderBottom:'1px solid rgba(255,255,255,0.05)',display:'flex',alignItems:'center',justifyContent:'space-between' }}>
          <span style={{fontSize:13,fontWeight:700,color:'#fff'}}>Transactions</span>
          <span style={{fontSize:11,color:'#3d4560'}}>{monthTxs.length} this month</span>
        </div>
        {monthTxs.length===0 && <div style={{padding:'32px 20px',textAlign:'center',color:'#3d4560',fontSize:13}}>No transactions for {month}.</div>}
        {monthTxs.map(tx=>(
          <div key={tx.id} className="table-row">
            <div>
              <div style={{fontSize:13,fontWeight:500,color:'#e2e8f0'}}>{tx.category||tx.notes||'—'}</div>
              {tx.notes&&tx.category&&<div style={{fontSize:11,color:'#3d4560'}}>{tx.notes}</div>}
              <div style={{fontSize:11,color:'#3d4560'}}>{tx.date}</div>
            </div>
            <span style={{fontSize:16,fontWeight:800,color:tx.type==='income'?'#22c55e':'#f87171'}}>
              {tx.type==='income'?'+':'-'}${tx.amount?.toLocaleString()}
            </span>
          </div>
        ))}
      </div>
    </div>
  )
}
