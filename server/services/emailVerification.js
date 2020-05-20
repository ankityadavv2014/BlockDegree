var User = require("../models/user");
const CorporateUser = require("../models/corporateUser");
var Token = require("../models/tokenVerification");
const emailer = require("../emailer/impl");
var crypto = require("crypto");

exports.confirmEmail = function (req, res) {
  console.log("In confirmation", req.query.token);
  Token.findOne({ token: req.query.token }, function (err, token) {
    if (err) {
      console.error(`Exception at confirmEmail for user ${token.email}: `, err);
      return res.render("displayError", {
        error:
          "Something went wrong while looking up a user for this token, please try again after sometime or contact-us at info@blockdegree.org.",
      });
    }
    if (!token) {
      return res.render("displayError", {
        error:
          "We were unable to find a valid token. Your token my have expired.",
      });
    }
    User.findOne({ email: token.email }, function (err, user) {
      if (err) {
        // some error occured
        return res.status(500).send({
          type: "not-verified",
          msg:
            "Its not you, its us. Please try again after sometime or contact-us at info@blockdegree.org.",
        });
      }
      if (!user) {
        return res.render("displayError", {
          error: "We were unable to find a user for this token.",
        });
      }
      if (user.examData.isVerified)
        return res.redirect("/login?alreadyVerified=true");
      // Verify and save the user
      user.auth.local.isVerified = true;
      user.save(function (err) {
        if (err) {
          return res.render("displayError", {
            error:
              "Its not you, its us. Please try again after sometime or contact-us at info@blockdegree.org",
          });
        }
        console.log("Success");
        res.redirect("/login?emailConfirmed=true");
      });
    });
  });
};

exports.resendEmail = function (req, res, next) {
  User.findOne({ email: req.body.email }, function (err, user) {
    if (err) {
      return res.status(500).render("displayError", {
        error:
          "Its not you, its us. Please try again after sometime or contact-us at info@blockdegree.org",
      });
    }
    if (!user) {
      return res.status(500).render("displayError", {
        error: "We were unable to find a user with that email.",
      });
    }
    if (user.isVerified) {
      return res.status(500).render("displayError", {
        error: "This account has already been verified. Please log in.",
      });
    }
    // Create a verification token, save it, and send email
    var token = new Token({
      _userId: user._id,
      token: crypto.randomBytes(16).toString("hex"),
    });
    // Save the token
    token.save(function (err) {
      if (err) {
        return res.status(500).render("displayError", {
          error:
            "Its not you, its us. Please try again after sometime or contact-us at info@blockdegree.org",
        });
      }
      // Send the email
      emailer.sendTokenMail(req.body.email, token, req, "resend");
    });
  });
};

exports.confirmCorporateEmail = async function (req, res) {
  try {
    const givenToken = req.query.token;
    const token = await Token({ token: givenToken });
    if (token === null) {
      return res.json({ status: false, error: "invalid token" });
    }
    const corporateUser = await CorporateUser.findOne({ companyEmail: token.email });
    if (corporateUser.auth.local.isVerified === true) {
      return res.json({ status: false, error: "User ready verified" });
    }
    corporateUser.auth.local.isVerified = true;
    await corporateUser.save();
    return res.json({ status: true, error: "verified true" });
  } catch (e) {
    console.log(`exception at ${__filename}.confirmCorporateEmail: `, e);
    return res.json({ status: false, error: "internal error" });
  }
};

exports.resendConfirmCorporate = async function (req, res) {
  try {
    const email = req.body.email;
    const corporateUser = await CorporateUser.findOne({ companyEmail: email });
    if (corporateUser === null) {
      return res.json({ status: false, error: "user not found" });
    }
    const newToken = new Token({
      email: email,
      token: crypto.randomBytes(16).toString("hex"),
    });
    await newToken.save();
    emailer.sendTokenMail(req.body.email, newToken, req, "resend");
    return res.json({ status: true });
  } catch (e) {
    console.log(`exception at ${__filename}.resendConfirmCorporate: `, e);
    return res.json({ status: false, error: "internal error" });
  }
};
