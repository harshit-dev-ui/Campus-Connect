import express from "express";
import bcrypt from "bcryptjs";
import jwt from "jsonwebtoken";
import nodemailer from "nodemailer";
import User from "../models/user.model.js";
import CollegeDomain from "../models/collegeDomain.js";
import authMiddleware from "../middleware/authMiddleware.js";
import Chat from "../models/chat.model.js";
const router = express.Router();
let otpStore = {};

const transporter = nodemailer.createTransport({
  service: "gmail",
  secure: true,
  port: 465,
  auth: {
    user: process.env.EMAIL_USER,
    pass: "uzed ejob wfrv ylgd"
  }
});

function generateOTP() {
  return Math.floor(100000 + Math.random() * 900000).toString();
}

async function sendEmailWithRetries({ to, subject, text }, maxAttempts = 3) {
  let attempts = 0;
  while (attempts < maxAttempts) {
    try {
      await transporter.sendMail({
        from: process.env.EMAIL_USER,
        to,
        subject,
        text
      });
      console.log(`Email sent to: ${to} on attempt ${attempts + 1}`);
      return true;
    } catch (error) {
      attempts++;
      console.error(
        `Attempt ${attempts}: Failed to send email to ${to}`,
        error
      );
      if (attempts === maxAttempts) {
        return false;
      }
    }
  }
}

router.post("/signup", async (req, res) => {
  const { username, password, email, collegename } = req.body;

  if (!username || !password || !email || !collegename) {
    return res.status(400).json({ message: "All fields are required" });
  }
  if (password.length !== 8) {
    return res
      .status(400)
      .json({ message: "Password must be 8 characters long" });
  }

  try {
    const college = await CollegeDomain.findOne({ collegename });
    if (!college) {
      return res.status(400).json({ message: "College name is not valid" });
    }

    const domain = email.split("@")[1];
    if (domain !== college.domainname) {
      return res
        .status(400)
        .json({ message: `Email must end with @${college.domainname}` });
    }

    const userExists = await User.findOne({ $or: [{ username }, { email }] });
    if (userExists) {
      return res
        .status(400)
        .json({ message: "Username or email already taken" });
    }

    const otp = generateOTP();
    const emailSent = await sendEmailWithRetries({
      to: email,
      subject: "Email Verification OTP",
      text: `Your OTP is: ${otp}`
    });

    if (!emailSent) {
      return res
        .status(500)
        .json({ message: "Failed to send OTP. Please try again." });
    }

    otpStore[email] = otp;
    res
      .status(200)
      .json({ message: "OTP sent to email. Verify to complete signup." });
  } catch (error) {
    res.status(500).json({ message: "Error during signup", error });
  }
});

router.post("/verify-signup", async (req, res) => {
  console.log("hit !");
  const { username, password, email, collegename, otp } = req.body;
  console.log(otp);

  if (!otp || otpStore[email] !== otp) {
    return res.status(400).json({ message: "Invalid or expired OTP" });
  }

  try {
    const hashedPassword = await bcrypt.hash(password, 10);

    const newUser = new User({
      username,
      password: hashedPassword,
      email,
      collegename
    });

    await newUser.save();
    delete otpStore[email];

    res.status(201).json({ message: "User registered successfully" });
  } catch (error) {
    console.log("erorr hit!");
    console.log(error);

    res.status(500).json({ message: "Error saving user", error });
  }
});

router.post("/login", async (req, res) => {
  const { username, password } = req.body;

  try {
    const user = await User.findOne({ username });
    if (!user) {
      return res.status(400).json({ message: "User does not exist" });
    }

    const isPasswordValid = await bcrypt.compare(password, user.password);
    if (!isPasswordValid) {
      return res.status(400).json({ message: "Invalid password" });
    }

    
    const token = jwt.sign(
      { id: user._id, username: user.username, email: user.email },
      process.env.JWT_SECRET,
      { expiresIn: "5d" }
    );
    
    res.cookie("authToken", token, {
      secure:true,
      httpOnly: true,
      sameSite: "none",
      maxAge: 5 * 24 * 60 * 600 * 1000,
    });
    res.status(200).json({ message: "DONE " });
  } catch (error) {
    res.status(500).json({ message: "Error during login", error });
  }
});

router.post("/verify-signup", async (req, res) => {
  const { username, password, email, collegename, otp } = req.body;

  if (!otp || otpStore[email] !== otp) {
    return res.status(400).json({ message: "Invalid or expired OTP" });
  }

  try {
    const hashedPassword = await bcrypt.hash(password, 10);

    const newUser = new User({
      username,
      password: hashedPassword,
      email,
      collegename
    });

    await newUser.save();
    delete otpStore[email];


    res.status(201).json({ message: "User registered successfully" });
  } catch (error) {
    res.status(500).json({ message: "Error saving user", error });
  }
});

router.post("/verify-login", async (req, res) => {
  const { username, otp } = req.body;

  try {
    const user = await User.findOne({ username });
    if (!user || otpStore[user.email] !== otp) {
      return res.status(400).json({ message: "Invalid OTP or user" });
    }

   

    delete otpStore[user.email];

 

    res.status(200).json({ message: "Login successful", token, user });
  } catch (error) {
    res.status(500).json({ message: "Error during OTP verification", error });
  }
});

const authenticateUser = (req, res, next) => {
  const token = req.cookies.authToken;
  if (!token) {
    return res.status(404).json({ message: "Unauthorized" });
  }

  try {
    const decoded = jwt.verify(token, process.env.JWT_SECRET);
    req.user = decoded;
    next();
  } catch (error) {
    res.status(403).json({ message: "Invalid or expired token" });
  }
};

router.post("/api/auth/logout", (req, res) => {
  res.clearCookie("authToken", { httpOnly: true, sameSite: "Strict" });
  res.status(200).json({ message: "Logged out successfully" });
});

router.get("/dashboard", authenticateUser, async (req, res) => {
  try {
    const user = await User.findById(req.user.id).select("-password");

    if (!user) {
      return res.status(404).json({ message: "User not found" });
    }

    res.status(200).json({ message: "Welcome to the dashboard", user });
  } catch (error) {
    res.status(500).json({ message: "Error loading dashboard", error });
  }
});

// Get current user data
router.get("/me", authMiddleware, async (req, res) => {
  try {
    console.log("hit me" + req.user);
    const user = await User.findById(req.user._id).select("-password");
    if (!user) {
      return res.status(404).json({ message: "User not found" });
    }
    res.json(user);
  } catch (error) {
    res.status(500).json({ message: "Error fetching user data", error });
  }
});

// Get mentor chat list
router.get("/mentor/chats", authMiddleware, async (req, res) => {
  try {
    // Check if user is a mentor
    const mentorApplication = await MentorApplication.findOne({
      studentId: req.user._id,
      status: "approved"
    });

    if (!mentorApplication) {
      return res
        .status(403)
        .json({ message: "Only mentors can access this route" });
    }

    // Use the findAllParticipants function to get chat details
    // Yes, findAllParticipants returns array of {_id, message} objects that we can send directly
    const chats = await Chat.findAllParticipants(req.user._id);

   

    res.json(chats);
  } catch (error) {
    res.status(500).json({ message: "Error fetching chat list", error });
  }
});

export default router;
