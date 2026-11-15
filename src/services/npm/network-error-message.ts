/** A message for a request to npm that failed before it got an answer */
export const networkErrorMessage = (error: unknown) => {
  if (error instanceof Error) return error.message;

  if (typeof error === 'string') return error;

  return 'Network error';
};
