# Sign-Up Flow Error Analysis

## Error 1 — Login Page: `GET /api/providers/dashboard?us… → 404`

### What you see
```
GET https://roundu-app.vercel.app/api/providers/dashboard?us…  404 (Not Found)
DB Sync error: AxiosError: Request failed with status code 404
```

### Where it comes from
**`AppContext.tsx` lines 525–576** — the `syncDb` useEffect.

```ts
useEffect(() => {
  const syncDb = async () => {
    if (state.isAuthenticated && state.user.id) {
      if (state.role === 'provider') {
        const dashboard = await fetchProviderDashboard(state.user.id);  // <-- this fires
```

This effect runs every time `(isAuthenticated, user.id, role)` changes.  
When a **fresh user** completes OTP and lands on the Login/Splash page:
- `isAuthenticated` becomes `true`
- `user.id` is populated from localStorage (the JWT payload saved during OTP verify)
- `role` is read from `localStorage.getItem("roundu_role")` — **which may still be set to `"provider"` from a previous test session**

Because `role === 'provider'`, the context immediately calls `fetchProviderDashboard`.  
This hits `GET /api/providers/dashboard?userId=<id>`.  
The backend controller (`provider.controller.ts:12`) returns **404** because no `providers` row exists yet for a brand-new user.

The socket registration log you also see in the console confirms this — the user is already authenticated and being registered as `provider` before the onboarding is complete:
```
[socket] registering d4328760-b4cb-4fca-932b-4dbae9b75647 (provider) services: []
```

### Root cause
`localStorage.getItem("roundu_role")` retains the value `"provider"` from a prior session.  
A fresh sign-up should have no role set, but if you've tested as a provider before and didn't explicitly logout, the role leaks into the new session, causing the premature dashboard call.

### Severity
**Medium** — it doesn't block the user flow (the error is caught and swallowed in the `try/catch`), but it causes a noisy 404 on every sign-up and unnecessary backend load. A fresh-user seeing "DB Sync error" in the console is also a bad signal during debugging.

---

## Error 2 — RoleSelect Page: `GET /api/providers/dashboard?us… → 404`

### What you see
```
GET https://roundu-app.vercel.app/api/providers/dashboard?us…  404 (Not Found)
```
This happens immediately after clicking **Service Provider** on the role selection screen.

### Where it comes from
**`RoleSelect.tsx` lines 17–39**:

```ts
const select = async (role: "customer" | "provider") => {
  dispatch({ type: "SET_ROLE", role });
  if (role === "provider") {
    if (user.role === "provider") {         // <-- checks local state role
      navigate("/provider", { replace: true });
      return;
    }
    // Otherwise, double-check the database...
    const res = await fetchProviderDashboard(user.id);  // <-- this fires for a fresh user
```

For a **fresh user** who was never a provider:
1. `user.role` in state is `null` or `"customer"` — so the early return is skipped.
2. `fetchProviderDashboard` is called to "double-check the DB".
3. The backend returns **404** because no `providers` row exists yet.

The 404 is technically **expected** here — the code uses the 404 to infer "not a provider yet" and then navigates to `/provider/select-service`. The problem is that it is causing a visible red error in the console because a 404 is treated as an Axios exception, which is uncaught in a way that still logs to the console.

### Root cause
The logic is intentionally doing a DB check, but it's calling an endpoint that semantically means "get dashboard data" — and a 404 is the only way it can signal "not a provider". There is no dedicated `/api/providers/exists?userId=` check. The `catch` block silently swallows the error (`catch (err) { // Not a provider yet }`), but Axios still logs the 404 to the browser console as a red error before the catch runs.

### Severity
**Low-Medium** — functionally harmless (the navigation to `/provider/select-service` proceeds correctly), but produces confusing red console errors during every fresh provider sign-up and could mislead you into thinking the backend is broken.

---

## Error 3 — Verify Identity Page: `POST /api/v1/kyc/aadhaar/init → 500 (Internal Server Error)`

