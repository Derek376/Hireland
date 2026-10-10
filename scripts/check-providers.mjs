// Real provider readiness probe. No CV, keys, balances or provider response bodies are logged.
import Stripe from 'stripe';

const checks = [];
async function probeOpenRouter() {
  if (!process.env.OPENROUTER_API_KEY || !process.env.OPENROUTER_MODEL) {
    return { provider: 'OpenRouter', status: 'BLOCKED', reason: 'Set OPENROUTER_API_KEY and OPENROUTER_MODEL in .env.local' };
  }
  const response = await fetch('https://openrouter.ai/api/v1/chat/completions', {
    method: 'POST',
    signal: AbortSignal.timeout(20000),
    headers: { Authorization: `Bearer ${process.env.OPENROUTER_API_KEY}`, 'Content-Type': 'application/json' },
    body: JSON.stringify({
      model: process.env.OPENROUTER_MODEL,
      messages: [{ role: 'user', content: 'This is a readiness check. Return {"ok":true}.' }],
      provider: { require_parameters: true },
      response_format: { type: 'json_schema', json_schema: { name: 'readiness', strict: true, schema: { type: 'object', properties: { ok: { type: 'boolean', const: true } }, required: ['ok'], additionalProperties: false } } },
      max_tokens: 128,
      stream: false
    })
  });
  if (!response.ok) return { provider: 'OpenRouter', status: 'FAIL', httpStatus: response.status };
  const data = await response.json();
  const result = JSON.parse(data.choices?.[0]?.message?.content ?? 'null');
  if (!result || result.ok !== true || Object.keys(result).length !== 1) return { provider: 'OpenRouter', status: 'FAIL', reason: 'Invalid structured output' };
  return { provider: 'OpenRouter', status: 'PASS', evidence: 'Real chat completion with validated structured output; not the M2 product feature' };
}
async function probeStripe() {
  const key = process.env.STRIPE_SECRET_KEY;
  if (!key) return { provider: 'Stripe', status: 'BLOCKED', reason: 'Set sandbox STRIPE_SECRET_KEY in .env.local' };
  if (!/^(sk|rk)_test_/.test(key)) return { provider: 'Stripe', status: 'FAIL', reason: 'Refusing non-test or unrecognized key' };
  const stripe = new Stripe(key, { timeout: 20000, maxNetworkRetries: 0 });
  const balance = await stripe.balance.retrieve();
  if (balance.livemode !== false) return { provider: 'Stripe', status: 'FAIL', reason: 'Not sandbox mode' };
  return { provider: 'Stripe', status: 'PASS', evidence: 'Authenticated read-only sandbox request; no Checkout or transaction created' };
}
for (const [provider, run] of [['OpenRouter', probeOpenRouter], ['Stripe', probeStripe]]) {
  try { checks.push(await run()); }
  catch (error) { checks.push({ provider, status: 'FAIL', reason: error.name === 'TimeoutError' ? 'Timeout' : 'Network, authentication or output error (response details suppressed)' }); }
}
console.log(JSON.stringify({ checks }, null, 2));
process.exitCode = checks.some(c => c.status === 'FAIL') ? 1 : checks.some(c => c.status === 'BLOCKED') ? 2 : 0;
