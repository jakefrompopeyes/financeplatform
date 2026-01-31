# Connect IONOS Domain to Vercel

Use this guide to point your IONOS domain to your Vercel project. You keep the domain at IONOS and only add DNS records; no transfer needed.

---

## Part 1: Add the domain in Vercel

1. Open **[Vercel Dashboard](https://vercel.com/dashboard)** → select your **financeplatform** project.
2. Go to **Settings** → **Domains**.
3. Click **Add Domain**.
4. Enter your domain, e.g.:
   - **Apex:** `yourdomain.com`
   - Vercel will suggest adding **www** as well; you can add `www.yourdomain.com`.
5. Click **Add**.
6. On the domain row, Vercel will show **Configure** and the exact DNS records you need. **Leave this tab open** — you’ll copy the values from here.

You’ll typically see:

- **Apex (yourdomain.com):** an **A** record → IP like `76.76.21.21`.
- **www (www.yourdomain.com):** a **CNAME** record → target like `cname.vercel-dns.com` or a project-specific `*.vercel-dns-*.com`.

Copy the **exact** values Vercel shows for your project (they can differ).

---

## Part 2: Add DNS records in IONOS

1. Log in at **[IONOS](https://www.ionos.com)** and open the **Domains** section.
2. Find your domain → click the **gear (⚙️)** under **Actions** → **DNS** (or **Manage DNS** / **DNS Settings**).
3. Add the records Vercel asked for.

### A record (apex: yourdomain.com)

- Click **Add record** (or **+ Add**).
- **Type:** `A`
- **Host / Name:**  
  - If IONOS asks for “host”: use `@` (or leave blank) for the root domain.  
  - If it shows “Name” and your domain is already there: often `@` or blank.
- **Points to / Value / Target:** the **IPv4 address** from Vercel (e.g. `76.76.21.21`).
- **TTL:** default is fine (e.g. 3600 or 1 hour).
- Save.

### CNAME record (www: www.yourdomain.com)

- Click **Add record** again.
- **Type:** `CNAME`
- **Host / Name:** `www` (only the subdomain part).
- **Points to / Value / Target:** the **CNAME target** from Vercel (e.g. `cname.vercel-dns.com` or the `*.vercel-dns-*.com` value).
- **TTL:** default.
- Save.

### If Vercel asked for a TXT record (verification)

- **Type:** `TXT`
- **Host / Name:** `@` (or whatever Vercel shows, often `_vercel` or blank).
- **Value / Content:** the exact verification string from Vercel.
- Save.

---

## Part 3: Wait and verify

- DNS can take from a few minutes up to **24–48 hours** to propagate.
- In Vercel **Settings → Domains**, the domain status will change to a checkmark when it’s valid.
- Optional: check propagation at [whatsmydns.net](https://www.whatsmydns.net) for your domain.

---

## Quick reference

| In Vercel you see | In IONOS you add |
|-------------------|------------------|
| A record → `76.76.21.21` (or other IP) | Type: **A**, Host: **@**, Value: that IP |
| CNAME → `cname.vercel-dns.com` (or project CNAME) | Type: **CNAME**, Host: **www**, Value: that target |
| TXT for verification | Type: **TXT**, Host: as shown in Vercel, Value: verification string |

---

## Troubleshooting

- **“Invalid configuration” in Vercel:** Wait a bit longer, then refresh. Ensure the A and CNAME values in IONOS match Vercel exactly (no extra spaces, correct host/subdomain).
- **Only www or only apex works:** Add both the A record (apex) and the CNAME (www) in IONOS as above.
- **IONOS UI differs:** Look for “DNS”, “DNS Settings”, or “Manage DNS” for the domain; then “Add record” and choose A, CNAME, or TXT as needed.

Once the domain shows as configured in Vercel, your app will be served at your IONOS domain with HTTPS automatically.
