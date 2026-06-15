const express = require("express");
const Itinerary = require("../models/Itinerary");
const User = require("../models/User");
const { protect, optionalAuth } = require("../middleware/authMiddleware");

const router = express.Router();

// ─── GET /api/itineraries ─────────────────────────────────────────────────
// Get current user's itineraries
router.get("/", protect, async (req, res) => {
  try {
    const { status, page = 1, limit = 10, sort = "-createdAt" } = req.query;

    const filter = { userId: req.user._id };
    if (status) filter.status = status;

    const total = await Itinerary.countDocuments(filter);
    const itineraries = await Itinerary.find(filter)
      .sort(sort)
      .skip((page - 1) * limit)
      .limit(Number(limit))
      .select("-dayPlans -sustainabilityTips -packingList"); // Omit heavy fields in list

    res.json({
      success: true,
      data: itineraries,
      pagination: {
        total,
        page: Number(page),
        pages: Math.ceil(total / limit),
        limit: Number(limit),
      },
    });
  } catch (error) {
    res.status(500).json({ success: false, message: "Failed to fetch itineraries" });
  }
});

// ─── POST /api/itineraries ────────────────────────────────────────────────
// Save a new AI-generated itinerary
router.post("/", protect, async (req, res) => {
  try {
    const itineraryData = {
      ...req.body,
      userId: req.user._id,
    };

    const itinerary = await Itinerary.create(itineraryData);

    // Update user stats
    await User.findByIdAndUpdate(req.user._id, {
      $inc: { "stats.totalItineraries": 1 },
    });

    res.status(201).json({
      success: true,
      message: "Itinerary saved successfully",
      data: itinerary,
    });
  } catch (error) {
    console.error("Create itinerary error:", error.message);
    res.status(500).json({ success: false, message: "Failed to save itinerary" });
  }
});

// ─── GET /api/itineraries/:id ─────────────────────────────────────────────
router.get("/:id", optionalAuth, async (req, res) => {
  try {
    const itinerary = await Itinerary.findById(req.params.id).populate(
      "userId",
      "name photoURL"
    );

    if (!itinerary) {
      return res.status(404).json({ success: false, message: "Itinerary not found" });
    }

    // Allow access if owner or if itinerary is public
    const isOwner = req.user && req.user._id.toString() === itinerary.userId._id.toString();
    if (!itinerary.isPublic && !isOwner) {
      return res.status(403).json({ success: false, message: "Access denied" });
    }

    // Increment view count
    await Itinerary.findByIdAndUpdate(req.params.id, { $inc: { viewCount: 1 } });

    res.json({ success: true, data: itinerary });
  } catch (error) {
    res.status(500).json({ success: false, message: "Failed to fetch itinerary" });
  }
});

// ─── PUT /api/itineraries/:id ─────────────────────────────────────────────
router.put("/:id", protect, async (req, res) => {
  try {
    const itinerary = await Itinerary.findOne({
      _id: req.params.id,
      userId: req.user._id,
    });

    if (!itinerary) {
      return res.status(404).json({ success: false, message: "Itinerary not found" });
    }

    const allowedUpdates = [
      "title", "status", "isPublic", "isFavorite", "startDate", "endDate",
      "notes", "dayPlans", "budget",
    ];

    const updates = {};
    allowedUpdates.forEach((field) => {
      if (req.body[field] !== undefined) updates[field] = req.body[field];
    });

    const updated = await Itinerary.findByIdAndUpdate(
      req.params.id,
      { $set: updates },
      { new: true }
    );

    res.json({ success: true, message: "Itinerary updated", data: updated });
  } catch (error) {
    res.status(500).json({ success: false, message: "Failed to update itinerary" });
  }
});

// ─── DELETE /api/itineraries/:id ──────────────────────────────────────────
router.delete("/:id", protect, async (req, res) => {
  try {
    const itinerary = await Itinerary.findOneAndDelete({
      _id: req.params.id,
      userId: req.user._id,
    });

    if (!itinerary) {
      return res.status(404).json({ success: false, message: "Itinerary not found" });
    }

    await User.findByIdAndUpdate(req.user._id, {
      $inc: { "stats.totalItineraries": -1 },
    });

    res.json({ success: true, message: "Itinerary deleted" });
  } catch (error) {
    res.status(500).json({ success: false, message: "Failed to delete itinerary" });
  }
});

// ─── GET /api/itineraries/public/explore ──────────────────────────────────
// Public itineraries for explore page
router.get("/public/explore", async (req, res) => {
  try {
    const { destination, page = 1, limit = 12 } = req.query;

    const filter = { isPublic: true };
    if (destination) filter.destination = new RegExp(destination, "i");

    const itineraries = await Itinerary.find(filter)
      .sort("-viewCount -createdAt")
      .skip((page - 1) * limit)
      .limit(Number(limit))
      .select("title destination duration budget ecoScore highlights viewCount userId createdAt")
      .populate("userId", "name photoURL");

    const total = await Itinerary.countDocuments(filter);

    res.json({
      success: true,
      data: itineraries,
      pagination: { total, page: Number(page), pages: Math.ceil(total / limit) },
    });
  } catch (error) {
    res.status(500).json({ success: false, message: "Failed to fetch public itineraries" });
  }
});

module.exports = router;
