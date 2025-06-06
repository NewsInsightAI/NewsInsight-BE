
function requestLogger(req, res, next) {
  const method = req.method;
  const url = req.originalUrl || req.url;
  const timestamp = new Date().toLocaleTimeString('id-ID', { 
    hour12: false,
    timeZone: 'Asia/Jakarta'
  });
  
  
  const getMethodColor = (method) => {
    const colors = {
      GET: '\x1b[32m[GET]\x1b[0m   ',     
      POST: '\x1b[33m[POST]\x1b[0m  ',    
      PUT: '\x1b[34m[PUT]\x1b[0m   ',     
      DELETE: '\x1b[31m[DELETE]\x1b[0m',  
      PATCH: '\x1b[35m[PATCH]\x1b[0m '    
    };
    return colors[method] || `[${method}]`;
  };
  
  
  console.log(`${getMethodColor(method)} ${url}`);
  
  next();
}

module.exports = requestLogger;
