import { asyncHandler } from "../utils/asyncHandler.js";
import { ApiError } from '../utils/ApiError.js'
import { User } from "../models/user.model.js"
import { uploadOnCloudinary } from "../utils/cloudinary.js";
import { ApiResponse } from "../utils/ApiResponse.js"
import jwt from "jsonwebtoken";

const generateAccessAndRefershToken = async(userId) => {
  try {
    const user = await User.findById(userId)

    const accessToken = await user.generateAccessToken()
    const refreshToken = await user.generateRefreshToken()

    user.refreshToken = refreshToken
    await user.save({ validateBeforeSave : false })

    return { accessToken, refreshToken}

  } catch (error) {
    throw new ApiError(500, "Something went wrong while generating access and refresh token")
    
  }
}

// for /register route
const registerUser = asyncHandler(async (req, res) => {
  
  // setps needed : 

  // 1. get user detail from frontend 
  const {username, fullName, email, password} = req.body
  // console.log(req.body);

  // 2. validation - not empty 
  // if (fullName === "") {
  //   throw new ApiError(400, "fullname is required")    
  // } 
  // same do for all fields or 
  
  if (
    [fullName, email, username, password].some( 
      (field) => field?.trim() === ""
    )
  ) {
    throw new ApiError(400, "All fields are required")
  }
  
  // 3. check if user already exist : username, email 
  const existedUser = await User.findOne({
    $or : [ { username }, { email } ]
  })
  // console.log(existedUser);
  
  if (existedUser) {
    throw new ApiError(409, "User with email or username already exists")
  }

  // 4. check for image, check for avatar
  const avatarLocalPath = req.files?.avatar[0]?.path
  // const coverImageLocalPath = req.files?.coverImage[0]?.path
  // console.log(req.files);

  let coverImageLocalPath;
  if (req.files && Array.isArray(req.files.coverImage) && req.files?.coverImage.length > 0) {
    coverImageLocalPath = req.files.coverImage[0].path
  }

  if (!avatarLocalPath) {
    throw new ApiError(400, "Avatar file is not given")
  }

  // 5. upload them to cloudinary, avatar
  const avatar = await uploadOnCloudinary(avatarLocalPath)
  // console.log(avatar);
  
  const coverImage = await uploadOnCloudinary(coverImageLocalPath)

  // 6. create user object - create entry in db
  if (!avatar) {
    throw new ApiError(400, "Avatar file is not uploaded on cloud")
  }

  // 7. remove password and refesh toke field from response 
  const user = await User.create({
    fullName,
    avatar : avatar.url,
    coverImage : coverImage?.url || "",
    email,
    password,
    username : username.toLowerCase() 
  })
  // console.log(user + '\n');
  
  // 8. check for user creation 
  const createdUser = await User.findById(user._id).select(
    "-password -refreshToken"
  )
  // console.log(createdUser + '\n');

  // 9. check user is created or not 
  if (!createdUser) {
    throw new ApiError(500, "Something went wrong while registering the user")
  }

  // 10. return res
  return res.status(201).json(
    new ApiResponse(200, createdUser, "User registered successfully")
  )

});

// for /login route 
const loginUser = asyncHandler(async (req, res) => {
  // todos :

  // 1. take data from req.body
  const {username, email, password} = req.body

  // 2. check username or email
  // if (!(username || email))  --> if user need to login with name or email   
  if (!username && !email) {
    throw new ApiError(400, "username or email is required")
  }
  
  // 3. find user
  const user = await User.findOne({
    $or: [{ username }, { email }],
  })

  if (!user) {
    throw new ApiError(404, "User does not exist")
  }

  // 4. check password
  const isPasswordValid = await user.isPasswordCorrect(password)

  if (!isPasswordValid) {
    throw new ApiError(401, "Invalid Password")
  }

  // 5. access and refresh token generation
  const {accessToken, refreshToken} = await generateAccessAndRefershToken(user._id)
  
  const loggedInUser = await User.findById(user._id).select("-password -refreshToken")

  // 6. send secure cookie 
  const options = {
    httpOnly : true,
    secure : true
  }

  return res
  .status(200)
  .cookie("accessToken" , accessToken, options)
  .cookie("refreshToken", refreshToken, options)
  .json(
    new ApiResponse(
      200, {
        user : loggedInUser, accessToken, refreshToken
      },
      "User Logged In Successfully"
    )
  )

})