### What you see
```
POST https://roundu-app-production.up.railway.app/api/v1/kyc/… 500 (Internal Server Error)
```
This happens when clicking **"Connect DigiLocker"** in the Verify Identity page.

### Where it comes from
**`DigiLockerKYC.tsx` line 6**:
```ts
const API_URL = import.meta.env.VITE_API_URL || "http://localhost:5000/api";
```

When `VITE_API_URL` is set (Railway URL), the request goes **directly to Railway** at:
```
POST https://roundu-app-production.up.railway.app/api/v1/kyc/aadhaar/init
```

Notice the path is `/api/v1/kyc/...`. Look at `app.ts`:
```ts
app.use('/api', apiRouter);
app.use('/api/v1', apiRouter);   // <-- both are registered
```

So the route itself should resolve. The 500 comes from inside `KycController.initDigilocker` in `kyc.controller.ts`.

**The actual failure chain:**

1. The route is protected by `authenticate` middleware (`kyc.routes.ts:9`).
2. `authenticate` reads the `Authorization: Bearer <token>` header.
3. **`DigiLockerKYC.tsx` uses `fetch` directly**, not the shared `axios` instance in `api.ts`. It reads the token from `localStorage.getItem("roundu_token")`.
4. If that token is missing, expired, or malformed, `authenticate` will reject with 401 — but the 500 suggests the token is valid and the request gets through.
5. The controller then calls `SetuService.createDigilockerRequest(redirectUrl)` — this makes a real HTTP call to Setu's servers.
6. **The Railway server has a non-Indian IP address** — Setu's production APIs geo-block non-Indian IPs with HTTP 403. The fallback in the controller catches `403 Forbidden` in the string, but the actual error from Setu may not always arrive as a plain string containing that phrase — it may be a structured JSON 403 response or a connection error, causing the `if (typeof details === 'string' && details.includes('403 Forbidden'))` check to fail.
7. When the fallback check fails, the code falls through to `res.status(500).json(...)`, producing the 500 you see.

Additionally, there is a secondary possible cause: **`setu.service.ts` has hardcoded sandbox credentials as fallbacks**:
```ts
'x-client-id': env.SETU_CLIENT_ID || '3b3d4e41-f540-4dfa-a44f-5fe3ea98a3f4',
'x-client-secret': env.SETU_CLIENT_SECRET || 'BizBetDlpEgM7DXWXAeWZTeUJtB7AilT',
```
If Railway does not have `SETU_CLIENT_ID` / `SETU_CLIENT_SECRET` set as environment variables, it falls back to these sandbox credentials (which may be invalid or expired), causing Setu to return a 401/403, which then hits the same unhandled path and becomes a 500.

### Root cause summary (Error 3)
- **Primary**: Railway's non-Indian IP is geo-blocked by Setu. The 403 fallback guard (`details.includes('403 Forbidden')`) is too fragile — it may not match if the error is a structured object rather than a string.
- **Secondary**: If Setu env vars are missing on Railway, sandbox fallback creds are used which may no longer be valid, causing an auth error from Setu that also results in 500.

### Severity
**High** — this directly breaks the provider onboarding flow. Users cannot complete Aadhaar verification. The "Autofill (Demo Only)" bypass button on the page exists specifically to work around this, but it must not reach production.

---

## Summary Table

| # | Page | Error | Cause | Severity |
|---|------|-------|-------|----------|
| 1 | Login/AppContext | `GET /providers/dashboard → 404` | Stale `"provider"` role in localStorage from previous test session triggers premature dashboard sync on mount | Medium |
| 2 | RoleSelect | `GET /providers/dashboard → 404` | Intentional DB existence check uses dashboard endpoint; 404 is expected for new users but leaks to console | Low-Medium |
| 3 | Verify Identity | `POST /kyc/aadhaar/init → 500` | Railway's non-Indian IP is geo-blocked by Setu; the 403 fallback guard in `initDigilocker` fails to match structured error responses; possibly also missing Setu env vars on Railway | High |
