# Contact submission recovery

Each normalized draft has an opaque UUIDv4 submission identity. Before POST, the form saves that identity in sessionStorage under a SHA-256 fingerprint. Contact fields are not stored. An unchanged draft can reuse its identity after a network error, request timeout, invalid acknowledgement or same-tab reload. Different drafts retain separate pending identities. Confirmed success removes the completed identity so a later intentional inquiry can be submitted separately.

The receiver must atomically accept the lead and its submission identity, return the same lead ID on an unchanged retry, and reject changed content under that identity. A successful HTTP status alone is insufficient: the form requires a JSON success receipt with a nonempty lead ID and the matching submission identity. The previous receiver must be upgraded before publishing this website change.

While a request is pending the handler prevents duplicate submission and preserves raw newer form edits. Success resets only the submitted draft. If crypto or session storage is unavailable, the form keeps the draft and offers the existing phone/email fallback; it does not send without retry protection. A 20 second timeout releases the form while retaining the original identity.

The guarantee is limited to retained session storage and an unchanged normalized draft. Closing the tab, clearing storage, switching browsers or changing the inquiry creates a new request context. There is no global email deduplication. A receipt confirms original acceptance; the receiver owns durable storage and subsequent operator handling.

Run `npm ci` and `npm test` inside `tests/`. The suite executes the actual inline handler through JSDOM with synthetic fetch responses and real Web Crypto. It performs no browser automation and submits no external lead. Production receiver persistence and real browser acceptance must be verified separately.
