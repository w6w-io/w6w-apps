import { assertEquals, assertRejects } from "@std/assert";
import { compact, formatSenderError, SenderClient, toList } from "../../lib/client.ts";
import { API_ROOT, errorBody, mockCtx } from "../_helpers.ts";

Deno.test("SenderClient.data unwraps a top-level data key", async () => {
  const { ctx } = mockCtx([{ body: { data: { id: "a1" } } }]);
  const out = await new SenderClient(ctx).data("/groups/a1");
  assertEquals(out, { id: "a1" });
});

Deno.test("SenderClient.data returns the body verbatim when there is no data key", async () => {
  const { ctx } = mockCtx([{ body: { message: "Selected subscribers will be deleted shortly" } }]);
  const out = await new SenderClient(ctx).data("/subscribers", { method: "DELETE" });
  assertEquals(out, { message: "Selected subscribers will be deleted shortly" });
});

Deno.test("SenderClient builds the URL against api.sender.net/v2", async () => {
  const { ctx, calls } = mockCtx([{ body: { data: [] } }]);
  await new SenderClient(ctx).data("/groups");
  assertEquals(calls[0].url, `${API_ROOT}/groups`);
});

Deno.test("SenderClient array query params use repeated key[] entries", async () => {
  const { ctx, calls } = mockCtx([{ body: { data: [] } }]);
  await new SenderClient(ctx).json("/campaigns", { query: { status: ["DRAFT", "SENT"] } });
  const url = new URL(calls[0].url);
  assertEquals(url.searchParams.getAll("status[]"), ["DRAFT", "SENT"]);
});

Deno.test("SenderClient throws a formatted error on a non-2xx response", async () => {
  const { ctx } = mockCtx([{
    status: 422,
    body: errorBody("The given data was invalid.", { email: ["Required value, email"] }),
  }]);
  await assertRejects(
    () => new SenderClient(ctx).data("/subscribers", { method: "POST", body: {} }),
    Error,
    "The given data was invalid.",
  );
});

Deno.test("formatSenderError includes field-level errors", () => {
  const raw = JSON.stringify({
    message: "The given data was invalid.",
    errors: { email: ["Required value, email"] },
  });
  const msg = formatSenderError(422, "POST", "/v2/subscribers", raw);
  assertEquals(msg.includes("email: Required value, email"), true);
});

Deno.test("compact drops undefined/null/empty-string but keeps false and 0", () => {
  const out = compact({ a: undefined, b: null, c: "", d: false, e: 0, f: "x" });
  assertEquals(out, { d: false, e: 0, f: "x" });
});

Deno.test("toList normalises a comma-separated string and an array the same way", () => {
  assertEquals(toList("a, b,c"), ["a", "b", "c"]);
  assertEquals(toList(["a", "b"]), ["a", "b"]);
  assertEquals(toList(undefined), undefined);
  assertEquals(toList(""), undefined);
});
