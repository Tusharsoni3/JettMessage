// utils/authUtils.js
import jwt from 'jsonwebtoken';

const generateTokenAndSetCookie = (res, userId) => {
  const token = jwt.sign({ id: userId }, process.env.JWT_SECRET, {
    expiresIn: '7d'
  });

  const cookieOptions = {
    httpOnly: true, // Prevents client-side JS from reading the cookie (XSS protection)
    secure: process.env.NODE_ENV === 'production', // Requires HTTPS in production
    sameSite: 'strict', // Protects against Cross-Site Request Forgery (CSRF)
    maxAge: 7 * 24 * 60 * 60 * 1000 // 7 days in milliseconds
  };

  res.cookie('jwt', token, cookieOptions);
  return token;
};

export default generateTokenAndSetCookie ;