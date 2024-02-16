import express from "express";
import "dotenv/config";
import crypto from "crypto";
import jwt from "jsonwebtoken";
import pg from "pg";
import cors from "cors";

const app = express();
const port = process.env.PORT || 3000;

app.listen(port, () => {
  console.log(`Server running on port ${port}`);
});

app.use(cors());

// Enable COR

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

// PATCH + DELETE USERS
app.delete("/users", async (req, res) => {
  const token = req.headers.authorization.split(" ")[1];
  try {
    const verifiedToken = jwt.verify(token, process.env.TOKEN_HASH_KEY);
    if (verifiedToken) {
      const { users } = await pool.query("DELETE FROM users WHERE id = $1;", [
        verifiedToken.id,
      ]);
      const { addictionItems } = await await pool.query(
        "DELETE FROM addiction_items WHERE user_id = $1;",
        [verifiedToken.id]
      );
      res.json({ message: "Deleted your account, its a shame to see you go!" });
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

app.patch("/users", async (req, res) => {
  const token = req.headers.authorization.split(" ")[1];
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
  try {
    const verifiedToken = jwt.verify(token, process.env.TOKEN_HASH_KEY);
    if (verifiedToken) {
      const { rows } = await pool.query("SELECT * FROM users WHERE id = $1;", [
        verifiedToken.id,
      ]);
      let currentValues = rows[0];
      currentValues.password = currentValues.password.trim();
      let newValues = {
        id: verifiedToken.id,
        username: username ? username : null,
        email: email ? email : null,
        password: hashedPassword.trim(" "),
        first_name: first_name ? first_name : null,
        last_name: last_name ? last_name : null,
        bio: bio ? bio : null,
        gender: gender ? gender : null,
        profile_picture_url: profile_picture_url ? profile_picture_url : null,
        role: role ? role : null,
      };
      let updatedValues = {};
      Object.keys(newValues).forEach((key) => {
        const value = newValues[key];
        if (value !== currentValues[key]) {
          if (newValues[key] !== null && newValues[key] !== undefined) {
            updatedValues[key] = newValues[key];
          }
        }
      });
      console.log(newValues);
      if (Object.keys(updatedValues).length > 0) {
        await updateUsers(
          newValues.username,
          newValues.email,
          hashedPassword.trim(" "),
          newValues.first_name,
          newValues.last_name,
          newValues.bio,
          newValues.gender,
          newValues.profile_picture_url,
          newValues.role,
          newValues.id
        );
        res.json({
          message: "Accepted, changed values.",
          previousData: currentValues,
          newData: newValues,
          updatedData: updatedValues,
        });
      } else {
        res.json({
          message: "No changes found",
          previousData: currentValues,
          newData: newValues,
          updatedData: updatedValues,
        });
      }
    }
  } catch (err) {
    console.error(err.message);
    res.status(500).send(`Server error: ${err.message}`);
  }
});
//

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
    const newUser = await insertIntoUsers(
      username,
      email,
      hashedPassword.trim(" "),
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
      const user_id = user.id;
      const token = jwt.sign(
        { user: email, id: user_id },
        process.env.TOKEN_HASH_KEY,
        {
          expiresIn: "24h",
        }
      );
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
  const { title, description, money_saved_per_month } = req.body;
  try {
    const verifiedToken = jwt.verify(token, process.env.TOKEN_HASH_KEY);
    if (verifiedToken) {
      const newAddictionItem = await insertIntoAddictions(
        verifiedToken.id,
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
    console.log(verifiedToken.user_id);
    if (verifiedToken) {
      console.log(verifiedToken.user);
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
async function updateUsers(
  username,
  email,
  hashedPassword,
  first_name,
  last_name,
  bio,
  gender,
  profile_picture_url,
  role,
  user_id
) {
  const query = `
    UPDATE users
    SET username = $1,
        email = $2,
        password = $3,
        first_name = $4,
        last_name = $5,
        bio = $6,
        gender = $7,
        profile_picture_url = $8,
        role = $9
    WHERE id = $10`;
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
      user_id,
    ]);
    console.log(
      username,
      email,
      hashedPassword,
      first_name,
      last_name,
      bio,
      gender,
      profile_picture_url,
      role,
      user_id
    );
    console.log(rows[0]);
    return rows[0];
  } catch (err) {
    console.log(err);
    console.error(err.message);
    throw err;
  }
}

async function insertIntoUsers(
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
async function insertIntoAddictions(
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
