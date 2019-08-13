const { User } = require("../models/user");
const sgMail = require("@sendgrid/mail");
const crypto = require("crypto");
const { validationResult } = require("express-validator");

const sendGridApiKey =
  "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";

sgMail.setApiKey(sendGridApiKey);
exports.getLogin = (req, res, next) => {
  let message = req.flash("error");
  if (message.length > 0) {
    message = message[0];
  } else {
    message = null;
  }
  res.render("auth/login", {
    path: "/login",
    pageTitle: "Login",
    errorMessage: message,
    oldInput: {
      email: "",
      password: ""
    },
    validationErrors: []
  });
};

exports.getSignup = (req, res, next) => {
  let message = req.flash("error");
  if (message.length > 0) {
    message = message[0];
  } else {
    message = null;
  }

  res.render("auth/signup", {
    path: "/signup",
    pageTitle: "Signup",
    errorMessage: message,
    oldInput: {
      email: "",
      password: ""
    },
    validationErrors: []
  });
};

exports.postLogin = async (req, res, next) => {
  const errors = validationResult(req);

  if (!errors.isEmpty()) {
    console.log(errors.array());
    return res.status(422).render("auth/login", {
      path: "/login",
      pageTitle: "logIn",
      errorMessage: `${errors.array()[0].msg}`,
      oldInput: { email: req.body.email, password: req.body.password },
      validationErrors: errors.array()
    });
  }
  try {
    const user = await User.findByCredentials(
      req.body.email,
      req.body.password
    );
    if (!user) {
      req.flash("error", "Invalid email or password");
      return res.redirect("/login");
    }

    req.session.isLoggedIn = true;
    req.session.user = user;
    await req.session.save();

    res.redirect("/");
  } catch (err) {
    req.flash("error", "Invalid email or password");
    res.redirect("/login");
  }
};

exports.postSignup = async (req, res, next) => {
  const email = req.body.email;
  const password = req.body.password;
  const confirmPassword = req.body.confirmPassword;
  const errors = validationResult(req);

  if (!errors.isEmpty()) {
    console.log(errors.array());
    return res.status(422).render("auth/signup", {
      path: "/signup",
      pageTitle: "Signup",
      errorMessage: `${errors.array()[0].msg}`,
      oldInput: { email: email, password: password },
      validationErrors: errors.array()
    });
  }

  if (!email) {
    req.flash("error", "Please Enter Your Email");
    return res.redirect("/signup");
  }
  if (!password) {
    req.flash("error", "Please Enter Your Password");
    return res.redirect("/signup");
  }
  if (!confirmPassword) {
    req.flash("error", "Please Enter Your Confirm Password");
    return res.redirect("/signup");
  }

  // const isMatch = password === confirmPassword;
  // if (!isMatch) {
  //   req.flash("error", "Please Enter The Same Password");
  //   return res.redirect("/signup");
  // }

  // const userDoc = await User.findOne({ email: email });
  // if (userDoc) {
  //   req.flash("error", "This User Already exist");
  //   return res.status(400).redirect("/signup");
  // }

  const user = new User({
    email: email,
    password: password,
    cart: { items: [] }
  });

  await user.save();
  res.redirect("/login");
};

exports.postLogout = (req, res, next) => {
  req.session.destroy(err => {
    console.log(err);
    res.redirect("/");
  });
};

exports.getReset = (req, res, next) => {
  let message = req.flash("error");
  if (message.length > 0) {
    message = message[0];
  } else {
    message = null;
  }
  res.render("auth/reset", {
    path: "/reset",
    pageTitle: "Reset Password",
    errorMessage: message
  });
};

exports.postReset = async (req, res, next) => {
  crypto.randomBytes(32, async (err, buffer) => {
    if (err) {
      console.log(err);
      return res.redirect("/reset");
    }
    const token = buffer.toString("hex");
    const user = await User.findOne({ email: req.body.email });

    if (!user) {
      req.flash("error", "No account with this email found.");
      res.redirect("/reset");
    }

    user.resetToken = undefined;
    user.resetTokenExportation = undefined;
    await user.save();

    user.resetToken = token;
    user.resetTokenExportation = Date.now() + 3600000;
    await user.save();
    res.redirect("/");
    sgMail.send({
      to: user.email,
      from: "support@shop-dash.com",
      subject: "Reset Password",
      text: "You requested to reset your password Enter the link down",
      html: `
      <p>click this <a href="http://localhost:3000/reset/${token}">link</a> to reset you password.</p>
      `
    });
  });
};

exports.getNewPassword = async (req, res, next) => {
  const token = req.params.token;
  const user = await User.findOne({
    resetToken: token,
    resetTokenExportation: { $gt: Date.now() }
  });
  if (!user) {
    return res.redirect("/login");
  }

  let message = req.flash("error");
  if (message.length > 0) {
    message = message[0];
  } else {
    message = null;
  }

  res.render("auth/newPassword", {
    path: "/newPassword",
    pageTitle: "New Password",
    errorMessage: message,
    userId: user._id.toString(),
    passwordToken: token
  });
};

exports.postNewPassword = async (req, res, next) => {
  const userId = req.body.userId;
  if (!userId) {
    return res.redirect("/signup");
  }
  const token = req.body.passwordToken;
  if (!token) {
  }
  const user = await User.findOne({
    _id: userId,
    resetToken: token,
    resetTokenExportation: { $gt: Date.now() }
  });
  if (!user) {
    return res.redirect("/signup");
  }

  user.password = req.body.password;
  user.resetToken = undefined;
  user.resetTokenExportation = undefined;

  await user.save();
  res.redirect("/login");
  req.flash("go", "password change successfully.");
};
