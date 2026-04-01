// filepath: c:\Users\hk939\Desktop\coding\concierge\Concierge-AI\src\utils\aws-config.ts
import { S3Client } from "@aws-sdk/client-s3";

console.log("bucket name", process.env.Aws_Bucket_Name);
console.log("aws region", process.env.Aws_Region);
console.log("aws access key id", process.env.Aws_Access_Key_Id!);
console.log("aws secret access key", process.env.Aws_Access_Key_Secret!);
export const s3Client = new S3Client({
  region: process.env.Aws_Region,
  credentials: {
    accessKeyId: process.env.Aws_Access_Key_Id!,
    secretAccessKey: process.env.Aws_Access_Key_Secret!,
  },
});
