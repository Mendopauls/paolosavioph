'use strict';
const {CATALOG,fail,required,handleError,tokenSession,readOrder}=require('../lib/core');
module.exports=async function download(req,res){
 try{
  if(req.method!=='GET')throw fail('Method not allowed',405);
  res.setHeader('Cache-Control','no-store, private');
  res.setHeader('Referrer-Policy','no-referrer');
  const sid=tokenSession(req.query?.token);
  const sku=req.query?.sku;
  if(typeof sku!=='string'||!Object.prototype.hasOwnProperty.call(CATALOG,sku))throw fail('Unknown product',404);
  const order=await readOrder(sid);
  if(!order||order.state!=='paid'||!Array.isArray(order.product_ids)||!order.product_ids.includes(sku))throw fail('Download not authorized',403);
  const base=required('SUPABASE_URL').replace(/\/$/,'');
  const secret=required('SUPABASE_SERVICE_ROLE_KEY');
  const storagePath=CATALOG[sku].path.split('/').map(encodeURIComponent).join('/');
  const bucket='colorlab-downloads';
  const response=await fetch(base+'/storage/v1/object/sign/'+bucket+'/'+storagePath,{
   method:'POST',
   headers:{apikey:secret,Authorization:'Bearer '+secret,'Content-Type':'application/json'},
   body:JSON.stringify({expiresIn:60})
  });
  if(!response.ok)throw fail('File delivery unavailable',503);
  const body=await response.json();
  if(!body.signedURL)throw fail('File delivery unavailable',503);
  const target=new URL(body.signedURL.startsWith('/object/')?'/storage/v1'+body.signedURL:body.signedURL,base);
  if(target.origin!==new URL(base).origin)throw fail('Invalid signed delivery URL',503);
  return res.redirect(302,target.toString());
 }catch(err){return handleError(res,err);}
};
