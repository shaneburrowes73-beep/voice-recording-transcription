'use client';
import { useState } from 'react';
import { useStore } from './store.jsx';
import { useAuth } from './auth.jsx';
import { getBranding } from './branding.js';

const C = {
  blue:   { bg:'#dbeafe', text:'#1e40af', border:'#93c5fd' },
  green:  { bg:'#d1fae5', text:'#065f46', border:'#6ee7b7' },
  amber:  { bg:'#fef3c7', text:'#92400e', border:'#fcd34d' },
  red:    { bg:'#fee2e2', text:'#991b1b', border:'#fca5a5' },
  gray:   { bg:'#f3f4f6', text:'#374151', border:'#d1d5db' },
  purple: { bg:'#ede9fe', text:'#5b21b6', border:'#c4b5fd' },
};
const card = (e={}) => ({ background:'#fff', border:'1px solid #e5e7eb', borderRadius:12, padding:'1rem 1.25rem', ...e });
const btn  = (v='default',e={}) => ({ padding:'8px 16px', borderRadius:8, fontSize:13, fontWeight:500, cursor:'pointer', border:'1px solid', borderColor:v==='primary'?'#2563eb':v==='green'?'#059669':v==='red'?'#dc2626':'#d1d5db', background:v==='primary'?'#2563eb':v==='green'?'#059669':v==='red'?'#dc2626':'#f9fafb', color:['primary','green','red'].includes(v)?'#fff':'#374151', ...e });
const inp  = (e={}) => ({ padding:'8px 10px', borderRadius:8, border:'1px solid #d1d5db', fontSize:13, width:'100%', boxSizing:'border-box', background:'#f9fafb', color:'#111', fontFamily:'inherit', ...e });
function Tag({ color, label }) { return <span style={{ background:color.bg, color:color.text, border:`1px solid ${color.border}`, fontSize:11, fontWeight:600, padding:'2px 9px', borderRadius:20, whiteSpace:'nowrap' }}>{label}</span>; }
function Ava({ name, size=32 }) { return <div style={{ width:size, height:size, borderRadius:'50%', background:'#dbeafe', display:'flex', alignItems:'center', justifyContent:'center', fontSize:size*0.36, fontWeight:700, color:'#1e40af', flexShrink:0 }}>{name.split(' ').map(w=>w[0]).join('').slice(0,2).toUpperCase()}</div>; }
function NavTabs({ tabs, active, onChange }) {
  return <div style={{ display:'flex', gap:4, marginBottom:'1.25rem', background:'#f3f4f6', padding:4, borderRadius:10 }}>{tabs.map(t=><button key={t.key} onClick={()=>onChange(t.key)} style={{ flex:1, padding:'7px 4px', borderRadius:7, border:'none', cursor:'pointer', fontSize:11, fontWeight:500, background:active===t.key?'#fff':'transparent', color:active===t.key?'#1e40af':'#6b7280', boxShadow:active===t.key?'0 1px 3px rgba(0,0,0,0.08)':'none', whiteSpace:'nowrap', fontFamily:'inherit' }}>{t.icon} {t.label}</button>)}</div>;
}

function Overview({ org, users, brand }) {
  const active = users.filter(u=>u.status==='active').length;
  const suspended = users.filter(u=>u.status==='suspended').length;
  const mods = org?.modules || {};
  return (
    <div>
      <div style={{ ...card({ marginBottom:14 }), background:brand.primary, border:'none' }}>
        <div style={{ fontSize:17, fontWeight:600, color:'#fff', marginBottom:4 }}>{org?.name}</div>
        <div style={{ fontSize:12, color:'rgba(255,255,255,0.8)' }}>User ID: {org?.userIdLabel} &middot; Transcript: {org?.transcriptLabel}</div>
      </div>
      <div style={{ display:'grid', gridTemplateColumns:'repeat(2,1fr)', gap:8, marginBottom:14 }}>
        {[['Total',users.length,'#dbeafe','#1e40af'],['Active',active,'#d1fae5','#065f46'],['Suspended',suspended,'#fee2e2','#991b1b'],['Modules',Object.values(mods).filter(Boolean).length,'#ede9fe','#5b21b6']].map(([l,v,bg,c])=>(
          <div key={l} style={{ background:bg, borderRadius:8, padding:'10px 12px', textAlign:'center' }}><div style={{ fontSize:22, fontWeight:700, color:c }}>{v}</div><div style={{ fontSize:11, color:c, opacity:0.8 }}>{l}</div></div>
        ))}
      </div>
      <div style={card()}>
        <div style={{ fontSize:12, color:'#9ca3af', marginBottom:8, fontWeight:500 }}>ACTIVE MODULES</div>
        {[['voiceCapture','🎙','Voice Capture'],['approvalFlow','✅','Approval Flow'],['dataStorage','🗄','Data Storage'],['orgManagement','🏢','Org Management']].map(([k,icon,label])=>(
          <div key={k} style={{ display:'flex', alignItems:'center', justifyContent:'space-between', padding:'8px 0', borderBottom:'1px solid #f3f4f6' }}>
            <span style={{ fontSize:13 }}>{icon} {label}</span>
            <Tag color={mods[k]?C.green:C.gray} label={mods[k]?'Active':'Off'}/>
          </div>
        ))}
      </div>
    </div>
  );
}

