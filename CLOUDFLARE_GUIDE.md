# Cloudflare Redirect Guide

You asked how to redirect `https://roboledgers-com.pages.dev/app` to `roboledgers.com`.

I have added a `_redirects` file to your project which is the code-based way to do this.

## Method 1: The `_redirects` File (Implemented)
I created a file named `_redirects` in your project root. Cloudflare Pages reads this automatically.
```
/app https://roboledgers.com 301
```
*Effect:* Any visitor to `your-site.pages.dev/app` will be permanently moved to `https://roboledgers.com`.

## Method 2: Custom Domains (Recommended for Site-wide)
If you want **ALL** traffic to go to `roboledgers.com`, you shouldn't use redirects for everything. Instead:
1.  Log in to **Cloudflare Dashboard**.
2.  Go to **Workers & Pages** -> Select your project.
3.  Go to **Custom Domains**.
4.  Add `roboledgers.com` as a custom domain.
    *   *Cloudflare will automatically serve your site there.*

## Method 3: Bulk Redirects (Dashboard)
If you want to manage this outside of code:
1.  Go to **Cloudflare Dashboard** -> **websites** -> **roboledgers.com**.
2.  Go to **Rules** -> **Redirect Rules** (or Bulk Redirects).
3.  Create a rule:
    *   If incoming URL contains `pages.dev/app`...
    *   Then redirect to `https://roboledgers.com`.
