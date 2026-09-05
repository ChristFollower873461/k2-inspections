import assert from 'node:assert/strict';
import nodeTest from 'node:test';
const test = (name, fn) => nodeTest(name, { timeout: 5000 }, fn);
import { readFileSync } from 'node:fs';
import { webcrypto } from 'node:crypto';
import { JSDOM } from 'jsdom';

const html = readFileSync(new URL('../contact.html', import.meta.url), 'utf8');
const draft = {
  name: '  Synthetic Reviewer  ', email: 'reviewer@example.invalid', phone: '  202-555-0100  ',
  service: 'Home Inspection', propertyAddress: '  Synthetic property, not a real address  ',
  message: '  Local test only; do not submit to a provider.  ',
};
const accepted = (call, status = 201) => Response.json({ success: true, id: 'synthetic-lead-id', submissionId: call.payload.submissionId }, { status });

function deferred() {
  let resolve, reject;
  const promise = new Promise((yes, no) => { resolve = yes; reject = no; });
  return { promise, resolve, reject };
}
function mount(t, respond = (attempt, call) => accepted(call), options = {}) {
  const dom = new JSDOM(html, { url: 'https://k2-local.invalid/contact.html', runScripts: 'outside-only' });
  t.after(() => dom.window.close());
  const { window } = dom;
  Object.defineProperty(window.crypto, 'subtle', { value: webcrypto.subtle });
  window.TextEncoder = TextEncoder;
  for (const [key, value] of Object.entries(options.storage || {})) window.sessionStorage.setItem(key, value);
  options.configure?.(window);
  const form = window.document.getElementById('lead-form'), button = form.querySelector('button[type="submit"]');
  const status = window.document.getElementById('form-status'), calls = [], signals = [];
  const signal = n => signals[n - 1] ||= deferred();
  window.fetch = (url, request) => {
    assert.equal(url, 'https://hq.k2inspections.com/api/leads');
    const call = { url, options: request, payload: JSON.parse(request.body) };
    calls.push(call);
    signal(calls.length).resolve(call);
    // Only synthetic responses. No external resource, browser or network execution.
    return respond(calls.length, call);
  };
  let completion;
  const add = form.addEventListener.bind(form);
  form.addEventListener = (name, handler, opts) => name !== 'submit' ? add(name, handler, opts) :
    add(name, function (event) { completion = Promise.resolve(handler.call(this, event)); }, opts);
  const scripts = [...window.document.scripts].filter(s => !s.src && s.textContent.includes('lead-form'));
  assert.equal(scripts.length, 1);
  window.eval(scripts[0].textContent);
  return {
    window, form, button, status, calls,
    fill(values = draft) { for (const [name, value] of Object.entries(values)) form.elements.namedItem(name).value = value; },
    values() { return Object.fromEntries(Object.keys(draft).map(name => [name, form.elements.namedItem(name).value])); },
    storage() { return Object.fromEntries(Object.keys(window.sessionStorage).map(k => [k, window.sessionStorage.getItem(k)])); },
    sent(n = 1) { return signal(n).promise; },
    submit() {
      completion = undefined;
      form.requestSubmit();
      assert.ok(completion, 'native form submission must invoke the actual handler');
      return completion;
    },
  };
}

test('required fields and invalid email reject before sending', async t => {
  const page = mount(t);
  await page.submit();
  page.fill({ ...draft, email: 'invalid-email' });
  await page.submit();
  assert.equal(page.calls.length, 0);
  assert.equal(page.button.disabled, false);
});

test('persists identity before sending; confirms a durable receipt before resetting', async t => {
  const reply = deferred(), page = mount(t, () => reply.promise);
  page.fill();
  const done = page.submit(), call = await page.sent();
  assert.equal(page.button.disabled, true);
  assert.equal(page.button.getAttribute('aria-busy'), 'true');
  assert.ok(page.status.classList.contains('pending'));
  assert.equal(page.values().message, draft.message);
  const { submissionId, ...payload } = call.payload;
  assert.deepEqual(payload, Object.fromEntries(Object.entries(draft).map(([k, v]) => [k, v.trim()])));
  assert.match(submissionId, /^[0-9a-f-]{36}$/);
  assert.deepEqual(Object.values(page.storage()), [submissionId]);
  assert.match(Object.keys(page.storage())[0], /^k2-lead-retry-v1:[0-9a-f]{64}$/);
  assert.equal(call.options.method, 'POST');
  reply.resolve(accepted(call));
  await done;
  assert.ok(page.status.classList.contains('success'));
  assert.ok(Object.values(page.values()).every(v => v === ''));
  assert.deepEqual(page.storage(), {});
  assert.equal(page.button.disabled, false);
  assert.equal(page.button.hasAttribute('aria-busy'), false);
});

