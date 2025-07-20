const jwt = require("jsonwebtoken");
const JWT_SECRET = process.env.JWT_SECRET || "defaultsecret";


module.exports = function (req, res, next) {
  console.log("[middlewareAuth] Checking auth for:", req.method, req.path);
  const authHeader = req.headers["authorization"];
  if (!authHeader || !authHeader.startsWith("Bearer ")) {
    console.log("[middlewareAuth] No token found, rejecting request");
    return res.status(401).json({
      status: "error",
      message: "Token tidak ditemukan atau format salah",
      data: null,
      error: { code: "NO_TOKEN" },
      metadata: null,
    });
  }
  const token = authHeader.split(" ")[1];
  try {
    const decoded = jwt.verify(token, JWT_SECRET);
    req.user = decoded; 
    next();
  } catch (err) {
    return res.status(401).json({
      status: "error",
      message: "Token tidak valid atau sudah expired",
      data: null,
      error: { code: "INVALID_TOKEN" },
      metadata: null
    });
  }
};
