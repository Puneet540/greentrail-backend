const mongoose = require("mongoose");

const bookingSchema = new mongoose.Schema(
  {
    userId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      required: true,
      index: true,
    },
    itineraryId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Itinerary",
      default: null,
    },

    // Type of booking
    bookingType: {
      type: String,
      enum: ["hotel", "train", "flight", "activity"],
      required: true,
    },

    // ─── Hotel Booking Fields ──────────────────────────────────────────
    hotel: {
      hotelId: String,           // RapidAPI hotel ID
      hotelName: String,
      hotelAddress: String,
      hotelCity: String,
      hotelCountry: { type: String, default: "India" },
      roomType: String,
      checkIn: Date,
      checkOut: Date,
      nights: Number,
      guests: {
        adults: { type: Number, default: 1 },
        children: { type: Number, default: 0 },
      },
      amenities: [String],
      hotelImageUrl: String,
      ecoRating: Number,
    },

    // ─── Train Booking Fields ──────────────────────────────────────────
    train: {
      trainNumber: String,
      trainName: String,
      fromStation: String,
      fromStationCode: String,
      toStation: String,
      toStationCode: String,
      departureDate: Date,
      departureTime: String,
      arrivalTime: String,
      duration: String,
      classType: String,       // SL, 3A, 2A, 1A, CC
      passengers: [
        {
          name: String,
          age: Number,
          gender: String,
          idType: String,
          idNumber: String,
        },
      ],
      pnrNumber: String,
      seatNumbers: [String],
    },

    // ─── Pricing ──────────────────────────────────────────────────────
    pricing: {
      basePrice: { type: Number, required: true },
      taxes: { type: Number, default: 0 },
      discount: { type: Number, default: 0 },
      totalAmount: { type: Number, required: true },
      currency: { type: String, default: "INR" },
    },

    // ─── Payment ──────────────────────────────────────────────────────
    payment: {
      status: {
        type: String,
        enum: ["pending", "paid", "failed", "refunded"],
        default: "pending",
      },
      method: String,
      razorpayOrderId: String,
      razorpayPaymentId: String,
      razorpaySignature: String,
      paidAt: Date,
    },

    // ─── Booking Status ───────────────────────────────────────────────
    status: {
      type: String,
      enum: ["pending", "confirmed", "cancelled", "completed", "failed"],
      default: "pending",
    },

    bookingReference: {
      type: String,
      unique: true,
      default: () => `GT-${Date.now()}-${Math.random().toString(36).substr(2, 6).toUpperCase()}`,
    },

    cancellationReason: String,
    cancelledAt: Date,
    notes: String,
  },
  {
    timestamps: true,
  }
);

bookingSchema.index({ userId: 1, bookingType: 1, createdAt: -1 });
bookingSchema.index({ bookingReference: 1 });

module.exports = mongoose.model("Booking", bookingSchema);
