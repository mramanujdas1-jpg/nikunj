# Nikunj Production Deployment

This app keeps the existing static frontend in `public/` and runs the API with Express.

## Required Services

- Frontend: Vercel static hosting
- Backend: Render web service
- Database: MongoDB Atlas
- Images: Cloudinary
- Auth: Clerk
- Payments: Razorpay

## Backend Environment Variables

Set these on Render:

```env
NODE_ENV=production
PORT=10000
MONGODB_URI=mongodb+srv://USER:PASSWORD@CLUSTER.mongodb.net/nikunj?retryWrites=true&w=majority
CORS_ORIGIN=https://YOUR_VERCEL_DOMAIN.vercel.app
CLERK_PUBLISHABLE_KEY=pk_test_or_live...
VITE_CLERK_PUBLISHABLE_KEY=pk_test_or_live...
CLERK_SECRET_KEY=sk_test_or_live...
CLERK_FRONTEND_API_URL=https://YOUR_CLERK_FRONTEND_API_DOMAIN
CLOUDINARY_CLOUD_NAME=...
CLOUDINARY_API_KEY=...
CLOUDINARY_API_SECRET=...
RAZORPAY_KEY_ID=...
RAZORPAY_KEY_SECRET=...
ANTHROPIC_API_KEY=...
SMTP_HOST=smtp.gmail.com
SMTP_PORT=587
SMTP_USER=...
SMTP_PASS=...
```

Never put secret keys in frontend files. `CLERK_FRONTEND_API_URL` is optional when it can be derived from the publishable key, but setting it explicitly is useful for production/custom Clerk domains.

## Render

1. Push this repo to GitHub.
2. In Render, create a new Web Service from the repo.
3. Use:
   - Build command: `npm install`
   - Start command: `npm start`
4. Add the environment variables above.
5. Copy the Render URL, for example `https://nikunj-backend.onrender.com`.

## Vercel

Deploy `public/` as the static frontend. Configure rewrites so `/api/*` goes to your Render backend:

```json
{
  "rewrites": [
    {
      "source": "/api/:path*",
      "destination": "https://YOUR_RENDER_BACKEND.onrender.com/api/:path*"
    },
    {
      "source": "/(.*)",
      "destination": "/index.html"
    }
  ]
}
```

Set Clerk allowed origins to both local and production domains:

- `http://localhost:5000`
- `https://YOUR_VERCEL_DOMAIN.vercel.app`

## Local Run

```bash
npm install
npm run dev
```

Open `http://localhost:5000`.

## Clerk Roles

Set roles in Clerk user private metadata:

```json
{
  "role": "admin"
}
```

Allowed roles are `admin`, `owner`, and `student`. The backend returns only the safe `role` value to the frontend.
