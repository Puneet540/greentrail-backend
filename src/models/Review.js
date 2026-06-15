const mongoose = require("mongoose");

const reviewSchema = new mongoose.Schema(
  {
    userId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      required: true,
      index: true,
    },

    // What is being reviewed
    reviewType: {
      type: String,
      enum: ["destination", "hotel", "train", "itinerary"],
      required: true,
    },

    // Reference IDs
    destinationId: { type: String, index: true },
    destinationName: { type: String },
    hotelId: { type: String },
    hotelName: { type: String },
    itineraryId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Itinerary",
    },

    // Review Content
    title: {
      type: String,
      required: true,
      trim: true,
      maxlength: 150,
    },
    content: {
      type: String,
      required: true,
      trim: true,
      maxlength: 2000,
    },

    // Ratings (1-5)
    ratings: {
      overall: { type: Number, required: true, min: 1, max: 5 },
      ecoFriendliness: { type: Number, min: 1, max: 5 },
      valueForMoney: { type: Number, min: 1, max: 5 },
      cleanliness: { type: Number, min: 1, max: 5 },
      accessibility: { type: Number, min: 1, max: 5 },
    },

    // Travel context
    travelMonth: { type: Number, min: 1, max: 12 },
    travelYear: { type: Number },
    travelType: {
      type: String,
      enum: ["solo", "couple", "family", "friends", "business"],
    },

    // Media
    images: [
      {
        url: String,
        caption: String,
      },
    ],

    // Helpful votes
    helpfulVotes: { type: Number, default: 0 },
    votedBy: [{ type: mongoose.Schema.Types.ObjectId, ref: "User" }],

    isVerified: { type: Boolean, default: false },
    isPublished: { type: Boolean, default: true },
    isFlagged: { type: Boolean, default: false },
  },
  {
    timestamps: true,
  }
);

reviewSchema.index({ destinationId: 1, createdAt: -1 });
reviewSchema.index({ userId: 1, reviewType: 1 });

module.exports = mongoose.model("Review", reviewSchema);
