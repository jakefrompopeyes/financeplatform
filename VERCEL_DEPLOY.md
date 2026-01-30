# Deploy on Vercel

## 1. Connect your repo

1. Go to **[vercel.com](https://vercel.com)** and sign in (use **Continue with GitHub**).
2. Click **Add New…** → **Project**.
3. **Import** the repo: `jakefrompopeyes/financeplatform`.
4. Leave **Framework Preset** as **Next.js** (auto-detected).
5. Click **Deploy**.

The first deploy may fail until you add environment variables (step 2).

---

## 2. Add environment variables

Your app needs API keys. In Vercel:

1. Open your project → **Settings** → **Environment Variables**.
2. Add each variable (name + value). Use the same names as in `env.example`:

| Name | Where to get it |
|------|------------------|
| `FMP_API_KEY` | [Financial Modeling Prep](https://site.financialmodelingprep.com/register) |
| `COINGECKO_API_KEY` | [CoinGecko](https://www.coingecko.com/en/api) |
| `OPENAI_API_KEY` | [OpenAI](https://platform.openai.com/api-keys) |
| `FRED_API_KEY` | [FRED](https://fred.stlouisfed.org/) |

3. Add them for **Production**, **Preview**, and **Development** (or at least Production).
4. **Redeploy**: **Deployments** → ⋮ on latest → **Redeploy**.

---

## 3. Optional: deploy from CLI

After connecting once via the dashboard:

```bash
npx vercel login    # sign in in browser
npx vercel link     # link this folder to your Vercel project
npx vercel --prod   # deploy to production
```

Your live URL will be like: `https://financeplatform-xxx.vercel.app` (or your custom domain).
