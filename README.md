# 🌿 GreenTrail India — Backend API

Node.js + Express + MongoDB + Firebase Auth backend for the GreenTrail India eco-travel platform.

---

## 🚀 Quick Start

### 1. Install dependencies
```bash
cd greentrail-backend
npm install
```

### 2. Set up environment variables
```bash
cp .env.example .env
# Fill in all values in .env
```

### 3. Run the server
```bash
# Development (auto-restart on changes)
npm run dev

# Production
npm start
```

Server runs at: `http://localhost:5000`

---

## 📁 Project Structure

```
src/
├── config/
│   ├── db.js           # MongoDB connection
│   └── firebase.js     # Firebase Admin SDK
├── middleware/
│   └── authMiddleware.js  # Token verification
├── models/
│   ├── User.js
│   ├── Itinerary.js
│   ├── Booking.js
│   └── Review.js
├── routes/
│   ├── auth.js         # /api/auth
│   ├── users.js        # /api/users
│   ├── itineraries.js  # /api/itineraries
│   ├── bookings.js     # /api/bookings
│   ├── reviews.js      # /api/reviews
│   └── proxy.js        # /api/proxy (API key proxy)
└── server.js
```

---

## 🔐 Authentication Flow

1. User logs in via **Firebase Auth** on the frontend
2. Frontend gets a Firebase **ID Token**
3. Frontend sends token in every request:
   ```
   Authorization: Bearer <firebase-id-token>
   ```
4. Backend verifies token → attaches user to `req.user`

### Sync user after login (call this once after Firebase login):
```
POST /api/auth/sync
Authorization: Bearer <token>
```

---

## 📡 API Endpoints

### Auth
| Method | Endpoint | Description |
|--------|----------|-------------|
| POST | `/api/auth/sync` | Sync Firebase user to MongoDB |
| POST | `/api/auth/logout` | Revoke Firebase tokens |
| DELETE | `/api/auth/delete-account` | Delete account |

### Users
| Method | Endpoint | Description |
|--------|----------|-------------|
| GET | `/api/users/me` | Get my profile |
| PUT | `/api/users/me` | Update profile |
| PUT | `/api/users/me/preferences` | Update travel preferences |
| GET | `/api/users/me/saved-destinations` | Get saved destinations |
| POST | `/api/users/me/saved-destinations` | Save a destination |
| DELETE | `/api/users/me/saved-destinations/:id` | Remove saved destination |

### Itineraries
| Method | Endpoint | Description |
|--------|----------|-------------|
| GET | `/api/itineraries` | Get my itineraries |
| POST | `/api/itineraries` | Save AI-generated itinerary |
| GET | `/api/itineraries/:id` | Get itinerary by ID |
| PUT | `/api/itineraries/:id` | Update itinerary |
| DELETE | `/api/itineraries/:id` | Delete itinerary |
| GET | `/api/itineraries/public/explore` | Public itineraries |

### Bookings
| Method | Endpoint | Description |
|--------|----------|-------------|
| GET | `/api/bookings` | Get my bookings |
| POST | `/api/bookings` | Create booking + Razorpay order |
| POST | `/api/bookings/verify-payment` | Verify Razorpay payment |
| GET | `/api/bookings/:id` | Get booking by ID |
| POST | `/api/bookings/:id/cancel` | Cancel booking |

### Reviews
| Method | Endpoint | Description |
|--------|----------|-------------|
| GET | `/api/reviews` | Get reviews for a destination/hotel |
| POST | `/api/reviews` | Submit a review |
| GET | `/api/reviews/my-reviews` | Get my reviews |
| PUT | `/api/reviews/:id` | Update my review |
| DELETE | `/api/reviews/:id` | Delete my review |
| POST | `/api/reviews/:id/vote` | Mark review as helpful |

### Proxy (API Key Protection)
| Method | Endpoint | Description |
|--------|----------|-------------|
| POST | `/api/proxy/gemini` | Gemini AI requests |
| GET | `/api/proxy/hotels` | Hotel search (Booking.com) |
| GET | `/api/proxy/hotels/location` | Hotel location search |
| GET | `/api/proxy/trains` | Train search (IRCTC) |
| GET | `/api/proxy/trains/station` | Station search |
| GET | `/api/proxy/places` | Google Places search |

---

## 🔗 Connecting Frontend to Backend

In your React frontend, update API calls to go through the backend proxy instead of directly calling external APIs.

### Example: Fetch itinerary from backend
```javascript
const getToken = async () => {
  const { currentUser } = auth; // Firebase auth
  return await currentUser.getIdToken();
};

const fetchMyItineraries = async () => {
  const token = await getToken();
  const res = await fetch("http://localhost:5000/api/itineraries", {
    headers: { Authorization: `Bearer ${token}` },
  });
  return res.json();
};
```

---

## 🌐 Deployment

### Deploy to Railway (recommended)
1. Push backend to GitHub
2. Connect repo at [railway.app](https://railway.app)
3. Add all `.env` variables in Railway dashboard
4. Railway auto-deploys on push

### Or deploy to Render
1. Create a new Web Service at [render.com](https://render.com)
2. Connect GitHub repo
3. Set build command: `npm install`
4. Set start command: `npm start`
5. Add environment variables
