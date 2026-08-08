# Stitchhouse — Remove OTP from Login

## Steps
- [x] 1. Rewrite `handleLogin` in `app/login/page.js` to sign in directly (no OTP)
- [x] 2. Remove login 2FA state (loginStep, loginCode, skipOtp) and OTP UI
- [x] 3. Remove unused login-send-code / login-verify-code API routes
- [x] 4. Remove dead sendLoginOtp / verifyLoginOtp from lib/otp.js
- [x] 5. Verify no remaining references (clean)

