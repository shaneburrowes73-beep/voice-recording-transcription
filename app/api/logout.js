import{neon}from'@neondatabase/serverless';
import crypto from'crypto';
import{rateLimit,securityHeaders,handleOptions}from'../lib/security.js';

export default async function handler(req,res){
  securityHeaders(res);
  if(handleOptions(req,res))return;
  if(!rateLimit(req,res,{max:20,windowMs:60*1000}))return;
  const auth=req.headers.authorization;
  if(!auth?.startsWith('Bearer '))return res.status(200).json({success:true});
  const token=auth.slice(7);
  if(token.length>2048)return res.status(200).json({success:true});
  try{const sql=neon(process.env.DATABASE_URL);const th=crypto.createHash('sha256').update(token).digest('hex');await sql`DELETE FROM user_sessions WHERE token_hash=${th}`;}catch{}
  return res.status(200).json({success:true});
}