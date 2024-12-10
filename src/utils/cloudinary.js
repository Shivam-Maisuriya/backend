import { v2 as cloudinary } from "cloudinary";
import fs from "fs";

cloudinary.config({
  cloud_name: "dzqgxq7iv",
  api_key: "772839985673931",
  api_secret: "GzYCNqyq0mw0MFQilQT4TmD61dw"
});

const uploadOnCloudinary = async (localFilePath) => {
  
  try {
    if (!localFilePath) return null;

    // upload the file on cloudinary
    const response = await cloudinary.uploader.upload(localFilePath, {
      resource_type: "auto",
    });

    // file has been uploaded successfully
    // console.log("file is uploaded in cloudinry ", response.url);
    fs.unlinkSync(localFilePath)
    
    return response;

  } catch (error) {
    console.log(error);
    
    // remove the locally saved temoporary file as the upload opration got failed
    fs.unlinkSync(localFilePath);
    return null;
  }
};

export { uploadOnCloudinary }

// (async function() {

//     // Configuration
//     cloudinary.config({
//         cloud_name: ``,
//         api_key: ``,
//         api_secret: `` // Click 'View API Keys' above to copy your API secret
//     });

//     // Upload an image
//      const uploadResult = await cloudinary.uploader
//        .upload(
//            'https://res.cloudinary.com/demo/image/upload/getting-started/shoes.jpg', {
//                public_id: 'shoes',
//            }
//        )
//        .catch((error) => {
//            console.log(error);
//        });

//     console.log(uploadResult);

//     // Optimize delivery by resizing and applying auto-format and auto-quality
//     const optimizeUrl = cloudinary.url('shoes', {
//         fetch_format: 'auto',
//         quality: 'auto'
//     });

//     console.log(optimizeUrl);

//     // Transform the image: auto-crop to square aspect_ratio
//     const autoCropUrl = cloudinary.url('shoes', {
//         crop: 'auto',
//         gravity: 'auto',
//         width: 500,
//         height: 500,
//     });

//     console.log(autoCropUrl);
// })();
