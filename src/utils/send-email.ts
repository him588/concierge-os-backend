import { createTransport } from "nodemailer";
import path from "path";
import fs from "fs";

function escapeHtml(str: string) {
  return str
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#39;");
}

/** Replace all {{ key }} placeholders with provided values (global, whitespace tolerant) */
function fillTemplate(html: string, data: Record<string, string | number>) {
  return Object.keys(data).reduce((acc, key) => {
    const value = String(data[key] ?? "");
    // escape inserted values for safety
    const escaped = escapeHtml(value);
    const re = new RegExp(`\\{\\{\\s*${key}\\s*\\}\\}`, "g");
    return acc.replace(re, escaped);
  }, html);
}

export function sendOtpEmail(
  directory: string,
  fileName: string,
  senderEmail: string,
  recieverEmail: string,
  subject: string,
  name: string,
  otp_dig_1: string,
  otp_dig_2: string,
  otp_dig_3: string,
  otp_dig_4: string,
  valid_till: string,
) {
  const htmlPath = path.join(__dirname, directory, fileName);
  let htmlContent = fs.readFileSync(htmlPath, "utf8");

  const data = {
    username: name,
    otp_dig_1,
    otp_dig_2,
    otp_dig_3,
    otp_dig_4,
    valid_till,
    unsubscribe_link: "https://swiftalpha.com/unsubscribe",
  };

  // Inject values (replaces all occurrences)
  htmlContent = fillTemplate(htmlContent, data);

  //   const htmlContent = fs.readFileSync(htmlPath, "utf8");
  const transporter = createTransport({
    service: "Gmail",
    auth: {
      user: senderEmail,
      pass: "lmui cymr byrk itcu",
    },
  });
  const mailOptions = {
    from: senderEmail,
    to: recieverEmail,
    subject: `Welcome! ${subject}`,
    html: htmlContent,
    context: {
      username: name,
      otp_dig_1: otp_dig_1,
      otp_dig_2: otp_dig_2,
      otp_dig_3: otp_dig_3,
      otp_dig_4: otp_dig_4,
      valid_till: valid_till,
      unsubscribe_link: "https://swiftalpha.com/unsubscribe",
    },
  };

  transporter.sendMail(mailOptions, function (error, info) {
    if (error) {
      console.error(error);
    } else {
      console.log("Email sent: " + info.response);
    }
  });
}

export function sendBookingEmail(
  directory: string,
  fileName: string,
  senderEmail: string,
  recieverEmail: string,
  subject: string,
  propertyName: string,
  year: string,
  city: string,
  state: string,
  bookingId: string,
  roomType: string,
  checkIn: string,
  checkOut: string,
  totalNights: string,
  guests: string,
  totalAmount: string,
  paymentLink: string,
  expireTime: string,
) {
  const htmlPath = path.join(__dirname, directory, fileName);
  let htmlContent = fs.readFileSync(htmlPath, "utf8");

  // ✅ Correct template data for booking
  const data = {
    propertyName,
    year,
    city,
    state,
    bookingId,
    roomType,
    checkIn,
    checkOut,
    totalNights,
    guests,
    totalAmount,
    paymentLink,
    expireTime,
    unsubscribe_link: "https://swiftalpha.com/unsubscribe",
  };

  // Inject values into template
  htmlContent = fillTemplate(htmlContent, data);

  const transporter = createTransport({
    service: "Gmail",
    auth: {
      user: senderEmail,
      pass: "lmui cymr byrk itcu",
    },
  });

  const mailOptions = {
    from: senderEmail,
    to: recieverEmail,
    subject: subject, // ✅ clean subject
    html: htmlContent,
  };

  transporter.sendMail(mailOptions, function (error, info) {
    if (error) {
      console.error(error);
    } else {
      console.log("Email sent: " + info.response);
    }
  });
}

