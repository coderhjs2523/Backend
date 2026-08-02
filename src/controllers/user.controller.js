import apiErrors from "../utils/apiErrors.js";
import asyncHandler from "../utils/asyncHandler.js";
import User from "../models/user.models.js";
import cloudinary from "../utils/cloudinary.js";
import apiResponse from "../utils/apiResponse.js";
import jwt from "jsonwebtoken"
import uploadOnCloudinary from "../utils/cloudinary.js";

const generateReferesh_And_AccessTokens = async (userId) => {
  try {
    const user = await User.findById(userId);
    const accessToken = user.generateAccessTokens();
    const refreshToken = user.generateRefreshTokens();

    user.refreshToken = refreshToken;
    await user.save({validateBeforeSave: false});

    return { accessToken, refreshToken }

  } catch (error) {
    throw new apiErrors(
      500,
      "Smotheing went wrong while generating the referesh and access tokens."
    );
  }
};

const registerUser = asyncHandler( async (req, res) => {
  //res.status(200).json({message: "ok"})
  const { username, fullname, email, password } = req.body;

  // if (username === "") {
  //   throw new apiErrors(404, "Username is required.");
  // }

  // if (fullname === "") {
  //   throw new apiErrors(400, "FullName is required.");
  // }

  // if (email === "") {
  //   throw new apiErrors(404, "Email is required.");
  // }

  // if (password === "") {
  //   throw new apiErrors(404, "Password is required.");
  // }

  if ([username, fullname, email, password].some((field) => !field?.trim())) {
    throw new apiErrors(400, "All fields are required.");
  }

  const Userexist = await User.findOne({
    $or: [{ username }, { email }],
  });

  if (Userexist) {
    throw new apiErrors(409, "This email or user is Exist.");
  }

  const avatarlocalPath = req.files?.avatar[0]?.path;
  //const coverImageLocalPath = req.files?.coverImage[0]?.path;

  let coverImageLocalPath;
  if (
    req.files &&
    Array.isArray(req.files.coverImage) &&
    req.files.coverImage.length > 0
  ) {
    coverImageLocalPath = req.files.coverImage[0].path;
  }

  if (!avatarlocalPath) {
    throw new apiErrors(400, "Avatar file is required.");
  }

  const avatar = await cloudinary(avatarlocalPath); //uploadimages
  const coverImage = await cloudinary(coverImageLocalPath); //uploadimages

  if (!avatar) {
    throw new apiErrors(400, "Avatar file is required.");
  }

  const user = await User.create({
    username: username.toLowerCase(),
    fullname,
    email,
    password,
    avatar: avatar.url,
    coverImage: coverImage?.url || "",
  });

  const createdUser = await User.findById(user._id).select(
    "-password -refreshToken" //those field which are not required
  );

  if (!createdUser) {
    throw new apiErrors(500, "Something went wrong while register the user.");
  }

  return res
    .status(201)
    .json(new apiResponse(200, createdUser, "User registered successfully."));
});

const loginUser = asyncHandler( async (req, res) => {
  const { email, username, password } = req.body;

  if (!(email || username) || !password) {
    throw new apiErrors(400, "Username and password is required.");
  }

  const user = await User.findOne({
    $or: [{ email }, { username }],
  });

  if (!user) {
    throw new apiErrors(401, "User does not exist.");
  }

  const isPasswordCorrect = await user.isPasswordCorrect(password);

  if (!isPasswordCorrect) {
    throw new apiErrors(404, "Invalid user credientials.");
  }

  const {accessToken, refreshToken} = await generateReferesh_And_AccessTokens(user._id);

  const loginUser = await User.findById(user._id).select("-password -refreshToken")

  const options = {
    httpOnly : true,
    secure : true
  }

  return res
  .status(200)
  .cookie("accessToken", accessToken, options)
  .cookie("refreshToken", refreshToken, options)
  .json(
    new apiResponse(
      200,
      {
        user: loginUser, refreshToken, accessToken
      },
      "User is login successfully."
    )
  )

});

