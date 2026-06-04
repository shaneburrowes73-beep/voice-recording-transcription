import{neon}from'@neondatabase/serverless';
import jwt from'jsonwebtoken';
import{rateLimit,securityHeaders,handleOptions}from'../lib/security.js';

export default async function handler(req,res){
  securityHeaders(res);
  if(handleOptions(req,res))return;
  if(!rateLimit(req,res,{max:10,windowMs:60*1000}))return;
  const auth=req.headers.authorization;
  if(!auth?.startsWith('Bearer '))return res.status(401).json({error:'Unauthorised'});
  const token=auth.slice(7);
  if(token.length>2048)return res.status(401).json({error:'Unauthorised'});
  try{
    const decoded=jwt.verify(token,process.env.JWT_SECRET,{issuer:'voice-transcript',audience:'voice-transcript-app'});
    const sql=neon(process.env.DATABASE_URL);
    const rc=await sql`SELECT is_supervisor,is_admin FROM roles WHERE org_id=${decoded.orgId} AND LOWER(name)=LOWER(${decoded.role})`;
    if(!rc.length||(!rc[0].is_supervisor&&!rc[0].is_admin))return res.status(403).json({error:'Supervisor access required'});
    const since=req.query?.since&&/^\d{4}-\d{2}-\d{2}/.test(req.query.since)?req.query.since:new Date(Date.now()-30*24*60*60*1000).toISOString();
    const users=await sql`SELECT full_name,badge_no,email,role,status,created_at,last_login FROM users WHERE org_id=${decoded.orgId} AND created_at>=${since} ORDER BY created_at DESC`;
    return res.status(200).json({success:true,count:users.length,since,users});
  }catch{return res.status(401).json({error:'Invalid token'});}
}