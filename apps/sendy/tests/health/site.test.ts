import { assertEquals } from "@std/assert";
import { mockCtx } from "../_helpers.ts";
import site from "../../health/site.ts";

const conn = { display: { baseUrl: "https://example.com/sendy" } };

Deno.test("site: ok on the documented keyless rejection", async () => {
  const { ctx, calls } = mockCtx([{ body: "API key not passed" }], conn);
  const result = await site.check!({}, ctx);
  assertEquals(result.state, "ok");
  assertEquals(calls[0].url, "https://example.com/sendy/api/brands/get-brands.php");
  const body = new URLSearchParams(calls[0].body ?? "");
  assertEquals(body.get("api_key"), null, "the site check must not sign the request");
});

Deno.test("site: down on an unrecognised body", async () => {
  const { ctx } = mockCtx([{ body: "<!doctype html>" }], conn);
  const result = await site.check!({}, ctx);
  assertEquals(result.state, "down");
});

Deno.test("site: down on a non-2xx status", async () => {
  const { ctx } = mockCtx([{ status: 500, body: "" }], conn);
  const result = await site.check!({}, ctx);
  assertEquals(result.state, "down");
});

Deno.test("site: unknown when the connection records no installation URL", async () => {
  const { ctx } = mockCtx([]);
  const result = await site.check!({}, ctx);
  assertEquals(result.state, "unknown");
});
