import{useState,useRef,useEffect}from'react';
import{MODULE_CONFIG,OPENAI_KEY}from'./config.js';
import{useStore,saveToSheets}from'./store.jsx';
import{getBranding}from'./branding.js';
import{useAuth}from'./auth.jsx';

const genId=()=>`${Date.now()}-${Math.random().toString(36).slice(2,6)}`;
const nowStr=()=>new Date().toLocaleString('en-GB');
const fmtTime=s=>`${String(Math.floor(s/60)).padStart(2,'0')}:${String(s%60).padStart(2,'0')}`;

async function runGrammarCheck(text){
  if(!OPENAI_KEY||OPENAI_KEY.length<10){
    await new Promise(r=>setTimeout(r,700));
    return text.charAt(0).toUpperCase()+text.slice(1).replace(/\bi\b/g,'I').replace(/\s{2,}/g,' ').trimEnd()+(text.trim().slice(-1)==='.'?'':'.');
  }
  try{
    const r=await fetch('https://api.openai.com/v1/chat/completions',{
      method:'POST',
      headers:{'Content-Type':'application/json','Authorization':`Bearer ${OPENAI_KEY}`},
      body:JSON.stringify({model:'gpt-4o-mini',max_tokens:1000,messages:[
        {role:'system',content:'Grammar and spelling correction for a UK/Caribbean police force. Return ONLY the corrected text. Formal British English. No preamble.'},
        {role:'user',content:text}
      ]})
    });
    const d=await r.json();
    return d.choices?.[0]?.message?.content?.trim()||text;
  }catch{return text;}
}

const isMobile=()=>window.innerWidth<768;

