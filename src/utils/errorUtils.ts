export function getSignupErrorMessage(error: any): string {
  if (!error.response) {
    return "Network error. Please try again.";
  }

  const status = error.response.status;
  const message = error.response.data?.message;

  if (status === 409) {
    return "An account with this email already exists.";
  }

  if (status === 400) {
    return message || "Invalid signup details.";
  }

  return message || "Signup failed. Please try again.";
}
