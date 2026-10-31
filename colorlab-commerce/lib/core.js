'use strict';
const crypto = require('node:crypto');
const CATALOG = Object.freeze({
 complete:{name:'SPORT COLOR LUTs — Volume 01',amount:2490,path:'v1/volume-01-complete.zip'},
 indoor:{name:'Indoor Court',amount:690,path:'v1/indoor-court.zip'},
 aquatic:{name:'Aquatic Blue',amount:690,path:'v1/aquatic-blue.zip'},
 broadcast:{name:'Broadcast Neutral',amount:690,path:'v1/broadcast-neutral.zip'},
 action:{name:'Action Contrast',amount:690,path:'v1/action-contrast.zip'},
 outdoor:{name:'Outdoor Match',amount:690,path:'v1/outdoor-match.zip'},
 editorial:{name:'Editorial Sport',amount:690,path:'v1/editorial-sport.zip'}
});
const ORIGIN='https://www.paolosavio.eu';
function fail(message,status=400){const error=new Error(message);error.status=status;return error;}
function required(key){const value=process.env[key];if(!value)throw fail('Missing server configuration: '+key,503);return value;}
function handleError(res,e){const status=(e&&e.status&&Number.isInteger(e.status))?e.status:500;if(status>=500)console.error('Color Lab API failed:',String(e?.message||e).slice(0,180));res.status(status).json({error:status===500?'Server error':String(e.message||'Invalid request')});}
function selectItems(ids){if(!Array.isArray(ids)||ids.length<1||ids.length>7)throw fail('Select from 1 to 7 products');
 const uniq=[...new Set(ids)];if(uniq.length!==ids.length||uniq.some(id=>typeof id!=='string'||!Object.prototype.hasOwnProperty.call(CATALOG,id)))throw fail('Invalid selection');
 return uniq;
}
function allowOrigin(req,res){
 const origin=req.headers.origin;
 if(origin && origin!==ORIGIN && origin!=='https://paolosavio.eu')throw fail('Origin not allowed',403);
 res.setHeader('Access-Control-Allow-Origin',origin||ORIGIN);
 res.setHeader('Vary','Origin');
 res.setHeader('Access-Control-Allow-Methods','POST, OPTIONS');
 res.setHeader('Access-Control-Allow-Headers','Content-Type');
 res.setHeader('Cache-Control','no-store');
}
async function parseBody(req,limit=8192){
 let size=0,parts=[];
 for await(const p of req){size+=p.length;if(size>limit)throw fail('Payload too large',413);parts.push(p);}
 return Buffer.concat(parts);
}
async function stripeRequest(method,path,params){
 const key=required('STRIPE_SECRET_KEY');
 if(!/^sk_test_/.test(key) && process.env.ALLOW_LIVE_STRIPE!=='true')throw fail('Live Stripe mode is disabled',503);
 const headers={'Authorization':'Bearer '+key,'Content-Type':'application/x-www-form-urlencoded'};
 const response=await fetch('https://api.stripe.com/v1'+path,{method,headers,body:params?.toString()});
 const body=await response.json();
 if(!response.ok)throw fail('Stripe rejected request: '+(body.error?.type||'error'),502);
 return body;
}
function stripeSignature(raw,header,secret,now=Math.floor(Date.now()/1000)){
 const fields=String(header||'').split(',').map(x=>x.trim());
 const t=fields.find(x=>/^t=\d+$/.test(x));
 const signatures=fields.filter(x=>/^v1=[a-f0-9]{64}$/i.test(x)).map(x=>x.slice(3));
 if(!t||!signatures.length)throw fail('Missing Stripe signature',400);
 const timestamp=Number(t.slice(2));
 if(!Number.isSafeInteger(timestamp)||Math.abs(now-timestamp)>300)throw fail('Expired Stripe signature',400);
 const expected=crypto.createHmac('sha256',secret).update(String(timestamp)+'.').update(raw).digest();
 const valid=signatures.some(sig=>{const got=Buffer.from(sig,'hex');return got.length===expected.length&&crypto.timingSafeEqual(got,expected);});
 if(!valid)throw fail('Invalid Stripe signature',400);
}
function tokenFor(session,ttl=60*60*24*30,anchor=Math.floor(Date.now()/1000)){
 const secret=required('DOWNLOAD_SIGNING_SECRET');if(secret.length<32)throw fail('Signing secret too short',503);
 const payload=Buffer.from(JSON.stringify({sid:session,exp:anchor+ttl})).toString('base64url');
 const sig=crypto.createHmac('sha256',secret).update(payload).digest('base64url');
 return payload+'.'+sig;
}
function tokenSession(token){
 if(typeof token!=='string'||token.length>2048||!token.includes('.'))throw fail('Invalid access token',403);
 const [payload,sig,extra]=token.split('.');
 if(extra||!payload||!sig)throw fail('Invalid token',403);
 const expected=crypto.createHmac('sha256',required('DOWNLOAD_SIGNING_SECRET')).update(payload).digest();
 const actual=Buffer.from(sig,'base64url');
 if(expected.length!==actual.length||!crypto.timingSafeEqual(expected,actual))throw fail('Invalid token',403);
 let value;try{value=JSON.parse(Buffer.from(payload,'base64url').toString('utf8'));}catch{throw fail('Invalid token',403);}
 if(typeof value.sid!=='string'||!/^cs_(test_|live_)[A-Za-z0-9]+$/.test(value.sid)||!Number.isSafeInteger(value.exp)||value.exp<Math.floor(Date.now()/1000))throw fail('Expired or invalid token',403);
 return value.sid;
}
async function db(method,path,body,prefer){
 const url=required('SUPABASE_URL'),key=required('SUPABASE_SERVICE_ROLE_KEY');
 const response=await fetch(url.replace(/\/$/,'')+'/rest/v1/'+path,{method,headers:{apikey:key,Authorization:'Bearer '+key,'Content-Type':'application/json',...(prefer?{Prefer:prefer}:{})},body:body===undefined?undefined:JSON.stringify(body)});
 if(!response.ok){const err=await response.text();throw fail('Database operation failed: '+response.status+' '+err.slice(0,150),503);}
 const content=await response.text();return content?JSON.parse(content):null;
}
async function readOrder(session){
 const orders=await db('GET','colorlab_orders?stripe_session_id=eq.'+encodeURIComponent(session)+'&select=*');
 return orders?.[0]||null;
}
async function resendEmail(email,session,ids,eventId,anchor){
 const from=required('RESEND_FROM'),key=required('RESEND_API_KEY'),backend=required('API_ORIGIN');
 if(!/^https:\/\//.test(backend))throw fail('API_ORIGIN requires HTTPS',503);
 if(!Number.isSafeInteger(anchor)||anchor<1600000000)throw fail('Invalid session creation timestamp',422);
 const token=tokenFor(session,60*60*24*30,anchor);
 const links=ids.map(id=>{const p=CATALOG[id];return '<li><a href="'+backend+'/api/download?sku='+encodeURIComponent(id)+'&token='+encodeURIComponent(token)+'">'+p.name+'</a></li>';}).join('');
 const result=await fetch('https://api.resend.com/emails',{method:'POST',headers:{Authorization:'Bearer '+key,'Content-Type':'application/json','Idempotency-Key':eventId},body:JSON.stringify({from,to:[email],subject:'Paolo Savio Color Lab — il tuo acquisto',html:'<p>Grazie per l’acquisto. Scarica qui i tuoi file:</p><ul>'+links+'</ul><p>I collegamenti scadono dopo 30 giorni. Per assistenza: info@paolosavio.eu</p>'})});
 if(!result.ok)throw fail('Email service rejected request: '+result.status,503);
 return await result.json();
}
module.exports={CATALOG,ORIGIN,fail,required,handleError,selectItems,allowOrigin,parseBody,stripeRequest,stripeSignature,tokenFor,tokenSession,db,readOrder,resendEmail};
