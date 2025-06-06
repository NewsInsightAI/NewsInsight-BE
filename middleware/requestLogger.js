// Middleware untuk logging setiap request yang masuk
function requestLogger(req, res, next) {
  const method = req.method;
  const url = req.originalUrl || req.url;
  const timestamp = new Date().toLocaleTimeString('id-ID', { 
    hour12: false,
    timeZone: 'Asia/Jakarta'
  });
  
  // Warna untuk setiap HTTP method
  const getMethodColor = (method) => {
    const colors = {
      GET: '\x1b[32m[GET]\x1b[0m   ',     // Green
      POST: '\x1b[33m[POST]\x1b[0m  ',    // Yellow
      PUT: '\x1b[34m[PUT]\x1b[0m   ',     // Blue
      DELETE: '\x1b[31m[DELETE]\x1b[0m',  // Red
      PATCH: '\x1b[35m[PATCH]\x1b[0m '    // Magenta
    };
    return colors[method] || `[${method}]`;
  };
  
  // Log request
  console.log(`${getMethodColor(method)} ${url}`);
  
  next();
}

module.exports = requestLogger;
