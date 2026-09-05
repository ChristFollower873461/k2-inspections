import assert from 'node:assert/strict';
import test from 'node:test';
import { readFileSync } from 'node:fs';
import { JSDOM } from 'jsdom';

const html = readFileSync(new URL('../contact.html', import.meta.url), 'utf8');

test('invalid required fields and invalid email do not send a lead', async t => {
  const page = mount(t, () => { throw new Error('unexpected submission'); });
  await page.submit();
  page.fill({ ...draft, email: 'invalid-email' });
  await page.submit();
  assert.equal(page.calls.length, 0);
  assert.equal(page.values().message, draft.message);
  assert.equal(page.button.disabled, false);
});

test('successful request submits trimmed fields and resets only after the response', async t => {
  const request = deferred();
  const page = mount(t, () => request.promise);
  page.fill();
  const complete = page.submit();
  assert.equal(page.button.disabled, true);
  assert.equal(page.button.getAttribute('aria-busy'), 'true');
  assert.ok(page.status.classList.contains('pending'));
  assert.equal(page.values().message, draft.message);
  assert.equal(page.calls.length, 1);
  assert.equal(page.calls[0].options.method, 'POST');
  assert.equal(page.calls[0].options.headers['Content-Type'], 'application/json');
  assert.deepEqual(page.calls[0].payload, Object.fromEntries(Object.entries(draft).map(([key, value]) => [key, value.trim()])));
  request.resolve(new Response('', { status: 201 }));
  await complete;
  assert.ok(page.status.classList.contains('success'));
  assert.ok(Object.values(page.values()).every(value => value === ''));
  assert.equal(page.button.disabled, false);
  assert.equal(page.button.hasAttribute('aria-busy'), false);
});

for (const failure of ['HTTP 500', 'network rejection']) {
  test(`${failure} keeps the full draft and allows a successful retry`, async t => {
    const page = mount(t, attempt => attempt > 1
      ? Promise.resolve(new Response('', { status: 200 }))
      : failure === 'HTTP 500'
        ? Promise.resolve(new Response('', { status: 500 }))
        : Promise.reject(new TypeError('synthetic network failure')));
    page.fill();
    await page.submit();
    assert.deepEqual(page.values(), draft);
    assert.ok(page.status.classList.contains('error'));
    assert.equal(page.button.disabled, false);
    assert.equal(page.button.hasAttribute('aria-busy'), false);
    assert.match(page.window.document.getElementById('mailto-fallback').getAttribute('href'), /^mailto:/);
    await page.submit();
    assert.equal(page.calls.length, 2);
    assert.ok(page.status.classList.contains('success'));
    assert.ok(Object.values(page.values()).every(value => value === ''));
  });
}

test('success preserves a newer unsent message and a later retry sends those edits', async t => {
  const request = deferred();
  const page = mount(t, attempt => attempt === 1
    ? request.promise
    : Promise.resolve(new Response('', { status: 200 })));
  page.fill();
  const complete = page.submit();
  const changedMessage = 'New unsent inspection detail entered while sending.';
  page.form.elements.namedItem('message').value = changedMessage;
  page.form.elements.namedItem('message').dispatchEvent(new page.window.Event('input', { bubbles: true }));
  assert.equal(page.calls[0].payload.message, draft.message.trim());
  request.resolve(new Response('', { status: 200 }));
  await complete;
  assert.deepEqual(page.values(), { ...draft, message: changedMessage });
  assert.ok(page.status.classList.contains('success'));
  assert.match(page.status.textContent, /newer edits.*have not been sent/i);
  assert.equal(page.button.disabled, false);
  assert.equal(page.button.hasAttribute('aria-busy'), false);

  await page.submit();
  assert.equal(page.calls.length, 2);
  assert.equal(page.calls[1].payload.message, changedMessage);
  assert.ok(Object.values(page.values()).every(value => value === ''));
  assert.doesNotMatch(page.status.textContent, /have not been sent/i);
});

