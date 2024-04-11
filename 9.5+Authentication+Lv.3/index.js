// Import necessary modules and packages
import express from "express"; // Import Express.js framework
import bodyParser from "body-parser"; // Middleware to parse incoming request bodies
import pg from "pg"; // PostgreSQL client
import bcrypt from "bcrypt"; // Library for hashing passwords
import passport from "passport"; // Authentication middleware for Node.js
import { Strategy } from "passport-local"; // Local authentication strategy for Passport
import GoogleStrategy from "passport-google-oauth2"; // Google authentication strategy for Passport
import session from "express-session"; // Middleware for session management
import env from "dotenv"; // Load environment variables

// Initialize Express app
const app = express();
const port = 3000; // Port number for the server
const saltRounds = 10; // Number of salt rounds for bcrypt

// Load environment variables from .env file
env.config();

// Set up session middleware
app.use(
  session({
    secret: process.env.SESSION_SECRET, // Secret key for session. The secret key used to sign the session ID cookie
    resave: false, // Don't save session if unmodified . When set to false, this option indicates that the session should not be saved to the store if it hasn't been modified during the request. It helps optimize server performance by avoiding unnecessary session updates.
    saveUninitialized: true, // Save uninitialized session. When set to true, this option indicates that a session should be created for every new user, even if the session is empty. It's useful for implementing login sessions, as it ensures that a session is available for storing user data.
  })
);  

// Middleware to parse urlencoded request bodies
app.use(bodyParser.urlencoded({ extended: true }));

// Serve static files from the 'public' directory
app.use(express.static("public"));

// Initialize Passport and session middleware
app.use(passport.initialize());
app.use(passport.session());

// Set up PostgreSQL client
const db = new pg.Client({
  user: process.env.PG_USER, // PostgreSQL user
  host: process.env.PG_HOST, // PostgreSQL host
  database: process.env.PG_DATABASE, // PostgreSQL database name
  password: process.env.PG_PASSWORD, // PostgreSQL password
  port: process.env.PG_PORT, // PostgreSQL port
});
db.connect(); // Connect to PostgreSQL database

// Define route for homepage
app.get("/", (req, res) => {
  res.render("home.ejs"); // Render home page template
});

// Define route for login page
app.get("/login", (req, res) => {
  res.render("login.ejs"); // Render login page template
});

// Define route for registration page
app.get("/register", (req, res) => {
  res.render("register.ejs"); // Render registration page template
});

// Define route for logging out
app.get("/logout", (req, res) => {
  req.logout(function (err) { // Logout user
    if (err) {
      return next(err); // Error handling
    }
    res.redirect("/"); // Redirect to homepage after logout
  });
});

// Define route for accessing secrets (requires authentication)
app.get("/secrets", (req, res) => {
  console.log(req.user); // Log user information
  if (req.isAuthenticated()) { // Check if user is authenticated
    res.render("secrets.ejs"); // Render secrets page template
  } else {
    res.redirect("/login"); // Redirect to login page if not authenticated
  }
});

// Define route for Google authentication
app.get("/auth/google", passport.authenticate("google", {
  scope: ["profile", "email"], // Request access to user's profile and email
}));

// Define route for handling Google authentication callback
app.get("/auth/google/secrets", passport.authenticate("google", {
  successRedirect: "/secrets", // Redirect to secrets page on successful authentication
  failureRedirect: "/login", // Redirect to login page on failed authentication
}));

// // Define route for logging out
// app.get("/logout", (res, req) => {
//   req.logout((err) => { // Logout user
//     if (err) console.log(err); // Error handling
//     res.redirect("/"); // Redirect to homepage after logout
//   });
// });

// Define route for handling login form submission
app.post(
  "/login",
  passport.authenticate("local", {
    successRedirect: "/secrets", // Redirect to secrets page on successful login
    failureRedirect: "/login", // Redirect to login page on failed login
  })
);

// Define route for handling registration form submission
app.post("/register", async (req, res) => {
  const email = req.body.username; // Get email from request body
  const password = req.body.password; // Get password from request body

  try {
    const checkResult = await db.query("SELECT * FROM users WHERE email = $1", [
      email,
    ]); // Check if user already exists in the database

    if (checkResult.rows.length > 0) {
      req.redirect("/login"); // Redirect to login page if user already exists
    } else {
      bcrypt.hash(password, saltRounds, async (err, hash) => { // Hash the password
        if (err) {
          console.error("Error hashing password:", err); // Error handling
        } else {
          const result = await db.query(
            "INSERT INTO users (email, password) VALUES ($1, $2) RETURNING *",
            [email, hash]
          ); // Insert new user into the database
          const user = result.rows[0]; // Get the newly inserted user
          req.login(user, (err) => { // Log in the user
            console.log("success"); // Log success
            res.redirect("/secrets"); // Redirect to secrets page after login
          });
        }
      });
    }
  } catch (err) {
    console.log(err); // Error handling
  }
});

// Define local authentication strategy
passport.use("local",
  new Strategy(async function verify(username, password, cb) {
    try {
      const result = await db.query("SELECT * FROM users WHERE email = $1 ", [
        username,
      ]); // Find user by email in the database
      if (result.rows.length > 0) {
        const user = result.rows[0]; // Get user data
        const storedHashedPassword = user.password; // Get hashed password from database
        bcrypt.compare(password, storedHashedPassword, (err, valid) => { // Compare passwords
          if (err) {
            // Error with password check
            console.error("Error comparing passwords:", err);
            return cb(err);
          } else {
            if (valid) {
              // Passed password check
              return cb(null, user);
            } else {
              // Did not pass password check
              return cb(null, false);
            }
          }
        });
      } else {
        return cb("User not found"); // User not found
      }
    } catch (err) {
      console.log(err); // Error handling
    }
  })
);

// Define Google authentication strategy
passport.use("google", new GoogleStrategy({
  clientID: process.env.GOOGLE_CLIENT_ID, // Google client ID
  clientSecret: process.env.GOOGLE_CLIENT_SECRET, // Google client secret
  callbackURL: "http://localhost:3000/auth/google/secrets", // Callback URL
  userProfileURL: "https://www.googleapis.com/oauth2/v3/userinfo", // Google user profile URL
}, async (accessToken, refreshToken, profile, cb) => {
  console.log(profile); // Log Google profile data
  try {
    const result = await db.query("SELECT * FROM users WHERE email =$1", [profile.email]); // Check if user already exists
    if (result.rows.length == 0) {
      const newUser = await db.query("INSERT INTO users (email,password) VALUES ($1,$2)", [profile.email, "google"]); // Insert new user into the database
      cb(null, newUser.rows[0]); // Callback with new user data
    } else {
      // Already existing User
      cb(null, result.rows[0]); // Callback with existing user data
    }
  } catch (err) {
    cb(err); // Error handling
  }
}));

// Serialize user object into session . Stores the user object in the session after authentication.
passport.serializeUser((user, cb) => {
  cb(null, user); // Callback with user object
});

// Deserialize user object from session . Retrieves the user object from the session during subsequent requests.
passport.deserializeUser((user, cb) => {
  cb(null, user); // Callback with user object
});

// Start the server
app.listen(port, () => {
  console.log(`Server running on port ${port}`); // Log server start
});