export function sendConfirmedBookingEmail(
  directory: string,
  fileName: string,
  senderEmail: string,
  recieverEmail: string,
  subject: string,
  propertyName: string,
  year: string,
  city: string,
  state: string,
  bookingId: string,
  guestName: string,
  guestEmail: string,
  roomType: string,
  roomNumber: string,
  floor: string,
  checkIn: string,
  checkOut: string,
  totalNights: string,
  guests: string,
  totalAmount: string,
  supportEmail: string,
  supportPhone: string,
) {
  const htmlPath = path.join(__dirname, directory, fileName);
  let htmlContent = fs.readFileSync(htmlPath, "utf8");

  // Template data for confirmed booking
  const data = {
    propertyName,
    year,
    city,
    state,
    bookingId,
    guestName,
    guestEmail,
    roomType,
    roomNumber,
    floor,
    checkIn,
    checkOut,
    totalNights,
    guests,
    totalAmount,
    supportEmail,
    supportPhone,
  };

  // Inject values into template
  htmlContent = fillTemplate(htmlContent, data);

  const transporter = createTransport({
    service: "Gmail",
    auth: {
      user: senderEmail,
      pass: "lmui cymr byrk itcu",
    },
  });

  const mailOptions = {
    from: senderEmail,
    to: recieverEmail,
    subject: subject,
    html: htmlContent,
  };

  transporter.sendMail(mailOptions, function (error, info) {
    if (error) {
      console.error(error);
    } else {
      console.log("Email sent: " + info.response);
    }
  });
}

// ✅ NEW: Send warning email at 2 hours
export function sendScheduledBookingWarning(
  directory: string,
  fileName: string,
  senderEmail: string,
  receiverEmail: string,
  subject: string,
  propertyName: string,
  year: string,
  city: string,
  state: string,
  bookingId: string,
  guestName: string,
  serviceName: string,
  scheduledAt: string,
  supportEmail: string,
  supportPhone: string,
) {
  const htmlPath = path.join(__dirname, directory, fileName);
  let htmlContent = fs.readFileSync(htmlPath, "utf8");

  const data = {
    propertyName,
    year,
    city,
    state,
    bookingId,
    guestName,
    serviceName,
    scheduledAt,
    supportEmail,
    supportPhone,
  };

  htmlContent = fillTemplate(htmlContent, data);

  const transporter = createTransport({
    service: "Gmail",
    auth: {
      user: senderEmail,
      pass: "lmui cymr byrk itcu",
    },
  });

  const mailOptions = {
    from: senderEmail,
    to: receiverEmail,
    subject: subject,
    html: htmlContent,
  };

  transporter.sendMail(mailOptions, function (error, info) {
    if (error) {
      console.error(error);
    } else {
      console.log("Email sent: " + info.response);
    }
  });
}

// ✅ NEW: Send cancellation email at 3 hours
export function sendScheduledBookingCancelled(
  directory: string,
  fileName: string,
  senderEmail: string,
  receiverEmail: string,
  subject: string,
  propertyName: string,
  year: string,
  city: string,
  state: string,
  bookingId: string,
  guestName: string,
  serviceName: string,
  scheduledAt: string,
  supportEmail: string,
  supportPhone: string,
) {
  const htmlPath = path.join(__dirname, directory, fileName);
  let htmlContent = fs.readFileSync(htmlPath, "utf8");

  const data = {
    propertyName,
    year,
    city,
    state,
    bookingId,
    guestName,
    serviceName,
    scheduledAt,
    supportEmail,
    supportPhone,
  };

  htmlContent = fillTemplate(htmlContent, data);

  const transporter = createTransport({
    service: "Gmail",
    auth: {
      user: senderEmail,
      pass: "lmui cymr byrk itcu",
    },
  });

  const mailOptions = {
    from: senderEmail,
    to: receiverEmail,
    subject: subject,
    html: htmlContent,
  };

  transporter.sendMail(mailOptions, function (error, info) {
    if (error) {
      console.error(error);
    } else {
      console.log("Email sent: " + info.response);
    }
  });
}
