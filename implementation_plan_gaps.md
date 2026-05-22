# Implementation Plan Gaps Analysis

This document details the 17 gaps and potential bugs identified by comparing `implementation_plan.md` against the Cashfree integration plans (`digilocker-integration-plan.md`, `pan-verify-integration-plan.md`, and `bav-integration-plan.md`).

---

## DigiLocker Aadhaar Verification Gaps

### 1. Account Check Parameter
* **Integration Plan**: Prefers `aadhaar_number` for `verify-account` checks to ensure high KYC accuracy.
* **Implementation Plan**: Passes `mobile_number` only. (Note: Since this runs before the user enters Aadhaar, using phone is a valid compromise, but the discrepancy was undocumented).

### 2. Check Verification ID Length Limit
* **Problem**: The check ID format `chk-${userId}-${Date.now()}` will exceed Cashfree's strict 50-character limit.
* **Length**: `chk-` (4 chars) + UUID (36 chars) + `-` (1 char) + Timestamp (13 chars) = 54 characters.
* **Result**: Will return an HTTP `400 verification_id_length_exceeded` error in production.

### 3. Redirect Verification ID Length Limit
* **Problem**: The main verification ID format `kyc-aadhaar-${userId}-${Date.now()}` is even longer.
* **Length**: `kyc-aadhaar-` (12 chars) + UUID (36 chars) + `-` (1 char) + Timestamp (13 chars) = 62 characters.
* **Result**: Will fail validation and return HTTP `400` / `409` error.

### 4. DigiLocker Document Fetch 202 Response
* **Integration Plan**: If the document fetch API returns HTTP `202` with status `validation_pending`, the backend must retry up to 3 times with a 3-second delay.
* **Implementation Plan**: Lacks retry logic for `202`. It treats any status other than `SUCCESS` as an immediate failure.

### 5. `eaadhaar = N` Retry Logic
* **Integration Plan**: When `eaadhaar = N` (Aadhaar not linked in DigiLocker), the system should prompt the user to link it, allow one retry, and then fallback to OCR.
* **Implementation Plan**: Returns `verified: false` immediately without offering a retry or path to OCR fallback.

---

## PAN Verification Gaps

### 6. Missing Backend Format Validation
* **Integration Plan**: Validate input using regex `/^[A-Z]{5}[0-9]{4}[A-Z]{1}$/` and sanitise names to prevent burning API credits on malformed inputs.
* **Implementation Plan**: Only checks if `pan` string is truthy, letting malformed requests reach Cashfree and incur costs.

### 7. Missing PAN API 500/502 Retry
* **Integration Plan**: Retry `500`/`502` errors once after a 2-second delay before falling back to OCR.
* **Implementation Plan**: Immediatelly throws on failure, missing transient recovery.

### 8. Aadhaar-PAN Linking Soft Warning
* **Integration Plan**: If `aadhaar_seeding_status = R` for an Individual, return a soft warning to let the user know their Aadhaar is not linked to PAN (non-blocking).
* **Implementation Plan**: Returns `verified: true` but omits warnings.

### 9. Name Match Score Warning
* **Integration Plan**: If name match score falls into `POOR_PARTIAL_MATCH` or `NO_MATCH` (score < 50.0), return a soft warning.
* **Implementation Plan**: Stores the match result but doesn't map it to a user-facing warning.

### 10. `INVALID` Status Mapping
* **Integration Plan**: Categorise `INVALID` PAN status separately from hard blocks to report back to the user accurately.
* **Implementation Plan**: Lacks distinct handling or logging for the `INVALID` status code in the audit trails.

---

## Bank Account Verification (BAV) Gaps

### 11. Silent 500 on `fraud_account` Error
* **Integration Plan**: A `422` with code `fraud_account` must flag the user as fraud, record the attempt, and block onboarding.
* **Implementation Plan**: `verifyBankWithRetry` throws the error, which is uncaught in `initBankVerify`, causing a generic 500 crash.

### 12. Silent 500 on `insufficient_balance` Error
* **Integration Plan**: Catch `insufficient_balance`, halt requests, alert operations, and return a friendly error.
* **Implementation Plan**: Re-throws the exception directly, causing a 500 crash instead of alerting ops.

### 13. Missing 3-Strike Session Lock
* **Integration Plan**: Limit BAV attempts to 3 failures per session. Lock the field and prompt user to contact support if exceeded.
* **Implementation Plan**: No attempt tracking or locking logic implemented.

### 14. Missing Penny Drop Fallback Queue
* **Integration Plan**: If transient BAV errors are exhausted, add the request to `penny_drop_queue` for asynchronous/manual check.
* **Implementation Plan**: Discards the request and returns a crash response when retries fail.

### 15. Missing Onboarding Fraud Check Gate
* **Integration Plan**: Gate `initBankVerify` with a check against `req.user.fraud_flagged` to block flagged sessions.
* **Implementation Plan**: Lacks the fraud check gate at endpoint initiation.

### 16. Mapped Failure Responses shape
* **Integration Plan**: For re-entry status codes, return `422` with the status code and descriptive user message.
* **Implementation Plan**: Returns `requestId` with a successful `200` response. Polling must complete to see the error, degrading UX.

### 17. Parameter Order Transposition Bug (Critical)
* **Problem**: Swapped parameter order.
  * Service declaration: `verifyBankSync(ifsc, accountNumber, name)`
  * Service retry helper: `verifyBankWithRetry(ifsc, accountNumber, name)`
  * Call in controller: `verifyBankWithRetry(ifsc, accountNumber, userName)`
  * Cashfree request payload maps:
    * `bank_account: accountNumber`
    * `ifsc: ifsc`
  * Inside `verifyBankSync`, `ifsc` is passed first, mapping IFSC value to `bank_account` and the account number value to `ifsc`.
* **Result**: Cashfree will reject every sync request with `400` validation errors because the values are reversed.
