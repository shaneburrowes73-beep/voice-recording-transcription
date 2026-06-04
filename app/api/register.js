import{neon}from'@neondatabase/serverless';
import bcrypt from'bcryptjs';
import{rateLimit,securityHeaders,handleOptions,validateContentType,sanitise,isValidEmail}from'../lib/security.js';

export default async function handler(req,res){
  securityHeaders(res);
  if(handleOptions(req,res))return;
  if(!rateLimit(req,res,{max:5,windowMs:15*60*1000}))return;
  if(!validateContentType(req,res))return;
  if(req.method!=='POST')return res.status(405).json({error:'Method not allowed'});

  const raw=req.body||{};
  const fullName=sanitise(raw.fullName,100);
  const badgeNo=sanitise(raw.badgeNo,30);
  const email=sanitise(raw.email,255).toLowerCase();
  const password=typeof raw.password==='string'?raw.password:'';
  const role=sanitise(raw.role,60);
  const orgSlug=sanitise(raw.orgSlug||'barbados-police',60);

  if(!fullName||!badgeNo||!email||!password||!role)
    return res.status(400).json({error:'All fields are required'});
  if(!isValidEmail(email))
    return res.status(400).json({error:'Invalid email address'});
  if(password.length>128)
    return res.status(400).json({error:'Password too long'});

  const strong=/^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)(?=.*[^a-zA-Z\d]).{8,}$/;
  if(!strong.test(password))
    return res.status(400).json({error:'Password must be 8+ characters with uppercase, lowercase, number and symbol'});

  try{
    const sql=neon(process.env.DATABASE_URL);
    const org=await sql`SELECT id FROM organisations WHERE slug=${orgSlug}`;
    if(!org.length)return res.status(404).json({error:'Organisation not found'});
    const orgId=org[0].id;
    const validRole=await sql`SELECT name FROM roles WHERE org_id=${orgId} AND LOWER(name)=LOWER(${role})`;
    const resolvedRole=validRole.length?validRole[0].name:role;
    const hash=await bcrypt.hash(password,12);
    const user=await sql`
      INSERT INTO users(org_id,full_name,badge_no,email,password_hash,role)
      VALUES(${orgId},${fullName},${badgeNo},${email},${hash},${resolvedRole})
      RETURNING id,full_name,badge_no,email,role,status,created_at
    `;
    return res.status(201).json({success:true,user:user[0]});
  }catch(err){
    if(err.message?.includes('unique'))return res.status(409).json({error:'Email or badge number already registered'});
    return res.status(500).json({error:'Registration failed'});
  }
}