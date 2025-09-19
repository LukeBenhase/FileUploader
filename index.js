const path = require("node:path");
const express = require("express");
const session = require("express-session");
const passport = require("passport");
const { PrismaClient } = require("./generated/prisma");
const { PrismaSessionStore } = require("@quixo3/prisma-session-store");

const prisma = new PrismaClient();
const app = express();
// views config
app.set("views", path.join(__dirname, "views"));
app.set("view engine", "ejs");

app.use(express.json());
app.use(express.urlencoded({ extended: true }));

app.use(
  session({
    cookie: { maxAge: 60 * 60 * 1000 }, // 1 hour
    secret: "your-session-secret",
    resave: false,
    saveUninitialized: false,
    store: new PrismaSessionStore(prisma, {
      checkPeriod: 2 * 60 * 1000, // Remove expired sessions every 2 minutes
      dbRecordIdIsSessionId: true,
      dbRecordIdFunction: undefined,
    }),
  })
);

app.use(passport.initialize());
app.use(passport.session());

// Passport config
require("./config/passport")(passport, prisma);

// Routers
const usersRouter = require("./routes/usersRouter");
app.use("/", usersRouter);

const PORT = process.env.PORT || 3000;
app.listen(PORT, () => {
  console.log(`Server running on port ${PORT}`);
});