const logoutuser = asyncHandler( async (req, res) => {
  await User.findByIdAndUpdate(
    req.user._id,
    { $set: { refreshToken: undefined} },
    { new: true }
  )

  const options = {
    httpOnly : true,
    secure : true
  }

  return res
  .status(200)
  .clearCookie("accessToken", options)
  .clearCookie("refreshToken", options)
  .json( new apiResponse(200, {}, "User is logout successfully."))
})

const refreshAccessTokens = asyncHandler( async(req, res) => {
  const incomingRefreshToken = req.cookie.refreshToken || req.body.refreshToken;

  if(!incomingRefreshToken){
    throw new apiErrors(401, "Unauthorize request")
  }

  try {
    const decodedToken = jwt.verify(incomingRefreshToken, process.env.REFRESH_TOKEN_SECRET);
  
    const user = await User.findById(decodedToken?._id)
  
    if(!user){
      throw new apiErrors(401, "Invalid refresh token")
    }
  
    if(incomingRefreshToken !== user?.refreshToken){
      throw new apiErrors(401, "Refresh token is expired or used")
    }
  
    const option = {
      httpOnly: true,
      secure: true
    }
    const { accessToken, newRefreshToken} = await generateReferesh_And_AccessTokens(user_id)
  
    return res
    .status(200)
    .cookie("accessToken", accessToken, option)
    .cookie("RefreshToken", newRefreshToken, option)
    .json(
      200,
      {
        accessToken, refreshToken: newRefreshToken
      },
      "Access token refresh"
    )
    
  } catch (error) {
    throw new apiErrors(401, error?.message || "Invalid refresh token")
  }
})

const changeCurrentPassword = asyncHandler(async(req, res) => {
  const { oldPassword, newPassword } = req.body;

  const user = await User.findById(req.user?._id)

  const isPasswordCorrect = await user.isPasswordCorrect(oldPassword);

  if(!isPasswordCorrect){
    throw new apiErrors(401, "Invalid old password")
  }

  user.password = newPassword;
  await user.save({validateBeforeSave: true})

  return res
  .status(200)
  .json(new apiResponse(200, {}, "Password is change successfully"))

})

const getCurrentUser = asyncHandler(async(req, res) => {
  return res
  .status(200)
  .json(
    200,
    req.user,
    "User is get successfully"
  )
})

const updateAccountDetails = asyncHandler(async(req, res) => {
  const { fullname, email} = req.body;

  if(!fullname || !email){
    throw new apiErrors(401, "All field are required");
  }

  const user = await User.findByIdAndUpdate(
    req.user?._id,
    {
      $set: {
        fullname,
        email
      }
    },
    {
      new: true
    }
  ).select("-password")

  return res
  .status(200)
  .json(new apiResponse(200, user, "Account detail updated successfully"))

})

const updateUserAvatar = asyncHandler(async(req, res) => {
  const avatarLocalPath = req.file?.path;

  if(!avatarLocalPath){
    throw new apiErrors(401, "Avatar file is missing")
  }

  const avatar = await uploadOnCloudinary(avatarLocalPath)

  if(!avatar.url){
    throw new apiErrors(401, "Error while uploading avatar")
  }

  const user = await User.findByIdAndUpdate(
    req.user?._id,
    { $set: { avatar: avatar.url } },
    { new: true }
  ).select("-password")

  return res
  .status(200)
  .json(new apiResponse(200, user, "Avatar is change successfully"))

})

const updateUserCoverImage = asyncHandler(async(req, res) => {
  const coverImageLocalPath = req.file?.path;

  if(!coverImageLocalPath){
    throw new apiErrors(401, "Cover Image file is missing")
  }

  const coverImage = await uploadOnCloudinary(coverImageLocalPath)

  if(!coverImage.url){
    throw new apiErrors(401, "Error while uploading CoverImage")
  }

  const user = await User.findByIdAndUpdate(
    req.user?._id,
    { $set: { coverImage: coverImage.url } },
    { new: true }
  ).select("-password")

  return res
  .status(200)
  .json(new apiResponse(200, user, "CoverImage is change successfully"))

})

export { 
  registerUser, 
  loginUser, 
  logoutuser, 
  refreshAccessTokens, 
  changeCurrentPassword, 
  getCurrentUser,
  updateAccountDetails,
  updateUserAvatar,
  updateUserCoverImage 
}
