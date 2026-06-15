const express = require("express");
const axios = require("axios");
const { protect } = require("../middleware/authMiddleware");
const rateLimit = require("express-rate-limit");

const router = express.Router();

// Rate limit proxy routes more aggressively
const proxyLimiter = rateLimit({
  windowMs: 60 * 1000, // 1 minute
  max: 30,
  message: { success: false, message: "Too many API requests, slow down!" },
});

router.use(proxyLimiter);
router.use(protect); // All proxy routes require authentication

// ─── POST /api/proxy/gemini ───────────────────────────────────────────────
// Proxy Gemini AI requests (itinerary generation, chat)
router.post("/gemini", async (req, res) => {
  try {
    const { prompt, model = "gemini-pro" } = req.body;

    if (!prompt) {
      return res.status(400).json({ success: false, message: "Prompt is required" });
    }

    const response = await axios.post(
      `https://generativelanguage.googleapis.com/v1beta/models/${model}:generateContent?key=${process.env.GEMINI_API_KEY}`,
      {
        contents: [{ parts: [{ text: prompt }] }],
        generationConfig: {
          temperature: 0.7,
          topK: 40,
          topP: 0.95,
          maxOutputTokens: 8192,
        },
      },
      { headers: { "Content-Type": "application/json" } }
    );

    res.json({ success: true, data: response.data });
  } catch (error) {
    console.error("Gemini proxy error:", error.response?.data || error.message);
    res.status(error.response?.status || 500).json({
      success: false,
      message: "Gemini API request failed",
      error: error.response?.data?.error?.message || error.message,
    });
  }
});

// ─── GET /api/proxy/hotels ────────────────────────────────────────────────
// Proxy Booking.com hotel search via RapidAPI
router.get("/hotels", async (req, res) => {
  try {
    const { destination, checkIn, checkOut, adults = 1, children = 0, rooms = 1 } = req.query;

    if (!destination || !checkIn || !checkOut) {
      return res.status(400).json({ success: false, message: "destination, checkIn, checkOut are required" });
    }

    const response = await axios.get(
      "https://booking-com.p.rapidapi.com/v1/hotels/search",
      {
        params: {
          dest_id: destination,
          search_type: "city",
          arrival_date: checkIn,
          departure_date: checkOut,
          adults_number: adults,
          children_number: children,
          room_number: rooms,
          currency: "INR",
          locale: "en-us",
          units: "metric",
          order_by: "review_score",
          filter_by_currency: "INR",
          categories_filter_ids: "class::2,class::4,free_cancellation::1",
        },
        headers: {
          "X-RapidAPI-Key": process.env.RAPIDAPI_KEY,
          "X-RapidAPI-Host": "booking-com.p.rapidapi.com",
        },
      }
    );

    res.json({ success: true, data: response.data });
  } catch (error) {
    console.error("Hotels proxy error:", error.response?.data || error.message);
    res.status(error.response?.status || 500).json({
      success: false,
      message: "Hotel search failed",
    });
  }
});

// ─── GET /api/proxy/hotels/location ──────────────────────────────────────
// Search hotel destination IDs
router.get("/hotels/location", async (req, res) => {
  try {
    const { query } = req.query;

    if (!query) {
      return res.status(400).json({ success: false, message: "Search query required" });
    }

    const response = await axios.get(
      "https://booking-com.p.rapidapi.com/v1/hotels/locations",
      {
        params: { name: query, locale: "en-us" },
        headers: {
          "X-RapidAPI-Key": process.env.RAPIDAPI_KEY,
          "X-RapidAPI-Host": "booking-com.p.rapidapi.com",
        },
      }
    );

    res.json({ success: true, data: response.data });
  } catch (error) {
    res.status(500).json({ success: false, message: "Location search failed" });
  }
});

// ─── GET /api/proxy/trains ────────────────────────────────────────────────
// Proxy IRCTC train search via RapidAPI
router.get("/trains", async (req, res) => {
  try {
    const { fromStation, toStation, date } = req.query;

    if (!fromStation || !toStation || !date) {
      return res.status(400).json({ success: false, message: "fromStation, toStation, date are required" });
    }

    const response = await axios.get(
      "https://irctc1.p.rapidapi.com/api/v3/trainBetweenStations",
      {
        params: {
          fromStationCode: fromStation.toUpperCase(),
          toStationCode: toStation.toUpperCase(),
          dateOfJourney: date,
        },
        headers: {
          "X-RapidAPI-Key": process.env.RAPIDAPI_KEY,
          "X-RapidAPI-Host": "irctc1.p.rapidapi.com",
        },
      }
    );

    res.json({ success: true, data: response.data });
  } catch (error) {
    console.error("Train proxy error:", error.response?.data || error.message);
    res.status(error.response?.status || 500).json({
      success: false,
      message: "Train search failed",
    });
  }
});

// ─── GET /api/proxy/trains/station ───────────────────────────────────────
// Search station codes
router.get("/trains/station", async (req, res) => {
  try {
    const { query } = req.query;

    if (!query) {
      return res.status(400).json({ success: false, message: "Station name required" });
    }

    const response = await axios.get(
      "https://irctc1.p.rapidapi.com/api/v1/searchStation",
      {
        params: { query },
        headers: {
          "X-RapidAPI-Key": process.env.RAPIDAPI_KEY,
          "X-RapidAPI-Host": "irctc1.p.rapidapi.com",
        },
      }
    );

    res.json({ success: true, data: response.data });
  } catch (error) {
    res.status(500).json({ success: false, message: "Station search failed" });
  }
});

// ─── GET /api/proxy/places ────────────────────────────────────────────────
// Proxy Google Places API
router.get("/places", async (req, res) => {
  try {
    const { query, location, radius = 50000 } = req.query;

    if (!query) {
      return res.status(400).json({ success: false, message: "Query required" });
    }

    const params = {
      query,
      key: process.env.GOOGLE_PLACES_API_KEY,
    };

    if (location) params.location = location;
    if (radius) params.radius = radius;

    const response = await axios.get(
      "https://maps.googleapis.com/maps/api/place/textsearch/json",
      { params }
    );

    res.json({ success: true, data: response.data });
  } catch (error) {
    res.status(500).json({ success: false, message: "Places search failed" });
  }
});

module.exports = router;
