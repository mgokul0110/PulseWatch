
const jwt = require("jsonwebtoken");
const { validate: isUUID } = require("uuid");

const authMiddleware = (req, res, next) => {
  try {
    const secret = process.env.JWT_SECRET;

    if (!secret) {
      console.error("JWT_SECRET is not configured");

      return res.status(500).json({
        message: "Authentication service is not configured",
      });
    }

    const authHeader = req.headers.authorization;

    if (!authHeader || !authHeader.startsWith("Bearer ")) {
      return res.status(401).json({
        message: "Authentication required",
      });
    }

    const token = authHeader.slice(7).trim();

    if (!token || token.split(".").length !== 3) {
      return res.status(401).json({
        message: "Invalid authentication token",
      });
    }

    const decoded = jwt.verify(token, secret, {
      algorithms: ["HS256"],
    });

    if (
      !decoded ||
      typeof decoded !== "object" ||
      typeof decoded.userId !== "string" ||
      !isUUID(decoded.userId)
    ) {
      return res.status(401).json({
        message: "Invalid authentication token",
      });
    }

    req.user = {
      userId: decoded.userId,
      email: decoded.email,
    };

    next();
  } catch (error) {
    return res.status(401).json({
      message: "Invalid or expired token",
    });
  }
};

module.exports = authMiddleware;
