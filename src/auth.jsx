import{createContext,useContext,useState,useEffect}from'react';

const AuthCtx = createContext(null);
const TOKEN_KEY = 'vt_token';

export function AuthProvider({children}){
  const[user,setUser]=useState(null);
  const[org,setOrg]=useState(null);
  const[loading,setLoading]=useState(true);

  useEffect(()=>{
    const tk=sessionStorage.getItem(TOKEN_KEY)||localStorage.getItem(TOKEN_KEY);
    if(tk) verifyToken(tk); else setLoading(false);
  },[]);

  const verifyToken = async tk => {
    try{
      const r=await fetch('/api/verify',{method:'POST',headers:{Authorization:'Bearer '+tk}});
      if(r.ok){const d=await r.json();setUser(d.user);setOrg(d.org);localStorage.setItem(TOKEN_KEY,tk);}
      else{localStorage.removeItem(TOKEN_KEY);sessionStorage.removeItem(TOKEN_KEY);}
    }catch{}
    setLoading(false);
  };

  const login = async(email,password)=>{
    const r=await fetch('/api/login',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({email,password})});
    const d=await r.json();
    if(!r.ok) throw new Error(d.error||'Login failed');
    localStorage.setItem(TOKEN_KEY,d.token);
    setUser(d.user);setOrg(d.org);
    return d;
  };

  const logout = async()=>{
    const tk=localStorage.getItem(TOKEN_KEY);
    if(tk) await fetch('/api/logout',{method:'POST',headers:{Authorization:'Bearer '+tk}}).catch(()=>{});
    localStorage.removeItem(TOKEN_KEY);sessionStorage.removeItem(TOKEN_KEY);
    setUser(null);setOrg(null);
  };

  const register = async(data)=>{
    const r=await fetch('/api/register',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify(data)});
    const d=await r.json();
    if(!r.ok) throw new Error(d.error||'Registration failed');
    return d;
  };

  const getToken=()=>localStorage.getItem(TOKEN_KEY)||sessionStorage.getItem(TOKEN_KEY);

  return <AuthCtx.Provider value={{user,org,loading,login,logout,register,getToken}}>{children}</AuthCtx.Provider>;
}

export const useAuth=()=>useContext(AuthCtx);