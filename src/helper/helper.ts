import jwt from "jsonwebtoken";

export function generateOtp4() {
  const array = new Uint32Array(1);
  crypto.getRandomValues(array); // secure RNG
  const num = array[0] % 10_000; // 0 .. 9999
  return String(num).padStart(4, "0"); // ensures 4 digits
}

export function decodeJwt(token: string) {
  return jwt.verify(token, process.env.JWT_SECRET as string);
}
