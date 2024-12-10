import { asyncHandler } from "../utils/asyncHandler.js";
import { ApiError } from '../utils/ApiError.js'
import { User } from "../models/user.model.js"
import { uploadOnCloudinary } from "../utils/cloudinary.js";
import { ApiResponse } from "../utils/ApiResponse.js"

const registerUser = asyncHandler(async (req, res) => {
  
  // setps needed : 

  // 1. get user detail from frontend 
  // 2. validation - not empty 
  // 3. check if user already exist : username, email 
  // 4. check for image, check for avatar
  // 5. upload them to cloudinary, avatar
  // 6. create user object - create entry in db
  // 7. remove password and refesh toke field from response 
  // 8. check for user creation 
  // 9. return res

  // 1. 
  const {username, fullName, email, password} = req.body
  // console.log(req.body);

  // 2.
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
  
  // 3.
  const existedUser = await User.findOne({
    $or : [ { username }, { email } ]
  })
  // console.log(existedUser);
  
  if (existedUser) {
    throw new ApiError(409, "User with email or username already exists")
  }

  // 4.
  const avatarLocalPath = req.files?.avatar[0]?.path
  const coverImageLocalPath = req.files?.coverImage[0]?.path
  // console.log(req.files);

  if (!avatarLocalPath) {
    throw new ApiError(400, "Avatar file is not given")
  }

  // 5. 
  const avatar = await uploadOnCloudinary(avatarLocalPath)
  console.log(avatar);
  
  const coverImage = await uploadOnCloudinary(coverImageLocalPath)

  // 6. 
  if (!avatar) {
    throw new ApiError(400, "Avatar file is not uploaded on cloud")
  }

  // 7. 
  const user = await User.create({
    fullName,
    avatar : avatar.url,
    coverImage : coverImage?.url || "",
    email,
    password,
    username : username.toLowerCase() 
  })
  // console.log(user + '\n');
  
  // 8.  
  const createdUser = await User.findById(user._id).select(
    "-password -refreshToken"
  )
  // console.log(createdUser + '\n');

  // check user is created or not 
  if (!createdUser) {
    throw new ApiError(500, "Something went wrong while registering the user")
  }

  // 9. 
  return res.status(201).json(
    new ApiResponse(200, createdUser, "User registered successfully")
  )

});

export { registerUser }
