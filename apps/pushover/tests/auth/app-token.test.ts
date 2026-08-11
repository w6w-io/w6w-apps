import { assert, assertEquals } from "@std/assert";
import appToken, {
  endpointTakesUser,
  injectCredential,
  KEY_PATTERN,
  PROBE_PATH,
} from "../../auth/app-token.ts";
import { failure, mockCtx, ok, TOKEN, USER } from "../_helpers.ts";

interface SignableRequest {
  url: string;
  method: string;
  headers: Record<string, string>;
  body?: string | null;
}

/** `sign` is network-less, so the ctx it is handed makes no requests. */
function signWith(request: SignableRequest): SignableRequest {
  const { ctx } = mockCtx([]);
  return appToken.sign!(
    { request, credential: { token: TOKEN, user: USER } } as never,
    ctx,
  ) as SignableRequest;
}

Deno.test("auth: declares two secret fields, because the credential is a pair", () => {
  assertEquals(appToken.key, "app-token");
  // `custom`, not `apiKey` or `bearer`: the credential rides in the request
  // body, which no header-placement block describes.
  assertEquals(appToken.type, "custom");
  const fields = appToken.fields ?? [];
  assertEquals(fields.map((f) => f.key), ["token", "user"]);
  assertEquals(fields.every((f) => f.type === "secret"), true, "both halves are private");
});

Deno.test("KEY_PATTERN: 30 letters and digits, as the vendor documents", () => {
  assert(KEY_PATTERN.test(TOKEN));
  assert(KEY_PATTERN.test(USER));
  assertEquals(TOKEN.length, 30);
  assert(!KEY_PATTERN.test(TOKEN.slice(0, 29)));
  assert(!KEY_PATTERN.test(`${TOKEN.slice(0, 29)}-`), "punctuation must not match");
});

/**
 * The application-scoped endpoints take a token and no user key. Withholding the
 * recipient's key from them keeps it off requests that have no business
 * carrying it.
 */
Deno.test("endpointTakesUser: only the recipient-addressing endpoints get the user key", () => {
  assertEquals(endpointTakesUser("https://api.pushover.net/1/messages.json"), true);
  assertEquals(endpointTakesUser("https://api.pushover.net/1/users/validate.json"), true);
  assertEquals(endpointTakesUser("https://api.pushover.net/1/sounds.json"), false);
  assertEquals(endpointTakesUser("https://api.pushover.net/1/apps/limits.json"), false);
});

Deno.test("injectCredential: adds token and user to a form-encoded body", () => {
  const out = injectCredential("message=hi", { token: TOKEN, user: USER }, true);
  const params = new URLSearchParams(out);
  assertEquals(params.get("message"), "hi");
  assertEquals(params.get("token"), TOKEN);
  assertEquals(params.get("user"), USER);
});

/**
 * An action may name a different recipient. The Connection's key is the
 * *default*, not an override of a deliberate choice.
 */
Deno.test("injectCredential: an action's explicit user survives, the token never does", () => {
  const out = injectCredential("message=hi&user=OTHERKEY", { token: TOKEN, user: USER }, true);
  const params = new URLSearchParams(out);
  assertEquals(params.get("user"), "OTHERKEY");
  assertEquals(params.get("token"), TOKEN);

  // A token an action somehow supplied must not win over the Connection's.
  const forced = injectCredential("token=SNEAKY", { token: TOKEN, user: USER }, true);
  assertEquals(new URLSearchParams(forced).get("token"), TOKEN);
});

Deno.test("injectCredential: strips the user key for application-scoped endpoints", () => {
  const out = injectCredential("user=LEAKED", { token: TOKEN, user: USER }, false);
  const params = new URLSearchParams(out);
  assertEquals(params.get("user"), null);
  assertEquals(params.get("token"), TOKEN);
});

/**
 * The mechanism that makes this app possible: `sign` rewrites the BODY, not a
 * header, because that is where Pushover takes its credentials.
 */
Deno.test("sign: injects into the body of a POST and sets the form content-type", () => {
  const signed = signWith({
    url: "https://api.pushover.net/1/messages.json",
    method: "POST",
    headers: {},
    body: "message=hello",
  });
  const params = new URLSearchParams(signed.body!);
  assertEquals(params.get("message"), "hello");
  assertEquals(params.get("token"), TOKEN);
  assertEquals(params.get("user"), USER);
  assertEquals(signed.headers["content-type"], "application/x-www-form-urlencoded");
});

/** A GET carries its parameters in the query string, so `sign` has to look there. */
Deno.test("sign: injects into the query string of a GET, leaving the body alone", () => {
  const signed = signWith({
    url: "https://api.pushover.net/1/sounds.json",
    method: "GET",
    headers: {},
    body: null,
  });
  const url = new URL(signed.url);
  assertEquals(url.pathname, "/1/sounds.json");
  assertEquals(url.searchParams.get("token"), TOKEN);
  // Application-scoped: the recipient's key has no business here.
  assertEquals(url.searchParams.get("user"), null);
  assertEquals(signed.body, null);
});

