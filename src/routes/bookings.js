const express = require("express");
const Razorpay = require("razorpay");
const crypto = require("crypto");
const Booking = require("../models/Booking");
const User = require("../models/User");
const { protect } = require("../middleware/authMiddleware");

const router = express.Router();
router.use(protect);

// Lazy-initialize Razorpay — only when a booking route is actually called.
// This prevents a crash at startup if RAZORPAY keys are not yet set.
let _razorpay = null;
function getRazorpay() {
  if (!process.env.RAZORPAY_KEY_ID || !process.env.RAZORPAY_KEY_SECRET) {
    throw new Error("Razorpay keys not configured. Add RAZORPAY_KEY_ID and RAZORPAY_KEY_SECRET to your environment variables.");
  }
  if (!_razorpay) {
    _razorpay = new Razorpay({
      key_id: process.env.RAZORPAY_KEY_ID,
      key_secret: process.env.RAZORPAY_KEY_SECRET,
    });
  }
  return _razorpay;
}

// ─── GET /api/bookings ────────────────────────────────────────────────────
router.get("/", async (req, res) => {
  try {
    const { bookingType, status, page = 1, limit = 10 } = req.query;

    const filter = { userId: req.user._id };
    if (bookingType) filter.bookingType = bookingType;
    if (status) filter.status = status;

    const total = await Booking.countDocuments(filter);
    const bookings = await Booking.find(filter)
      .sort("-createdAt")
      .skip((page - 1) * limit)
      .limit(Number(limit));

    res.json({
      success: true,
      data: bookings,
      pagination: { total, page: Number(page), pages: Math.ceil(total / limit) },
    });
  } catch (error) {
    res.status(500).json({ success: false, message: "Failed to fetch bookings" });
  }
});

// ─── POST /api/bookings ───────────────────────────────────────────────────
// Create a booking and Razorpay order
router.post("/", async (req, res) => {
  try {
    const { bookingType, hotel, train, pricing, itineraryId } = req.body;

    if (!bookingType || !pricing) {
      return res.status(400).json({ success: false, message: "Booking type and pricing required" });
    }

    // Create Razorpay Order
    const razorpayOrder = await getRazorpay().orders.create({
      amount: Math.round(pricing.totalAmount * 100), // Amount in paise
      currency: "INR",
      receipt: `GT-${Date.now()}`,
      notes: {
        userId: req.user._id.toString(),
        bookingType,
      },
    });

    // Create booking in DB
    const booking = await Booking.create({
      userId: req.user._id,
      itineraryId: itineraryId || null,
      bookingType,
      hotel: bookingType === "hotel" ? hotel : undefined,
      train: bookingType === "train" ? train : undefined,
      pricing,
      payment: {
        status: "pending",
        razorpayOrderId: razorpayOrder.id,
      },
      status: "pending",
    });

    res.status(201).json({
      success: true,
      message: "Booking initiated",
      data: {
        booking,
        razorpayOrderId: razorpayOrder.id,
        razorpayKeyId: process.env.RAZORPAY_KEY_ID,
        amount: razorpayOrder.amount,
        currency: razorpayOrder.currency,
      },
    });
  } catch (error) {
    console.error("Create booking error:", error.message);
    res.status(500).json({ success: false, message: "Failed to create booking" });
  }
});

// ─── POST /api/bookings/verify-payment ───────────────────────────────────
// Verify Razorpay payment signature
router.post("/verify-payment", async (req, res) => {
  try {
    const { bookingId, razorpayOrderId, razorpayPaymentId, razorpaySignature } = req.body;

    // Verify signature
    const expectedSignature = crypto
      .createHmac("sha256", process.env.RAZORPAY_KEY_SECRET)
      .update(`${razorpayOrderId}|${razorpayPaymentId}`)
      .digest("hex");

    if (expectedSignature !== razorpaySignature) {
      await Booking.findByIdAndUpdate(bookingId, {
        $set: { "payment.status": "failed", status: "failed" },
      });
      return res.status(400).json({ success: false, message: "Payment verification failed" });
    }

    // Update booking as paid
    const booking = await Booking.findByIdAndUpdate(
      bookingId,
      {
        $set: {
          "payment.status": "paid",
          "payment.razorpayPaymentId": razorpayPaymentId,
          "payment.razorpaySignature": razorpaySignature,
          "payment.paidAt": new Date(),
          status: "confirmed",
        },
      },
      { new: true }
    );

    // Update user stats
    await User.findByIdAndUpdate(req.user._id, {
      $inc: { "stats.totalTrips": 1 },
    });

    res.json({ success: true, message: "Payment verified. Booking confirmed!", data: booking });
  } catch (error) {
    console.error("Payment verification error:", error.message);
    res.status(500).json({ success: false, message: "Payment verification failed" });
  }
});

// ─── GET /api/bookings/:id ────────────────────────────────────────────────
router.get("/:id", async (req, res) => {
  try {
    const booking = await Booking.findOne({
      _id: req.params.id,
      userId: req.user._id,
    });

    if (!booking) {
      return res.status(404).json({ success: false, message: "Booking not found" });
    }

    res.json({ success: true, data: booking });
  } catch (error) {
    res.status(500).json({ success: false, message: "Failed to fetch booking" });
  }
});

// ─── POST /api/bookings/:id/cancel ───────────────────────────────────────
router.post("/:id/cancel", async (req, res) => {
  try {
    const booking = await Booking.findOne({
      _id: req.params.id,
      userId: req.user._id,
    });

    if (!booking) {
      return res.status(404).json({ success: false, message: "Booking not found" });
    }

    if (["cancelled", "completed"].includes(booking.status)) {
      return res.status(400).json({ success: false, message: `Booking already ${booking.status}` });
    }

    const updated = await Booking.findByIdAndUpdate(
      req.params.id,
      {
        $set: {
          status: "cancelled",
          cancellationReason: req.body.reason || "Cancelled by user",
          cancelledAt: new Date(),
        },
      },
      { new: true }
    );

    res.json({ success: true, message: "Booking cancelled", data: updated });
  } catch (error) {
    res.status(500).json({ success: false, message: "Failed to cancel booking" });
  }
});

module.exports = router;
