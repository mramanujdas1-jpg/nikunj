# 🏠 Nikunj — Student Living Platform

> Jaipur's most trusted platform for student accommodation, PG rooms, flats & tiffin services.

---

## 📁 Project Structure

```
nikunj/
├── server.js              # Main Express server
├── seed.js                # Database seeder
├── package.json
├── .env.example           # Copy to .env and fill values
├── models/
│   ├── User.js            # User schema (student/owner/admin)
│   └── Listing.js         # Listing schema with reviews
├── routes/
│   ├── auth.js            # Register, login, save listings
│   ├── listings.js        # CRUD + search + filter + reviews
│   ├── admin.js           # Approve/reject/stats
│   └── ai.js              # AI chatbot (Anthropic API)
├── middleware/
│   └── auth.js            # JWT protection + role authorization
└── public/
    └── index.html         # Complete frontend SPA
```

---

## 🚀 Quick Setup

### 1. Install dependencies
```bash
cd nikunj
npm install
```

### 2. Setup environment
```bash
cp .env.example .env
# Edit .env with your values
```

### 3. Start MongoDB
```bash
# Make sure MongoDB is running locally
mongod
# OR use MongoDB Atlas (cloud) — paste connection string in .env
```

### 4. Seed the database
```bash
node seed.js
```

### 5. Start the server
```bash
npm run dev     # development (with nodemon)
npm start       # production
```

### 6. Open in browser
```
http://localhost:5000
```

---

## 🔑 Default Login Credentials (after seeding)

| Role    | Email                  | Password   |
|---------|------------------------|------------|
| Admin   | admin@nikunj.in        | Admin@123  |
| Owner   | ramesh@owner.com       | Pass@123   |
| Student | student@nikunj.in      | Pass@123   |

---

## 🗺️ Google Maps Setup

1. Go to [Google Cloud Console](https://console.cloud.google.com/)
2. Enable **Maps JavaScript API** and **Geocoding API**
3. Create an API key
4. Add to `.env`:
   ```
   GOOGLE_MAPS_API_KEY=your_key_here
   ```
5. Add to `public/index.html` before `</body>`:
   ```html
   <script src="https://maps.googleapis.com/maps/api/js?key=YOUR_KEY&callback=initMap" async defer></script>
   ```

---

## 🤖 AI Chatbot Setup

1. Get your API key from [console.anthropic.com](https://console.anthropic.com)
2. Add to `.env`:
   ```
   ANTHROPIC_API_KEY=your_key_here
   ```
The AI uses real listing data from your database to give smart recommendations.

---

## 📱 Features

### Student Panel
- 🔍 Search & filter by type, area, budget, gender
- 📍 Map view of all listings
- 🔖 Save favourite listings
- ⭐ Read & write reviews
- 💬 AI-powered chatbot assistant
- 📞 Direct contact with owners

### Owner Panel
- ➕ Submit new listing (hostel/room/flat/tiffin)
- 📊 View listing status (pending/approved/rejected)
- 📈 Track views and ratings

### Admin Panel
- ✅ Approve / Reject listings
- 🗑️ Delete listings
- 📊 Platform statistics
- 👥 View all registered users
- ⭐ Feature listings

---

## 🔌 API Endpoints

### Auth
| Method | Endpoint              | Description         |
|--------|-----------------------|---------------------|
| POST   | /api/auth/register    | Register new user   |
| POST   | /api/auth/login       | Login               |
| GET    | /api/auth/me          | Get current user    |
| PUT    | /api/auth/save/:id    | Save/unsave listing |

### Listings
| Method | Endpoint                     | Description              |
|--------|------------------------------|--------------------------|
| GET    | /api/listings                | Get all (with filters)   |
| GET    | /api/listings/:id            | Get single listing       |
| POST   | /api/listings                | Submit new listing       |
| PUT    | /api/listings/:id            | Update listing           |
| POST   | /api/listings/:id/review     | Add review               |
| GET    | /api/listings/owner/mine     | Owner's own listings     |

### Admin (requires admin token)
| Method | Endpoint                         | Description        |
|--------|----------------------------------|--------------------|
| GET    | /api/admin/stats                 | Platform stats     |
| GET    | /api/admin/listings?status=...   | Filter listings    |
| PUT    | /api/admin/listings/:id/approve  | Approve listing    |
| PUT    | /api/admin/listings/:id/reject   | Reject listing     |
| PUT    | /api/admin/listings/:id/feature  | Toggle featured    |
| DELETE | /api/admin/listings/:id          | Delete listing     |
| GET    | /api/admin/users                 | All users          |

### AI
| Method | Endpoint      | Description           |
|--------|---------------|-----------------------|
| POST   | /api/ai/chat  | Chat with AI assistant|

---

## 🚢 Deployment

### Deploy to Railway (recommended)
```bash
npm install -g @railway/cli
railway login
railway init
railway up
```
Set environment variables in Railway dashboard.

### Deploy to Render
1. Push code to GitHub
2. Create new Web Service on render.com
3. Connect your repo
4. Add environment variables
5. Deploy!

### Deploy to VPS (Ubuntu)
```bash
# Install Node.js & MongoDB
curl -fsSL https://deb.nodesource.com/setup_20.x | sudo -E bash -
sudo apt-get install -y nodejs mongodb

# Clone & setup
git clone your-repo
cd nikunj
npm install
cp .env.example .env
# Edit .env

# Use PM2 for process management
npm install -g pm2
pm2 start server.js --name nikunj
pm2 save
pm2 startup
```

---

## 📦 Tech Stack

| Layer     | Technology              |
|-----------|-------------------------|
| Frontend  | Vanilla HTML/CSS/JS     |
| Backend   | Node.js + Express.js    |
| Database  | MongoDB + Mongoose      |
| Auth      | JWT (jsonwebtoken)      |
| AI        | Anthropic Claude API    |
| Maps      | Google Maps JS API      |
| Security  | bcryptjs + Helmet       |

---

## 🛣️ Roadmap

- [ ] Image upload (Cloudinary integration)
- [ ] Email notifications (Nodemailer)
- [ ] WhatsApp OTP verification
- [ ] Push notifications
- [ ] Mobile app (React Native)
- [ ] Payment integration (Razorpay)
- [ ] Multi-city support
- [ ] Owner analytics dashboard
- [ ] Student roommate finder

---

Made with ❤️ for students in Jaipur