test('success also preserves changes to the selected inspection service', async t => {
  const request = deferred();
  const page = mount(t, () => request.promise);
  page.fill();
  const complete = page.submit();
  page.form.elements.namedItem('service').value = 'Radon Testing';
  page.form.elements.namedItem('service').dispatchEvent(new page.window.Event('change', { bubbles: true }));
  request.resolve(new Response('', { status: 200 }));
  await complete;
  assert.equal(page.calls[0].payload.service, 'Home Inspection');
  assert.deepEqual(page.values(), { ...draft, service: 'Radon Testing' });
  assert.match(page.status.textContent, /newer edits.*have not been sent/i);
});

test('success preserves raw field edits even when their trimmed payload would match', async t => {
  const request = deferred();
  const page = mount(t, () => request.promise);
  page.fill();
  const complete = page.submit();
  const changedMessage = draft.message + '  ';
  page.form.elements.namedItem('message').value = changedMessage;
  request.resolve(new Response('', { status: 200 }));
  await complete;
  assert.equal(page.values().message, changedMessage);
  assert.match(page.status.textContent, /newer edits.*have not been sent/i);
});

test('a failed pending request retains edits and retries the current draft', async t => {
  const request = deferred();
  const page = mount(t, attempt => attempt === 1
    ? request.promise
    : Promise.resolve(new Response('', { status: 200 })));
  page.fill();
  const complete = page.submit();
  const changedMessage = 'New detail retained after a failed request.';
  page.form.elements.namedItem('message').value = changedMessage;
  request.reject(new TypeError('synthetic network failure'));
  await complete;
  assert.deepEqual(page.values(), { ...draft, message: changedMessage });
  assert.ok(page.status.classList.contains('error'));
  assert.equal(page.button.disabled, false);
  await page.submit();
  assert.equal(page.calls[1].payload.message, changedMessage);
  assert.ok(page.status.classList.contains('success'));
  assert.ok(Object.values(page.values()).every(value => value === ''));
});

const draft = {
  name: '  Synthetic Reviewer  ',
  email: 'reviewer@example.invalid',
  phone: '  202-555-0100  ',
  service: 'Home Inspection',
  propertyAddress: '  Synthetic property, not a real address  ',
  message: '  Local test only; do not submit to a provider.  ',
};

function deferred() {
  let resolve;
  let reject;
  const promise = new Promise((yes, no) => { resolve = yes; reject = no; });
  return { promise, resolve, reject };
}

function mount(t, respond) {
  // outside-only executes neither script tags nor external resources automatically.
  const dom = new JSDOM(html, {
    url: 'https://k2-local.invalid/contact.html',
    runScripts: 'outside-only',
  });
  t.after(() => dom.window.close());
  const { window } = dom;
  const form = window.document.getElementById('lead-form');
  const button = form.querySelector('button[type="submit"]');
  const status = window.document.getElementById('form-status');
  const calls = [];
  window.fetch = (url, options) => {
    // Captured locally. There is no call to Node fetch or any network transport.
    assert.equal(url, 'https://hq.k2inspections.com/api/leads');
    calls.push({ url, options, payload: JSON.parse(options.body) });
    return respond(calls.length);
  };

  let completion;
  const add = form.addEventListener.bind(form);
  form.addEventListener = (name, handler, options) => {
    if (name !== 'submit') return add(name, handler, options);
    return add(name, function (event) {
      // Observe the promise returned by the actual registered handler; do not copy it.
      completion = Promise.resolve(handler.call(this, event));
    }, options);
  };
  const scripts = [...window.document.scripts].filter(script => !script.src && script.textContent.includes('lead-form'));
  assert.equal(scripts.length, 1, 'one actual contact handler must be present');
  window.eval(scripts[0].textContent);

  return {
    window, form, button, status, calls,
    fill(values = draft) {
      for (const [name, value] of Object.entries(values)) form.elements.namedItem(name).value = value;
    },
    values() {
      return Object.fromEntries(Object.keys(draft).map(name => [name, form.elements.namedItem(name).value]));
    },
    submit() {
      completion = undefined;
      form.requestSubmit();
      assert.ok(completion, 'native requestSubmit must invoke the actual form handler');
      return completion;
    },
  };
}