export default function VoiceCapture({user,onSaved}){
  const{org}=useAuth();
  const{dispatch}=useStore();
  const brand=getBranding(org);
  const mobile=isMobile();

  const[phase,setPhase]=useState('idle');
  const[rawText,setRaw]=useState('');
  const[interim,setInterim]=useState('');
  const[corrected,setCorrected]=useState('');
  const[notes,setNotes]=useState('');
  const[timer,setTimer]=useState(0);
  const[checking,setChecking]=useState(false);
  const[saving,setSaving]=useState(false);
  const[saveMsg,setSaveMsg]=useState('');
  const[speechOk,setSpeechOk]=useState(true);
  const recRef=useRef(null);const timerRef=useRef(null);const accRef=useRef('');

  useEffect(()=>{if(!('webkitSpeechRecognition'in window||'SpeechRecognition'in window))setSpeechOk(false);},[]);

  const P=brand.primary;const A=brand.accent;const AT=brand.accentText;

  const startRec=()=>{
    const SR=window.SpeechRecognition||window.webkitSpeechRecognition;
    if(!SR){setSpeechOk(false);return;}
    accRef.current='';setRaw('');setInterim('');setCorrected('');setNotes('');
    const r=new SR();r.continuous=true;r.interimResults=true;r.lang='en-GB';
    r.onresult=e=>{let fin='',int='';for(let i=e.resultIndex;i<e.results.length;i++){if(e.results[i].isFinal)fin+=e.results[i][0].transcript+' ';else int+=e.results[i][0].transcript;}if(fin){accRef.current+=fin;setRaw(accRef.current);}setInterim(int);};
    r.onerror=()=>{};r.start();recRef.current=r;
    setTimer(0);setPhase('recording');
    timerRef.current=setInterval(()=>setTimer(t=>t+1),1000);
  };
  const stopRec=()=>{recRef.current?.stop();clearInterval(timerRef.current);setPhase('stopped');setInterim('');};
  const doCheck=async()=>{if(!rawText.trim())return;setChecking(true);setCorrected(await runGrammarCheck(rawText));setChecking(false);setPhase('reviewing');};
  const save=async()=>{
    setSaving(true);setSaveMsg('');
    const needsApproval=MODULE_CONFIG.approvalFlow&&user.role!=='Supervisor'&&user.role!=='Inspector'&&user.role!=='Administrator';
    const entry={id:genId(),timestamp:nowStr(),officer:user.officer,role:user.role,raw:rawText,corrected:corrected||rawText,notes,status:needsApproval?'Pending':'Saved',reviewNote:'',reviewedBy:'',reviewedAt:''};
    dispatch({type:'ADD_TRANSCRIPT',payload:entry});
    await saveToSheets(entry);
    setSaveMsg(needsApproval?'✓ Submitted for approval':'✓ Saved');
    setSaving(false);
    if(onSaved)setTimeout(()=>onSaved(entry),1200);
  };
  const reset=()=>{setPhase('idle');setRaw('');setCorrected('');setNotes('');setSaveMsg('');setTimer(0);};

  // ── Mobile layout ──────────────────────────────────────────
  if(mobile){
    const card=(e={})=>({background:'#fff',borderRadius:14,border:'1px solid #e5e7eb',padding:'14px',...e});
    const btnP={width:'100%',padding:'14px',borderRadius:14,border:'none',background:P,color:'#fff',fontSize:15,fontWeight:500,cursor:'pointer',marginBottom:10,fontFamily:'inherit'};
    const btnS={flex:1,padding:'12px',borderRadius:14,border:'1px solid #e5e7eb',background:'#fff',color:'#374151',fontSize:13,fontWeight:500,cursor:'pointer',fontFamily:'inherit'};
    const btnA={...btnS,border:`1px solid ${A}`,background:A,color:AT};

    return(
      <div style={{display:'flex',flexDirection:'column',minHeight:'100vh',background:'#f7f8fa',fontFamily:'system-ui,sans-serif'}}>
        {/* Header */}
        <div style={{background:P,padding:'0 16px 16px'}}>
          <div style={{height:44,display:'flex',alignItems:'center',justifyContent:'space-between'}}>
            <div style={{display:'flex',alignItems:'center',gap:8}}>
              <div style={{width:32,height:22,borderRadius:3,overflow:'hidden',display:'flex',flexShrink:0}}>
                <div style={{flex:1,background:P,border:'1px solid rgba(255,255,255,0.3)'}}/>
                <div style={{flex:1,background:A,display:'flex',alignItems:'center',justifyContent:'center',fontSize:12,color:'#000'}}>{brand.trident}</div>
                <div style={{flex:1,background:P,border:'1px solid rgba(255,255,255,0.3)'}}/>
              </div>
              <div>
                <div style={{color:'#fff',fontSize:13,fontWeight:500,lineHeight:1.2}}>{org?.name||'Voice Transcript'}</div>
                <div style={{color:'rgba(255,255,255,0.7)',fontSize:11}}>Voice Transcript</div>
              </div>
            </div>
            <div style={{width:34,height:34,borderRadius:'50%',background:A,display:'flex',alignItems:'center',justifyContent:'center',fontSize:12,fontWeight:700,color:AT}}>{user.officer.split(' ').map(w=>w[0]).join('').slice(0,2).toUpperCase()}</div>
          </div>
          {phase==='idle'&&(
            <div style={{background:'rgba(255,255,255,0.12)',borderRadius:12,padding:'10px 14px',display:'flex',alignItems:'center',gap:10}}>
              <div style={{width:38,height:38,borderRadius:'50%',background:A,display:'flex',alignItems:'center',justifyContent:'center',fontSize:13,fontWeight:700,color:AT,flexShrink:0}}>{user.officer.split(' ').map(w=>w[0]).join('').slice(0,2).toUpperCase()}</div>
              <div style={{flex:1}}>
                <div style={{color:'#fff',fontSize:14,fontWeight:500}}>{user.officer}</div>
                <div style={{color:'rgba(255,255,255,0.75)',fontSize:12}}>{user.role}</div>
              </div>
              <div style={{background:A,color:AT,fontSize:10,fontWeight:700,padding:'2px 8px',borderRadius:20}}>{user.badgeNo||'—'}</div>
            </div>
          )}
          {phase!=='idle'&&(
            <div style={{color:'rgba(255,255,255,0.85)',fontSize:13,textAlign:'center',paddingTop:4}}>
              {phase==='recording'?'Recording in progress…':phase==='stopped'?'Recording stopped':phase==='reviewing'?'Review corrected report':'Review your recording'}
            </div>
          )}
        </div>
        {/* Flag stripe */}
        <div style={{height:5,display:'flex'}}>
          {brand.flagStripe.map((c,i)=><div key={i} style={{flex:1,background:c}}/>)}
        </div>

        {/* Body */}
        <div style={{flex:1,padding:'16px',overflowY:'auto'}}>
          {!speechOk&&<div style={{background:'#fef3c7',border:'1px solid #fcd34d',borderRadius:10,padding:'10px 14px',marginBottom:12,fontSize:13,color:'#92400e'}}>Speech recognition requires Chrome or Edge.</div>}

          {/* IDLE */}
          {phase==='idle'&&(
            <>
              <div style={{textAlign:'center',margin:'8px 0 20px'}}>
                <div style={{width:110,height:110,borderRadius:'50%',background:P,display:'inline-flex',alignItems:'center',justifyContent:'center',position:'relative',cursor:'pointer',boxShadow:`0 0 0 16px rgba(0,38,127,0.08), 0 0 0 28px rgba(0,38,127,0.04)`}} onClick={startRec}>
                  <svg width="48" height="48" viewBox="0 0 24 24" fill="none" stroke={A} strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"><rect x="9" y="2" width="6" height="12" rx="3"/><path d="M5 10a7 7 0 0014 0"/><line x1="12" y1="19" x2="12" y2="22"/><line x1="9" y1="22" x2="15" y2="22"/></svg>
                </div>
                <div style={{marginTop:12,fontSize:13,color:'#6b7280'}}>Tap to begin your report</div>
              </div>
              <button style={btnP} onClick={startRec}>New recording</button>
            </>
          )}

          {/* RECORDING */}
          {phase==='recording'&&(
            <>
              <div style={{textAlign:'center',margin:'8px 0 16px'}}>
                <div style={{fontSize:36,fontWeight:500,color:'#dc2626',fontVariantNumeric:'tabular-nums',marginBottom:12}}>{fmtTime(timer)}</div>
                <div style={{width:110,height:110,borderRadius:'50%',background:'#dc2626',display:'inline-flex',alignItems:'center',justifyContent:'center',cursor:'pointer',boxShadow:'0 0 0 16px rgba(220,38,38,0.1),0 0 0 28px rgba(220,38,38,0.05)'}} onClick={stopRec}>
                  <svg width="36" height="36" viewBox="0 0 24 24" fill="#fff"><rect x="6" y="6" width="12" height="12" rx="2"/></svg>
                </div>
                <div style={{marginTop:10,fontSize:13,color:'#6b7280'}}>Tap to stop</div>
              </div>
              {rawText&&<div style={card({marginBottom:12})}><div style={{fontSize:11,color:'#9ca3af',marginBottom:4,textTransform:'uppercase',letterSpacing:'0.04em'}}>Live transcript</div><div style={{fontSize:14,lineHeight:1.6,color:'#111'}}>{rawText}</div>{interim&&<div style={{fontSize:14,color:'#9ca3af',fontStyle:'italic',marginTop:4}}>{interim}</div>}</div>}
              <button style={{...btnP,background:'#dc2626'}} onClick={stopRec}>Stop recording</button>
              <button style={{...btnS,width:'100%'}}>+ Add more context</button>
            </>
          )}

          {/* STOPPED */}
          {phase==='stopped'&&(
            <>
              <div style={card({marginBottom:12})}><div style={{fontSize:11,color:'#9ca3af',marginBottom:6,textTransform:'uppercase',letterSpacing:'0.04em'}}>Raw transcript</div><div style={{fontSize:14,lineHeight:1.6,color:'#111'}}>{rawText}</div></div>
              <div style={card({marginBottom:12})}><div style={{fontSize:11,color:'#9ca3af',marginBottom:6,textTransform:'uppercase',letterSpacing:'0.04em'}}>Incident reference (optional)</div><input value={notes} onChange={e=>setNotes(e.target.value)} placeholder="Case no., location, unit…" style={{border:'none',outline:'none',background:'transparent',fontSize:14,color:'#111',width:'100%',fontFamily:'inherit'}}/></div>
              <button style={btnP} onClick={doCheck} disabled={checking}>{checking?'Checking grammar…':'Check grammar & spelling'}</button>
              <div style={{display:'flex',gap:10}}><button style={btnS} onClick={startRec}>Re-record</button><button style={btnS} onClick={()=>navigator.clipboard?.writeText(rawText)}>Copy</button></div>
            </>
          )}

          {/* REVIEWING */}
          {phase==='reviewing'&&(
            <>
              <div style={{...card({marginBottom:12}),border:'1px solid #86efac',background:'#f0fdf4'}}>
                <div style={{display:'flex',alignItems:'center',justifyContent:'space-between',marginBottom:6}}>
                  <div style={{fontSize:11,color:'#9ca3af',textTransform:'uppercase',letterSpacing:'0.04em'}}>Corrected transcript</div>
                  <span style={{background:'#d1fae5',color:'#065f46',fontSize:10,fontWeight:600,padding:'2px 8px',borderRadius:20}}>AI corrected</span>
                </div>
                <textarea value={corrected} onChange={e=>setCorrected(e.target.value)} style={{border:'none',outline:'none',background:'transparent',fontSize:14,color:'#111',width:'100%',minHeight:100,resize:'vertical',fontFamily:'inherit',lineHeight:1.6}}/>
              </div>
              <div style={card({marginBottom:16})}><div style={{fontSize:11,color:'#9ca3af',marginBottom:6,textTransform:'uppercase',letterSpacing:'0.04em'}}>Notes</div><input value={notes} onChange={e=>setNotes(e.target.value)} placeholder="Case no., location, unit…" style={{border:'none',outline:'none',background:'transparent',fontSize:14,color:'#111',width:'100%',fontFamily:'inherit'}}/></div>
              {saveMsg&&<div style={{background:'#d1fae5',borderRadius:10,padding:'10px 14px',marginBottom:12,fontSize:13,color:'#065f46'}}>{saveMsg}</div>}
              <button style={{...btnP,background:'#059669'}} onClick={save} disabled={saving}>{saving?'Saving…':MODULE_CONFIG.approvalFlow&&user.role!=='Supervisor'?'Submit for approval':'Save report'}</button>
              <div style={{display:'flex',gap:10}}><button style={btnS} onClick={()=>navigator.clipboard?.writeText(corrected||rawText)}>Copy</button><button style={btnS} onClick={reset}>Discard</button></div>
            </>
          )}
        </div>

        {/* Nav bar */}
        <div style={{background:'#fff',borderTop:'1px solid #e5e7eb',padding:'8px 0 20px',display:'flex',justifyContent:'space-around'}}>
          {[{icon:'🎙',label:'Record',active:true},{icon:'✅',label:'Approval'},{icon:'🗄',label:'Records'},{icon:'👤',label:'Profile'}].map(n=>(
            <div key={n.label} style={{display:'flex',flexDirection:'column',alignItems:'center',gap:3,flex:1,cursor:'pointer'}}>
              <span style={{fontSize:22}}>{n.icon}</span>
              <span style={{fontSize:10,color:n.active?P:'#9ca3af',fontWeight:n.active?500:400}}>{n.label}</span>
            </div>
          ))}
        </div>
      </div>
    );
  }

  // ── Desktop layout (existing) ──────────────────────────────
  const card2=(e={})=>({background:'#fff',border:'1px solid #e5e7eb',borderRadius:12,padding:'1rem 1.25rem',...e});
  const btnP2={padding:'8px 16px',borderRadius:8,fontSize:13,fontWeight:500,cursor:'pointer',border:'none',background:P,color:'#fff',fontFamily:'inherit'};
  const btnS2={padding:'8px 16px',borderRadius:8,fontSize:13,fontWeight:500,cursor:'pointer',border:'1px solid #d1d5db',background:'#f9fafb',color:'#374151',fontFamily:'inherit'};
  const inpS={padding:'8px 10px',borderRadius:8,border:'1px solid #d1d5db',fontSize:13,width:'100%',boxSizing:'border-box',background:'#f9fafb',color:'#111',fontFamily:'inherit'};

  return(
    <div>
      <div style={{display:'flex',alignItems:'center',justifyContent:'space-between',marginBottom:'1rem'}}>
        <h2 style={{margin:0,fontSize:16,fontWeight:600}}>🎙 Voice Capture</h2>
        <span style={{background:'#dbeafe',color:'#1e40af',border:'1px solid #93c5fd',fontSize:11,fontWeight:600,padding:'2px 9px',borderRadius:20}}>Module 1</span>
      </div>
      {!speechOk&&<div style={{background:'#fef3c7',border:'1px solid #fcd34d',borderRadius:8,padding:'10px 14px',marginBottom:12,fontSize:13,color:'#92400e'}}>Speech recognition requires Chrome or Edge.</div>}
      {['idle','recording','stopped'].includes(phase)&&(
        <div style={{textAlign:'center',margin:'1.25rem 0'}}>
          <button onClick={phase==='recording'?stopRec:startRec} style={{width:90,height:90,borderRadius:'50%',border:'none',cursor:'pointer',background:phase==='recording'?'#dc2626':P,color:'#fff',fontSize:34,display:'inline-flex',alignItems:'center',justifyContent:'center',boxShadow:phase==='recording'?'0 0 0 10px rgba(220,38,38,0.12)':'none',transition:'all 0.2s'}}>
            {phase==='recording'?'⏹':'🎙'}
          </button>
          {phase==='recording'&&<div style={{marginTop:10,fontSize:22,fontWeight:700,color:'#dc2626',fontVariantNumeric:'tabular-nums'}}>{fmtTime(timer)}</div>}
          {phase==='idle'&&<p style={{marginTop:8,fontSize:13,color:'#6b7280'}}>{MODULE_CONFIG.approvalFlow&&user.role!=='Supervisor'&&user.role!=='Inspector'&&user.role!=='Administrator'?'Recordings will be submitted for supervisor approval.':'Tap to begin recording.'}</p>}
        </div>
      )}
      {(phase==='recording'||phase==='stopped')&&rawText&&(
        <div style={{...card2({background:'#f9fafb',marginBottom:12})}}>
          <div style={{fontSize:12,color:'#6b7280',marginBottom:4}}>{phase==='recording'?'Listening…':'Recording stopped'}</div>
          <p style={{margin:0,fontSize:14,lineHeight:1.6}}>{rawText}</p>
          {interim&&<p style={{margin:'4px 0 0',fontSize:13,color:'#9ca3af',fontStyle:'italic'}}>{interim}</p>}
        </div>
      )}
      {phase==='stopped'&&rawText&&(
        <div style={{display:'flex',gap:8,marginBottom:12}}>
          <button onClick={startRec} style={btnS2}>+ Add more</button>
          <button onClick={doCheck} disabled={checking} style={{...btnP2,flex:1}}>{checking?'Checking grammar…':'✦ Check grammar & spelling →'}</button>
        </div>
      )}
      {phase==='reviewing'&&(
        <><div style={{display:'flex',alignItems:'center',gap:8,margin:'1rem 0'}}><div style={{flex:1,height:1,background:'#e5e7eb'}}/><span style={{fontSize:11,color:'#9ca3af',fontWeight:500}}>REVIEW</span><div style={{flex:1,height:1,background:'#e5e7eb'}}/></div>
        <div style={{...card2({marginBottom:10,border:'1px solid #6ee7b7'})}}>
          <div style={{display:'flex',justifyContent:'space-between',alignItems:'center',marginBottom:6}}>
            <span style={{fontSize:13,fontWeight:600}}>Corrected transcript</span>
            <span style={{background:'#d1fae5',color:'#065f46',fontSize:11,fontWeight:600,padding:'2px 8px',borderRadius:20}}>AI corrected</span>
          </div>
          <textarea value={corrected} onChange={e=>setCorrected(e.target.value)} style={{...inpS,minHeight:90,resize:'vertical'}}/>
        </div></>
      )}
      {(phase==='reviewing'||phase==='stopped')&&(
        <>
          <div style={{...card2({marginBottom:10})}}>
            <label style={{fontSize:13,fontWeight:600,display:'block',marginBottom:6}}>Notes (optional)</label>
            <textarea value={notes} onChange={e=>setNotes(e.target.value)} placeholder="Incident ref, case number, location…" style={{...inpS,minHeight:52,resize:'vertical'}}/>
          </div>
          <div style={{display:'flex',gap:8}}>
            <button onClick={()=>navigator.clipboard?.writeText(corrected||rawText)} style={btnS2}>Copy</button>
            <button onClick={reset} style={btnS2}>Discard</button>
            <button onClick={save} disabled={saving} style={{...btnP2,flex:1}}>{saving?'Saving…':MODULE_CONFIG.approvalFlow&&user.role!=='Supervisor'&&user.role!=='Inspector'&&user.role!=='Administrator'?'Submit for approval →':'✓ Save'}</button>
          </div>
          {saveMsg&&<p style={{fontSize:13,color:'#065f46',marginTop:8,textAlign:'center'}}>{saveMsg}</p>}
        </>
      )}
    </div>
  );
}