for (const failure of ['HTTP 503', 'network rejection', 'invalid JSON receipt', 'wrong identity receipt']) {
  test(`${failure} preserves the draft and reuses identical request on retry`, async t => {
    const page = mount(t, (attempt, call) => attempt > 1 ? accepted(call, 200) :
      failure === 'HTTP 503' ? new Response('', { status: 503 }) :
      failure === 'network rejection' ? Promise.reject(new TypeError('synthetic response loss')) :
      failure === 'invalid JSON receipt' ? new Response('<html>proxy</html>') :
      Response.json({ success: true, id: 'synthetic', submissionId: 'wrong' }));
    page.fill();
    await page.submit();
    assert.deepEqual(page.values(), draft);
    assert.ok(page.status.classList.contains('error'));
    assert.equal(page.button.disabled, false);
    await page.submit();
    assert.deepEqual(page.calls[1].payload, page.calls[0].payload);
    assert.ok(page.status.classList.contains('success'));
    assert.match(page.window.document.getElementById('mailto-fallback').getAttribute('href'), /^mailto:/);
  });
}

test('reload retains identity without storing contact fields', async t => {
  const first = mount(t, () => Promise.reject(new TypeError('synthetic lost response')));
  first.fill(); await first.submit();
  const stored = first.storage(), text = JSON.stringify(stored);
  for (const value of Object.values(draft)) assert.ok(!text.includes(value.trim()));
  const second = mount(t, undefined, { storage: stored });
  second.fill(); await second.submit();
  assert.deepEqual(second.calls[0].payload, first.calls[0].payload);
  assert.ok(second.status.classList.contains('success'));
});

test('duplicate submit while preparing identity or awaiting response sends once', async t => {
  const reply = deferred(), page = mount(t, () => reply.promise);
  page.fill(); const done = page.submit();
  await page.submit();
  const call = await page.sent(); await page.submit();
  assert.equal(page.calls.length, 1);
  reply.resolve(accepted(call)); await done;
});

for (const [field, value] of [['message', 'New unsent detail.'], ['service', 'Radon Testing'], ['message', draft.message + '  ']]) {
  test(`success preserves newer raw ${field} edits`, async t => {
    const reply = deferred(), page = mount(t, (attempt, call) => attempt === 1 ? reply.promise : accepted(call));
    page.fill(); const done = page.submit(); const call = await page.sent();
    page.form.elements.namedItem(field).value = value;
    reply.resolve(accepted(call)); await done;
    assert.deepEqual(page.values(), { ...draft, [field]: value });
    assert.match(page.status.textContent, /newer edits.*have not been sent/i);
    await page.submit();
    assert.equal(page.calls[1].payload[field], value.trim());
    assert.notEqual(page.calls[1].payload.submissionId, call.payload.submissionId);
    assert.ok(Object.values(page.values()).every(v => v === ''));
  });
}

test('uncertain older request retains identity when a different draft is attempted', async t => {
  const page = mount(t, () => Promise.reject(new TypeError('synthetic lost response')));
  page.fill(); await page.submit();
  page.fill({ ...draft, message: 'Different request.' }); await page.submit();
  assert.notEqual(page.calls[1].payload.submissionId, page.calls[0].payload.submissionId);
  page.fill(); await page.submit();
  assert.deepEqual(page.calls[2].payload, page.calls[0].payload);
});

test('new intentional inquiry after acknowledged success gets a new identity', async t => {
  const page = mount(t);
  page.fill(); await page.submit(); page.fill(); await page.submit();
  assert.notEqual(page.calls[1].payload.submissionId, page.calls[0].payload.submissionId);
});

for (const broken of ['storage denied', 'storage corrupt', 'crypto unavailable']) {
  test(`${broken} cannot silently send an unprotected request`, async t => {
    const page = mount(t, undefined, { configure(window) {
      if (broken === 'storage denied') Object.defineProperty(window, 'sessionStorage', { get() { throw new Error('synthetic storage denied'); } });
      else if (broken === 'storage corrupt') window.Storage.prototype.getItem = () => 'corrupt';
      else Object.defineProperty(window, 'crypto', { value: {} });
    } });
    page.fill(); await page.submit();
    assert.equal(page.calls.length, 0);
    assert.deepEqual(page.values(), draft);
    assert.ok(page.status.classList.contains('error'));
    assert.equal(page.button.disabled, false);
  });
}

test('request timeout leaves the original identity available for a retry', async t => {
  let timeout;
  const page = mount(t, (attempt, call) => attempt > 1 ? accepted(call) : new Promise((resolve, reject) =>
    call.options.signal.addEventListener('abort', () => reject(new Error('synthetic abort')), { once: true })), {
    configure(window) {
      const original = window.setTimeout.bind(window);
      window.setTimeout = (fn, ms, ...args) => ms === 20000 ? (timeout = fn, 0) : original(fn, ms, ...args);
    },
  });
  page.fill(); const done = page.submit(); await page.sent(); timeout(); await done;
  assert.ok(page.status.classList.contains('error'));
  await page.submit();
  assert.deepEqual(page.calls[1].payload, page.calls[0].payload);
});
