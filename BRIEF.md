# K Squared Inspections — Build Brief

## Overview
Build a professional website for K Squared Inspections, a home inspection company in Ocala/Gainesville, FL.

## Brand Colors
- **Primary Dark (Navy)**: #1B2433
- **Primary Green**: #6BB535
- **White text on dark backgrounds**
- **Two-color system** — dark and green, inversions for variety

## Logo
- Hexagonal "K²" mark with geometric sans-serif typography
- Font family: Montserrat or similar geometric sans
- Files: logo-dark.jpg (green on navy), logo-green.jpg (navy on green)

## Client Info
- **Company**: K Squared Inspections
- **Owner**: Andrew Spitzer
- **Email**: ksquaredinspectionsfl@gmail.com
- **Phone**: 352-572-4156
- **Tagline**: "Your Home, Your Investment, Our Priority"
- **Service Area**: Ocala, Gainesville, Citra — Tri-county area (Marion, Alachua)

## 12 Services
1. Pre-Listing Inspections
2. Home Inspections (general/buyer)
3. Radon Testing
4. Four Point Insurance Inspections
5. Wind Mitigation Insurance Inspections
6. Thermal Imaging
7. Well Water Quality Testing
8. New Construction Inspections
9. Punchlist Inspections
10. Construction Draw/Phase Inspections
11. WDO (Wood Destroying Organism) Inspections
12. Mobile Home Tie Down Engineering Inspections

## Site Structure (same stack as aissistedconsulting.com — static HTML/CSS/JS)

### Pages
1. **index.html** — Homepage
   - Hero with tagline, CTA button ("Schedule Your Inspection")
   - Services overview grid (12 services with icons)
   - Why Choose K² section (experience, certifications, technology)
   - Service area map/mention
   - Testimonials section (placeholder)
   - Contact CTA footer

2. **services.html** — All services overview page
   - Card grid with all 12 services
   - Link to individual service pages

3. **about.html** — About Andrew & K²
   - Professional bio
   - Certifications, experience
   - Mission statement

4. **contact.html** — Contact page
   - Contact form (name, email, phone, service needed, property address, message)
   - Phone number, email, service area
   - Google Maps embed for Ocala area

5. **Individual service pages** (in /services/ directory):
   - pre-listing.html
   - home-inspection.html
   - radon-testing.html
   - four-point.html
   - wind-mitigation.html
   - thermal-imaging.html
   - well-water.html
   - new-construction.html
   - punchlist.html
   - construction-draw.html
   - wdo-inspection.html
   - mobile-home-tiedown.html

### Technical
- Single styles.css
- Mobile-first responsive
- SEO optimized (structured data, meta tags, sitemap)
- Fast loading (no frameworks, vanilla JS)
- Contact form sends to ksquaredinspectionsfl@gmail.com
- robots.txt + sitemap.xml
- _headers + _redirects for Cloudflare Pages
- Accessibility (WCAG AA)

### Design References
- Use aissistedconsulting.com as structural reference
- Professional, clean, trustworthy
- Hero sections with gradient overlays
- Card-based service sections
- Smooth scrolling, subtle animations
- Florida home inspection industry appropriate
