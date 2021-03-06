const express = require("express");
const mysql = require("mysql2/promise");
const bcrypt = require("bcryptjs");
const jwt = require("jsonwebtoken");
const router = express.Router();

const { mysqlConfig, jwtSecret } = require("../config");
const { isRegisterDataCorrect, isLoginDataCorrect } = require("../middleware");

router.post("/register", isRegisterDataCorrect, async (req, res) => {
  try {
    const hashedPassword = bcrypt.hashSync(req.body.password, 8);

    const con = await mysql.createConnection(mysqlConfig);

    const [user] = await con.execute(
      `SELECT email FROM users WHERE email = ${mysql.escape(
        req.userData.email
      )}`
    );

    if (user.length) {
      return res
        .status(400)
        .send({ error: "User with this email already exists" });
    }

    console.log(user);

    const [data] = await con.execute(
      `INSERT INTO users (name, email, password) VALUES (${mysql.escape(
        req.userData.name
      )}, ${mysql.escape(req.userData.email)}, '${hashedPassword}')`
    );
    con.end();

    if (data.affectedRows !== 1) {
      return res
        .status(500)
        .send({ error: "Database error. Please contact the admin." });
    }

    return res.send({ msg: "Successfully registered an account" });
  } catch (e) {
    console.log(e);
    res
      .status(500)
      .send({ error: "Unexpected error. Please try again later." });
  }
});

router.post("/login", isLoginDataCorrect, async (req, res) => {
  try {
    const con = await mysql.createConnection(mysqlConfig);
    const [data] = await con.execute(
      `SELECT id, email, password FROM users WHERE email = ${mysql.escape(
        req.userData.email
      )}`
    );
    con.end();

    if (data.length !== 1) {
      return res.status(400).send({ error: "Email or password is incorrect" });
    }

    const passwordValidity = bcrypt.compareSync(
      req.body.password,
      data[0].password
    );

    if (!passwordValidity) {
      return res.status(400).send({ error: "Email or password is incorrect" });
    }

    const token = jwt.sign(
      {
        id: data[0].id,
        email: data[0].email,
      },
      jwtSecret,
      { expiresIn: 60 * 60 }
    );

    return res.send({ msg: "Successfully logged in", token });
  } catch (e) {
    console.log(e);
    res
      .status(500)
      .send({ error: "Unexpected error. Please try again later." });
  }
});

module.exports = router;
