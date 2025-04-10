import mongoose from "mongoose";

const userSchema = new mongoose.Schema({
  name: {
    type: String,
    required: true,
    trim: true
  },
  email: {
    type: String,
    required: true,
    unique: true,
    trim: true,
    lowercase: true
  },
  password: {
    type: String,
    required: true
  },
  avatar: {
    type: String,
    default: null
  },
  role: {
    type: String,
    enum: ["user", "admin", "mentor"],
    default: "user"
  },
  createdAt: {
    type: Date,
    default: Date.now
  }
});

const User = mongoose.model("UserAdmin", userSchema);

export default User;