// for /logout route
const logoutUser = asyncHandler( async(req, res) => {
  
  await User.findByIdAndUpdate(
    req.user._id,
    {
      $set: {
        refreshToken : undefined  
      }
    },
    {
      new : true
    }
  )

  const options = {
    httpOnly : true,
    secure : true
  }

  return res
  .status(200)
  .clearCookie("accessToken", options)
  .clearCookie("refreshToken", options)
  .json( new ApiResponse(200, {}, "User logged out successfully") )
  
})

// for refresh token route
const refreshAccessToken = asyncHandler(async(req, res) => {
  const incomingRefreshToken = req.cookies.refreshToken || req.body.refreshToken
  
  if (!incomingRefreshToken) {
    throw new ApiError(401, "Unauthorized request")
  }

  try {

    const decodedToken = jwt.verify(
      incomingRefreshToken, 
      process.env.REFRESH_TOKEN_SECRET,
    )
  
    const user = await User.findById(decodedToken?._id)
  
    if (!user) {
      throw new ApiError(401, "Invalid refresh token")
    }
  
    if (incomingRefreshToken !== user?.refreshToken) {
      throw new ApiError(401, "Refresh Token is expired or used")
    }
  
    const {accessToken, newRefreshToken} = await generateAccessAndRefershToken(user._id)
  
    options = {
      httpOnly : true,
      secure : true
    }
  
    return res
    .status(200)
    .cookie("accessToken", accessToken, options)
    .cookie("refreshToken", newRefreshToken, options)
    .json(
      new ApiResponse(
        200,
        {accessToken, refreshToken: newRefreshToken},
        "Access token refreshed successfully"
      )
    )

  } catch (error) {
    throw new ApiError(401, error?.message || "Invalid refresh token")
  }

})

// for password change
const changeCurrentPassword = asyncHandler( async(req, res) => {
  const {oldPassword, newPassword} = req.body

  const user = await User.findById(req.user?._id)

  const isPasswordCorrect = await user.isPasswordCorrect(oldPassword)

  if (!isPasswordCorrect) {
    throw new ApiError(400, "Old password is incorrect")
  }

  user.password = newPassword
  await user.save({
    validateBeforeSave : false
  })

  res
  .status(200)
  .json(
    new ApiResponse(200, {}, "Password changed successfully")
  )
})

// for getting user details
const getCurrentUser = asyncHandler( async(req, res) => {
  
  return res
  .status(200)
  .json(
    new ApiResponse(200, req.user, "User retrieved successfully")
  )

})

// for updating user details like fullName, email 
const updateAccountDetails = asyncHandler( async (req, res) => {
  const {fullName, email} = req.body

  if ( !(fullName || email) ) {
    throw new apiError(
      400, "All fields are required "
    )
  }

  const user = await User.findByIdAndUpdate(
    req.user?._id,
    {
      $set : {
        fullName,
        email // email : email also work 
      }
    },
    {new : true}  // this will return the updated document
  ).select( "-password" )

  return res
  .status(200)
  .json(
    new ApiResponse(
      200, user, "Account details updated successfully"
    )
  )

}) 

// for updating user avatar
const updateUserAvatar = asyncHandler( async(req, res) => {
  const avatarLocalPath = req.file?.path  

  if (!avatarLocalPath) {
    throw new ApiError(400, "Avatar file is missing")
  }

  const avatar = await uploadOnCloudinary(avatarLocalPath)

  if (!avatar.url) {
    throw new ApiError(400, "Error while uploading on avatar")
  }

  const user = await User.findByIdAndUpdate(
    req.user?._id,
    {
      avatar : avatar.url
    },
    {new : true}
  ).select( "-password")

  return res
  .status(200)
  .json(
    new ApiResponse(
      200, user, "Avatar updated successfully"
    )
  )

})

// for updating user coverImage 
const updateUserCoverImage = asyncHandler( async(req, res) => {
  const coverImageLocalPath = req.file?.path  

  if (!coverImageLocalPath) {
    throw new ApiError(400, "Cover image file is missing")
  }

  const coverImage = await uploadOnCloudinary(coverImageLocalPath)

  if (!coverImage.url) {
    throw new ApiError(400, "Error while uploading on cover image")
  }

  const user = await User.findByIdAndUpdate(
    req.user?._id,
    {
      coverImage : coverImage.url
    },
    {new : true}
  ).select( "-password")

  return res
  .status(200)
  .json(
    new ApiResponse(
      200, user, "Cover Image updated successfully"
    )
  )
  
})

export { 
  registerUser, 
  loginUser, 
  logoutUser, 
  refreshAccessToken, 
  changeCurrentPassword, 
  getCurrentUser, 
  updateAccountDetails,
  updateUserAvatar,
  updateUserCoverImage
}
