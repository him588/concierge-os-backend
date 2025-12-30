import { google } from "googleapis";

const googleClientId = process.env.GoogleClientId;
const googleClientSecret = process.env.GoogleClientSecret;
console.log("google client id", !process.env.GoogleClientId);

console.log(googleClientId);
console.log(googleClientSecret);

export const oauthClient = new google.auth.OAuth2(
  googleClientId,
  googleClientSecret,
  "postmessages"
);
