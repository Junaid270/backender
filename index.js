require('dotenv').config();

const express = require("express");
const session = require("express-session");
const MongoStore = require("connect-mongo"); // You'll need to install this package
const bodyParser = require("body-parser");
const passport = require("./config/passport");
const mongoose = require("mongoose");
const path = require("path");
const cors = require("cors");
const Admin = require("./models/Admin");
const User = require("./models/User");
const adminRoutes = require("./routes/adminRoutes");
const authRoutes = require("./routes/authRoutes");
const postRoutes = require("./routes/postRoutes");
const userRoutes = require("./routes/userRoutes");
const port = process.env.PORT || 3000;

const app = express();

// MongoDB connection setup
const mongoURI = process.env.MONGODB_URI || "mongodb+srv://junaidshk2711:madmax1234@cluster0.ykcxw.mongodb.net/nagrik_seva";

mongoose
  .connect(mongoURI, {
    useNewUrlParser: true,
    useUnifiedTopology: true,
    retryWrites: true,
    w: "majority",
  })
  .then(() => {
    console.log("Successfully connected to MongoDB Atlas");
  })
  .catch((err) => {
    console.error("MongoDB Atlas connection error:", err);
  });

// View engine setup (EJS)
app.set("view engine", "ejs");
app.set("views", path.join(__dirname, "/views"));

// CORS configuration for cross-origin requests
app.use(
  cors({
    origin: [
      "https://nagrikseva-admin.netlify.app",
      "http://localhost:3001", // React web app
      "http://localhost:3000",
      "http://192.168.29.123:3001",
      "http://192.168.29.123:3000",
      // Add your React Native development URLs
      "exp://192.168.29.123:19000", // Expo development
      "exp://localhost:19000",
    ],
    credentials: true, // Allow credentials in requests
    methods: ["GET", "POST", "PUT", "DELETE", "OPTIONS"],
    allowedHeaders: [
      "Content-Type", 
      "Authorization", 
      "Accept",
      "User-Agent" // Important for detecting mobile clients
    ],
  })
);

// Middleware configuration for parsing JSON and form data
app.use(express.json({ limit: "50mb" }));
app.use(express.urlencoded({ limit: "50mb", extended: true }));
app.use(express.static("public"));

// Enhanced Session middleware setup with MongoDB store
app.use(
  session({
    secret: process.env.SESSION_SECRET || "fallback-secret",
    resave: false,
    saveUninitialized: false,
    store: MongoStore.create({
      mongoUrl: mongoURI, // Use the same MongoDB connection
      collectionName: "sessions", // Name of the collection to store sessions
      ttl: 7 * 24 * 60 * 60, // 7 days (match with your current settings)
      autoRemove: "native", // Use MongoDB's TTL index
      touchAfter: 24 * 3600, // Refresh session only once per 24 hours for performance
    }),
    cookie: {
      secure: process.env.NODE_ENV === "production", // Set to true in production with HTTPS
      httpOnly: true,
      maxAge: 7 * 24 * 60 * 60 * 1000, // 7 days to match your current settings
      sameSite: process.env.NODE_ENV === "production" ? "none" : "lax", // Helps with CSRF protection
      domain: process.env.NODE_ENV === "production" ? ".netlify.app" : undefined // Set domain for production
    },
    name: "sessionId", // Explicit session cookie name
  })
);

// Passport initialization
app.use(passport.initialize());
app.use(passport.session());

// Add session activity tracking middleware
app.use((req, res, next) => {
  if (req.session && req.isAuthenticated()) {
    // Update last activity time
    req.session.lastActivity = Date.now();

    // Extend session if needed
    if (req.session.cookie && req.session.cookie.maxAge) {
      req.session.cookie.maxAge = 30 * 24 * 60 * 60 * 1000; // Reset to 30 days
    }
  }
  next();
});

// Add this middleware to handle mobile clients
app.use((req, res, next) => {
  // Check if request is from mobile app
  const isMobileApp = req.headers["user-agent"]?.includes("ReactNative");

  if (isMobileApp) {
    // Extend session lifetime for mobile clients
    if (req.session) {
      req.session.cookie.maxAge = 30 * 24 * 60 * 60 * 1000; // 30 days for mobile
    }
  }
  next();
});

// Routes configuration
app.use("/admin", adminRoutes); // Admin routes
app.use("/auth", authRoutes); // Authentication routes
app.use("/auth/posts", postRoutes); // Post routes
app.use("/auth/users", userRoutes); // User routes

// Session status endpoint (optional, for debugging)
app.get("/session-status", (req, res) => {
  if (req.isAuthenticated()) {
    res.json({
      authenticated: true,
      user: {
        id: req.user._id,
        role: req.user.role,
      },
      session: {
        lastActivity: req.session.lastActivity,
        cookie: {
          maxAge: req.session.cookie.maxAge,
        },
      },
    });
  } else {
    res.json({
      authenticated: false,
      session: req.session
        ? {
            id: req.session.id,
            cookie: {
              maxAge: req.session.cookie.maxAge,
            },
          }
        : null,
    });
  }
});

// Error handling middleware
app.use((err, req, res, next) => {
  console.error("Error:", err.stack); // Enhanced error logging
  res.status(500).json({
    message: "Something broke! Please try again later.",
    error: err.message,
  });
});

// 404 Error handling for undefined routes
app.use((req, res) => {
  console.log("404 Not Found:", req.method, req.url); // Detailed logging for 404s
  res.status(404).json({
    message: "Route not found",
    path: req.url,
    method: req.method,
  });
});

// Start server and log the port
app.listen(port, () => {
  console.log(`Server is running on port ${port}`);
});

module.exports = app;