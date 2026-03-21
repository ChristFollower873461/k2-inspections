# K Squared Inspections Website

Public marketing website for K Squared Inspections (Ocala, Gainesville, and Citra, FL).

[![CI](https://github.com/ChristFollower873461/k2-inspections/actions/workflows/ci.yml/badge.svg)](https://github.com/ChristFollower873461/k2-inspections/actions/workflows/ci.yml)
[![License: MIT](https://img.shields.io/badge/License-MIT-yellow.svg)](LICENSE)

## Overview
- Static HTML/CSS site (no runtime framework dependency)
- Service pages for all primary inspection offerings
- Contact form posts to CRM API endpoint
- SEO and crawler support via `sitemap.xml` and `robots.txt`
- Cloudflare Pages support via `_headers` and `_redirects`

## Public Snapshot
- Status: Production marketing site
- Stack: Static HTML/CSS + Cloudflare Pages
- Scope: Homepage, service pages, contact flow, crawl/SEO metadata
- Domain: `k2inspections.com`

## Structure
- `index.html` — homepage
- `services.html` — service overview
- `about.html` — company/about page
- `contact.html` — contact page + lead form submit
- `services/` — individual service landing pages
- `styles.css` — shared styling
- `img/` — brand assets and logos
- `_headers` / `_redirects` — edge/CDN behavior config

## Local Preview
Any static file server works. Example:

```bash
python3 -m http.server 8080
```

Then open `http://localhost:8080`.

## Verification

```bash
bash scripts/validate-site.sh
```

## Deployment Notes
- Primary domain: `k2inspections.com`
- Ensure `_headers`, `_redirects`, `robots.txt`, and `sitemap.xml` are published with the site.
- Contact form endpoint is configured in `contact.html`.

## Maintenance
- Keep service content, contact details, and metadata current.
- Update `sitemap.xml` `lastmod` values when page content changes materially.

## License

[MIT](LICENSE)
