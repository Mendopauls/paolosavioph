'use strict';
const {CATALOG,fail,required,handleError,selectItems,parseBody,stripeSignature,db,readOrder,resendEmail}=require('../lib/core');
module.exports=async function webhook(req,res){
 try{
  if(req.method!=='POST')throw fail('Method not allowed',405);
  if(process.env.ENABLE_WEBHOOK!=='true')throw fail('Webhook not enabled',503);
  const raw=await parseBody(req,256*1024);
  stripeSignature(raw,req.headers['stripe-signature'],required('STRIPE_WEBHOOK_SECRET'));
  let event;try{event=JSON.parse(raw.toString('utf8'));}catch{throw fail('Malformed JSON');}
  if(!event.id||!event.type||!event.data?.object)throw fail('Invalid event payload');
  const seen=await db('GET','colorlab_stripe_events?id=eq.'+encodeURIComponent(event.id)+'&select=id');
  if(seen?.length)return res.status(200).json({received:true,duplicate:true});
  const s=event.data.object;
  const completed=['checkout.session.completed','checkout.session.async_payment_succeeded'];
  const failure=['checkout.session.async_payment_failed','checkout.session.expired'];
  if(completed.includes(event.type)){
   if(typeof s.id!=='string'||!s.id.startsWith('cs_'))throw fail('Invalid checkout session');
   const ids=selectItems(String(s.metadata?.items||'').split(','));
   const expected=ids.reduce((total,id)=>total+CATALOG[id].amount,0);
   if(s.amount_total!==expected||s.currency!=='eur')throw fail('Amount mismatch',422);
   const email=s.customer_details?.email||s.customer_email;
   if(!email || typeof email!=='string' || email.length>254)throw fail('Customer email not available',422);
   const state=(s.payment_status==='paid')?'paid':'pending';
   const existing=await readOrder(s.id);
   if(!existing){
    await db('POST','colorlab_orders?on_conflict=stripe_session_id',{
     stripe_session_id:s.id,stripe_payment_intent:s.payment_intent||null,
     email,product_ids:ids,amount_total:expected,currency:'eur',state
    },'resolution=ignore-duplicates,return=representation');
   }else if(existing.state==='pending' && state==='paid'){
    await db('PATCH','colorlab_orders?stripe_session_id=eq.'+encodeURIComponent(s.id)+'&state=eq.pending',
     {state:'paid',stripe_payment_intent:s.payment_intent||existing.stripe_payment_intent},'return=representation');
   }
   const order=await readOrder(s.id);
   if(!order)throw fail('Order was not persisted',503);
   if(order.state==='paid'&&!order.email_sent_at){
    const anchor=Number(s.created)||Number(event.created);
    await resendEmail(order.email,s.id,ids,'purchase/'+s.id,anchor);
    await db('PATCH','colorlab_orders?stripe_session_id=eq.'+encodeURIComponent(s.id)+'&email_sent_at=is.null',
      {email_sent_at:new Date().toISOString()},'return=representation');
   }
  }else if(event.type==='charge.refunded'){
   if(typeof s.payment_intent==='string'){
    await db('PATCH','colorlab_orders?stripe_payment_intent=eq.'+encodeURIComponent(s.payment_intent),{state:'refunded'},'return=minimal');
   }
  }else if(failure.includes(event.type)){
   if(typeof s.id==='string'){
    await db('PATCH','colorlab_orders?stripe_session_id=eq.'+encodeURIComponent(s.id)+'&state=eq.pending',{state:'failed'},'return=minimal');
   }
  }
  await db('POST','colorlab_stripe_events?on_conflict=id',{id:event.id,type:event.type,stripe_created:Number(event.created)||null},'resolution=ignore-duplicates,return=minimal');
  return res.status(200).json({received:true});
 }catch(err){return handleError(res,err);}
};
module.exports.config={api:{bodyParser:false}};
