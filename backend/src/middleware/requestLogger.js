export function requestLogger(request, response, next) {
  const start = Date.now();
  response.on('finish', () => {
    const duration = Date.now() - start;
    if (process.env.NODE_ENV !== 'test') {
      console.info(`${request.method} ${request.originalUrl} ${response.statusCode} - ${duration}ms`);
    }
  });
  next();
}
