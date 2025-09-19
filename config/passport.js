const LocalStrategy = require("passport-local").Strategy;
const bcrypt = require("bcrypt");

module.exports = (passport, prisma) => {
  passport.use(
    new LocalStrategy(
      { usernameField: "email" },
      async (email, password, done) => {
        try {
          const user = await prisma.user.findUnique({ where: { email } });
          if (!user) {
            return done(null, false, {
              message: "Incorrect email or password.",
            });
          }
          const valid = await bcrypt.compare(password, user.password);
          if (!valid) {
            return done(null, false, {
              message: "Incorrect email or password.",
            });
          }
          return done(null, user);
        } catch (err) {
          return done(err);
        }
      }
    )
  );

  passport.serializeUser((user, done) => {
    done(null, user.id);
  });

  passport.deserializeUser(async (id, done) => {
    try {
      const user = await prisma.user.findUnique({ where: { id } });
      done(null, user);
    } catch (err) {
      done(err);
    }
  });

  passport.registerUser = async (req, res, next) => {
    try {
      const hashedPassword = await bcrypt.hash(req.body.password, 10);
      await prisma.user.create({
        data: {
          username: req.body.username,
          email: req.body.email,
          password: hashedPassword,
        },
      });
      next();
    } catch (err) {
      return next(err);
    }
  };
};
