module.exports = function (req, res, next) {
  if (!req.user || req.user.role !== "admin") {
    return res.status(403).json({
      status: "error",
      message: "Akses hanya untuk admin",
      data: null,
      error: { code: "FORBIDDEN" },
      metadata: null
    });
  }
  next();
};
