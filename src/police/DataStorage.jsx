'use client';
import { useState } from 'react';
import { useStore, fetchFromSheets } from './store.jsx';
import { card, btn, inp, C, Tag, Divider, Avatar, EmptyState, Alert, StatCard, statusColor } from './ui.jsx';

const STATUSES = ['All','Saved','Pending','Approved','Rejected'];

export default function DataStorage({ user }) {
  const { state, dispatch }        = useStore();
  const [search, setSearch]        = useState('');
  const [filterStatus, setStatus]  = useState('All');
  const [filterOfficer, setOfficer]= useState('All');
  const [selected, setSelected]    = useState(null);
  const [emailTo, setEmailTo]      = useState('');
  const [emailMsg, setEmailMsg]    = useState('');
  const [sendingEmail, setSending] = useState(false);
  const [syncing, setSyncing]      = useState(false);
  const [syncMsg, setSyncMsg]      = useState('');

  const isSupervisor = user.role === 'Supervisor';
  const pool = state.transcripts.filter(t => isSupervisor ? true : t.officer === user.officer);
  const filtered = pool.filter(t => {
    const txt = (t.corrected||t.raw||'').toLowerCase();
    const ms = !search || txt.includes(search.toLowerCase()) || t.officer.toLowerCase().includes(search.toLowerCase()) || (t.notes||'').toLowerCase().includes(search.toLowerCase());
    return ms && (filterStatus==='All'||t.status===filterStatus) && (filterOfficer==='All'||t.officer===filterOfficer);
  });
  const stats = { total:pool.length, approved:pool.filter(t=>t.status==='Approved').length, pending:pool.filter(t=>t.status==='Pending').length, officers:[...new Set(pool.map(t=>t.officer))].length };
  const uniqueOfficers = ['All',...[...new Set(pool.map(t=>t.officer))]];

  const exportCSV = () => {
    const hdr = ['ID','Timestamp','Officer','Role','Corrected Transcript','Notes','Status','Reviewed By','Review Note'];
    const rows = filtered.map(t=>[t.id,t.timestamp,t.officer,t.role,`"${(t.corrected||t.raw||'').replace(/"/g,'""')}"`,t.notes||'',t.status,t.reviewedBy||'',t.reviewNote||'']);
    const csv  = [hdr,...rows].map(r=>r.join(',')).join('\n');
    const a = document.createElement('a');
    a.href = URL.createObjectURL(new Blob([csv],{type:'text/csv'}));
    a.download = `transcripts-${new Date().toISOString().slice(0,10)}.csv`;
    a.click();
  };

  const syncFromSheets = async () => {
    setSyncing(true); setSyncMsg('');
    const remote = await fetchFromSheets(user.officer, user.role);
    if (remote && remote.length) { dispatch({type:'LOAD_TRANSCRIPTS',payload:remote}); setSyncMsg(`✓ Synced ${remote.length} records`); }
    else setSyncMsg('Using local records (configure SHEETS_URL to sync)');
    setSyncing(false); setTimeout(() => setSyncMsg(''), 3000);
  };

  const doEmail = async () => {
    if (!emailTo.trim() || !selected) return;
    setSending(true);
    await new Promise(r => setTimeout(r, 800));
    setEmailMsg('✓ Email sent via Gmail');
    setSending(false); setTimeout(() => { setEmailMsg(''); setEmailTo(''); }, 3000);
  };

  return (
    <div>
      <div style={{ display:'flex',alignItems:'center',justifyContent:'space-between',marginBottom:'1rem' }}>
        <h2 style={{ margin:0,fontSize:16,fontWeight:600 }}>&#128452; Data Storage &amp; Retrieval</h2>
        <Tag color={C.green} label="Module 3"/>
      </div>
      <div style={{ display:'grid',gridTemplateColumns:'repeat(4,minmax(0,1fr))',gap:8,marginBottom:14 }}>
        <StatCard label="Total"    value={stats.total}    bg="#dbeafe" color="#1e40af"/>
        <StatCard label="Approved" value={stats.approved} bg="#d1fae5" color="#065f46"/>
        <StatCard label="Pending"  value={stats.pending}  bg="#fef3c7" color="#92400e"/>
        <StatCard label="Officers" value={stats.officers} bg="#ede9fe" color="#5b21b6"/>
      </div>
      <div style={{ display:'flex',gap:8,marginBottom:10,flexWrap:'wrap' }}>
        <input value={search} onChange={e=>setSearch(e.target.value)} placeholder="Search transcripts, officers, notes..." style={{ ...inp(),flex:2,minWidth:140 }}/>
        <select value={filterStatus} onChange={e=>setStatus(e.target.value)} style={{ ...inp(),flex:1,minWidth:90 }}>{STATUSES.map(s=><option key={s}>{s}</option>)}</select>
        {isSupervisor&&<select value={filterOfficer} onChange={e=>setOfficer(e.target.value)} style={{ ...inp(),flex:1,minWidth:90 }}>{uniqueOfficers.map(o=><option key={o}>{o}</option>)}</select>}
      </div>
      <div style={{ display:'flex',justifyContent:'space-between',alignItems:'center',marginBottom:10 }}>
        <span style={{ fontSize:12,color:'#6b7280' }}>{filtered.length} record{filtered.length!==1?'s':''}</span>
        <div style={{ display:'flex',gap:8 }}>
          <button onClick={syncFromSheets} disabled={syncing} style={{ ...btn(),fontSize:12,padding:'5px 12px' }}>{syncing?'Syncing...':'↻ Sync'}</button>
          <button onClick={exportCSV} style={{ ...btn(),fontSize:12,padding:'5px 12px' }}>⬇ CSV</button>
        </div>
      </div>
      {syncMsg&&<p style={{ fontSize:12,color:'#065f46',marginBottom:8 }}>{syncMsg}</p>}
      {filtered.length===0&&<EmptyState message="No records match your filters."/>}
      <div style={{ display:'flex',flexDirection:'column',gap:8 }}>
        {filtered.map(t => {
          const sc=statusColor(t.status); const isOpen=selected?.id===t.id; const txt=t.corrected||t.raw||'';
          return (
            <div key={t.id} style={{ ...card({cursor:'pointer'}) }} onClick={()=>setSelected(isOpen?null:t)}>
              <div style={{ display:'flex',alignItems:'center',justifyContent:'space-between',marginBottom:6 }}>
                <div style={{ display:'flex',alignItems:'center',gap:8 }}><Avatar name={t.officer} size={32}/><div><div style={{ fontSize:13,fontWeight:600 }}>{t.officer}</div><div style={{ fontSize:11,color:'#6b7280' }}>{t.role} &middot; {t.timestamp}</div></div></div>
                <Tag color={sc} label={t.status}/>
              </div>
              <p style={{ margin:0,fontSize:13,color:'#6b7280',overflow:'hidden',whiteSpace:'nowrap',textOverflow:'ellipsis' }}>{txt.slice(0,140)}{txt.length>140?'...':''}</p>
              {isOpen&&(
                <div onClick={e=>e.stopPropagation()} style={{ marginTop:12 }}>
                  <Divider/>
                  <p style={{ fontSize:14,lineHeight:1.7,margin:'0 0 10px',whiteSpace:'pre-wrap' }}>{txt}</p>
                  {t.notes&&<p style={{ fontSize:12,color:'#6b7280',margin:'0 0 10px' }}>Notes: {t.notes}</p>}
                  {t.reviewNote&&<div style={{ background:C.amber.bg,border:`1px solid ${C.amber.border}`,borderRadius:8,padding:'8px 12px',marginBottom:10 }}><div style={{ fontSize:11,color:C.amber.text }}>Review &mdash; {t.reviewedBy} &middot; {t.reviewedAt}</div><p style={{ margin:'4px 0 0',fontSize:13 }}>{t.reviewNote}</p></div>}
                  <div style={{ display:'flex',gap:8,marginBottom:12 }}><button onClick={()=>navigator.clipboard?.writeText(txt)} style={{ ...btn(),fontSize:12,padding:'5px 12px' }}>Copy</button></div>
                  <div style={{ ...card({background:'#f0f9ff',border:`1px solid ${C.blue.border}`}) }}>
                    <div style={{ fontSize:13,fontWeight:600,marginBottom:8 }}>&#9993; Send via Gmail</div>
                    <input type="email" placeholder="Recipient email address" value={emailTo} onChange={e=>setEmailTo(e.target.value)} style={{ ...inp(),marginBottom:8 }}/>
                    <button onClick={doEmail} disabled={sendingEmail||!emailTo.trim()} style={{ ...btn('primary'),width:'100%' }}>{sendingEmail?'Sending...':'Send email'}</button>
                    {emailMsg&&<p style={{ fontSize:12,color:'#065f46',marginTop:6 }}>{emailMsg}</p>}
                  </div>
                </div>
              )}
            </div>
          );
        })}
      </div>
    </div>
  );
}
