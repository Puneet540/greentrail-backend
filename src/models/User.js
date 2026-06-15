const mongoose = require("mongoose");

const userSchema = new mongoose.Schema(
  {
    firebaseUid: {
      type: String,
      required: true,
      unique: true,
      index: true,
    },
    name: {
      type: String,
      required: true,
      trim: true,
      maxlength: 100,
    },
    email: {
      type: String,
      required: true,
      unique: true,
      lowercase: true,
      trim: true,
    },
    photoURL: {
      type: String,
      default: "",
    },
    phone: {
      type: String,
      default: "",
    },
    bio: {
      type: String,
      maxlength: 500,
      default: "",
    },
    location: {
      type: String,
      default: "",
    },

    // Travel preferences
    preferences: {
      travelStyle: {
        type: [String],
        enum: ["adventure", "cultural", "relaxation", "wildlife", "spiritual", "budget", "luxury"],
        default: [],
      },
      preferredTransport: {
        type: [String],
        enum: ["train", "bus", "flight", "car", "bike"],
        default: [],
      },
      dietaryPreferences: {
        type: [String],
        enum: ["vegetarian", "vegan", "non-vegetarian", "jain", "halal"],
        default: [],
      },
    },

    // Saved/Wishlist destinations
    savedDestinations: [
      {
        destinationId: String,
        destinationName: String,
        savedAt: { type: Date, default: Date.now },
      },
    ],

    // Stats
    stats: {
      totalTrips: { type: Number, default: 0 },
      totalItineraries: { type: Number, default: 0 },
      totalReviews: { type: Number, default: 0 },
    },

    isActive: { type: Boolean, default: true },
    lastLoginAt: { type: Date, default: Date.now },
  },
  {
    timestamps: true,
  }
);

module.exports = mongoose.model("User", userSchema);
