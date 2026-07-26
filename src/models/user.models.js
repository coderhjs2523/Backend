import mongoose from "mongoose";
import jwt from "jsonwebtoken"
import bcrypt from "bcrypt"

const userSchema = new mongoose.Schema(
  {
    username: {
      type: String,
      required: true,
      unique: true,
      lowercase: true,
      trim: true,
      index: true,
    },

    email: {
      type: String,
      required: true,
      unique: true,
      lowercase: true,
      trim: true,
    },

    fullname: {
      type: String,
      required: true,
      trim: true,
      index: true,
    },

    avatar: {
      type: String, // Cloudinary URL
      required: true,
    },

    coverImage: {
      type: String, // Cloudinary URL
    },

    watchHistory: [
      {
        type: mongoose.Schema.Types.ObjectId,
        ref: "Video",
      },
    ],

    password: {
      type: String,
      required: [true, "Password is required"],
    },

    refreshToken: {
      type: String,
    },
  },
  {
    timestamps: true,
  }
);


                      //dont pass arrow function call back
userSchema.pre("save", async function (next) {
  if(!this.isModified("password"))return next();
  this.password = bcrypt.hash(this.password, 10)
  next()

  // if(this.isModified("password")){
  //   this.password = bcrypt.hash(this.password, 10)
  //   next()
  // }
}) 

userSchema.methods.isPasswordCorrect = async function 
(password){
  return await bcrypt.compare(password, this.password)
}

userSchema.methods.generateAccessTokens = function(){
  return jwt.sign(
    {
      _id: this._id,
      email: this.email,
      username: this.username,
      fullname: this.fullname
    },
    process.env.ACCESS_TOKEN_SECRET,
    {
      expiresIn: process.env.ACCESS_TOKEN_EXPIRY
    }
  )
}

userSchema.methods.generateRefereshTokens = function(){
  return jwt.sign(
    {
      _id: this._id,
    },
    process.env.REFRESH_TOKEN_SECRET,
    {
      expiresIn: process.env.REFRESH_TOKEN_EXPIRY
    }
  )
}

const User = mongoose.model("User", userSchema);
export default User;