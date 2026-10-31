'use strict';
const test=require('node:test');
const assert=require('node:assert/strict');
const crypto=require('node:crypto');
const core=require('../lib/core');
test('only allow finite, unique, known product IDs',()=>{
 assert.deepEqual(core.selectItems(['complete','indoor']),['complete','indoor']);
 for(const ids of [[],['unknown'],['indoor','indoor'],['complete',5],Array(8).fill('action')])assert.throws(()=>core.selectItems(ids));
});
test('pricing is server owned',()=>{
 assert.equal(core.CATALOG.complete.amount,2490);
 assert.equal(Object.keys(core.CATALOG).length,7);
 assert.equal(Object.entries(core.CATALOG).filter(([key])=>key!=='complete').every(([,p])=>p.amount===690),true);
});
test('valid webhook signatures and reject replay or tampering',()=>{
 const body=Buffer.from('{"id":"evt_test"}'),secret='whsec_demo_secret',now=1793459200;
 const signature=crypto.createHmac('sha256',secret).update(now+'.').update(body).digest('hex');
 const header='t='+now+',v1='+signature;
 assert.doesNotThrow(()=>core.stripeSignature(body,header,secret,now));
 assert.throws(()=>core.stripeSignature(Buffer.from('tampered'),header,secret,now),/Invalid Stripe signature/);
 assert.throws(()=>core.stripeSignature(body,header,secret,now+301),/Expired Stripe signature/);
});
test('signed download token is deterministic, expiring, authenticated',()=>{
 process.env.DOWNLOAD_SIGNING_SECRET='a'.repeat(64);
 const token=core.tokenFor('cs_test_ABC123',3600,1793459200);
 assert.equal(token,core.tokenFor('cs_test_ABC123',3600,1793459200));
 assert.equal(JSON.parse(Buffer.from(token.split('.')[0],'base64url').toString('utf8')).exp,1793462800);
 assert.throws(()=>core.tokenSession(token.slice(0,-1)+'X'));
 const current=core.tokenFor('cs_test_ABC123',3600,Math.floor(Date.now()/1000));
 assert.equal(core.tokenSession(current),'cs_test_ABC123');
});
test('origins restricted to the shop',()=>{
 const res={setHeader(){}};
 core.allowOrigin({headers:{origin:'https://www.paolosavio.eu'}},res);
 assert.throws(()=>core.allowOrigin({headers:{origin:'https://attacker.example'}},res),/Origin not allowed/);
});
