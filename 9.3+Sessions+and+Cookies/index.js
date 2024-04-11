import express from "express"; // Importing Express framework
import bodyParser from "body-parser"; // Middleware to parse incoming request bodies
import pg from "pg"; // PostgreSQL client library
import bcrypt from "bcrypt"; // Library for hashing passwords
import session from "express-session"; // Middleware for managing sessions
import passport from "passport"; // Authentication middleware
import { Strategy } from "passport-local"; // Local strategy for passport authentication

const app = express(); // Creating an Express application
const port = 3000; // Port number for the server to listen on
const saltRounds = 10; // Number of salt rounds for bcrypt hashing

app.use(bodyParser.urlencoded({ extended: true })); // Using body-parser middleware to parse urlencoded request bodies
app.use(express.static("public")); // Serving static files from the 'public' directory

// Setting up session middleware
app.use(
    session({
      secret: "TOPSECRETWORD" , // Secret key for session
      resave:false,
      savedUnintialized:true,
      cookie: {
        maxAge:1000*60*60*24, // Session cookie expiration time (24 hours)
      }
    })
);

app.use(passport.initialize()); // Initializing passport middleware
app.use(passport.session()) // Using passport for session management

// Setting up PostgreSQL client
const db = new pg.Client({
  user: "postgres",
  host: "localhost",
  database: "secrets",
  password: "16122000",
  port: 5432,
});
db.connect(); // Connecting to the database

// Route to render home page
app.get("/", (req, res) => {
  res.render("home.ejs");
});

// Route to render login page
app.get("/login", (req, res) => {
  res.render("login.ejs");
});

// Route to render registration page
app.get("/register", (req, res) => {
  res.render("register.ejs");
});

// Route to render secrets page if authenticated, otherwise redirect to login page
app.get("/secrets",(req,res)=>{
  console.log(req.user); // Logging current user (if authenticated)
  if(req.isAuthenticated()){
    res.render("secrets.ejs")
  }else{
    res.redirect('/login')
  }
})

// Route to handle user registration
app.post("/register", async (req, res) => {
  const email = req.body.username;
  const password = req.body.password;

  try {
    const checkResult = await db.query("SELECT * FROM users WHERE email = $1", [
      email,
    ]);

    if (checkResult.rows.length > 0) {
      res.send("Email already exists. Try logging in.");
    } else {
      // Hashing the password and saving it in the database
      bcrypt.hash(password, saltRounds, async (err, hash) => {
        if (err) {
          console.error("Error hashing password:", err);
        } else {
          console.log("Hashed Password:", hash);
          const result= await db.query(
            "INSERT INTO users (email, password) VALUES ($1, $2) RETURNING *",
            [email, hash]
          );
          const user = result.rows[0]
          req.login(user,(err)=>{
            console.log(err)
            res.redirect("/secrets")
          })
        }
      });
    }
  } catch (err) {
    console.log(err);
  }
});

// Route to handle user login
app.post("/login", passport.authenticate("local",{
  successRedirect: "/secrets",
  failureRedirect: "/login"
}));

// Configuring passport local strategy for authentication
passport.use(new Strategy(async function verify(username,password,cb){
  try {
    const result = await db.query("SELECT * FROM users WHERE email = $1", [
      username,
    ]);
    if (result.rows.length > 0) {
      const user = result.rows[0];
      const storedHashedPassword = user.password;
      bcrypt.compare(password, storedHashedPassword, (err, result) => {
        if (err) {
          return cb(err)
        } else {
          if (result) {
            return cb(null,user)
          } else {
            return cb(null, false)
          }
        }
      });
    } else {
      return cb("User not found")
    }
  } catch (err) {
    return cb(err)
  }
}));

// Serialization and deserialization of user objects for passport session management
passport.serializeUser((user,cb)=>{
  cb(null,user);
});
passport.deserializeUser((user,cb)=>{
  cb(null,user);
})

// Starting the server
app.listen(port, () => {
  console.log(`Server running on port ${port}`);
}); 