function Users({ users:init, roles, userIdLabel }) {
  const [users, setUsers]     = useState(init);
  const [search, setSearch]   = useState('');
  const [selected, setSelected]= useState(null);
  const [newRole, setNewRole] = useState('');
  const [msg, setMsg]         = useState('');
  const filtered = users.filter(u => !search || u.full_name?.toLowerCase().includes(search.toLowerCase()) || u.badge_no?.toLowerCase().includes(search.toLowerCase()) || u.email?.toLowerCase().includes(search.toLowerCase()));
  const changeRole = id => { if(!newRole)return; setUsers(us=>us.map(u=>u.id===id?{...u,role:newRole}:u)); setMsg('✓ Role updated'); setTimeout(()=>setMsg(''),2000); };
  const toggle = id => { setUsers(us=>us.map(u=>u.id===id?{...u,status:u.status==='active'?'suspended':'active'}:u)); setSelected(s=>s?.id===id?{...s,status:s.status==='active'?'suspended':'active'}:s); setMsg('✓ Status updated'); setTimeout(()=>setMsg(''),2000); };
  return (
    <div>
      <input value={search} onChange={e=>setSearch(e.target.value)} placeholder="Search name, badge, email..." style={{ ...inp(), marginBottom:10 }}/>
      <div style={{ fontSize:12, color:'#6b7280', marginBottom:8 }}>{filtered.length} users</div>
      {msg&&<p style={{ fontSize:13, color:'#065f46', marginBottom:8 }}>{msg}</p>}
      <div style={{ display:'flex', flexDirection:'column', gap:6 }}>
        {filtered.map(u => {
          const isOpen = selected?.id===u.id;
          return (
            <div key={u.id} style={{ ...card({ cursor:'pointer', borderLeft:`3px solid ${u.status==='active'?C.green.border:C.red.border}` }), padding:'10px 14px' }} onClick={()=>{ setSelected(isOpen?null:u); setNewRole(u.role); }}>
              <div style={{ display:'flex', alignItems:'center', justifyContent:'space-between' }}>
                <div style={{ display:'flex', alignItems:'center', gap:8 }}><Ava name={u.full_name||'?'}/><div><div style={{ fontSize:13,fontWeight:600 }}>{u.full_name}</div><div style={{ fontSize:11,color:'#6b7280' }}>{u.role} &middot; {userIdLabel}: {u.badge_no}</div></div></div>
                <Tag color={u.status==='active'?C.green:C.red} label={u.status}/>
              </div>
              {isOpen&&(
                <div onClick={e=>e.stopPropagation()} style={{ marginTop:10, paddingTop:10, borderTop:'1px solid #f3f4f6' }}>
                  <div style={{ fontSize:12, color:'#6b7280', marginBottom:8 }}>Email: {u.email} &middot; Registered: {u.created_at}</div>
                  <div style={{ display:'flex', gap:8, marginBottom:8 }}>
                    <select value={newRole} onChange={e=>setNewRole(e.target.value)} style={{ ...inp(), flex:1 }}>{(roles||[]).map(r=><option key={r.name||r}>{r.name||r}</option>)}</select>
                    <button onClick={()=>changeRole(u.id)} style={{ ...btn('primary'), whiteSpace:'nowrap' }}>Update</button>
                  </div>
                  <button onClick={()=>toggle(u.id)} style={btn(u.status==='active'?'red':'green')}>{u.status==='active'?'Suspend':'Reactivate'}</button>
                </div>
              )}
            </div>
          );
        })}
      </div>
    </div>
  );
}

