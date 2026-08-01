import apiErrors from "../utils/apiErrors.js";
import asyncHandler from "../utils/asyncHandler.js";
import User from "../models/user.models.js";
import cloudinary from "../utils/cloudinary.js";
import apiResponse from "../utils/apiResponse.js";

const generateReferesh_And_AccessTokens = async (userId) => {
  try {
    const user = User.findById(userId);
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

const loginUser = asynchandler( async (req, res) => {
  const { email, username, password } = req.body;

  if (!email || !username) {
    throw new apiErrors(400, "Username and password is required.");
  }

  const user = User.findOne({
    $or: [{ email }, { username }],
  });

  if (!user) {
    throw new apiErrors(404, "User does not exist.");
  }

  const isPasswordCorrect = await user.isPasswordCorrect(password);

  if (!isPasswordCorrect) {
    throw new apiErrors(404, "Invalid user credientials.");
  }

  const {accessToken, refreshToken} = await generateReferesh_And_AccessTokens(user._id);

  const loginUser = await User.findById(user._id).select("-password -refreshToken-")

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

})


export { registerUser, loginUser };
