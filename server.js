const express = require("express");
const app = express();

// IMPORTANT: use Render port
const PORT = process.env.PORT || 5000;

// ✅ API route (MUST be BEFORE anything else)
app.get("/api/test", (req, res) => {
    res.json({
        message: "NEW BACKEND IS WORKING",
        time: new Date()
    });
});

// Optional: root route
app.get("/", (req, res) => {
    res.send("Backend is running");
});

// ❌ DO NOT put this above API routes
// app.use(express.static("public"));

app.listen(PORT, () => {
    console.log(`Server running on port ${PORT}`);
});