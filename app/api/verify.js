import{neon}from'@neondatabase/serverless';
import jwt from'jsonwebtoken';
import crypto from'crypto';
import{rateLimit,securityHeaders,handleOptions}from'../lib/security.js';

export default async function handler(req,res){
  securityHeaders(res);
  if(handleOptions(req,res))return;
  if(!rateLimit(req,res,{max:60,windowMs:60*1000}))return;
  if(req.method!=='POST')return res.status(405).json({error:'Method not allowed'});
  const auth=req.headers.authorization;
  if(!auth?.startsWith('Bearer '))return res.status(401).json({error:'No token provided'});
  const token=auth.slice(7);
  if(token.length>2048)return res.status(401).json({error:'Invalid token'});
  try{
    jwt.verify(token,process.env.JWT_SECRET,{issuer:'voice-transcript',audience:'voice-transcript-app'});
    const sql=neon(process.env.DATABASE_URL);
    const tokenHash=crypto.createHash('sha256').update(token).digest('hex');
    const rows=await sql`
      SELECT s.*,u.full_name,u.badge_no,u.role,u.status,u.email,
             o.name as org_name,o.slug as org_slug,o.modules,o.user_id_label,o.transcript_label
      FROM user_sessions s
      JOIN users u ON s.user_id=u.id
      JOIN organisations o ON u.org_id=o.id
      WHERE s.token_hash=${tokenHash} AND s.expires_at>NOW()
    `;
    if(!rows.length)return res.status(401).json({error:'Session expired'});
    if(rows[0].status==='suspended')return res.status(403).json({error:'Account suspended'});
    await sql`UPDATE user_sessions SET last_active=NOW() WHERE token_hash=${tokenHash}`;
    const s=rows[0];
    return res.status(200).json({success:true,user:{id:s.user_id,fullName:s.full_name,badgeNo:s.badge_no,email:s.email,role:s.role},org:{name:s.org_name,slug:s.org_slug,modules:s.modules,userIdLabel:s.user_id_label,transcriptLabel:s.transcript_label}});
  }catch{return res.status(401).json({error:'Invalid or expired token'});}
}