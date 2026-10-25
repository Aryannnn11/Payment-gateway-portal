require("dotenv").config();

const express = require("express");
const cors = require("cors");

const userRoutes = require("./routes/users");
const paymentRoutes = require("./routes/payments");
const dashboardRoutes = require("./routes/dashboard");
const webhookRoutes = require("./routes/webhook");

const app = express();


// ==========================================
// MIDDLEWARE
// ==========================================

app.use(cors());
// Webhook signatures require the unmodified raw request bytes.
// Register this endpoint before the global JSON body parser.
app.use("/api/webhooks", express.raw({ type: "application/json", limit: "1mb" }), webhookRoutes);
app.use(express.json());


// ==========================================
// API ROUTES
// ==========================================

app.use("/api/users", userRoutes);

app.use("/api/payments", paymentRoutes);

app.use("/api/dashboard", dashboardRoutes);


// ==========================================
// HEALTH CHECK
// ==========================================

app.get("/", (req, res) => {
    res.status(200).json({
        message: "Payment Gateway API is running"
    });
});


// ==========================================
// START SERVER
// ==========================================

const PORT = process.env.PORT || 5000;

app.listen(PORT, () => {
    console.log(
        `Server running on http://localhost:${PORT}`
    );
});