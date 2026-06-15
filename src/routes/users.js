const express = require("express");
const { body, validationResult } = require("express-validator");
const User = require("../models/User");
const { protect } = require("../middleware/authMiddleware");

const router = express.Router();

// All user routes are protected
router.use(protect);

// ─── GET /api/users/me ────────────────────────────────────────────────────
router.get("/me", async (req, res) => {
  try {
    const user = await User.findById(req.user._id).select("-__v");

    res.json({ success: true, data: user });
  } catch (error) {
    res.status(500).json({ success: false, message: "Failed to fetch profile" });
  }
});

// ─── PUT /api/users/me ────────────────────────────────────────────────────
router.put(
  "/me",
  [
    body("name").optional().trim().isLength({ min: 2, max: 100 }),
    body("phone").optional().trim(),
    body("bio").optional().trim().isLength({ max: 500 }),
    body("location").optional().trim(),
  ],
  async (req, res) => {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({ success: false, errors: errors.array() });
    }

    try {
      const allowedFields = ["name", "phone", "bio", "location", "photoURL"];
      const updates = {};
      allowedFields.forEach((field) => {
        if (req.body[field] !== undefined) updates[field] = req.body[field];
      });

      const user = await User.findByIdAndUpdate(
        req.user._id,
        { $set: updates },
        { new: true, runValidators: true }
      ).select("-__v");

      res.json({ success: true, message: "Profile updated", data: user });
    } catch (error) {
      res.status(500).json({ success: false, message: "Failed to update profile" });
    }
  }
);

// ─── PUT /api/users/me/preferences ───────────────────────────────────────
router.put("/me/preferences", async (req, res) => {
  try {
    const { travelStyle, preferredTransport, dietaryPreferences } = req.body;

    const user = await User.findByIdAndUpdate(
      req.user._id,
      {
        $set: {
          "preferences.travelStyle": travelStyle || [],
          "preferences.preferredTransport": preferredTransport || [],
          "preferences.dietaryPreferences": dietaryPreferences || [],
        },
      },
      { new: true }
    ).select("preferences");

    res.json({ success: true, message: "Preferences updated", data: user.preferences });
  } catch (error) {
    res.status(500).json({ success: false, message: "Failed to update preferences" });
  }
});

// ─── POST /api/users/me/saved-destinations ────────────────────────────────
router.post("/me/saved-destinations", async (req, res) => {
  try {
    const { destinationId, destinationName } = req.body;

    if (!destinationId || !destinationName) {
      return res.status(400).json({ success: false, message: "Destination ID and name required" });
    }

    // Check if already saved
    const alreadySaved = req.user.savedDestinations.some(
      (d) => d.destinationId === destinationId
    );

    if (alreadySaved) {
      return res.status(400).json({ success: false, message: "Destination already saved" });
    }

    const user = await User.findByIdAndUpdate(
      req.user._id,
      {
        $push: {
          savedDestinations: { destinationId, destinationName, savedAt: new Date() },
        },
      },
      { new: true }
    ).select("savedDestinations");

    res.json({ success: true, message: "Destination saved", data: user.savedDestinations });
  } catch (error) {
    res.status(500).json({ success: false, message: "Failed to save destination" });
  }
});

// ─── DELETE /api/users/me/saved-destinations/:destinationId ──────────────
router.delete("/me/saved-destinations/:destinationId", async (req, res) => {
  try {
    const user = await User.findByIdAndUpdate(
      req.user._id,
      {
        $pull: { savedDestinations: { destinationId: req.params.destinationId } },
      },
      { new: true }
    ).select("savedDestinations");

    res.json({ success: true, message: "Destination removed", data: user.savedDestinations });
  } catch (error) {
    res.status(500).json({ success: false, message: "Failed to remove destination" });
  }
});

// ─── GET /api/users/me/saved-destinations ─────────────────────────────────
router.get("/me/saved-destinations", async (req, res) => {
  try {
    const user = await User.findById(req.user._id).select("savedDestinations");
    res.json({ success: true, data: user.savedDestinations });
  } catch (error) {
    res.status(500).json({ success: false, message: "Failed to fetch saved destinations" });
  }
});

module.exports = router;
