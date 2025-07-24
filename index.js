const https = require('https');
const fs = require('fs');
const path = require('path');

const jwt = require("jsonwebtoken");
const cookieParser = require("cookie-parser");

const cors = require("cors");
const express = require("express");
const app = express();
const port = process.env.PORT || 3002;

const bcrypt = require("bcrypt");
const { connectMongoose } = require("./connect");
const User = require("./models/User");
const GroceryList = require("./models/GroceryList");

app.use(
    cors({
        origin: ["https://localhost:3002"],
        credentials: true,
    })
);
app.use(express.json());
app.use(cookieParser());

//* ********************* Manage accounts **************** */

app.post("/signup", async (req, res) => {
    console.log("POST request received on signup route");
    const newUser = req.body;

    const existingUser = await User.exists(newUser.username);
    if (!existingUser) {
        bcrypt.hash(newUser.password, 10, async function (err, hash) {
            if (!(err instanceof Error)) {
                newUser.password = hash;

                const results = await User.signup(newUser);
                console.log(`New user created with id: ${results._id}`);

                const token = jwt.sign(
                    { username: newUser.username },
                    process.env.JWT_SECRET, //look at later?
                    { expiresIn: "7d" }
                );
                res.cookie("token", token, {
                    httpOnly: true,
                    sameSite: "None",
                    secure: true,
                });

                res.sendStatus(201);
            } else {
                res.sendStatus(500);
            }
        });
    } else {
        res.sendStatus(400);
    }
});

app.post("/login", async (req, res) => {
    console.log("POST request received on login route");
    const user = req.body;

    const existingUser = await User.findOne({ username: user.username }).exec();
    if (existingUser !== null) {
        bcrypt.compare(
            user.password,
            existingUser.password,
            function (err, result) {
                if (!(err instanceof Error) && result) {
                    const token = jwt.sign(
                        { username: user.username },
                        process.env.JWT_SECRET, //
                        { expiresIn: "7d" }
                    );
                    res.cookie("token", token, {
                        httpOnly: true,
                        sameSite: "None",
                        secure: true,
                    });

                    res.sendStatus(200);
                } else {
                    res.sendStatus(401);
                }
            }
        );
    } else {
        res.sendStatus(401);
    }
});

app.post("/logout", (req, res) => {
    res.clearCookie("token", {
        httpOnly: true,
        sameSite: "None",
        secure: true,
    });
    res.sendStatus(200);
});

//* ********************* Middleware authorizers **************** */

//maybe?
async function requireValidToken(req, res, next) {
    if (req.params.secret === "true") {
        const token = req.cookies.token;
        if (!token) {
            res.status(403).json([]); // Forbidden if no token is found
        }
        jwt.verify(token, process.env.JWT_SECRET, (err, decoded) => {
            if (err) {
                res.status(403).json([]); // Forbidden if token is invalid
            }
        });
    }

    if (res.statusCode !== 403) {
        next();
    }
}

//* ********************* Grocery list **************** */

//show grocery list items
app.get("/grocery/:id", requireValidToken, async (req, res) => {
    const results = await Message.readAll(req.params.secret);
    res.send(results);

    console.log("GET request received on grocery page");
});

//* ********************* Launching the server **************** */

const start = async () => {
    try {
        await connectMongoose();
        app.listen(port, () => console.log(`Server running on port ${port}...`));
    }
    catch (err) {
        console.error(err);
    }
}

start();