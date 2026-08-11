import { assert, assertEquals, assertRejects } from "@std/assert";
import {
  BASE_URL,
  formatPushoverError,
  limitsFromHeaders,
  PushoverClient,
  toForm,
  truncate,
} from "../../lib/client.ts";
import { failure, mockPushoverCtx, ok } from "../_helpers.ts";

/**
 * The base is the bare origin and every path carries its own `/1/…`, matching
 * the URLs the vendor documents literally. Folding the version into the base
 * once produced `/1/1/messages.json`, which is why the paths are the single
 * source of truth for it.
 */
Deno.test("BASE_URL: the one fixed host, since there is no self-hosted Pushover", () => {
  assertEquals(BASE_URL, "https://api.pushover.net");
});

Deno.test("toForm: drops unset values and encodes booleans as Pushover's 1/0", () => {
  assertEquals(
    toForm({ a: "x", b: undefined, c: null, d: "", e: true, f: false, g: 0, h: 12 }),
    { a: "x", e: "1", f: "0", g: "0", h: "12" },
  );
});

Deno.test("limitsFromHeaders: reads the X-Limit-App-* trio", () => {
  const headers = new Headers({
    "x-limit-app-limit": "10000",
    "x-limit-app-remaining": "7496",
    "x-limit-app-reset": "1393653600",
  });
  assertEquals(limitsFromHeaders(headers), { limit: 10000, remaining: 7496, reset: 1393653600 });
});

Deno.test("limitsFromHeaders: absent or unreadable headers become undefined", () => {
  assertEquals(limitsFromHeaders(new Headers()), {
    limit: undefined,
    remaining: undefined,
    reset: undefined,
  });
  assertEquals(
    limitsFromHeaders(new Headers({ "x-limit-app-remaining": "lots" })).remaining,
    undefined,
  );
});

Deno.test("truncate: leaves short text alone and reports what it cut", () => {
  assertEquals(truncate("short", 10), "short");
  assert(truncate("x".repeat(50), 10).includes("50 bytes truncated"));
});

/**
 * The `errors` array names the offending parameters and `request` is the id the
 * vendor asks for by name. Both must survive.
 */
Deno.test("formatPushoverError: surfaces the errors array and the request id", () => {
  const msg = formatPushoverError(
    400,
    "/1/messages.json",
    failure(["user identifier is invalid"]) as never,
    "",
  );
  assert(msg.includes("400"), msg);
  assert(msg.includes("user identifier is invalid"), msg);
  assert(msg.includes("5042853c-402d-4a18-abcb-168734a801de"), msg);
});

/**
 * The vendor's own guidance, carried into the message: a 4xx here is permanent.
 * "Repeating your same request will not work, no matter how many times you retry
 * it."
 */
Deno.test("formatPushoverError: a 4xx says plainly that retrying cannot help", () => {
  const msg = formatPushoverError(400, "/1/messages.json", failure(["bad"]) as never, "");
  assert(msg.includes("retrying the same request cannot succeed"), msg);
});

Deno.test("formatPushoverError: a 5xx carries no such advice — it is worth retrying", () => {
  const msg = formatPushoverError(500, "/1/messages.json", failure(["oops"]) as never, "");
  assert(!msg.includes("cannot succeed"), msg);
});

Deno.test("formatPushoverError: falls back to the raw body when it is not JSON", () => {
  const msg = formatPushoverError(502, "/1/messages.json", null, "<html>bad gateway</html>");
  assert(msg.includes("502"), msg);
  assert(msg.includes("bad gateway"), msg);
});

Deno.test("client: POSTs url-encoded form fields to the fixed host", async () => {
  const { ctx, calls } = mockPushoverCtx([{ body: ok() }]);
  await new PushoverClient(ctx).request("/1/messages.json", {
    method: "POST",
    form: { message: "hello there", title: "Hi" },
  });
  assertEquals(calls[0].method, "POST");
  assertEquals(calls[0].url, "https://api.pushover.net/1/messages.json");
  assertEquals(calls[0].headers["content-type"], "application/x-www-form-urlencoded");
  assertEquals(calls[0].body, "message=hello+there&title=Hi");
});

/** A GET carries its parameters in the query string — which is where `sign` puts the token. */
Deno.test("client: a GET puts its parameters in the query string, with no body", async () => {
  const { ctx, calls } = mockPushoverCtx([{ body: ok({ sounds: {} }) }]);
  await new PushoverClient(ctx).request("/1/sounds.json", { method: "GET" });
  assertEquals(calls[0].method, "GET");
  assertEquals(calls[0].url, "https://api.pushover.net/1/sounds.json");
  assertEquals(calls[0].body, null);
  assertEquals(calls[0].headers["content-type"], undefined);
});

/**
 * The 200 that means failure. Pushover's contract is `status: 1` or it did not
 * happen, whatever the status line said.
 */
Deno.test("client: a 200 with status 0 is an error, not a success", async () => {
  const { ctx } = mockPushoverCtx([{
    status: 200,
    body: failure(["application token is invalid"]),
  }]);
  await assertRejects(
    async () => {
      await new PushoverClient(ctx).request("/1/messages.json", { method: "POST", form: {} });
    },
    Error,
    "application token is invalid",
  );
});

Deno.test("client: a 4xx throws with the vendor's field-level errors", async () => {
  const { ctx } = mockPushoverCtx([{ status: 400, body: failure(["message cannot be blank"]) }]);
  await assertRejects(
    async () => {
      await new PushoverClient(ctx).request("/1/messages.json", { method: "POST", form: {} });
    },
    Error,
    "message cannot be blank",
  );
});

/** The quota headers ride on every message response, so they are folded in. */
Deno.test("client: folds the rate-limit headers into the result when present", async () => {
  const { ctx } = mockPushoverCtx([{
    body: ok(),
    headers: {
      "content-type": "application/json",
      "x-limit-app-limit": "10000",
      "x-limit-app-remaining": "9994",
      "x-limit-app-reset": "1393653600",
    },
  }]);
  const out = await new PushoverClient(ctx).request("/1/messages.json", { method: "POST" });
  assertEquals((out as { limits?: unknown }).limits, {
    limit: 10000,
    remaining: 9994,
    reset: 1393653600,
  });
});

Deno.test("client: omits the limits key entirely when the headers are absent", async () => {
  const { ctx } = mockPushoverCtx([{ body: ok() }]);
  const out = await new PushoverClient(ctx).request("/1/messages.json", { method: "POST" });
  assert(!("limits" in out), JSON.stringify(out));
});

/** The action worker must never see or build a credential. */
Deno.test("client: sends no token or user — that is sign's job", async () => {
  const { ctx, calls } = mockPushoverCtx([{ body: ok() }]);
  await new PushoverClient(ctx).request("/1/messages.json", {
    method: "POST",
    form: { message: "x" },
  });
  assert(!calls[0].body!.includes("token="), calls[0].body!);
  assert(!calls[0].body!.includes("user="), calls[0].body!);
  assertEquals(calls[0].headers["authorization"], undefined);
});
