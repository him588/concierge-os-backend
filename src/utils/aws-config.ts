// filepath: c:\Users\hk939\Desktop\coding\concierge\Concierge-AI\src\utils\aws-config.ts
import { S3Client } from "@aws-sdk/client-s3";

export const s3Client = new S3Client({
  region: process.env.Aws_Region,
  credentials: {
    accessKeyId: process.env.Aws_Access_Key_Id!,
    secretAccessKey: process.env.Aws_Access_Key_Secret!,
  },
});
