# Clerk Authentication Setup Guide

## Overview
This guide explains how to set up Clerk authentication for your Nikunj Express.js application.

## Step 1: Create a Clerk Account
1. Go to [https://dashboard.clerk.com](https://dashboard.clerk.com)
2. Sign up or log in
3. Create a new application
4. Choose "Web" as your application type

## Step 2: Get Your Publishable Key
1. In your Clerk Dashboard, navigate to **API Keys**
2. Copy your **Publishable Key** (starts with `pk_`)
3. This is the key you'll use in your HTML file

## Step 3: Update the HTML Configuration
In your `public/index.html` file, locate the Clerk script tag and replace the placeholder:

### Current Setup:
```html
<script 
  async 
  crossorigin="anonymous" 
  data-clerk-publishable-key="pk_test_aW5jbHVkZWQtcGlyYW5oYS01My5jbGVyay5hY2NvdW50cy5kZXYk" 
  src="https://cdn.clerk.com/clerk.js">
</script>
```

### What to Update:
Replace `data-clerk-publishable-key` value with your actual publishable key from the Clerk Dashboard.

## Step 4: Button Functionality
The following buttons now open Clerk modals:

### Login Button
- **Location**: Navbar top-right
- **Action**: Opens Clerk Sign In modal
- **Function**: `openSignIn()`

### Register Button  
- **Location**: Navbar top-right and footer
- **Action**: Opens Clerk Sign Up modal
- **Function**: `openSignUp()`

### List Property Button
- **Location**: Footer under "Owners" section
- **Action**: Opens Clerk Sign Up modal
- **Function**: `openSignUp()`

### Logout Button
- **Location**: Navbar (appears after login)
- **Action**: Logs out user and hides dashboard
- **Function**: `logout()`

## Step 5: UI Customization
The Clerk modals are pre-styled to match your theme:
- **Colors**: Kiwi green (`#89E900`) and dark background (`#222222`)
- **Typography**: DM Sans font matches your site
- **Theme**: Dark futuristic aesthetic is preserved

## Step 6: Testing the Integration

### Test Sign In:
1. Click "Login" button in navbar
2. Clerk Sign In modal should appear
3. Sign in with your Clerk test account credentials

### Test Sign Up:
1. Click "Register" button
2. Clerk Sign Up modal should appear
3. Create a test account

### Verify Authentication:
After logging in:
- Login/Register buttons should hide
- Dashboard button should appear
- User information is stored in application state

## Features Included

### Authentication State Management
- User auth state is tracked in `state.user`
- User information includes: id, name, email, role
- Session information persists with Clerk

### Protected Actions
These actions now require authentication:
- Viewing dashboard (`showPage('panel')`)
- Saving listings (bookmark/heart)
- Submitting reviews
- Creating listings
- Admin functions

### Auth Status Listeners
The app listens for Clerk auth events:
- User profile updates
- Session creation
- Session removal
- Automatically updates UI based on auth state

## Environment Variables
Add to your `.env` file:
```
CLERK_PUBLISHABLE_KEY=your_actual_clerk_publishable_key_here
```

## Production Considerations

### Before Going Live:
1. **Replace Test Key**: Update with your production Clerk publishable key
2. **Update Allowed Domains**: In Clerk Dashboard, add your production domain to allowed origins
3. **Configure Email**: Set up email provider in Clerk for password resets
4. **Social OAuth** (Optional): Configure Google, GitHub, etc. in Clerk Dashboard
5. **Test Thoroughly**: Test all auth flows in your environment

### Security:
- Clerk handles all secure operations (password hashing, session management)
- Your backend can verify tokens if needed
- Never expose secret keys in frontend code (only publishable keys)

## Troubleshooting

### Issue: "Clerk not loaded yet" warning
**Solution**: 
- Check that your publishable key is correct
- Ensure you have internet connection for CDN loading
- Wait a few seconds - Clerk may be loading asynchronously

### Issue: Modal doesn't appear when clicking Login/Register
**Solution**:
- Verify Clerk script loaded: Open browser DevTools > Network tab
- Check Console for errors
- Ensure publishable key is valid
- Try hard refresh (Ctrl+Shift+R or Cmd+Shift+R)

### Issue: Auth state not persisting
**Solution**:
- Clerk handles session persistence automatically
- Check browser allows cookies
- Ensure third-party cookies are not blocked

## API Integration

When ready to integrate with your backend:

### Option 1: Verify Tokens
Pass Clerk session token to your API:
```javascript
const token = await clerk.session.getToken();
// Send token with requests to verify on backend
```

### Option 2: User Information
Access authenticated user data:
```javascript
const user = clerk.user;
console.log(user.id, user.emailAddress, user.fullName);
```

## File Changes Made

### Modified Files:
1. **public/index.html**
   - Added Clerk CDN script tag
   - Added Clerk styling for modals
   - Updated button onclick handlers
   - Added Clerk JavaScript functions

2. **.env**
   - Added `CLERK_PUBLISHABLE_KEY` environment variable

3. **.env.example**
   - Added `CLERK_PUBLISHABLE_KEY` placeholder

4. **package.json**
   - Removed unnecessary `@clerk/nextjs` dependency
   - Kept `@clerk/clerk-js` for browser integration

### No Changes To:
- Server architecture (Express.js)
- Database (MongoDB)
- Routes
- UI/UX design
- Responsiveness
- Theme colors

## Support

For more information:
- [Clerk Documentation](https://clerk.com/docs)
- [Clerk API Reference](https://clerk.com/docs/reference)
- [Clerk Dashboard](https://dashboard.clerk.com)

## Next Steps

1. ✅ Get your Clerk publishable key
2. ✅ Update the `data-clerk-publishable-key` in HTML
3. ✅ Test login/signup flow
4. ✅ Integrate backend auth verification (optional)
5. ✅ Deploy to production with production keys
