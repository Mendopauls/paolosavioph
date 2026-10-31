'use strict';
module.exports=function health(req,res){
 res.setHeader('Cache-Control','no-store');
 res.status(200).json({service:'colorlab-commerce',status:'ok',checkoutEnabled:process.env.ENABLE_CHECKOUT==='true',webhookEnabled:process.env.ENABLE_WEBHOOK==='true',mode:(process.env.STRIPE_SECRET_KEY||'').startsWith('sk_live_')?'live':'test-or-unconfigured'});
};
