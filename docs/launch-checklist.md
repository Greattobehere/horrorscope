# HorrorScope: taking payments (launch checklist)

Do these in order. Each step says where to click. Nothing here needs code changes.
Tell Claude when a step is done and it will check it.

## 1. Let horrorscope.art send email (must come first)

Right now **no HorrorScope email is delivered**. Resend refuses with "The horrorscope.art
domain is not verified". Without this, a buyer pays and never gets their unlock link.

1. Go to **resend.com → Domains → Add Domain**, type `horrorscope.art`, and click **Add**.
2. Resend shows 3 or 4 DNS records (types **TXT** and **MX**). Leave that page open.
3. In another tab, go to **namecheap.com → Domain List → horrorscope.art → Manage → Advanced DNS**.
4. For each record Resend shows, click **Add New Record** and copy it over:
   - **Type**: the same as Resend (TXT or MX)
   - **Host**: Resend's "Name" **without** `.horrorscope.art` on the end (e.g. `resend._domainkey`, `send`)
   - **Value**: Resend's value, exactly
   - For MX, put Resend's priority number in the priority box
5. Click the green check mark to save each one.
6. Back in Resend, click **Verify DNS Records**. It can take a few minutes, sometimes an hour or two.

## 2. Make the pass secret

Passes are signed with a secret only the site knows.

1. On your PC, open **PowerShell** and run:
   `[Convert]::ToBase64String((1..48|%{Get-Random -Max 256}))`
2. In **Vercel → horrorscope → Settings → Environment Variables**, add `PASS_SECRET` with
   that value, for **Production** and **Preview**.
3. **Never change it later.** Changing it cancels every pass already sold.

## 3. Stripe

1. Sign up at **dashboard.stripe.com/register** and finish the business details it asks for
   (you can't take real payments until it's activated).
2. **Product catalog → Add product**: name `Veil Season Pass`, **One-off**, **$9.99**. Save.
3. **Payment Links → New**: choose the Veil Season Pass.
   - Under **After payment**, choose **Show confirmation page** and add the message:
     *"Moira has your money. Check your email for your unlock link (look in spam too)."*
   - Create the link and copy it (`https://buy.stripe.com/...`).
4. **Developers → API keys**: reveal and copy the **Secret key** (`sk_live_...`).
5. **Developers → Webhooks → Add endpoint**:
   - Endpoint URL: `https://horrorscope.art/api/stripe/webhook`
   - Event: `checkout.session.completed`
   - Save, then reveal and copy the **Signing secret** (`whsec_...`).
6. In **Vercel → Environment Variables** add, for **Production**:
   - `NEXT_PUBLIC_PAYMENT_LINK` = the payment link
   - `STRIPE_SECRET_KEY` = the secret key
   - `STRIPE_WEBHOOK_SECRET` = the signing secret
7. Tell Claude. It redeploys the site, and the "Get the Pass — $9.99" button goes live.

## 4. Test it with a real purchase

1. Buy one pass yourself on horrorscope.art with your own card.
2. Within a minute you should get Moira's email with **Unlock my readings**. Click it.
3. On the reading page, **Change Your Fate** should now let you rewrite as often as you like.
4. Refund yourself in **Stripe → Payments → (the payment) → Refund**.

If the email doesn't arrive, tell Claude: it can read the site's logs to see why.
