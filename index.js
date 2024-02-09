import express from "express";
import "dotenv/config";
import crypto from "crypto";
import jwt from "jsonwebtoken";
import pg from "pg";

const app = express();
const port = 3000;

app.use(express.json());

app.listen(port, () => {
  console.log(`Server running on port ${port}`);
});

const { Pool } = pg;

const pool = new Pool({
  host: process.env.DB_HOST,
  port: process.env.DB_PORT,
  user: process.env.DB_USER,
  password: process.env.DB_PASSWORD,
  database: process.env.DB_NAME,
  ssl: {
    rejectUnauthorized: false, // You might want to handle SSL certificate validation differently in production
  },
});

pool.connect((err, client, release) => {
  if (err) {
    return console.error("Error acquiring client", err.stack);
  }
  client.query("SELECT NOW()", (err, result) => {
    release();
    if (err) {
      return console.error("Error executing query", err.stack);
    }
    console.log(result.rows);
  });
});

app.get("/users", async (req, res) => {
  try {
    const { rows } = await pool.query("SELECT * FROM users");
    res.json(rows);
  } catch (err) {
    console.error(err.message);
    res.status(500).send("Server error");
  }
});

app.post("/register", async (req, res) => {
  try {
    const {
      username,
      email,
      password, // Changed from password_hash to password
      first_name,
      last_name,
      bio,
      gender,
      profile_picture_url,
      role,
    } = req.body;
    console.log(req.body);

    // Generate the hashed password
    /*  const hashedPassword = crypto
      .createHmac("sha256", process.env.HASH_KEY)
      .update(password) // Use the provided password
      .digest("base64"); */

    // Call InsertIntoUsers with the hashed password
    const newUser = await InsertIntoUsers(
      username,
      email,
      password, // Pass the hashed password here
      first_name,
      last_name,
      bio,
      gender,
      profile_picture_url,
      role
    );
    res.json({
      message: "Accepted credentials, Registered.",
      dataSent: newUser,
    });
  } catch (err) {
    console.error(err.message);
    res.status(500).send("Server error");
  }
});

// Add other endpoints as needed

// FUNCTIONS
/* async function InsertIntoUsers(
  username,
  email,
  hashedPassword,
  first_name,
  last_name,
  bio,
  gender,
  profile_picture_url,
  role
) {
  pool.query(
    "INSERT INTO `users`( `username`, `email`, `password_hash`, `first_name`, `last_name`, `bio`, `gender`, `profile_picture_url`, `role`) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9) RETURNING id;`;",
    [
      username,
      email,
      hashedPassword,
      first_name,
      last_name,
      bio,
      gender,
      profile_picture_url,
      role,
    ],
    (err, rows, fields) => {
      if (err) {
        res.json({
          message: "Something went wrong, try again.",
          dataSendt: rows,
        });
      } else {
        res.json({
          message: "Accepted credentials, Registered. ",
          dataSent: rows,
        });
      }
    }
  );
} */

async function InsertIntoUsers(
  username,
  email,
  hashedPassword, // Use hashedPassword instead of password_hash
  first_name,
  last_name,
  bio,
  gender,
  profile_picture_url,
  role
) {
  const query = `
    INSERT INTO users (
      username,
      email,
      password_hash,
      first_name,
      last_name,
      bio,
      gender,
      profile_picture_url,
      role
    ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9)
    RETURNING id;`; // RETURNING id will return the id of the newly inserted user
  try {
    const { rows } = await pool.query(query, [
      username,
      email,
      hashedPassword,
      first_name,
      last_name,
      bio,
      gender,
      profile_picture_url,
      role,
    ]);

    // Assuming you're using Express's response object `res` that needs to be passed to the function
    return rows[0]; // Return the id of the newly created user
  } catch (err) {
    console.error(err.message);
    // Handle the error appropriately
    throw err; // Rethrow the error and handle it in the calling function
  }
}
