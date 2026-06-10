# ✅ Real-Time Provider Approval Workflow - VERIFICATION CHECKLIST

Complete the following steps to verify the entire workflow is working correctly.

---

## **PRE-REQUISITES** ✅

### **Database Setup**

```sql
-- 1. Ensure providers table has is_verified column
ALTER TABLE providers ADD COLUMN IF NOT EXISTS is_verified BOOLEAN DEFAULT false;

-- 2. Ensure notifications table exists
CREATE TABLE IF NOT EXISTS notifications (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  title TEXT NOT NULL,
  message TEXT NOT NULL,
  type TEXT NOT NULL,
  user_id UUID,
  provider_id UUID,
  created_at TIMESTAMP DEFAULT now(),
  is_read BOOLEAN DEFAULT false,
  metadata JSONB
);

-- 3. Enable Realtime in Supabase Dashboard
-- Go to: Project Settings → Replication → Enable for:
--   - notifications table
--   - providers table
```

### **Environment Variables**

Ensure both client and server have correct Supabase credentials:

**Client** (`.env.local`):
```
VITE_SUPABASE_URL=https://jputapvxaaaiafosuzxa.supabase.co
VITE_SUPABASE_ANON_KEY=eyJhbGciOiJIUzI1NiIs...
```

**Server** (.env):
```
DATABASE_URL=postgresql://...
```

---

## **TEST 1: Modal Appears on New Provider Registration**

### **Steps**:
1. Open Admin Dashboard: `http://localhost:8084/admin`
2. Open browser Console (F12)
3. In another window, complete provider registration:
   - Fill in all onboarding steps
   - Complete DigiLocker/KYC
   - Click "Complete Registration"

### **Expected Results** ✅:
- [ ] Modal pops up on admin page (no page refresh)
- [ ] Modal shows provider name correctly
- [ ] Modal shows service type
- [ ] Modal shows phone number
- [ ] Modal shows registration time
- [ ] Console shows: `[Dashboard] New provider registration notification received`
- [ ] Console shows: `[Dashboard] Showing registration modal for provider: {name}`

### **If Failed** ❌:
- Check: Did notification get created in database?
  ```sql
  SELECT * FROM notifications WHERE type = 'provider_registration' ORDER BY created_at DESC LIMIT 1;
  ```
- Check browser console for errors (red text)
- Check Realtime is enabled in Supabase

---

## **TEST 2: Approve Provider**

### **Steps**:
1. Modal is open with pending provider
2. Click green "Approve" button
3. Wait for modal to close

### **Expected Results** ✅:
- [ ] Modal closes smoothly
- [ ] Console shows: `[Dashboard] Approving provider: {id}`
- [ ] Console shows: `[AdminService] Updating provider {id} verification to true`
- [ ] Console shows: `[Dashboard] Provider approved and notification sent`
- [ ] Pending verifications count decreases by 1
- [ ] Provider row updates (status shows "Verified")
- [ ] Database shows is_verified = true for provider

### **Verification**:
```sql
-- Provider should be verified
SELECT id, full_name, is_verified FROM providers WHERE full_name = '{provider_name}';

-- Approval notification should exist
SELECT * FROM notifications WHERE type = 'provider_approved' ORDER BY created_at DESC LIMIT 1;
```

---

## **TEST 3: Reject Provider (Optional)**

### **Steps**:
1. Create another test provider
2. When modal appears, click red "Reject" button

### **Expected Results** ✅:
- [ ] Modal closes
- [ ] Console shows: `[Dashboard] Rejecting provider: {id}`
- [ ] Console shows: `[Dashboard] Provider rejected and notification sent`
- [ ] Provider remains in pending list
- [ ] Rejection notification created in database

---

## **TEST 4: Real-time Notifications in Top Bar**

### **Steps**:
1. Open Admin Dashboard
2. Click bell icon in top-right corner
3. Create new provider registration (in another window)

### **Expected Results** ✅:
- [ ] Notification appears in dropdown instantly
- [ ] Title: "New Provider Registration"
- [ ] Message shows provider details
- [ ] Time shows: "Just now"
- [ ] Badge count increases
- [ ] Console shows: `[AdminTopBar] New notification received`

