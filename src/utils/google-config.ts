import { configDotenv } from "dotenv";
import { google } from "googleapis";

configDotenv();

const googleClientId = process.env.GoogleClientId;
const googleClientSecret = process.env.GoogleClientSecret;

console.log(googleClientId);
console.log(googleClientSecret);

export const oauthClient = new google.auth.OAuth2(
  googleClientId,
  googleClientSecret,
  "postmessages"
);
