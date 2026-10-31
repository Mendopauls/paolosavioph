'use strict';
const {CATALOG,ORIGIN,fail,handleError,selectItems,allowOrigin,stripeRequest}=require('../lib/core');
module.exports=async function checkout(req,res){
 try{
  allowOrigin(req,res);
  if(req.method==='OPTIONS')return res.status(204).end();
  if(req.method!=='POST')throw fail('Method not allowed',405);
  if(process.env.ENABLE_CHECKOUT!=='true')throw fail('Checkout not yet enabled',503);
  const type=String(req.headers['content-type']||'');
  if(!/^application\/json(?:;|$)/.test(type))throw fail('Content type must be application/json',415);
  const ids=selectItems(req.body?.items);
  const params=new URLSearchParams();
  params.set('mode','payment');
  params.set('success_url',ORIGIN+'/color-lab/acquisto/?session_id={CHECKOUT_SESSION_ID}');
  params.set('cancel_url',ORIGIN+'/color-lab/carrello/?cancelled=1');
  params.set('metadata[items]',ids.join(','));
  params.set('metadata[product_version]','v1');
  ids.forEach((id,i)=>{const p=CATALOG[id];
    params.set('line_items['+i+'][price_data][currency]','eur');
    params.set('line_items['+i+'][price_data][unit_amount]',String(p.amount));
    params.set('line_items['+i+'][price_data][product_data][name]',p.name);
    params.set('line_items['+i+'][quantity]','1');
  });
  const session=await stripeRequest('POST','/checkout/sessions',params);
  if(!session.url||!session.id)throw fail('Checkout initialization failed',502);
  return res.status(200).json({url:session.url});
 }catch(err){return handleError(res,err);}
};
