const express = require("express");
const admin = require("firebase-admin");
const User = require("../models/User");
const { protect } = require("../middleware/authMiddleware");

const router = express.Router();

// ─── POST /api/auth/sync ───────────────────────────────────────────────────
// Called after Firebase login/signup to sync user with MongoDB
router.post("/sync", async (req, res) => {
  try {
    const authHeader = req.headers.authorization;

    if (!authHeader || !authHeader.startsWith("Bearer ")) {
      return res.status(401).json({ success: false, message: "No token provided" });
    }

    const token = authHeader.split(" ")[1];
    const decodedToken = await admin.auth().verifyIdToken(token);

    const { uid, email, name, picture } = decodedToken;

    // Upsert user in MongoDB
    let user = await User.findOneAndUpdate(
      { firebaseUid: uid },
      {
        $set: {
          firebaseUid: uid,
          email: email || "",
          name: name || req.body.name || "GreenTrail Explorer",
          photoURL: picture || req.body.photoURL || "",
          lastLoginAt: new Date(),
        },
      },
      { upsert: true, new: true, setDefaultsOnInsert: true }
    );

    res.status(200).json({
      success: true,
      message: "User synced successfully",
      data: {
        id: user._id,
        firebaseUid: user.firebaseUid,
        name: user.name,
        email: user.email,
        photoURL: user.photoURL,
        stats: user.stats,
        preferences: user.preferences,
      },
    });
  } catch (error) {
    console.error("Auth sync error:", error.message);

    if (error.code?.startsWith("auth/")) {
      return res.status(401).json({ success: false, message: "Invalid Firebase token" });
    }

    res.status(500).json({ success: false, message: "Server error during auth sync" });
  }
});

// ─── POST /api/auth/logout ─────────────────────────────────────────────────
// Optional: revoke Firebase refresh tokens server-side
router.post("/logout", protect, async (req, res) => {
  try {
    await admin.auth().revokeRefreshTokens(req.firebaseUser.uid);

    res.json({ success: true, message: "Logged out successfully" });
  } catch (error) {
    console.error("Logout error:", error.message);
    res.status(500).json({ success: false, message: "Logout failed" });
  }
});

// ─── DELETE /api/auth/delete-account ──────────────────────────────────────
router.delete("/delete-account", protect, async (req, res) => {
  try {
    const userId = req.user._id;
    const firebaseUid = req.firebaseUser.uid;

    // Delete from MongoDB
    await User.findByIdAndDelete(userId);

    // Delete from Firebase
    await admin.auth().deleteUser(firebaseUid);

    res.json({ success: true, message: "Account deleted successfully" });
  } catch (error) {
    console.error("Delete account error:", error.message);
    res.status(500).json({ success: false, message: "Failed to delete account" });
  }
});

module.exports = router;