Deno.test("sign: an empty POST body still gets the credential", () => {
  const signed = signWith({
    url: "https://api.pushover.net/1/messages.json",
    method: "POST",
    headers: {},
    body: null,
  });
  assertEquals(new URLSearchParams(signed.body!).get("token"), TOKEN);
});

/**
 * The probe is pinned by path. It is the only endpoint that checks BOTH halves
 * of the credential — the application-scoped ones would let a wrong user key
 * through.
 */
Deno.test("test: probes users/validate, the only endpoint that checks both halves", async () => {
  const { ctx, calls } = mockCtx([{ body: ok({ devices: ["iphone", "desktop"] }) }]);
  const result = await appToken.test!(
    { credential: { token: TOKEN, user: USER } } as never,
    ctx,
  );
  assertEquals(result, { ok: true });
  assertEquals(PROBE_PATH, "/1/users/validate.json");
  assertEquals(calls[0].url, `https://api.pushover.net${PROBE_PATH}`);
  assertEquals(calls[0].method, "POST");
  const sent = new URLSearchParams(calls[0].body!);
  assertEquals(sent.get("token"), TOKEN);
  assertEquals(sent.get("user"), USER);
});

Deno.test("test: rejects a malformed key without making a request", async () => {
  const { ctx, calls } = mockCtx([]);
  const badToken = await appToken.test!(
    { credential: { token: "short", user: USER } } as never,
    ctx,
  );
  assertEquals(badToken.ok, false);
  assert(badToken.message!.includes("application token"), badToken.message);

  const badUser = await appToken.test!(
    { credential: { token: TOKEN, user: "me@example.com" } } as never,
    ctx,
  );
  assertEquals(badUser.ok, false);
  assert(badUser.message!.includes("not your email address"), badUser.message);
  assertEquals(calls.length, 0);
});

/**
 * "Which of the two did I paste wrong?" is the only question worth answering at
 * connect time, and Pushover marks the offending field by name.
 */
Deno.test("test: names which half was rejected", async () => {
  const badToken = mockCtx([{
    status: 400,
    body: failure(["application token is invalid"], { token: "invalid" }),
  }]);
  const t = await appToken.test!(
    { credential: { token: TOKEN, user: USER } } as never,
    badToken.ctx,
  );
  assertEquals(t.ok, false);
  assert(t.message!.includes("application token was rejected"), t.message);

  const badUser = mockCtx([{
    status: 400,
    body: failure(["user identifier is invalid"], { user: "invalid" }),
  }]);
  const u = await appToken.test!(
    { credential: { token: TOKEN, user: USER } } as never,
    badUser.ctx,
  );
  assertEquals(u.ok, false);
  assert(u.message!.includes("user or group key was rejected"), u.message);
});

/**
 * A key with no active device is valid and delivers nothing — which is exactly
 * what the vendor says this endpoint exists to catch.
 */
Deno.test("test: a valid key with no active device is not usable", async () => {
  const { ctx } = mockCtx([{ body: ok({ devices: [] }) }]);
  const result = await appToken.test!({ credential: { token: TOKEN, user: USER } } as never, ctx);
  assertEquals(result.ok, false);
  assert(result.message!.includes("no active device"), result.message);
});

Deno.test("afterConnect: records the device count and nothing else", async () => {
  const { ctx } = mockCtx([{ body: ok({ devices: ["iphone", "work-laptop"] }) }]);
  const display = await appToken.afterConnect!(
    { credential: { token: TOKEN, user: USER } } as never,
    ctx,
  );
  assertEquals(display, { user: { devices: 2 } });
});

/**
 * Device names are the recipient's own hardware, and the display block is shown
 * wherever the Connection is. A count answers the useful question without
 * listing them — and neither key may ever appear.
 */
Deno.test("afterConnect: publishes no device names and neither credential", async () => {
  const { ctx } = mockCtx([{ body: ok({ devices: ["ada-iphone"] }) }]);
  const display = await appToken.afterConnect!(
    { credential: { token: TOKEN, user: USER } } as never,
    ctx,
  );
  const json = JSON.stringify(display);
  assert(!json.includes("ada-iphone"), "republished a device name");
  assert(!json.includes(TOKEN), "republished the token");
  assert(!json.includes(USER), "republished the user key");
});

Deno.test("afterConnect: a failed lookup publishes nothing rather than guessing", async () => {
  const { ctx } = mockCtx([{ status: 400, body: failure(["nope"]) }]);
  assertEquals(
    await appToken.afterConnect!({ credential: { token: TOKEN, user: USER } } as never, ctx),
    {},
  );
});
