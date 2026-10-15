export function errorHandler(error, _request, response, _next) {
  const requestedStatus = Number(error.status);
  const isClientError = Number.isInteger(requestedStatus)
    && requestedStatus >= 400
    && requestedStatus < 500;
  const status = isClientError ? requestedStatus : 500;
  const code = isClientError ? (error.code ?? 'REQUEST_ERROR') : 'INTERNAL_SERVER_ERROR';
  const message = isClientError ? error.message : 'An unexpected error occurred';

  if (status === 500) {
    console.error('Unhandled request error:', error);
  }

  const responseError = { code, message };
  if (isClientError && Array.isArray(error.details)) {
    responseError.details = error.details;
  }

  response.status(status).json({
    success: false,
    error: responseError
  });
}
