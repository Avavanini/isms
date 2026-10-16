export function httpError(status, code, message, details = null) {
  const error = new Error(message);
  error.status = status;
  error.code = code;
  if (details) {
    error.details = details;
  }
  return error;
}
