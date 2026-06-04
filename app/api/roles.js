import{neon}from'@neondatabase/serverless';
import{rateLimit,securityHeaders,handleOptions,sanitise}from'../lib/security.js';

export default async function handler(req,res){
  securityHeaders(res);
  if(handleOptions(req,res))return;
  if(!rateLimit(req,res,{max:30,windowMs:60*1000}))return;
  const orgSlug=sanitise(req.query?.orgSlug||'barbados-police',60);
  try{
    const sql=neon(process.env.DATABASE_URL);
    const roles=await sql`
      SELECT r.name,r.level,r.is_supervisor,r.is_admin
      FROM roles r JOIN organisations o ON r.org_id=o.id
      WHERE o.slug=${orgSlug} ORDER BY r.level ASC
    `;
    return res.status(200).json({success:true,roles});
  }catch{
    return res.status(500).json({error:'Failed to fetch roles'});
  }
}