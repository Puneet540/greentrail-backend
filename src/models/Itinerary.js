const mongoose = require("mongoose");

const dayPlanSchema = new mongoose.Schema({
  day: { type: Number, required: true },
  title: { type: String, required: true },
  activities: [
    {
      time: String,
      activity: String,
      location: String,
      description: String,
      ecoTip: String,
      estimatedCost: Number,
    },
  ],
  meals: {
    breakfast: String,
    lunch: String,
    dinner: String,
  },
  accommodation: {
    name: String,
    type: String,
    ecoRating: Number,
  },
  transportForDay: String,
  estimatedDayCost: Number,
});

const itinerarySchema = new mongoose.Schema(
  {
    userId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      required: true,
      index: true,
    },

    // Basic Info
    title: { type: String, required: true, trim: true },
    destination: { type: String, required: true },
    startDate: { type: Date },
    endDate: { type: Date },
    duration: { type: Number, required: true }, // in days
    numberOfTravelers: { type: Number, default: 1 },

    // Budget
    budget: {
      total: Number,
      currency: { type: String, default: "INR" },
      breakdown: {
        transport: Number,
        accommodation: Number,
        food: Number,
        activities: Number,
        misc: Number,
      },
    },

    // Travel Preferences used to generate
    travelStyle: [String],
    transportMode: [String],

    // AI Generated Plan
    dayPlans: [dayPlanSchema],
    
    // Summary from AI
    summary: { type: String },
    highlights: [String],
    ecoScore: { type: Number, min: 0, max: 10 },
    sustainabilityTips: [String],
    bestTimeToVisit: String,
    packingList: [String],

    // Status
    status: {
      type: String,
      enum: ["draft", "planned", "ongoing", "completed", "cancelled"],
      default: "draft",
    },
    isPublic: { type: Boolean, default: false },
    isFavorite: { type: Boolean, default: false },

    // Metadata
    generatedByAI: { type: Boolean, default: true },
    aiModel: { type: String, default: "gemini-pro" },
    viewCount: { type: Number, default: 0 },
  },
  {
    timestamps: true,
  }
);

itinerarySchema.index({ userId: 1, createdAt: -1 });
itinerarySchema.index({ destination: "text", title: "text" });

module.exports = mongoose.model("Itinerary", itinerarySchema);
