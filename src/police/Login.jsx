'use client';
import { useState, useEffect } from 'react';
import { createClient } from '@supabase/supabase-js';
import { useAuth } from './auth.jsx';
import { getBranding } from './branding.js';

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL,
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY
);

const strength = pw => { let s=0; if(pw.length>=8)s++; if(/[A-Z]/.test(pw))s++; if(/[a-z]/.test(pw))s++; if(/\d/.test(pw))s++; if(/[^a-zA-Z\d]/.test(pw))s++; return s; };
const strengthLabel = ['','Weak','Weak','Fair','Strong','Very strong'];
const strengthColor = ['','#dc2626','#dc2626','#f59e0b','#059669','#065f46'];

export default function LoginPage() {
  const { login, register, org } = useAuth();
  const brand = getBranding(org);
  const P=brand.primary; const A=brand.accent;
  const [mode,    setMode]    = useState('login');
  const [form,    setForm]    = useState({ email:'', password:'', fullName:'', badgeNo:'', role:'' });
  const [roles,   setRoles]   = useState([]);
  const [error,   setError]   = useState('');
  const [success, setSuccess] = useState('');
  const [loading, setLoading] = useState(false);
  const [showPw,  setShowPw]  = useState(false);

  // Fetch roles directly from Supabase (public read via RLS)
  useEffect(() => {
    supabase
      .from('roles')
      .select('name, level')
      .order('level', { ascending: true })
      .then(({ data }) => { if (data) setRoles(data.map(r => r.name)); });
  }, []);

  const set = k => e => setForm(f => ({...f,[k]:e.target.value}));
  const pw=form.password; const pws=strength(pw);
  const inpS = { padding:'12px 14px', borderRadius:10, border:'1px solid #e5e7eb', fontSize:14, width:'100%', boxSizing:'border-box', background:'#f9fafb', color:'#111', fontFamily:'inherit', outline:'none' };

  const handleSubmit = async () => {
    setError(''); setSuccess(''); setLoading(true);
    try {
      if (mode === 'login') {
        await login(form.email, form.password);
      } else {
        await register({
          fullName: form.fullName,
          badgeNo:  form.badgeNo,
          email:    form.email,
          password: form.password,
          role:     form.role,
        });
        setSuccess('Account created! Check your email to confirm, then sign in.');
        setMode('login');
        setForm(f => ({...f, password:'', fullName:'', badgeNo:'', role:''}));
      }
    } catch(e) { setError(e.message); }
    setLoading(false);
  };

  return (
    <div style={{maxWidth:420,margin:'0 auto',padding:'0 1rem',fontFamily:'system-ui,sans-serif',minHeight:'100vh',display:'flex',flexDirection:'column',justifyContent:'center'}}>
      <div style={{textAlign:'center',marginBottom:'1.5rem'}}>
        <div style={{width:64,height:42,margin:'0 auto 14px',borderRadius:6,overflow:'hidden',display:'flex'}}>
          <div style={{flex:1,background:P}}/><div style={{flex:1,background:A,display:'flex',alignItems:'center',justifyContent:'center',fontSize:22,color:'#000'}}>{brand.trident||'🎙'}</div><div style={{flex:1,background:P}}/>
        </div>
        <h1 style={{fontSize:22,fontWeight:500,margin:0,color:'#111'}}>{brand.orgName}</h1>
        <p style={{color:'#6b7280',fontSize:14,marginTop:4}}>Voice Transcript</p>
        <div style={{height:5,display:'flex',borderRadius:4,overflow:'hidden',margin:'12px auto',width:120}}>
          {brand.flagStripe.map((c,i)=><div key={i} style={{flex:1,background:c}}/>)}
        </div>
      </div>

      <div style={{background:'#fff',border:'1px solid #e5e7eb',borderRadius:16,padding:'1.25rem'}}>
        <div style={{display:'flex',gap:4,background:'#f3f4f6',padding:4,borderRadius:10,marginBottom:20}}>
          {['login','register'].map(m=>(
            <button key={m} onClick={()=>{setMode(m);setError('');setSuccess('');}} style={{flex:1,padding:'8px',borderRadius:7,border:'none',cursor:'pointer',fontSize:13,fontWeight:500,background:mode===m?'#fff':'transparent',color:mode===m?P:'#6b7280',boxShadow:mode===m?'0 1px 3px rgba(0,0,0,0.08)':'none',fontFamily:'inherit'}}>
              {m==='login'?'Sign in':'Register'}
            </button>
          ))}
        </div>

        {mode==='register'&&(<>
          <input value={form.fullName} onChange={set('fullName')} placeholder="Full name" style={{...inpS,marginBottom:10}}/>
          <input value={form.badgeNo}  onChange={set('badgeNo')}  placeholder="Badge / Employee ID" style={{...inpS,marginBottom:10}}/>
          <input value={form.role}     onChange={set('role')}     placeholder="Role (e.g. Field Officer)" list="roles-list" style={{...inpS,marginBottom:form.role?4:10}}/>
          <datalist id="roles-list">{roles.map(r=><option key={r} value={r}/>)}</datalist>
          {form.role&&<p style={{fontSize:11,marginBottom:10,color:roles.includes(form.role)?'#059669':'#f59e0b'}}>{roles.includes(form.role)?'✓ Valid role':'⚠ Role not in organisation list — please verify'}</p>}
        </>)}

        <input type="email" value={form.email} onChange={set('email')} placeholder="Email address" style={{...inpS,marginBottom:10}}/>
        <div style={{position:'relative',marginBottom:4}}>
          <input type={showPw?'text':'password'} value={form.password} onChange={set('password')} placeholder={mode==='register'?'Min 8 chars, A-Z, 0-9, symbol':'Password'} style={{...inpS,paddingRight:44}}/>
          <button onClick={()=>setShowPw(s=>!s)} style={{position:'absolute',right:12,top:'50%',transform:'translateY(-50%)',background:'none',border:'none',cursor:'pointer',fontSize:16,color:'#9ca3af',padding:0}}>{showPw?'🙈':'👁'}</button>
        </div>

        {mode==='register'&&pw.length>0&&(
          <div style={{marginBottom:12}}>
            <div style={{display:'flex',gap:3,marginBottom:3}}>{[1,2,3,4,5].map(i=><div key={i} style={{flex:1,height:3,borderRadius:2,background:i<=pws?strengthColor[pws]:'#e5e7eb'}}/>)}</div>
            <p style={{fontSize:11,color:strengthColor[pws],margin:0}}>{strengthLabel[pws]}</p>
          </div>
        )}

        {mode==='register'&&(<div style={{background:'#fef3c7',border:'1px solid #fcd34d',borderRadius:8,padding:'8px 12px',marginBottom:14}}><p style={{fontSize:12,color:'#92400e',margin:0}}>⚠ Never share your password. This account is linked to your badge number and all activity is logged.</p></div>)}
        {error  &&<div style={{background:'#fee2e2',border:'1px solid #fca5a5',borderRadius:8,padding:'8px 12px',marginBottom:12}}><p style={{fontSize:13,color:'#991b1b',margin:0}}>{error}</p></div>}
        {success&&<div style={{background:'#d1fae5',border:'1px solid #6ee7b7',borderRadius:8,padding:'8px 12px',marginBottom:12}}><p style={{fontSize:13,color:'#065f46',margin:0}}>✓ {success}</p></div>}

        <button onClick={handleSubmit} disabled={loading} style={{padding:'12px',borderRadius:10,border:'none',background:P,color:'#fff',fontSize:14,fontWeight:500,cursor:'pointer',width:'100%',fontFamily:'inherit'}}>
          {loading?'Please wait…':mode==='login'?'Sign in →':'Create account →'}
        </button>
      </div>
    </div>
  );
}
