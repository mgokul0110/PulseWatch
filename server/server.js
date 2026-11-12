
require("dotenv").config();

const express = require("express");
const cors = require("cors");
const pool = require("./config/db");

const authRoutes = require("./routes/authRoutes");
const monitorRoutes = require("./routes/monitorRoutes");
const checkRoutes = require("./routes/checkRoutes");
const dashboardRoutes = require("./routes/dashboardRoutes");
const monitorStatusRoutes = require("./routes/monitorStatusRoutes");
const checkHistoryRoutes = require("./routes/checkHistoryRoutes");
const incidentRoutes = require("./routes/incidentRoutes");

const { startMonitorScheduler } = require("./services/monitorScheduler");

const {
  notFound,
  errorHandler,
} = require("./middleware/errorMiddleware");

const app = express();

// Global middleware
app.use(
  cors({
    origin: process.env.FRONTEND_URL
      ? process.env.FRONTEND_URL.split(",").map((url) => url.trim())
      : "http://localhost:5173",
    methods: ["GET", "POST", "PUT", "PATCH", "DELETE"],
  })
);
app.use(express.json());

// API routes
app.use("/api/auth", authRoutes);
app.use("/api/monitors", monitorRoutes);
app.use("/api/checks", checkRoutes);
app.use("/api/dashboard", dashboardRoutes);
app.use("/api/monitor-status", monitorStatusRoutes);
app.use("/api/check-history", checkHistoryRoutes);
app.use("/api/incidents", incidentRoutes);

// Health check
app.get("/api/health", (req, res) => {
  res.json({
    success: true,
    status: "ok",
    message: "PulseWatch API is running",
  });
});

// 404 handler
app.use(notFound);

// Centralized error handler (must be last)
app.use(errorHandler);

// Start server after verifying database connectivity
const PORT = process.env.PORT || 5001;

const startServer = async () => {
  try {
    const result = await pool.query("SELECT NOW()");

    console.log("PostgreSQL connected:", result.rows[0]);

    app.listen(PORT, () => {
      console.log(`PulseWatch server running on port ${PORT}`);

      startMonitorScheduler();
    });
  } catch (error) {
    console.error("Failed to start PulseWatch:", error.message);
    process.exit(1);
  }
};

startServer();
