import type { AuthDefinition } from "@w6w/types";
import { API_URL } from "../lib/client.ts";

/**
 * Bitbucket Cloud App Password (`basic`) — the legacy per-user path. The user
 * mints an "App password" under Personal settings → App passwords, then pastes
 * `<username>:<app-password>` here. Every request signs with
 * `Authorization: Basic <base64(user:pw)>`.
 *
 * IMPORTANT: this is NOT the account password. Account passwords are rejected
 * by the API on Basic auth; only app passwords (or, on the bearer path, an
 * access token) are accepted.
 *
 * Base64 is inlined because the worker sandbox runs with `import: false` — we
 * can't pull in `jsr:@std/encoding/base64` at runtime. The encoder below is
 * standard RFC-4648 alphabet, ~30 lines, no dependencies.
 */

const BASE64_ALPHABET = "ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789+/";

/**
 * Encode a UTF-8 string to base64 using only ES-standard primitives so this
 * runs identically in browsers, Deno, Workers, and Node — no `Buffer`, no
 * `atob`/`btoa` (which choke on non-Latin-1 usernames).
 */
function base64Encode(input: string): string {
  const bytes = new TextEncoder().encode(input);
  let out = "";
  let i = 0;
  for (; i + 2 < bytes.length; i += 3) {
    const b1 = bytes[i], b2 = bytes[i + 1], b3 = bytes[i + 2];
    out += BASE64_ALPHABET[b1 >> 2];
    out += BASE64_ALPHABET[((b1 & 0x03) << 4) | (b2 >> 4)];
    out += BASE64_ALPHABET[((b2 & 0x0f) << 2) | (b3 >> 6)];
    out += BASE64_ALPHABET[b3 & 0x3f];
  }
  const rem = bytes.length - i;
  if (rem === 1) {
    const b1 = bytes[i];
    out += BASE64_ALPHABET[b1 >> 2];
    out += BASE64_ALPHABET[(b1 & 0x03) << 4];
    out += "==";
  } else if (rem === 2) {
    const b1 = bytes[i], b2 = bytes[i + 1];
    out += BASE64_ALPHABET[b1 >> 2];
    out += BASE64_ALPHABET[((b1 & 0x03) << 4) | (b2 >> 4)];
    out += BASE64_ALPHABET[(b2 & 0x0f) << 2];
    out += "=";
  }
  return out;
}

const basic: AuthDefinition = {
  key: "basic",
  type: "basic",
  displayName: "App Password",
  description:
    "Bitbucket username + App password (Personal settings → App passwords). Do NOT use your account password — Bitbucket rejects it.",
  connectionLabel: "{{user.display_name}} ({{user.username}})",
  fields: [
    {
      key: "username",
      label: "Username",
      type: "string",
      required: true,
      hint: "Your Bitbucket username (not email). Find it under Personal settings.",
    },
    {
      key: "password",
      label: "App password",
      type: "secret",
      required: true,
      hint:
        "Generate at Personal settings → App passwords. NOT your account password — those are rejected.",
    },
  ],

  sign({ request, credential }) {
    const { username, password } = credential as { username: string; password: string };
    request.headers["authorization"] = `Basic ${base64Encode(`${username}:${password}`)}`;
    return request;
  },

  async test({ credential }, ctx) {
    const { username, password } = credential as { username?: string; password?: string };
    if (!username || !password) {
      return { ok: false, message: "credential missing username or password" };
    }
    const res = await ctx.fetch(`${API_URL}/user`, {
      headers: { authorization: `Basic ${base64Encode(`${username}:${password}`)}` },
    });
    if (!res.ok) return { ok: false, message: `Bitbucket returned ${res.status}` };
    return { ok: true };
  },

  async afterConnect(_input, ctx) {
    const res = await ctx.fetch(`${API_URL}/user`);
    if (!res.ok) return {};
    const user = await res.json() as {
      account_id?: string;
      uuid?: string;
      username?: string;
      display_name?: string;
    };
    return {
      user: {
        id: user.account_id ?? user.uuid,
        username: user.username,
        display_name: user.display_name,
      },
    };
  },
};

// Exported for unit tests; keeps the encoder covered.
export { base64Encode };
export default basic;