function Roles({ initRoles=[] }) {
  const [roles, setRoles] = useState(initRoles);
  const [adding, setAdding] = useState(false);
  const [nr, setNr] = useState({ name:'', level:'', is_supervisor:false, is_admin:false });
  const add = () => { if(!nr.name.trim())return; setRoles(rs=>[...rs,{...nr,level:parseInt(nr.level)||rs.length+1}].sort((a,b)=>a.level-b.level)); setNr({ name:'',level:'',is_supervisor:false,is_admin:false }); setAdding(false); };
  return (
    <div>
      <div style={{ display:'flex', justifyContent:'space-between', alignItems:'center', marginBottom:12 }}>
        <p style={{ margin:0, fontSize:13, color:'#6b7280' }}>Valid roles for this organisation.</p>
        <button onClick={()=>setAdding(a=>!a)} style={btn('primary')}>+ Add role</button>
      </div>
      {adding&&(
        <div style={{ ...card({ marginBottom:12, background:C.blue.bg, border:`1px solid ${C.blue.border}` }) }}>
          <div style={{ display:'grid', gridTemplateColumns:'2fr 1fr', gap:8, marginBottom:8 }}>
            <input value={nr.name} onChange={e=>setNr(r=>({...r,name:e.target.value}))} placeholder="Role name" style={inp()}/>
            <input type="number" value={nr.level} onChange={e=>setNr(r=>({...r,level:e.target.value}))} placeholder="Level" style={inp()}/>
          </div>
          <div style={{ display:'flex', gap:16, marginBottom:10, fontSize:13 }}>
            <label style={{ display:'flex', alignItems:'center', gap:6, cursor:'pointer' }}><input type="checkbox" checked={nr.is_supervisor} onChange={e=>setNr(r=>({...r,is_supervisor:e.target.checked}))}/>Supervisor</label>
            <label style={{ display:'flex', alignItems:'center', gap:6, cursor:'pointer' }}><input type="checkbox" checked={nr.is_admin} onChange={e=>setNr(r=>({...r,is_admin:e.target.checked}))}/>Admin</label>
          </div>
          <div style={{ display:'flex', gap:8 }}><button onClick={()=>setAdding(false)} style={btn()}>Cancel</button><button onClick={add} style={btn('primary')}>Add</button></div>
        </div>
      )}
      <div style={{ display:'flex', flexDirection:'column', gap:6 }}>
        {roles.map(r=>(
          <div key={r.name} style={{ ...card({ display:'flex', alignItems:'center', justifyContent:'space-between', padding:'10px 14px' }) }}>
            <div style={{ display:'flex', alignItems:'center', gap:8 }}>
              <div style={{ width:26, height:26, borderRadius:'50%', background:'#f3f4f6', display:'flex', alignItems:'center', justifyContent:'center', fontSize:11, fontWeight:700, color:'#6b7280' }}>L{r.level}</div>
              <div><div style={{ fontSize:13, fontWeight:600 }}>{r.name}</div><div style={{ fontSize:11, color:'#9ca3af' }}>{r.is_admin?'Admin':r.is_supervisor?'Supervisor':'Officer'}</div></div>
            </div>
            <div style={{ display:'flex', gap:4 }}>
              {r.is_admin&&<Tag color={C.purple} label="Admin"/>}
              {r.is_supervisor&&!r.is_admin&&<Tag color={C.blue} label="Supervisor"/>}
              {!r.is_supervisor&&!r.is_admin&&<Tag color={C.gray} label="Officer"/>}
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}

function Settings({ org:initOrg, brand }) {
  const [org, setOrg] = useState(initOrg||{});
  const [saved, setSaved] = useState(false);
  const set = k => e => setOrg(o=>({...o,[k]:e.target.value}));
  const toggleMod = k => setOrg(o=>({...o,modules:{...o.modules,[k]:!o.modules?.[k]}}));
  const mods = [['voiceCapture','🎙','Voice Capture','Core — cannot be disabled'],['approvalFlow','✅','Approval Flow','Supervisor review queue'],['dataStorage','🗄','Data Storage','Central transcript library'],['orgManagement','🏢','Org Management','This admin panel']];
  return (
    <div>
      <div style={card({ marginBottom:12 })}>
        <label style={{ fontSize:12, color:'#6b7280', display:'block', marginBottom:4 }}>Organisation name</label>
        <input value={org.name||''} onChange={set('name')} style={{ ...inp(), marginBottom:10 }}/>
        <label style={{ fontSize:12, color:'#6b7280', display:'block', marginBottom:4 }}>User ID label</label>
        <input value={org.userIdLabel||''} onChange={set('userIdLabel')} placeholder="e.g. Badge Number, Employee ID" style={{ ...inp(), marginBottom:10 }}/>
        <label style={{ fontSize:12, color:'#6b7280', display:'block', marginBottom:4 }}>Transcript label</label>
        <input value={org.transcriptLabel||''} onChange={set('transcriptLabel')} placeholder="e.g. Incident Report, Call Note" style={inp()}/>
      </div>
      <div style={card()}>
        <div style={{ fontSize:12, color:'#9ca3af', marginBottom:8, fontWeight:500 }}>MODULES</div>
        {mods.map(([k,icon,label,note])=>(
          <div key={k} style={{ display:'flex', alignItems:'center', justifyContent:'space-between', padding:'8px 0', borderBottom:'1px solid #f3f4f6' }}>
            <div><div style={{ fontSize:13, fontWeight:500 }}>{icon} {label}</div><div style={{ fontSize:11, color:'#9ca3af' }}>{note}</div></div>
            <button onClick={()=>k!=='voiceCapture'&&toggleMod(k)} disabled={k==='voiceCapture'} style={{ width:42, height:22, borderRadius:11, border:'none', cursor:k==='voiceCapture'?'not-allowed':'pointer', background:org.modules?.[k]?'#2563eb':'#d1d5db', position:'relative', transition:'background 0.2s' }}>
              <div style={{ width:16, height:16, borderRadius:'50%', background:'#fff', position:'absolute', top:3, left:org.modules?.[k]?23:3, transition:'left 0.2s' }}/>
            </button>
          </div>
        ))}
      </div>
      <button onClick={()=>{ setSaved(true); setTimeout(()=>setSaved(false),2000); }} style={{ ...btn('primary'), width:'100%', marginTop:12 }}>{saved?'✓ Saved':'Save settings'}</button>
    </div>
  );
}

const MOCK_ROLES = [{name:'Field Officer',level:1,is_supervisor:false,is_admin:false},{name:'Office Officer',level:2,is_supervisor:false,is_admin:false},{name:'Detective',level:3,is_supervisor:false,is_admin:false},{name:'Sergeant',level:4,is_supervisor:false,is_admin:false},{name:'Inspector',level:5,is_supervisor:true,is_admin:false},{name:'Supervisor',level:6,is_supervisor:true,is_admin:false},{name:'Administrator',level:7,is_supervisor:true,is_admin:true}];

export default function OrgManagement() {
  const { org, user } = useAuth();
  const { state }     = useStore();
  const brand         = getBranding(org);
  const [tab, setTab] = useState('overview');

  const users = state.transcripts.map(t=>({ id:t.id, full_name:t.officer, badge_no:'—', email:'—', role:t.role, status:'active', created_at:t.timestamp?.slice(0,10)||'—', last_login:t.timestamp?.slice(0,10)||'—' }));
  const tabs  = [{key:'overview',icon:'📊',label:'Overview'},{key:'users',icon:'👥',label:'Users'},{key:'roles',icon:'🎖',label:'Roles'},{key:'report',icon:'📋',label:'Report'},{key:'settings',icon:'⚙️',label:'Settings'}];

  return (
    <div>
      <div style={{ display:'flex', alignItems:'center', justifyContent:'space-between', marginBottom:'1rem' }}>
        <h2 style={{ margin:0, fontSize:16, fontWeight:600 }}>🏢 Organisation</h2>
        <span style={{ background:C.purple.bg, color:C.purple.text, border:`1px solid ${C.purple.border}`, fontSize:11, fontWeight:600, padding:'2px 9px', borderRadius:20 }}>Module 4 &middot; Admin only</span>
      </div>
      <NavTabs tabs={tabs} active={tab} onChange={setTab}/>
      {tab==='overview' && <Overview org={org} users={users} brand={brand}/>}
      {tab==='users'    && <Users users={users} roles={MOCK_ROLES} userIdLabel={org?.userIdLabel||'ID'}/>}
      {tab==='roles'    && <Roles initRoles={MOCK_ROLES}/>}
      {tab==='settings' && <Settings org={org} brand={brand}/>}
    </div>
  );
}
