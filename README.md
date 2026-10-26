# Laced by MJ

Static catalog website for Laced by MJ: sneakers, streetwear, accessories and collectibles. Visitors build an inquiry list and send it to the owner through a form. There is no checkout.

## Pages

| File | Page |
| --- | --- |
| `index.html` | Home: hero, shop by brand, about teaser |
| `catalog.html` | Searchable, filterable catalog |
| `how-to-inquire.html` | How the inquiry process works |
| `about.html` | About us |
| `contact.html` | Contact |

## Files

- `site.js` – shared script: header, footer, product popup, inquiry popup and form, catalog logic
- `style.css`, `gotham.css`, `pages.css` – styles (`gotham.css` is the dark theme layered on top of `style.css`)
- `catalog.json` – product data (sample of 13 items; replace with the full list)
- `config.json` – business settings: `name`, `email`, `web3formsKey`, `logoUrl` (set to `images/logo.png`)

## Setup

1. Get a free access key at [web3forms.com](https://web3forms.com) (enter the email that should receive inquiries) and put it in `config.json` as `web3formsKey`.
2. Put your email in `config.json` as `email` (used on the Contact page and as a fallback if no key is set).
3. Replace `catalog.json` with the full product list. Each product looks like:

```json
{"id":"HQ8708","sku":"HQ8708","name":"Campus 00s Core Black","sizes":["8"],"aliases":[],
 "image":"images/HQ8708.webp","category":"Footwear","brand":"adidas","fit":"General"}
```

4. Product and brand images load from the original site until you copy an `images/` folder here. Then set `ASSET_BASE` to `''` at the top of `site.js`.

## Run locally

```
python3 -m http.server
```

Then open http://localhost:8000. Opening the files directly will not work because the page loads `catalog.json` with `fetch`.

## Deploy

Any static host works (GitHub Pages, Netlify, Cloudflare Pages). For GitHub Pages: Settings → Pages → deploy from the `main` branch, root folder.

## How an inquiry works

1. "Add to inquiry" stores `{id, size}` in the visitor's `localStorage`, so the list follows them between pages.
2. The Inquiry popup lists the items (each has an × to remove it) and asks for name, phone and email.
3. On submit, the items and contact details are sent to Web3Forms, which emails them to the address you registered. If no key is set, it falls back to opening the visitor's email app with a pre-filled message.
