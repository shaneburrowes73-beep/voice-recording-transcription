import{neon}from'@neondatabase/serverless';
import bcrypt from'bcryptjs';
import jwt from'jsonwebtoken';
import crypto from'crypto';
import{rateLimit,securityHeaders,handleOptions,validateContentType,sanitise,isValidEmail}from'../lib/security.js';

export default async function handler(req,res){
  securityHeaders(res);
  if(handleOptions(req,res))return;
  if(!rateLimit(req,res,{max:10,windowMs:15*60*1000}))return; // 10 login attempts per IP per 15 min
  if(!validateContentType(req,res))return;
  if(req.method!=='POST')return res.status(405).json({error:'Method not allowed'});

  const raw=req.body||{};
  const email=sanitise(raw.email,255).toLowerCase();
  const password=typeof raw.password==='string'?raw.password:'';

  if(!email||!password)return res.status(400).json({error:'Email and password required'});
  if(!isValidEmail(email))return res.status(401).json({error:'Invalid email or password'});
  if(password.length>128)return res.status(401).json({error:'Invalid email or password'});

  try{
    const sql=neon(process.env.DATABASE_URL);
    const users=await sql`
      SELECT u.*,o.name as org_name,o.slug as org_slug,o.modules,o.user_id_label,o.transcript_label
      FROM users u JOIN organisations o ON u.org_id=o.id
      WHERE u.email=${email}
    `;

    // Always run bcrypt compare to prevent timing attacks
    const dummyHash='$2b$12$invalidhashpaddingtopreventimingtattack000000000000000';
    const candidateHash=users.length?users[0].password_hash:dummyHash;
    const valid=await bcrypt.compare(password,candidateHash);

    if(!users.length||!valid)
      return res.status(401).json({error:'Invalid email or password'});

    const u=users[0];
    if(u.status==='suspended')
      return res.status(403).json({error:'Account suspended. Contact your administrator.'});

    const jwtToken=jwt.sign(
      {userId:u.id,email:u.email,role:u.role,orgId:u.org_id,orgSlug:u.org_slug},
      process.env.JWT_SECRET,
      {expiresIn:'7d',issuer:'voice-transcript',audience:'voice-transcript-app'}
    );
    const tokenHash=crypto.createHash('sha256').update(jwtToken).digest('hex');
    const expiresAt=new Date(Date.now()+7*24*60*60*1000);

    await sql`INSERT INTO user_sessions(user_id,token_hash,expires_at)VALUES(${u.id},${tokenHash},${expiresAt})`;
    await sql`UPDATE users SET last_login=NOW() WHERE id=${u.id}`;

    return res.status(200).json({
      success:true,token:jwtToken,
      user:{id:u.id,fullName:u.full_name,badgeNo:u.badge_no,email:u.email,role:u.role},
      org:{name:u.org_name,slug:u.org_slug,modules:u.modules,userIdLabel:u.user_id_label,transcriptLabel:u.transcript_label}
    });
  }catch{
    return res.status(500).json({error:'Login failed'});
  }
}