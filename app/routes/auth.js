"use strict";
/* ------------------------------ Module ------------------------------ */
// express
const express = require("express");
// Router
const router = express.Router();
// path
const path = require("path");
// fs
const fs = require("fs");
//JSDOM
const {JSDOM} = require("jsdom");
// session
const session = require("express-session");
router.use(session({
    secret: "BBY-20-Unified",
    resave: true,
    saveUninitialized: false
}));
// flash
const flash = require("connect-flash");
router.use(flash());
// passport
const passport = require("passport");
router.use(passport.initialize());
router.use(passport.session());
// LocalStrategy
const LocalStrategy = require("passport-local").Strategy;

/* ------------------------------ DB Setting ------------------------------ */
const MongoClient = require("mongodb").MongoClient;
const URL = "mongodb+srv://bby20:unified20@cluster0.wphdm.mongodb.net/Unified?retryWrites=true&w=majority";
let db;
MongoClient.connect(URL, (error, client) => {
    if (error) {
        return console.log(error);
    } else {
        db = client.db("Unified");
    }
});

/* ------------------------- Auth Strategy ------------------------- */
passport.use(new LocalStrategy({
    usernameField: "username",
    passwordField: "password",
    session: true,
    passReqToCallback: false
}, (inputUsername, inputPassword, done) => {
    db.collection("BBY_20_User").findOne({
        username: inputUsername
    }, (error, result) => {
        if (error) {
            return done(error);
        }
        if (!result) {
            return done(null, false, {
                message: "Incorrect username"
            });
        }
        if (inputPassword == result.password) {
            return done(null, result);
        } else {
            return done(null, false, {
                message: "Incorrect password"
            });
        }
    })
}));

/* ------------------------- Session Data ------------------------- */
passport.serializeUser((user, done) => {
    done(null, user.username);
});
passport.deserializeUser((username, done) => {
    db.collection("BBY_20_User").findOne({
        username: username
    }, (error, result) => {
        done(null, result);
    });
});

/* ------------------------------ File Directories ------------------------------ */
const directory = {
    main: path.join(__dirname, "../public/html", "main.html"),
    admin: path.join(__dirname, "../public/html", "admin.html"),
    login: path.join(__dirname, "../public/html", "login.html"),
    index: path.join(__dirname, "../public/html", "index.html"),
    profile: path.join(__dirname, "../public/html", "profile.html")
};

/* ------------------------------ Middleware Function ------------------------------ */
function isSignedIn(req, res, next) {
    if (req.user) {
        next()
    } else {
        res.redirect("/login");
    }
};

/* ------------------------------ Routers ------------------------------ */
// sign-in => redirect by users' role
// router.get("/main", isSignedIn, (req, res) => {
//     // if user.role is admin, show admin.html
//     if (req.user.role === "admin") {
//         db.collection("BBY_20_User").find().toArray((error, result) => {
//             var next = "<br><br>";
//             var button = "&nbsp<button>EDIT</button>";
//             var list = "";
//             for (var i = 0; i < result.length; i++) {
//                 list += JSON.stringify(result[i]) + button + next;
//             }
//             const admin = fs.readFileSync(directory.admin);
//             const adminHTML = new JSDOM(admin);
//             adminHTML.window.document.getElementById("username").innerHTML = req.user.username;
//             adminHTML.window.document.getElementById("user-list").innerHTML = list;

//             res.send(adminHTML.serialize());
//         });
//         // if user.role is regular, show main.html
//     } else if (req.user.role === "regular") {
//         var name = "";
//         name = req.user.username;
//         const main = fs.readFileSync(directory.main);
//         const mainHTML = new JSDOM(main);
//         mainHTML.window.document.getElementById("username").innerHTML = name;
//         res.send(mainHTML.serialize());
//     }
// });
router.get("/main", isSignedIn, (req, res) => {
    // if user.role is admin, show admin.html
    if (req.user.role === "admin") {
        db.collection("BBY_20_User").find().toArray((error, result) => {
            // var next = "<br><br>";
            // var list = "";
            // for (var i = 0; i < result.length; i++) {
            //     list += JSON.stringify(result[i]) + next;
            // }
            
            const admin = fs.readFileSync(directory.admin);
            const adminHTML = new JSDOM(admin);
            adminHTML.window.document.getElementById("username").innerHTML = req.user.username;
            // adminHTML.window.document.getElementById("user-list").innerHTML = list;
            adminHTML.window.document.getElementById("total-users").innerHTML = result.length + " users";
            res.send(adminHTML.serialize());
        });
        // if user.role is regular, show main.html
    } else if (req.user.role === "regular") {
        var name = "";
        name = req.user.username;
        const main = fs.readFileSync(directory.main);
        const mainHTML = new JSDOM(main);
        mainHTML.window.document.getElementById("username").innerHTML = name;
        res.send(mainHTML.serialize());
    }
});

// show login page
router.get("/login", (req, res, next) => {
    // middleware => logged in user cannot access login page
    if (!req.user) {
        next();
    } else {
        res.redirect(`/main?username=${req.user.username}`);
    }
}, (req, res) => {
    let msg = req.flash();
    let feedback = "";
    if (msg.error) {
        feedback = msg.error[0];
    }
    const login = fs.readFileSync(directory.login);
    const loginHTML = new JSDOM(login);
    loginHTML.window.document.getElementById("errorMsg").innerHTML = feedback;
    res.send(loginHTML.serialize());
});

//authenticate
router.post("/login-process", passport.authenticate("local", {
    failureRedirect: "/login",
    failureFlash: true
}), (req, res) => {
    res.redirect(`/main?username=${req.body.username}`);
});

// sign-out => redirect to landing page
router.get("/sign-out", (req, res) => {
    req.logout();
    res.redirect("/");
});

// show landing page
router.get("/", (req, res, next) => {
    // middleware => logged in user cannot access landing page
    if (!req.user) {
        next();
    } else {
        res.redirect(`/main?username=${req.user.username}`);
    }
}, (req, res) => {
    res.sendFile(directory.index);
});

// show profile page
router.get("/profile", (req, res) => {
    if (!req.user) {
        res.sendFile(directory.login);
    } else {
        const profile = fs.readFileSync(directory.profile);
        const profileHTML = new JSDOM(profile);
        profileHTML.window.document.getElementById("username").innerHTML = req.user.username;
        res.set("Developed by", "BBY-20");
        res.set("BCIT CST", "COMP2537");
        res.send(profileHTML.serialize());
    }
});

/* ------------------------------ Export Module ------------------------------ */
module.exports = router;