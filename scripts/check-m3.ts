import { existsSync, readFileSync, writeFileSync } from 'node:fs';
import { getDatabase, closeDatabase } from '../src/server/db.ts';
import { stripeClient, stripeProvider } from '../src/server/providers/stripe.ts';
import { fulfillCheckout } from '../src/server/billing.ts';
import { getTopicComments } from '../src/server/community.ts';
import { DEMO_USER_ID } from '../src/shared/contracts.ts';
try {
 const client=stripeClient(), provider=stripeProvider();
 if(!client||!provider){console.log('BLOCKED: configure a sandbox STRIPE_SECRET_KEY in ignored .env.local.');process.exitCode=2;}
 else {
  const arg=process.argv.find(a=>a.startsWith('--session='))?.slice('--session='.length);
  const db=getDatabase();
  const purchase=arg ? db.prepare('SELECT * FROM purchases WHERE stripe_session_id=? AND user_id=?').get(arg,DEMO_USER_ID) : db.prepare("SELECT * FROM purchases WHERE user_id=? AND status='PAID' ORDER BY created_at DESC LIMIT 1").get(DEMO_USER_ID);
  if(!purchase?.stripe_session_id){console.log('BLOCKED: complete a real sandbox Checkout in the application first. No payment is created by this script.');process.exitCode=2;}
  else {
   const session=await provider.retrieve(String(purchase.stripe_session_id));
   const confirmed=await fulfillCheckout(session.id); if(!confirmed.ok||confirmed.value.status!=='UNLOCKED')throw Error('Real Stripe confirmation did not unlock access.');
   const before=Number(db.prepare('SELECT count(*) AS n FROM entitlements WHERE user_id=? AND topic_id=?').get(DEMO_USER_ID,purchase.topic_id)?.n);
   const repeated=await fulfillCheckout(session.id);
   const after=Number(db.prepare('SELECT count(*) AS n FROM entitlements WHERE user_id=? AND topic_id=?').get(DEMO_USER_ID,purchase.topic_id)?.n);
   const comments=await getTopicComments(String(purchase.topic_id));
   const intent=typeof session.payment_intent==='string' ? await client.paymentIntents.retrieve(session.payment_intent) : session.payment_intent;
   const line=session.line_items!.data[0], price=line.price!, product=price.product;
   const fresh=db.prepare('SELECT id,topic_id,expected_amount,currency,stripe_session_id,status,created_at,updated_at FROM purchases WHERE id=?').get(purchase.id);
   const proof={recordedAt:new Date().toISOString(),source:'Actual Stripe sandbox Checkout completed through browser; real API retrieval and idempotent local fulfillment. No simulated payment.',purchase:fresh,stripe:{sessionId:session.id,livemode:session.livemode,status:session.status,paymentStatus:session.payment_status,currency:session.currency,amountTotal:session.amount_total,mode:session.mode,quantity:line.quantity,priceId:price.id,unitAmount:price.unit_amount,productId:typeof product==='string'?product:product.id,paymentIntentId:intent?.id,paymentIntentStatus:intent?.status,amountReceived:intent?.amount_received},product:{topicId:purchase.topic_id,unlocked:comments.ok&&comments.value.unlocked,visibleComments:comments.ok?comments.value.comments.length:0,totalComments:comments.ok?comments.value.totalCount:0,entitlementCount:after,repeatConfirmation:repeated.ok&&repeated.value.status==='UNLOCKED'&&before===1&&after===1},limitations:['Only fictional checkout details and official test card used','No real money collected','This does not prove willingness to pay or judge award','Real webhook delivery not claimed; return confirmation and manual recovery suffice locally']};
   if(!proof.product.unlocked||!proof.product.repeatConfirmation||intent?.status!=='succeeded'||intent.livemode||intent.amount_received!==99)throw Error('Sandbox acceptance failed.');
   if(process.argv.includes('--write-evidence')){const path='Doc/evidence/M3_REAL_RESULT.json';if(existsSync(path))writeFileSync(`Doc/evidence/M3_REAL_ARCHIVE_${Date.now()}.json`,readFileSync(path));writeFileSync(path,JSON.stringify(proof,null,2)+'\n');}
   console.log(JSON.stringify(proof,null,2));
  }
 }
} catch {console.error('FAIL: sandbox verification failed. Check configuration, recorded session ownership and Stripe availability; no raw provider data logged.');process.exitCode=1;}
finally {closeDatabase();}
