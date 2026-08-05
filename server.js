const express = require("express");
const path = require("path");

const app = express();

// ✅ Required for JSON requests
app.use(express.json());

// ✅ Use Render's port
const PORT = process.env.PORT || 5000;

/* =========================
   ✅ API ROUTES (TOP FIRST)
========================= */

// Test route (THIS is what you're trying to fix)
app.get("/api/test", (req, res) => {
    res.json({
        message: "NEW BACKEND IS WORKING",
        time: new Date()
    });
});

/* =========================
   ✅ OPTIONAL ROOT ROUTE
========================= */
app.get("/", (req, res) => {
    res.send("Backend is running");
});

/* =========================
   ⚠️ STATIC FILES (PUT AFTER API)
========================= */

// Only use this if you serve frontend from backend
app.use(express.static(path.join(__dirname, "public")));

/* =========================
   ⚠️ CATCH-ALL (VERY LAST)
========================= */

// This must be LAST or it will break API routes
app.get("*", (req, res) => {
    res.sendFile(path.join(__dirname, "public", "index.html"));
});

/* =========================
   🚀 START SERVER
========================= */
app.listen(PORT, () => {
    console.log(`Server running on port ${PORT}`);
});