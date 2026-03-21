#!/usr/bin/env bash
set -euo pipefail

required_files=(
  "index.html"
  "about.html"
  "services.html"
  "contact.html"
  "styles.css"
  "sitemap.xml"
  "robots.txt"
  "_headers"
  "_redirects"
)

for file in "${required_files[@]}"; do
  if [[ ! -f "$file" ]]; then
    echo "Missing required file: $file"
    exit 1
  fi
done

for html in index.html about.html services.html contact.html; do
  if ! grep -qi "<title>" "$html"; then
    echo "Missing <title> in $html"
    exit 1
  fi
done

service_count=$(find services -maxdepth 1 -type f -name "*.html" | wc -l | tr -d " ")
if [[ "$service_count" -lt 10 ]]; then
  echo "Expected at least 10 service pages, found $service_count"
  exit 1
fi

if ! grep -q "<urlset" sitemap.xml; then
  echo "sitemap.xml is missing <urlset>"
  exit 1
fi

echo "Static site validation passed."
