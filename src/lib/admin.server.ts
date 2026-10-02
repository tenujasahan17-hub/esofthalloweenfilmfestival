import { createHmac, timingSafeEqual } from "crypto";

const ADMIN_PASSWORD = "2050";
const TTL_MS = 8 * 60 * 60 * 1000;

function key() {
  return "esoft-hff:" + (process.env["SUPABASE_SERVICE_ROLE_KEY"] ?? "");
}
function sign(payload: string) {
  return createHmac("sha256", key()).update(payload).digest("hex");
}
function safeEq(a: string, b: string) {
  const A = Buffer.from(a);
  const B = Buffer.from(b);
  return A.length === B.length && timingSafeEqual(A, B);
}

export function checkPassword(pw: string) {
  return safeEq(pw, ADMIN_PASSWORD);
}
export function issueToken() {
  const exp = String(Date.now() + TTL_MS);
  return `${exp}.${sign(exp)}`;
}
export function verifyToken(token: string) {
  const [exp, sig] = token.split(".");
  if (!exp || !sig) return false;
  if (!safeEq(sig, sign(exp))) return false;
  return Number(exp) > Date.now();
}
