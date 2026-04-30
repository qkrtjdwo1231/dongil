export const AUTH_COOKIE_NAME = "dongil_session";

export function getLoginId() {
  return process.env.LOGIN_ID ?? "admin";
}

export function getLoginPassword() {
  return process.env.LOGIN_PASSWORD ?? "dongil1234";
}

export function isValidLogin(id: string, password: string) {
  return id === getLoginId() && password === getLoginPassword();
}
