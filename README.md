# ScamShield AI — USTH-inspired frontend

A responsive, bilingual (Vietnamese/English) **frontend prototype** built with HTML, CSS, and vanilla JavaScript.

> IMPORTANT: This is a UI demo, not a working URL security scanner. It does not classify links, call an AI model, authenticate users, or send URL/password data to a server. The result area explicitly says verification is unavailable. Do not use it to make security decisions.

## Project structure

```text
scamshield-usth/
├── index.html
├── styles.css
├── script.js
├── assets/
│   └── usth-inspired-mark.svg
├── .gitignore
└── README.md
```

## Run locally

**Option A:** Open `index.html` in Chrome/Edge.

**Option B (recommended):** In VS Code, open this folder, then use the Live Server extension and click **Go Live**.

**Option C (Python):** From inside this folder, run `python -m http.server 5500`, then open http://localhost:5500.

## Features

- Responsive navigation, hero section, scan form, features, risk-report placeholder, and sign-in dialog.
- VI / EN toggle (saved in localStorage if available).
- Basic client-side URL format validation; does not visit submitted URLs.
- Original stylized shield-and-U mark inspired by USTH, **not the official USTH logo**.
- CSS-only cyber-grid / radar background, no third-party image assets.
- Google Fonts (Space Grotesk and DM Sans); browser fallbacks work offline.

## Integrating the real Go backend later

1. Design a secure endpoint such as `POST /api/v1/analyze` accepting a URL.
2. Validate input server-side, add rate limiting and logging with sensitive-data minimization.
3. Return a documented schema with `risk_level`, `score`, `signals`, `sources`, and `checked_at`.
4. Replace the `showPreview()` demo in `script.js` with a `fetch()` request to your API and render results using `textContent` (avoid injecting untrusted HTML).
5. Implement authentication server-side. Never store passwords in JavaScript or commit API keys.
6. Configure HTTPS and CORS appropriately for deployment.

## GitHub team workflow

1. Confirm with teammates which repository and branch to use.
2. Add this folder as `frontend/` in the team repo (or copy its contents into the existing frontend folder).
3. From the repository root:

```bash
git pull origin main
git checkout -b feature/scamshield-frontend
git add frontend/
git commit -m "feat: add bilingual ScamShield frontend prototype"
git push -u origin feature/scamshield-frontend
```

4. Open a pull request to `main` on GitHub; ask teammates to review and merge.

If your team uses a different default branch, replace `main` accordingly. Do not run `git init` inside an existing cloned team repository.

## Publishing with GitHub Pages

GitHub Pages serves static HTML/CSS/JS only. It will **not** run the Go backend. In the repo settings, choose **Pages → Build and deployment** and publish from the appropriate branch/folder or configure a GitHub Actions Pages workflow. For the simplest setup, put the site files at the repository root or in `/docs` on the publishing branch.

## License and attribution

The logo graphic in this prototype is original and USTH-inspired; it is not an official university mark. Replace it with a licensed official logo only if the university authorizes that use.
