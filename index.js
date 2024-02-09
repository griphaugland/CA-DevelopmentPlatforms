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
    rejectUnauthorized: false, // You might want to handle SSL certificate validation differently in production CHATGPT INNSLAG
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

// USERS: GET

app.get("/users", async (req, res) => {
  const token = req.headers.authorization.split(" ")[1];
  try {
    const verifiedToken = jwt.verify(token, process.env.TOKEN_HASH_KEY);
    if (verifiedToken) {
      const { rows } = await pool.query(
        "SELECT id, username, first_name, last_name, bio, gender, profile_picture_url FROM users;"
      );
      res.json(rows);
    } else {
      res.status(404).json({
        message: "Invalid token",
      });
    }
  } catch (err) {
    console.error(err.message);
    res.status(500).send(`Server error: ${err.message}`);
  }
});

// REGISTER

app.post("/register", async (req, res) => {
  try {
    const {
      username,
      email,
      password,
      first_name,
      last_name,
      bio,
      gender,
      profile_picture_url,
      role,
    } = req.body;
    const hashedPassword = crypto
      .createHmac("sha256", process.env.HASH_KEY)
      .update(password) // Use the provided password
      .digest("base64");
    const newUser = await InsertIntoUsers(
      username,
      email,
      hashedPassword,
      first_name,
      last_name,
      bio,
      gender,
      profile_picture_url,
      role
    );
    res.json({
      message: "Accepted credentials, Registered.",
      data: newUser,
    });
  } catch (err) {
    console.error(err.message);
    res.status(500).send(`Server error: ${err.message}`);
  }
});

// LOGIN

app.post("/login", async (req, res) => {
  try {
    const { email, password } = req.body;
    const hashedPassword = crypto
      .createHmac("sha256", process.env.HASH_KEY)
      .update(password) // Use the provided password
      .digest("base64");

    const result = await pool.query("SELECT * FROM users WHERE email = $1", [
      email,
    ]);
    const user = result.rows[0]; // Access the first user in the rows array

    if (!user) {
      console.log(hashedPassword, password);
      return res.status(401).json({ message: "Invalid username" });
    }
    if (user.password.trim() === hashedPassword) {
      const token = jwt.sign({ user: email }, process.env.TOKEN_HASH_KEY, {
        expiresIn: "24h",
      });
      res.json({
        message: `Authorized, logged in with ${email}.`,
        accessToken: token,
      });
    } else {
      console.log("password mismatch");
      res.status(401).json({ message: "Invalid password" });
    }
  } catch (err) {
    console.error(err.message);
    res.status(500).send(`Server error: ${err.message}`);
  }
});

// ADDICTIONS: POST + GET

app.post("/addiction", async (req, res) => {
  const token = req.headers.authorization.split(" ")[1];
  const { user_id, title, description, money_saved_per_month } = req.body;
  try {
    const verifiedToken = jwt.verify(token, process.env.TOKEN_HASH_KEY);
    if (verifiedToken) {
      const newAddictionItem = await InsertIntoAddictions(
        user_id,
        title,
        description,
        money_saved_per_month
      );
      res.json({
        message: "Created new addiction item",
        data: newAddictionItem,
      });
    } else {
      res.status(404).json({
        message: "Invalid token",
      });
    }
  } catch (err) {
    console.error(err.message);
    res.status(500).send(`Server error: ${err.message}`);
  }
});

app.get("/addictions", async (req, res) => {
  const { user_id } = req.body;
  const token = req.headers.authorization.split(" ")[1];
  try {
    const verifiedToken = jwt.verify(token, process.env.TOKEN_HASH_KEY);
    if (verifiedToken) {
      const result = await pool.query(
        "SELECT * FROM addiction_items WHERE user_id = $1",
        [user_id]
      );
      res.json(result.rows);
    } else {
      res.status(404).json({
        message: "Invalid token",
      });
    }
  } catch (err) {
    console.error(err.message);
    res.status(500).send(`Server error: ${err.message}`);
  }
});

// FUNCTIONS

async function InsertIntoUsers(
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
  const query = `
    INSERT INTO users (
      username,
      email,
      password,
      first_name,
      last_name,
      bio,
      gender,
      profile_picture_url,
      role
    ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9)
    RETURNING id;`;
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

    return rows[0];
  } catch (err) {
    console.error(err.message);
    throw err;
  }
}
async function InsertIntoAddictions(
  user_id,
  title,
  description,
  money_saved_per_month
) {
  const query = `
    INSERT INTO addiction_items (
      user_id,
      title,
      description,
      money_saved_per_month
    ) VALUES ($1, $2, $3, $4)
    RETURNING id;`;
  try {
    const { rows } = await pool.query(query, [
      user_id,
      title,
      description,
      money_saved_per_month,
    ]);

    return rows[0];
  } catch (err) {
    console.error(err.message);
    throw err;
  }
}
