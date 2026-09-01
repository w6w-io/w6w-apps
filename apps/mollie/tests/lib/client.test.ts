import { assertEquals, assertRejects } from "@std/assert";
import {
  compact,
  formatMollieError,
  MollieClient,
  truncate,
  unwrapList,
} from "../../lib/client.ts";
import { errorBody, list, mockCtx, pathOf } from "../_helpers.ts";

Deno.test("compact: drops undefined/null/empty-string, keeps false and 0", () => {
  assertEquals(
    compact({ a: undefined, b: null, c: "", d: false, e: 0, f: "x" }),
    { d: false, e: 0, f: "x" },
  );
});

Deno.test("truncate: passes short text through untouched", () => {
  assertEquals(truncate("short"), "short");
});

Deno.test("truncate: caps long text and states the omitted byte count", () => {
  const long = "x".repeat(700);
  const out = truncate(long, 10);
  assertEquals(out.startsWith("xxxxxxxxxx"), true);
  assertEquals(out.includes("700 bytes truncated"), true);
});

Deno.test("formatMollieError: reads {status,title,detail,field}", () => {
  const msg = formatMollieError(
    422,
    "POST",
    "/payments",
    JSON.stringify({
      status: 422,
      title: "Unprocessable Entity",
      detail: "Currency not supported",
      field: "amount.currency",
    }),
  );
  assertEquals(msg.includes("422 Unprocessable Entity"), true);
  assertEquals(msg.includes("Currency not supported"), true);
  assertEquals(msg.includes("field: amount.currency"), true);
});

Deno.test("formatMollieError: falls back to the raw body when it isn't the Mollie error shape", () => {
  const msg = formatMollieError(502, "GET", "/payments", "<html>Bad Gateway</html>");
  assertEquals(msg.includes("502"), true);
  assertEquals(msg.includes("<html>Bad Gateway</html>"), true);
});

Deno.test("unwrapList: extracts _embedded.<key>, defaulting to []", () => {
  assertEquals(unwrapList(list("payments", [{ id: "tr_1" }]), "payments"), [{ id: "tr_1" }]);
  assertEquals(unwrapList({}, "payments"), []);
});

Deno.test("MollieClient.get: builds the URL under https://api.mollie.com/v2 and drops empty query values", async () => {
  const { ctx, calls } = mockCtx([{ body: { id: "tr_1" } }]);
  await new MollieClient(ctx).get("/payments/tr_1", { testmode: undefined, limit: 5 });

  assertEquals(calls[0].url, "https://api.mollie.com/v2/payments/tr_1?limit=5");
  assertEquals(calls[0].method, "GET");
  assertEquals(calls[0].headers["accept"], "application/json");
});

Deno.test("MollieClient.post: JSON-encodes the body and sets content-type", async () => {
  const { ctx, calls } = mockCtx([{ status: 201, body: { id: "tr_1" } }]);
  await new MollieClient(ctx).post("/payments", { description: "hi" });

  assertEquals(calls[0].method, "POST");
  assertEquals(calls[0].headers["content-type"], "application/json");
  assertEquals(JSON.parse(calls[0].body!), { description: "hi" });
});

Deno.test("MollieClient: a non-ok response throws with the formatted Mollie error", async () => {
  const { ctx } = mockCtx([
    { status: 404, body: errorBody(404, "Not Found", "No payment exists with token tr_x.") },
  ]);
  await assertRejects(
    () => new MollieClient(ctx).get("/payments/tr_x"),
    Error,
    "No payment exists with token tr_x.",
  );
});

Deno.test("MollieClient: a 204 with no body resolves to undefined, not a JSON parse error", async () => {
  const { ctx, calls } = mockCtx([{ status: 204 }]);
  const out = await new MollieClient(ctx).delete("/payments/tr_1");
  assertEquals(out, undefined);
  assertEquals(pathOf(calls[0].url), "/v2/payments/tr_1");
});
