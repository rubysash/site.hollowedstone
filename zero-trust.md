# Protecting Admin Endpoints with Cloudflare Zero Trust

This guide sets up Cloudflare Access (Zero Trust) to protect admin routes like `/admin` so only authorized users can access them. Free tier, no extra cost.

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
Enter PIN → Cloudflare checks: is this email in the allow list?
    ↓
Yes → Request passes through to Worker → Admin data returned
No  → Blocked. Worker never sees the request.
```

The Worker doesn't handle auth at all — Cloudflare blocks unauthorized requests at the edge before they arrive. This is real authentication, not security by obscurity.

## What You Get (Free Tier)

- Up to 50 users
- One-time PIN (email OTP) — no identity provider needed
- Optional: GitHub, Google, or other SSO if you prefer
- Path-level protection (protect `/admin` without affecting `/api/state`)
- Session management (configurable timeout)
- Audit logs of who accessed what and when

---

## Step 1: Create a Zero Trust Organization

1. Go to https://one.dash.cloudflare.com/
2. If this is your first time, you'll be asked to create a **team name** (e.g., `hollowedstone`)
3. Select the **Free** plan
4. Complete setup

This creates your Zero Trust dashboard at `https://one.dash.cloudflare.com/`

---

## Step 2: Enable One-Time PIN Authentication

The one-time PIN (OTP) lets authorized users log in with just their email — Cloudflare sends a code, they enter it, done. No passwords, no third-party identity provider needed.

1. In the Zero Trust dashboard, go to **Settings** → **Authentication**
2. Under **Login methods**, find **One-time PIN**
3. It should be enabled by default. If not, click **Add** and select **One-time PIN**

> **Optional:** You can also add GitHub, Google, or other identity providers here. Users will see all enabled options on the login screen. OTP is the simplest to start with.

---

## Step 3: Add the Admin Endpoint as a Protected Application

1. In the Zero Trust dashboard, go to **Access** → **Applications**
2. Click **Add an application**
3. Select **Self-hosted**
4. Configure the application:

| Setting | Value |
|---------|-------|
| **Application name** | `Ouroboros Admin` |
| **Session duration** | `24 hours` (or your preference) |
| **Application domain** | `hollowedstone.com` |
| **Path** | `/admin` |

5. Click **Next** to configure the access policy

---

## Step 4: Create an Access Policy

This defines WHO can access the admin endpoint.

1. **Policy name:** `Admin only`
2. **Action:** `Allow`
3. **Configure rules:**

### Allow specific email addresses:

| Rule type | Selector | Value |
|-----------|----------|-------|
| Include | Emails | `your-email@example.com` |

Add additional emails if other people need admin access.

### Or allow an entire email domain:

| Rule type | Selector | Value |
|-----------|----------|-------|
| Include | Emails ending in | `@yourdomain.com` |

4. Click **Next** → **Add application**

> **Important:** Access is deny-by-default. Only emails matching your Include rules can get through. Everyone else is blocked before the request reaches your Worker.

---

## Step 5: Test It

1. Open `https://hollowedstone.com/admin` in a browser
2. You should see a Cloudflare Access login page (not your Worker)
3. Enter your authorized email address
4. Check your inbox for the one-time PIN
5. Enter the PIN — you should now see the admin response from the Worker
6. Try with an unauthorized email — it should be blocked after the PIN step

---

## Step 6: Protect Additional Paths (Optional)

You can protect multiple paths under the same application or create separate applications:

**Same application, multiple paths:**
- When creating the application, you can add additional path rules
- More specific paths take precedence (e.g., `/admin/api/games` overrides `/admin`)

**Separate applications (different access rules per path):**
- Create another self-hosted application with a different path
- Give it its own policy (different allowed users, different session duration)

Example paths you might protect later:
```
/admin              ← Admin dashboard (game list, player IPs)
/admin/api/games    ← Admin API endpoint
```

---

## How the Worker Knows the User is Authenticated

When a request passes through Cloudflare Access, it includes a signed JWT in the `CF-Access-JWT-Assertion` header. Your Worker can optionally verify this to get the authenticated user's email:

```js
// In worker/index.js — optional, Access already blocks unauthorized requests
const identity = request.headers.get('CF-Access-JWT-Assertion');
// Decode to get the email: { email: "admin@example.com", ... }
```

For the admin endpoint, you don't strictly need to check this — Access already blocked anyone not on the allow list. But it's useful if you want to log WHO accessed the admin panel.

---

## Audit Logs

Zero Trust keeps logs of every access attempt:

1. In the Zero Trust dashboard, go to **Logs** → **Access requests**
2. See who accessed what, when, from which IP, and whether they were allowed or blocked

This is automatic — no code needed.

---

## Revoking Access

### Remove a user immediately:
1. Go to **Access** → **Applications** → `Ouroboros Admin` → **Edit**
2. Remove their email from the policy
3. Their existing session becomes invalid on the next request

### Revoke all active sessions:
1. Go to **Access** → **Applications** → `Ouroboros Admin`
2. Click **Revoke existing tokens**
3. All users must re-authenticate

---

## Summary

| Layer | What it does |
|-------|-------------|
| **Cloudflare Access** | Blocks unauthorized requests at the edge (never reaches Worker) |
| **One-time PIN** | Email-based auth, no passwords to manage |
| **Access policy** | Allow-list of specific email addresses |
| **Worker admin endpoint** | Returns game data only after Access has verified identity |
| **Audit logs** | Automatic record of every access attempt |

No tokens in URLs. No secrets in code. No passwords to rotate. Cloudflare handles the auth — your Worker just serves the data.
