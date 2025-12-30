// filepath: c:\Users\hk939\Desktop\coding\concierge\Concierge-AI\src\middlewares\upload-file.ts
import multer from "multer";
import multerS3 from "multer-s3";
import { Request } from "express";
import { s3Client } from "../utils/aws-config";

console.log("bucket name", process.env.Aws_Bucket_Name);
export const upload = multer({
  storage: multerS3({
    s3: s3Client,
    bucket: process.env.Aws_Bucket_Name!,
    contentType: multerS3.AUTO_CONTENT_TYPE,

    key: (req: Request, file: Express.Multer.File, cb) => {
      const fileName = `property-images/${Date.now()}-${file.originalname}`;
      cb(null, fileName);
    },
  }),

  limits: {
    fileSize: 5 * 1024 * 1024, // 5MB
  },

  fileFilter: (req: Request, file: Express.Multer.File, cb) => {
    if (file.mimetype.startsWith("image/")) {
      cb(null, true);
    } else {
      cb(new Error("Only image files allowed"));
    }
  },
});
