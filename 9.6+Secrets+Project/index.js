import express from "express"; // Importing Express framework for building web applications
import bodyParser from "body-parser"; // Middleware for parsing incoming request bodies
import pg from "pg"; // PostgreSQL client library
import bcrypt from "bcrypt"; // Library for hashing passwords
import passport from "passport"; // Authentication middleware for Node.js
import { Strategy } from "passport-local"; // Local authentication strategy for Passport
import GoogleStrategy from "passport-google-oauth2"; // Google OAuth2 authentication strategy for Passport
import session from "express-session"; // Middleware for managing user sessions
import env from "dotenv"; // Load environment variables from .env file

const app = express(); // Initialize Express app
const port = 3000; // Port number for the server
const saltRounds = 10; // Number of salt rounds for password hashing
env.config(); // Load environment variables from .env file

// Middleware setup
app.use(
  session({
    secret: process.env.SESSION_SECRET, // Session secret key
    resave: false, // Don't save session if unmodified . When set to false, this option indicates that the session should not be saved to the store if it hasn't been modified during the request. It helps optimize server performance by avoiding unnecessary session updates.
    saveUninitialized: true, // Saves uninitialized session to store
  })
);
app.use(bodyParser.urlencoded({ extended: true })); // Parse URL-encoded bodies
app.use(express.static("public")); // Serve static files from the "public" directory
app.use(passport.initialize()); // Initialize Passport
app.use(passport.session()); // Enable persistent login sessions with Passport

// PostgreSQL client setup
const db = new pg.Client({
  user: process.env.PG_USER, // PostgreSQL username
  host: process.env.PG_HOST, // PostgreSQL host
  database: process.env.PG_DATABASE, // PostgreSQL database name
  password: process.env.PG_PASSWORD, // PostgreSQL password
  port: process.env.PG_PORT, // PostgreSQL port
});
db.connect(); // Connect to the PostgreSQL database

// Routes setup
app.get("/", (req, res) => {
  res.render("home.ejs"); // Render the home page
});

app.get("/login", (req, res) => {
  res.render("login.ejs"); // Render the login page
});

app.get("/register", (req, res) => {
  res.render("register.ejs"); // Render the register page
});

app.get("/logout", (req, res) => {
  req.logout(function (err) { // Logout user
    if (err) {
      return next(err);
    }
    res.redirect("/"); // Redirect to the home page
  });
});

// Handle authenticated user accessing secrets
app.get("/secrets", async (req, res) => {
  if (req.isAuthenticated()) { // Check if user is authenticated
    try {
      const result = await db.query("SELECT secret FROM users WHERE email =$1", [req.user.email]); // Retrieve secret from database
      const secret = result.rows[0].secret; // Extract secret from query result
      if (secret) {
        res.render("secrets.ejs", { secret: secret }); // Render secrets page with the retrieved secret
      } else {
        res.render("secrets.ejs", { secret: "You should submit a secret!" }); // Render secrets page with a message
      }
    } catch (err) {
      console.log(err);
    }
  } else {
    res.redirect("/login"); // Redirect to login page if user is not authenticated
  }
});

// Handle submission of secrets
app.get("/submit", (req, res) => {
  if (req.isAuthenticated()) {
    res.render("submit.ejs"); // Render submission page if user is authenticated
  } else {
    res.redirect("/login"); // Redirect to login page if user is not authenticated
  }
});

// Google authentication routes
app.get(
  "/auth/google",
  passport.authenticate("google", {
    scope: ["profile", "email"], // Request access to user's profile and email
  })
);

app.get(
  "/auth/google/secrets",
  passport.authenticate("google", {
    successRedirect: "/secrets", // Redirect to secrets page upon successful authentication
    failureRedirect: "/login", // Redirect to login page upon authentication failure
  })
);

// Local authentication route
app.post(
  "/login",
  passport.authenticate("local", {
    successRedirect: "/secrets", // Redirect to secrets page upon successful login
    failureRedirect: "/login", // Redirect to login page upon login failure
  })
);

// Registration route
app.post("/register", async (req, res) => {
  const email = req.body.username; // Extract email from request body
  const password = req.body.password; // Extract password from request body

  try {
    const checkResult = await db.query("SELECT * FROM users WHERE email = $1", [
      email,
    ]);

    if (checkResult.rows.length > 0) {
      req.redirect("/login"); // Redirect to login page if user already exists
    } else {
      // Hash password
      bcrypt.hash(password, saltRounds, async (err, hash) => {
        if (err) {
          console.error("Error hashing password:", err);
        } else {
          // Store user in database
          const result = await db.query(
            "INSERT INTO users (email, password) VALUES ($1, $2) RETURNING *",
            [email, hash]
          );
          const user = result.rows[0];
          req.login(user, (err) => {
            console.log("success");
            res.redirect("/secrets"); // Redirect to secrets page upon successful registration
          });
        }
      });
    }
  } catch (err) {
    console.log(err);
  }
});

// Handle secret submission
app.post("/submit", async (req, res) => {
  const secret = req.body.secret; // Extract secret from request body
  console.log(req.user); // Log authenticated user
  try {
    // Update user's secret in the database
    await db.query("UPDATE users SET secret = $1 WHERE email=$2", [
      secret,
      req.user.email,
    ]);
    res.redirect("/secrets"); // Redirect to secrets page after submission
  } catch (err) {
    console.log(err);
  }
});

// Local authentication strategy setup
passport.use(
  "local",
  new Strategy(async function verify(username, password, cb) {
    try {
      const result = await db.query("SELECT * FROM users WHERE email = $1 ", [
        username,
      ]);
      if (result.rows.length > 0) {
        const user = result.rows[0];
        const storedHashedPassword = user.password;
        bcrypt.compare(password, storedHashedPassword, (err, valid) => {
          if (err) {
            console.error("Error comparing passwords:", err);
            return cb(err);
          } else {
            if (valid) {
              return cb(null, user);
            } else {
              return cb(null, false);
            }
          }
        });
      } else {
        return cb("User not found");
      }
    } catch (err) {
      console.log(err);
    }
  })
);

// Google authentication strategy setup
passport.use(
  "google",
  new GoogleStrategy(
    {
      clientID: process.env.GOOGLE_CLIENT_ID, // Google client ID
      clientSecret: process.env.GOOGLE_CLIENT_SECRET, // Google
      callbackURL: "http://localhost:3000/auth/google/secrets", // Callback URL after successful authentication
      userProfileURL: "https://www.googleapis.com/oauth2/v3/userinfo", // Google user profile URL
    },
    async (accessToken, refreshToken, profile, cb) => {
      try {
        console.log(profile); // Log user profile
        const result = await db.query("SELECT * FROM users WHERE email = $1", [
          profile.email,
        ]);
        if (result.rows.length === 0) {
          // Create new user if not found in database
          const newUser = await db.query(
            "INSERT INTO users (email, password) VALUES ($1, $2)",
            [profile.email, "google"]
          );
          return cb(null, newUser.rows[0]);
        } else {
          return cb(null, result.rows[0]); // Return existing user
        }
      } catch (err) {
        return cb(err);
      }
    }
  )
);

// Serialize user for session
passport.serializeUser((user, cb) => {
  cb(null, user);
});

// Deserialize user for session
passport.deserializeUser((user, cb) => {
  cb(null, user);
});

// Start the server
app.listen(port, () => {
  console.log(`Server running on port ${port}`);
});
