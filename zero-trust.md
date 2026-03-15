# Protecting the Admin Dashboard with Cloudflare Zero Trust

This guide sets up Cloudflare Access (Zero Trust) to protect `hollowedstone.com/admin` so only authorized users can view the admin dashboard (game logs, player IPs, metrics). Free tier, no extra cost.

## How It Works

```
Browser → hollowedstone.com/admin
    ↓
Cloudflare Access intercepts (before it reaches the Worker)
    ↓
Not authenticated? → Redirects to Cloudflare login page
    ↓
Enter email → Cloudflare sends a one-time PIN to that email
    ↓
Enter PIN → Cloudflare checks: is this email in the allow policy?
    ↓
Yes → Request passes through to Worker → Admin dashboard loads
No  → Blocked. Worker never sees the request.
```

The Worker doesn't handle auth at all — Cloudflare blocks unauthorized requests at the edge before they arrive.

## What You Get (Free Tier)

- Up to 50 users
- One-time PIN (email OTP) — no identity provider needed
- Optional: GitHub, Google, or other SSO
- Path-level protection (`/admin` is protected, game pages are not)
- Session management (configurable timeout)
- Audit logs of every access attempt

---

## Step 1: Create a Zero Trust Organization

1. Go to https://one.dash.cloudflare.com/
2. If first time, create a **team name** (e.g., `hollowedstone`)
3. Select the **Free** plan
4. Complete setup

---

## Step 2: Enable One-Time PIN Authentication

1. In the Zero Trust dashboard, go to **Settings** → **Authentication**
2. Under **Login methods**, find **One-time PIN**
3. It should be enabled by default. If not, click **Add** → select **One-time PIN**

> **Optional:** You can also add GitHub, Google, or other identity providers here. OTP is the simplest.

---

## Step 3: Create an Access Policy FIRST

You must create the policy (who is allowed) before you can apply it to a resource. The policy defines the allow-list of email addresses.

1. In the Zero Trust dashboard, go to **Access** → **Access Policies**
2. Click **Create a policy**
3. Configure:

| Setting | Value |
|---------|-------|
| **Policy name** | `Site Admins` |
| **Action** | `Allow` |

4. Under **Configure rules**, add an **Include** rule:

**To allow specific email addresses:**

| Rule type | Selector | Value |
|-----------|----------|-------|
| Include | Emails | `your-email@example.com` |

Click **+ Add rule** to add more email addresses.

**Or to allow an entire email domain:**

| Rule type | Selector | Value |
|-----------|----------|-------|
| Include | Emails ending in | `@yourdomain.com` |

5. Click **Save**

> **Important:** Access is deny-by-default. Only emails matching your Include rules get through. Everyone else is blocked before the request reaches your Worker.

---

## Step 4: Protect the Admin Path

Now apply the policy to your admin URL.

1. In the Zero Trust dashboard, go to **Networks** → **Tunnels** → **Public Hostname**
   (or **Access** → **Applications** depending on your dashboard version)
2. Click **Add Public Hostname** (or **Add an application** → **Self-hosted**)
3. Configure:

| Setting | Value |
|---------|-------|
| **Application name** | `Hollowed Stone Admin` |
| **Domain** | `hollowedstone.com` |
| **Path** | `/admin` |
| **Session duration** | `24 hours` (or your preference) |

4. Under **Application Policies**, select the **Site Admins** policy you created in Step 3
5. Click **Save**

> **What this does:** Any request to `hollowedstone.com/admin` or `hollowedstone.com/admin/*` (including `/admin/api/games`) now requires authentication through Cloudflare before the request reaches your Worker. Game pages at `/play/oroboros/` are unaffected.

---

## Step 5: Test It

1. Open `https://hollowedstone.com/admin` in a browser (or incognito)
2. You should see a **Cloudflare Access login page** — not your admin dashboard
3. Enter your authorized email address
4. Check your inbox for the one-time PIN (arrives within seconds)
5. Enter the PIN → admin dashboard should load with game list
6. Test with an unauthorized email → should be blocked after the PIN step
7. Open `https://hollowedstone.com/play/oroboros/` → should work without any login (game pages are not protected)

---

## Step 6: Protect Additional Paths (Optional)

You can apply the same policy to multiple paths:

```
/admin              ← Admin dashboard + API
/admin/api/games    ← Already covered by /admin path protection
```

To protect a completely different path with different users, create a second policy and a second application entry.

---

## How the Worker Knows Who You Are

When a request passes through Cloudflare Access, it includes a header with the authenticated user's email:

```
CF-Access-Authenticated-User-Email: admin@example.com
```

The admin dashboard reads this and displays "Logged in as: admin@example.com" at the top. No code changes needed — Cloudflare adds the header automatically.

---

## Audit Logs

Zero Trust keeps logs of every access attempt:

1. In the Zero Trust dashboard, go to **Logs** → **Access requests**
2. See who accessed what, when, from which IP, and whether they were allowed or blocked

Automatic — no code needed.

---

## Revoking Access

### Remove a user:
1. Go to **Access** → **Access Policies** → **Site Admins** → **Edit**
2. Remove their email from the Include rules
3. Click **Save** — their next request will be blocked

### Revoke all active sessions:
1. Go to **Access** → **Applications** → **Hollowed Stone Admin**
2. Click **Revoke existing tokens**
3. All users must re-authenticate

---

## Summary

| Layer | What it does |
|-------|-------------|
| **Access Policy** | Defines who is allowed (email allow-list) — create this first |
| **Public Hostname / Application** | Applies the policy to a specific path (`/admin`) |
| **One-time PIN** | Email-based login, no passwords |
| **Cloudflare Edge** | Blocks unauthorized requests before they reach the Worker |
| **Worker** | Serves admin data only after Access has verified identity |
| **Audit Logs** | Automatic record of every access attempt |

No tokens in URLs. No secrets in code. No passwords to rotate. Cloudflare handles the auth — your Worker just serves the data.
