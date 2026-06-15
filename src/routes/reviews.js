const express = require("express");
const Review = require("../models/Review");
const User = require("../models/User");
const { protect, optionalAuth } = require("../middleware/authMiddleware");

const router = express.Router();

// ─── GET /api/reviews ─────────────────────────────────────────────────────
// Get reviews for a destination or hotel
router.get("/", optionalAuth, async (req, res) => {
  try {
    const { destinationId, hotelId, reviewType, page = 1, limit = 10 } = req.query;

    const filter = { isPublished: true };
    if (destinationId) filter.destinationId = destinationId;
    if (hotelId) filter.hotelId = hotelId;
    if (reviewType) filter.reviewType = reviewType;

    const total = await Review.countDocuments(filter);
    const reviews = await Review.find(filter)
      .sort("-createdAt")
      .skip((page - 1) * limit)
      .limit(Number(limit))
      .populate("userId", "name photoURL");

    // Calculate average ratings
    const avgRatings = await Review.aggregate([
      { $match: filter },
      {
        $group: {
          _id: null,
          avgOverall: { $avg: "$ratings.overall" },
          avgEco: { $avg: "$ratings.ecoFriendliness" },
          avgValue: { $avg: "$ratings.valueForMoney" },
          avgClean: { $avg: "$ratings.cleanliness" },
          count: { $sum: 1 },
        },
      },
    ]);

    res.json({
      success: true,
      data: reviews,
      averageRatings: avgRatings[0] || null,
      pagination: { total, page: Number(page), pages: Math.ceil(total / limit) },
    });
  } catch (error) {
    res.status(500).json({ success: false, message: "Failed to fetch reviews" });
  }
});

// ─── POST /api/reviews ────────────────────────────────────────────────────
router.post("/", protect, async (req, res) => {
  try {
    const { reviewType, destinationId, hotelId, title, content, ratings, travelMonth, travelYear, travelType } = req.body;

    if (!reviewType || !title || !content || !ratings?.overall) {
      return res.status(400).json({ success: false, message: "Missing required fields" });
    }

    // Prevent duplicate reviews for same destination by same user
    if (destinationId) {
      const existing = await Review.findOne({
        userId: req.user._id,
        destinationId,
        reviewType: "destination",
      });

      if (existing) {
        return res.status(400).json({ success: false, message: "You've already reviewed this destination" });
      }
    }

    const review = await Review.create({
      userId: req.user._id,
      reviewType,
      destinationId,
      destinationName: req.body.destinationName,
      hotelId,
      hotelName: req.body.hotelName,
      title,
      content,
      ratings,
      travelMonth,
      travelYear,
      travelType,
      images: req.body.images || [],
    });

    await User.findByIdAndUpdate(req.user._id, {
      $inc: { "stats.totalReviews": 1 },
    });

    const populatedReview = await Review.findById(review._id).populate("userId", "name photoURL");

    res.status(201).json({
      success: true,
      message: "Review submitted successfully",
      data: populatedReview,
    });
  } catch (error) {
    console.error("Create review error:", error.message);
    res.status(500).json({ success: false, message: "Failed to submit review" });
  }
});

// ─── GET /api/reviews/my-reviews ─────────────────────────────────────────
router.get("/my-reviews", protect, async (req, res) => {
  try {
    const reviews = await Review.find({ userId: req.user._id }).sort("-createdAt");
    res.json({ success: true, data: reviews });
  } catch (error) {
    res.status(500).json({ success: false, message: "Failed to fetch reviews" });
  }
});

// ─── PUT /api/reviews/:id ─────────────────────────────────────────────────
router.put("/:id", protect, async (req, res) => {
  try {
    const review = await Review.findOne({ _id: req.params.id, userId: req.user._id });

    if (!review) {
      return res.status(404).json({ success: false, message: "Review not found" });
    }

    const allowedUpdates = ["title", "content", "ratings", "travelType", "images"];
    const updates = {};
    allowedUpdates.forEach((field) => {
      if (req.body[field] !== undefined) updates[field] = req.body[field];
    });

    const updated = await Review.findByIdAndUpdate(
      req.params.id,
      { $set: updates },
      { new: true }
    ).populate("userId", "name photoURL");

    res.json({ success: true, message: "Review updated", data: updated });
  } catch (error) {
    res.status(500).json({ success: false, message: "Failed to update review" });
  }
});

// ─── DELETE /api/reviews/:id ──────────────────────────────────────────────
router.delete("/:id", protect, async (req, res) => {
  try {
    const review = await Review.findOneAndDelete({ _id: req.params.id, userId: req.user._id });

    if (!review) {
      return res.status(404).json({ success: false, message: "Review not found" });
    }

    await User.findByIdAndUpdate(req.user._id, {
      $inc: { "stats.totalReviews": -1 },
    });

    res.json({ success: true, message: "Review deleted" });
  } catch (error) {
    res.status(500).json({ success: false, message: "Failed to delete review" });
  }
});

// ─── POST /api/reviews/:id/vote ───────────────────────────────────────────
router.post("/:id/vote", protect, async (req, res) => {
  try {
    const review = await Review.findById(req.params.id);

    if (!review) {
      return res.status(404).json({ success: false, message: "Review not found" });
    }

    const alreadyVoted = review.votedBy.includes(req.user._id);

    if (alreadyVoted) {
      // Remove vote
      await Review.findByIdAndUpdate(req.params.id, {
        $inc: { helpfulVotes: -1 },
        $pull: { votedBy: req.user._id },
      });
      return res.json({ success: true, message: "Vote removed" });
    }

    // Add vote
    await Review.findByIdAndUpdate(req.params.id, {
      $inc: { helpfulVotes: 1 },
      $push: { votedBy: req.user._id },
    });

    res.json({ success: true, message: "Marked as helpful" });
  } catch (error) {
    res.status(500).json({ success: false, message: "Failed to vote" });
  }
});

module.exports = router;
