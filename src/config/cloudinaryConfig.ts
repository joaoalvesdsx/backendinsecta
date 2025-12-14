import { v2 as cloudinary } from "cloudinary";
import dotenv from "dotenv";

dotenv.config();

cloudinary.config({
  cloud_name: process.env.CLOUDINARY_CLOUD_NAME, // Nome da cloud do Cloudinary
  api_key: process.env.CLOUDINARY_API_KEY, // API key do Cloudinary
  api_secret: process.env.CLOUDINARY_API_SECRET, // API secret do Cloudinary
});

export default cloudinary;
