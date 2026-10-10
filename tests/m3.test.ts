import { test } from 'node:test';
import assert from 'node:assert/strict';
import { mkdtempSync, rmSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import Stripe from 'stripe';
import { getDatabase, closeDatabase } from '../src/server/db.ts';
import { seedJobs, seedCommunity } from '../src/server/seed.ts';
import { getTopicComments, getTopicForJob, addComment } from '../src/server/community.ts';
import { createBillingService } from '../src/server/billing.ts';
import { processStripeWebhook } from '../src/server/stripe-webhook.ts';
import { verifyStripeEvent, stripeClient, appOrigin, type PurchaseInput, type StripeProvider } from '../src/server/providers/stripe.ts';

function session(p: PurchaseInput): Stripe.Checkout.Session {
 return { id: 'cs_test_' + p.id.replaceAll('-', ''), livemode: false, mode: 'payment', client_reference_id: p.id, metadata: { purchaseId:p.id,userId:p.user_id,topicId:p.topic_id }, currency:'eur',amount_total:99,amount_subtotal:99,payment_method_types:['card'],payment_status:'unpaid',status:'open',url:'https://checkout.stripe.com/c/pay/example', line_items:{has_more:false,data:[{quantity:1,amount_total:99,amount_subtotal:99,price:{currency:'eur',unit_amount:99,type:'one_time',product:{metadata:{purchaseId:p.id,topicId:p.topic_id}}}}]} } as unknown as Stripe.Checkout.Session;
}
test('M3: isolated community and simulated Stripe boundaries (NOT sandbox transaction evidence)', async t => {
 const folder=mkdtempSync(join(tmpdir(),'hireland-m3-')); const oldPath=process.env.DATABASE_PATH; process.env.DATABASE_PATH=join(folder,'test.sqlite');
 const sessions=new Map<string,Stripe.Checkout.Session>(); let calls=0; let creates=0; let ambiguous=false;
 const provider:StripeProvider={create:async p=>{creates++;const s=session(p);sessions.set(s.id,s);if(ambiguous){ambiguous=false;throw Error('SIMULATED timeout after creation');}return s;},retrieve:async id=>{calls++;const s=sessions.get(id);if(!s)throw Error('SIMULATED unavailable');return structuredClone(s);}};
 const service=createBillingService(()=>provider,new Map());
 const topic='topic-job-01';
 const purchaseFor=(id:string)=>getDatabase().prepare('SELECT * FROM purchases WHERE topic_id=? ORDER BY created_at DESC,rowid DESC LIMIT 1').get(id)!;
 const paid=(id:string)=>{const s=sessions.get(id)!;s.payment_status='paid';s.status='complete';s.url=null;};
 try {
  seedJobs();seedCommunity();
  await t.test('seed is additive and free response contains only latest three bodies',async()=>{
   assert.equal((await getTopicForJob('job-01')).ok,true);
   const result=await getTopicComments(topic);assert.ok(result.ok);assert.equal(result.value.totalCount,6);assert.equal(result.value.comments.length,3);
   const hidden=getDatabase().prepare('SELECT body FROM comments WHERE topic_id=? ORDER BY created_at,id LIMIT 3').all(topic);
   for(const c of hidden)assert.equal(JSON.stringify(result).includes(String(c.body)),false);
   assert.deepEqual(seedCommunity(),{topicsInserted:0,commentsInserted:0});
   assert.equal((await addComment(topic,'  ')).ok,false);assert.equal((await addComment(topic,'x'.repeat(1001))).ok,false);
   assert.equal((await addComment('missing','test')).ok,false);
   const post=await addComment(topic,'Fictional local test post');assert.ok(post.ok);assert.equal(post.value.comments.length,3);assert.equal(post.value.totalCount,7);assert.equal(post.value.comments[0].isSynthetic,false);
   seedCommunity();assert.equal(getDatabase().prepare('SELECT count(*) AS n FROM comments WHERE topic_id=?').get(topic)?.n,7);
  });
  await t.test('missing config or live key cannot start checkout',async()=>{
   const unconfigured=createBillingService(()=>null,new Map());assert.equal((await unconfigured.createCheckout(topic)).ok,false);
   const key=process.env.STRIPE_SECRET_KEY;process.env.STRIPE_SECRET_KEY='sk_live_simulated';assert.equal(stripeClient(),null);if(key===undefined)delete process.env.STRIPE_SECRET_KEY;else process.env.STRIPE_SECRET_KEY=key;
   assert.equal((await service.createCheckout('missing')).ok,false);assert.equal(creates,0);
   const origin=process.env.APP_URL;process.env.APP_URL='https://untrusted.example';assert.throws(appOrigin);if(origin===undefined)delete process.env.APP_URL;else process.env.APP_URL=origin;
  });
  await t.test('concurrent purchase clicks and cancel/unpaid reuse one pending session',async()=>{
   const results=await Promise.all([service.createCheckout(topic),service.createCheckout(topic)]);assert.ok(results.every(r=>r.ok));assert.equal(creates,1);
   const p=purchaseFor(topic);assert.equal(p.expected_amount,99);assert.equal(p.currency,'eur');assert.equal(p.status,'PENDING');
   assert.ok((await service.createCheckout(topic)).ok);assert.equal(creates,1);
   const confirmed=await service.fulfillCheckout(String(p.stripe_session_id));assert.ok(confirmed.ok);assert.equal(confirmed.value.status,'PENDING');assert.equal((await getTopicComments(topic)).ok,true);
   assert.equal(getDatabase().prepare('SELECT count(*) AS n FROM entitlements').get()?.n,0);
  });
  await t.test('ownership and unrecorded/tampered URL IDs fail before provider access',async()=>{
   const before=calls;assert.equal((await service.fulfillCheckout('cs_live_fake')).ok,false);assert.equal((await service.fulfillCheckout('cs_test_unknown')).ok,false);
   getDatabase().prepare("INSERT INTO users VALUES ('other','Other')").run();
   getDatabase().prepare("INSERT INTO purchases VALUES ('other-p','other',?,99,'eur','cs_test_other','PENDING',1,1)").run(topic);
   assert.equal((await service.fulfillCheckout('cs_test_other')).ok,false);assert.equal(calls,before);
  });
  await t.test('paid flag alone, live session, wrong currency, amount, product, quantity or metadata do not unlock',async()=>{
   const p=purchaseFor(topic);const id=String(p.stripe_session_id);paid(id);const baseline=structuredClone(sessions.get(id)!);
   const mutations:Array<(s:Stripe.Checkout.Session)=>void>=[s=>{s.livemode=true;},s=>{s.mode='subscription';},s=>{s.amount_total=0;},s=>{s.currency='usd';},s=>{s.client_reference_id='other';},s=>{s.metadata!.topicId='topic-job-02';},s=>{s.status='open';},s=>{s.line_items!.data[0].quantity=2;},s=>{s.line_items!.data[0].price!.unit_amount=98;},s=>{(s.line_items!.data[0].price!.product as Stripe.Product).metadata.topicId='other';},s=>{s.line_items!.has_more=true;},s=>{s.line_items!.data.push(s.line_items!.data[0]);},s=>{s.payment_method_types=['card','sepa_debit'];}];
   for(const mutate of mutations){const candidate=structuredClone(baseline);mutate(candidate);sessions.set(id,candidate);const result=await service.fulfillCheckout(id);assert.ok(!result.ok||result.value.status==='PENDING');assert.equal(getDatabase().prepare("SELECT count(*) AS n FROM entitlements WHERE user_id='demo-user'").get()?.n,0);}
   sessions.set(id,baseline);
  });
  await t.test('transaction rollback after payment can recover without another charge; duplicate confirmation is idempotent',async()=>{
   const p=purchaseFor(topic);const id=String(p.stripe_session_id);
   getDatabase().exec("CREATE TRIGGER simulated_failure BEFORE INSERT ON entitlements BEGIN SELECT RAISE(ABORT,'SIMULATED write failure'); END;");
   assert.equal((await service.fulfillCheckout(id)).ok,false);assert.equal(purchaseFor(topic).status,'PENDING');getDatabase().exec('DROP TRIGGER simulated_failure');
   const recovered=await service.recoverTopic(topic);assert.ok(recovered.ok);assert.equal(recovered.value.status,'UNLOCKED');
   await Promise.all([service.fulfillCheckout(id),service.fulfillCheckout(id)]);
   assert.equal(getDatabase().prepare("SELECT count(*) AS n FROM entitlements WHERE user_id='demo-user' AND topic_id=?").get(topic)?.n,1);
   const comments=await getTopicComments(topic);assert.ok(comments.ok);assert.equal(comments.value.comments.length,7);
   const other=await getTopicComments('topic-job-02');assert.ok(other.ok);assert.equal(other.value.unlocked,false);assert.equal(other.value.comments.length,3);
   assert.equal((await service.createCheckout(topic)).ok,false);seedCommunity();assert.equal(purchaseFor(topic).status,'PAID');closeDatabase();const persisted=await getTopicComments(topic);assert.ok(persisted.ok);assert.equal(persisted.value.unlocked,true);
  });
  await t.test('ambiguous create retries same purchase/idempotency key and expired session allows a new attempt',async()=>{
   ambiguous=true;assert.equal((await service.createCheckout('topic-job-02')).ok,false);const first=purchaseFor('topic-job-02');assert.equal(first.status,'CREATING');
   assert.ok((await service.createCheckout('topic-job-02')).ok);assert.equal(purchaseFor('topic-job-02').id,first.id);
   const oldId=String(purchaseFor('topic-job-02').stripe_session_id);sessions.get(oldId)!.status='expired';sessions.get(oldId)!.url=null;
   assert.ok((await service.createCheckout('topic-job-02')).ok);assert.notEqual(purchaseFor('topic-job-02').id,first.id);
   assert.equal(getDatabase().prepare('SELECT status FROM purchases WHERE id=?').get(first.id)?.status,'EXPIRED');
  });
  await t.test('signed events verify raw body; invalid signature/live/irrelevant events cannot fulfill, duplicates are safe',async()=>{
   const oldKey=process.env.STRIPE_SECRET_KEY,oldSecret=process.env.STRIPE_WEBHOOK_SECRET;process.env.STRIPE_SECRET_KEY='sk_test_simulated';process.env.STRIPE_WEBHOOK_SECRET='whsec_simulated';
   try {
    const id=String(purchaseFor('topic-job-02').stripe_session_id);paid(id);
    const body=JSON.stringify({id:'evt_simulated',type:'checkout.session.completed',livemode:false,data:{object:{id}}});
    const signature=Stripe.webhooks.generateTestHeaderString({payload:body,secret:'whsec_simulated'});
    assert.equal((await processStripeWebhook(body,'bad',verifyStripeEvent,id=>service.fulfillCheckout(id,false))).status,400);
    assert.equal((await processStripeWebhook(body+' ',signature,verifyStripeEvent,id=>service.fulfillCheckout(id,false))).status,400);
    assert.equal((await processStripeWebhook(body,signature,verifyStripeEvent,id=>service.fulfillCheckout(id,false))).status,200);
    assert.equal((await processStripeWebhook(body,signature,verifyStripeEvent,id=>service.fulfillCheckout(id,false))).status,200);
    assert.equal(getDatabase().prepare('SELECT count(*) AS n FROM entitlements WHERE topic_id=?').get('topic-job-02')?.n,1);
    const live=JSON.parse(body);live.livemode=true;assert.equal((await processStripeWebhook('', '',()=>live,()=>{throw Error('must not fulfill');})).status,400);
    live.livemode=false;live.type='payment_intent.created';assert.equal((await processStripeWebhook('', '',()=>live,()=>{throw Error('must not fulfill');})).status,200);
   } finally {if(oldKey===undefined)delete process.env.STRIPE_SECRET_KEY;else process.env.STRIPE_SECRET_KEY=oldKey;if(oldSecret===undefined)delete process.env.STRIPE_WEBHOOK_SECRET;else process.env.STRIPE_WEBHOOK_SECRET=oldSecret;}
  });
 } finally {closeDatabase();if(oldPath===undefined)delete process.env.DATABASE_PATH;else process.env.DATABASE_PATH=oldPath;rmSync(folder,{recursive:true,force:true});}
});
