import Razorpay from "razorpay";

const razorpay = new Razorpay({
  key_id: process.env.RazorpayKeyId,
  key_secret: process.env.RazorpayKeySecret,
});
export default razorpay;
