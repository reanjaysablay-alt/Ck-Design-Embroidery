# Stitchhouse — TODO

## Email verification (2FA) on login

- [x] 1. Add `login` purpose to `signup_verifications` check constraint in db/schema.sql
- [x] 2. Add `sendLoginOtp` + `verifyLoginOtp` to lib/otp.js
- [x] 3. Create `app/api/auth/login-send-code/route.js`
- [x] 4. Create `app/api/auth/login-verify-code/route.js`
- [x] 5. Update `app/login/page.js` with a 2-step login flow (password → OTP)
- [x] 6. Verify build compiles
- [x] 7. Skip OTP on the login right after a password reset (skipOtp flag)