### **If Empty** ❌:
- [ ] Click "Refresh" or reload page
- [ ] Check database for notifications:
  ```sql
  SELECT * FROM notifications ORDER BY created_at DESC LIMIT 5;
  ```

---

## **TEST 5: Provider Access Control**

### **Before Approval**:
1. Provider tries to access dashboard
2. Provider sees: "Awaiting Admin Approval"
3. No dashboard features available

### **After Approval**:
1. Admin approves provider
2. Provider logs in again
3. Provider sees full dashboard
4. Provider can see stats and take bookings

### **Code Check**:
Check provider dashboard respects `is_verified` status:
```
Look for: 
- if (!provider.is_verified) show "Awaiting Admin Approval"
- if (provider.is_verified) show dashboard
```

---

## **TEST 6: Dashboard Stats Auto-Update**

### **Steps**:
1. Note current "Pending Verifications" count on dashboard
2. Create new provider
3. Approve the provider (from modal)

### **Expected Results** ✅:
- [ ] "Pending Verifications" count decreases by 1
- [ ] "Total Providers" count increases by 1
- [ ] Stats update WITHOUT page refresh
- [ ] Console shows: `[Dashboard] Provider update received, refreshing stats`

---

## **DEBUGGING COMMANDS**

### **Browser Console** (F12):
```javascript
// Check if realtime is connected
// Look for these logs:
// [Dashboard] Setting up notification subscription for provider registrations
// [AdminTopBar] Setting up notification subscription

// Monitor real-time updates:
// [Dashboard] Provider update received
// [Dashboard] New provider registration notification received
```

### **Database Queries**:
```sql
-- Check all pending providers
SELECT id, full_name, is_verified, created_at FROM providers WHERE is_verified = false ORDER BY created_at DESC;

-- Check all notifications
SELECT id, title, type, created_at, is_read FROM notifications ORDER BY created_at DESC LIMIT 10;

-- Check provider registration notifications specifically
SELECT id, title, type, provider_id, created_at FROM notifications WHERE type = 'provider_registration' ORDER BY created_at DESC;
```

---

## **PERFORMANCE MONITORING**

### **Network Tab** (F12 → Network):
- Look for `ws://` connections (WebSocket realtime)
- Should see connection to Supabase realtime

### **Console Warnings**:
- Should see NO red error messages
- May see yellow warnings (normal)

### **Response Time**:
- Modal should appear < 1 second after provider registers
- Approval should complete < 2 seconds

---

## **PRODUCTION DEPLOYMENT CHECKLIST**

Before going live:

- [ ] All 6 tests above pass
- [ ] No console errors
- [ ] Realtime enabled in Supabase
- [ ] notifications table exists and has data
- [ ] is_verified column exists on providers
- [ ] Admin receives approval notifications
- [ ] Provider receives status notifications
- [ ] Stats update in real-time
- [ ] Database backups are working
- [ ] Monitoring alerts are set up

---

## **QUICK TROUBLESHOOTING**

| Issue | Quick Fix |
|-------|-----------|
| Modal doesn't appear | Reload page, check console for errors |
| Approve button not working | Check database for is_verified column |
| Notifications not showing | Enable Realtime in Supabase Dashboard |
| Stats not updating | Check provider table is in realtime |
| Time shows "Invalid Date" | Check database timestamp format |
| Slow response | Check Supabase connection, may need optimization |

---

## **SUCCESS INDICATORS** ✅

All tests pass when:
1. ✅ Modal pops up automatically
2. ✅ Provider details are correct
3. ✅ Approve/Reject buttons work
4. ✅ Notifications appear in real-time
5. ✅ Stats update without refresh
6. ✅ No console errors
7. ✅ Database is consistent

---

## **NEED HELP?**

Check the detailed guide: `REALTIME_WORKFLOW_GUIDE.md`

Look for logs with these prefixes:
- `[Dashboard]` - Admin dashboard events
- `[AdminTopBar]` - Notification center events
- `[AdminService]` - Database operations
- `[NotificationService]` - Notification creation
- `[ProviderModel]` - Server-side registration

---

**Status**: Ready to Test ✅

All code is deployed. Run through the tests above to verify everything is working.
