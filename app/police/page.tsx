'use client';
/**
 * /police — Police Voice Transcript app.
 *
 * This is the entry point for the Barbados Police Service (and future clients).
 * Client branding is driven by the org record returned from /api/police/verify.
 * To deploy for a new client: fork config, update ALLOWED_ORIGIN + DATABASE_URL,
 * redeploy — no code changes needed.
 */
import { AuthProvider, useAuth } from '@/src/police/auth.jsx';
import { StoreProvider, useStore } from '@/src/police/store.jsx';
import { getBranding } from '@/src/police/branding.js';
import LoginPage from '@/src/police/Login.jsx';
import VoiceCapture from '@/src/police/VoiceCapture.jsx';
import ApprovalFlow from '@/src/police/ApprovalFlow.jsx';
import DataStorage from '@/src/police/DataStorage.jsx';
import OrgManagement from '@/src/police/OrgManagement.jsx';
import { useState } from 'react';

const ADMIN_ROLES = ['Administrator', 'Supervisor', 'Inspector'];
const isAdmin = (role: string) => ADMIN_ROLES.includes(role);

function AppInner() {
  const { user, org, loading, logout } = useAuth()!;
  const [activeTab, setTab] = useState('voice');
  const brand = getBranding(org);
  const P=brand.primary; const A=brand.accent;

  if (loading) return (
    <div style={{display:'flex',alignItems:'center',justifyContent:'center',height:'100vh',fontFamily:'system-ui'}}>
      <div style={{textAlign:'center'}}>
        <div style={{width:48,height:32,margin:'0 auto 12px',borderRadius:4,overflow:'hidden',display:'flex'}}>
          <div style={{flex:1,background:P}}/><div style={{flex:1,background:A,display:'flex',alignItems:'center',justifyContent:'center',fontSize:18,color:'#000'}}>{brand.trident||'🎙'}</div><div style={{flex:1,background:P}}/>
        </div>
        <p style={{color:'#6b7280',fontSize:14}}>Loading…</p>
      </div>
    </div>
  );

  if (!user) return <LoginPage/>;

  const mods = (org as any)?.modules || { voiceCapture:true, approvalFlow:true, dataStorage:true };
  const admin = isAdmin((user as any).role);
  const u = { officer:(user as any).fullName, role:(user as any).role, badgeNo:(user as any).badgeNo };

  const tabs = [
    mods.voiceCapture  && { key:'voice',    icon:'🎙', label:'Record' },
    mods.approvalFlow  && { key:'approval', icon:'✅', label:'Approval' },
    mods.dataStorage   && { key:'data',     icon:'🗄', label:'Records' },
    admin && mods.orgManagement && { key:'org', icon:'🏢', label:'Admin' },
  ].filter(Boolean) as { key: string; icon: string; label: string }[];

  return (
    <div style={{fontFamily:'system-ui,sans-serif',color:'#111',maxWidth:600,margin:'0 auto'}}>
      <div style={{background:P,padding:'10px 16px',display:'flex',alignItems:'center',justifyContent:'space-between'}}>
        <div style={{display:'flex',alignItems:'center',gap:8}}>
          <div style={{width:28,height:18,borderRadius:2,overflow:'hidden',display:'flex'}}>
            <div style={{flex:1,background:P,border:'1px solid rgba(255,255,255,0.3)'}}/><div style={{flex:1,background:A,display:'flex',alignItems:'center',justifyContent:'center',fontSize:10,color:'#000'}}>{brand.trident}</div><div style={{flex:1,background:P,border:'1px solid rgba(255,255,255,0.3)'}}/>
          </div>
          <span style={{color:'#fff',fontSize:13,fontWeight:500}}>{(org as any)?.name||'Voice Transcript'}</span>
        </div>
        <div style={{display:'flex',alignItems:'center',gap:10}}>
          <span style={{color:'rgba(255,255,255,0.8)',fontSize:12}}>{(user as any).fullName} · {(user as any).role}</span>
          <button onClick={logout} style={{padding:'4px 10px',borderRadius:6,fontSize:12,border:'1px solid rgba(255,255,255,0.3)',background:'rgba(255,255,255,0.1)',color:'#fff',cursor:'pointer',fontFamily:'inherit'}}>Sign out</button>
        </div>
      </div>
      <div style={{height:4,display:'flex'}}>{brand.flagStripe.map((c: string,i: number)=><div key={i} style={{flex:1,background:c}}/>)}</div>
      <div style={{padding:'1rem',borderBottom:'1px solid #e5e7eb',background:'#fff'}}>
        <div style={{display:'flex',gap:4,background:'#f3f4f6',padding:4,borderRadius:10}}>
          {tabs.map(t=><button key={t.key} onClick={()=>setTab(t.key)} style={{flex:1,padding:'7px 6px',borderRadius:7,border:'none',cursor:'pointer',fontSize:12,fontWeight:500,background:activeTab===t.key?'#fff':'transparent',color:activeTab===t.key?P:'#6b7280',boxShadow:activeTab===t.key?'0 1px 3px rgba(0,0,0,0.08)':'none',fontFamily:'inherit',whiteSpace:'nowrap'}}>{t.icon} {t.label}</button>)}
        </div>
      </div>
      <div style={{padding:'1rem'}}>
        {activeTab==='voice'    && mods.voiceCapture  && <VoiceCapture user={u} onSaved={()=>mods.approvalFlow&&!admin?setTab('approval'):mods.dataStorage?setTab('data'):null}/>}
        {activeTab==='approval' && mods.approvalFlow  && <ApprovalFlow user={u}/>}
        {activeTab==='data'     && mods.dataStorage   && <DataStorage  user={u}/>}
        {activeTab==='org'      && admin              && <OrgManagement/>}
      </div>
    </div>
  );
}

export default function PolicePage() {
  return (
    <AuthProvider>
      <StoreProvider>
        <AppInner/>
      </StoreProvider>
    </AuthProvider>
  );
}
