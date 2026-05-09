# Clerk Authentication - Quick Reference Card

## 30-Second Setup

1. Go to https://dashboard.clerk.com (create free account)
2. Create new "Web" application
3. Copy your Publishable Key (starts with `pk_`)
4. Find in `public/index.html` line ~390:
   ```html
   data-clerk-publishable-key="pk_test_..."
   ```
5. Replace with your key
6. Save & Reload page
7. Click "Login" → Clerk modal appears ✅

---

## Integration Points

### Login Button
```html
<button onclick="openSignIn()">Login</button>
```

### Register Button
```html
<button onclick="openSignUp()">Register</button>
```

### Logout Button
```html
<button onclick="logout()">Logout</button>
```

### Check Auth Status
```javascript
if (state.user) {
  console.log('Logged in:', state.user.name);
} else {
  console.log('Not logged in');
}
```

---

## Key Files

| File | Change | Location |
|------|--------|----------|
| `public/index.html` | Clerk script + functions | Line ~390, ~710, ~1300 |
| `.env` | Add publishable key | `CLERK_PUBLISHABLE_KEY=pk_...` |
| `.env.example` | Template | `CLERK_PUBLISHABLE_KEY=...` |
| `package.json` | Removed @clerk/nextjs | Dependencies |

---

## Browser Console Commands

```javascript
// Is Clerk loaded?
window.clerkLoaded

// Get Clerk instance
window.clerk

// Check current user
state.user

// Get user ID
state.user?.id

// Get user email
state.user?.email

// Manual sign in (for testing)
window.clerk.openSignIn()

// Manual sign up
window.clerk.openSignUp()

// Manual logout
window.clerk.signOut()
```

---

## Troubleshooting

| Problem | Solution |
|---------|----------|
| Modal doesn't appear | Check console for errors, reload page |
| "Clerk not loaded" warning | Wait 2-3 seconds, check internet connection |
| Modal styling looks broken | Hard refresh (Ctrl+Shift+R), clear cache |
| After login, no user state | Check browser console, check Clerk key |
| 404 on Clerk script | Check internet connection to CDN |

---

## Important Dates/Info

- **Clerk Account URL**: https://dashboard.clerk.com
- **Publishable Key Format**: `pk_test_...` (test) or `pk_live_...` (production)
- **Secret Key Format**: `sk_...` (never expose in frontend!)
- **Docs URL**: https://clerk.com/docs

---

## Before Production

- [ ] Use production publishable key (pk_live_...)
- [ ] Add domain to Clerk Dashboard
- [ ] Test on target domain
- [ ] Configure email provider (optional)
- [ ] Set up social logins (optional)

---

## Code Locations in HTML

```
Line ~390  → Clerk CDN script tag
Line ~316  → Clerk CSS styling
Line ~407  → Login button (onclick="openSignIn()")
Line ~408  → Register button (onclick="openSignUp()")
Line ~710  → Clerk initialization code
Line ~1300 → Clerk functions (openSignIn, openSignUp, logout)
```

---

## Protected Features

These require user to be logged in:
- Dashboard access
- Saving listings (favorites)
- Writing reviews
- Creating listings
- Admin functions

---

## Theme Colors

```css
--white: #222222        /* Dark background */
--or: #89E900          /* Kiwi green accent */
--surf: #1A1A1A        /* Surface darker */
--ink: #E8E8E8         /* Text color */
```

All Clerk modals automatically use these colors.

---

## Files to Read

1. **README_CLERK.md** ← Start here (summary)
2. **CLERK_SETUP.md** ← Detailed setup instructions
3. **CLERK_IMPLEMENTATION.md** ← Technical details
4. **CLERK_VERIFICATION.md** ← Testing & verification

---

## Email Support

- **Clerk Support**: support@clerk.dev
- **Status Issues**: https://status.clerk.com

---

## Version Info

- **Clerk JS**: Latest (@clerk/clerk-js)
- **CDN**: https://cdn.clerk.com/clerk.js
- **Integration Type**: Browser-based (no frameworks)
- **Compatible With**: All modern browsers

---

**Your Nikunj app is ready for Clerk authentication!**
