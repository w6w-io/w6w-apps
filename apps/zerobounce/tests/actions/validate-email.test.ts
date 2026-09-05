import { assertEquals } from "@std/assert";
import { mockCtx } from "../_helpers.ts";
import action from "../../actions/validate-email.ts";

Deno.test("validate-email: GETs /v2/validate with email and ip_address query params", async () => {
  const body = {
    address: "a@example.com",
    status: "valid",
    sub_status: "",
    free_email: false,
    mx_found: "true",
  };
  const { ctx, calls } = mockCtx([{ body }]);
  const result = await action.execute!({ email: "a@example.com", ipAddress: "1.2.3.4" }, ctx);

  const url = new URL(calls[0].url);
  assertEquals(url.origin, "https://api.zerobounce.net");
  assertEquals(url.pathname, "/v2/validate");
  assertEquals(url.searchParams.get("email"), "a@example.com");
  assertEquals(url.searchParams.get("ip_address"), "1.2.3.4");
  assertEquals(calls[0].method, "GET");
  assertEquals(result, body);
});

Deno.test("validate-email: omits ip_address when not supplied", async () => {
  const { ctx, calls } = mockCtx([{ body: { address: "a@example.com", status: "valid" } }]);
  await action.execute!({ email: "a@example.com" }, ctx);
  const url = new URL(calls[0].url);
  assertEquals(url.searchParams.has("ip_address"), false);
});

Deno.test("validate-email: honors the region param against the EU host", async () => {
  const { ctx, calls } = mockCtx([{ body: { address: "a@example.com", status: "valid" } }]);
  await action.execute!({ email: "a@example.com", region: "eu" }, ctx);
  assertEquals(new URL(calls[0].url).host, "api-eu.zerobounce.net");
});

Deno.test("validate-email: is a read action scoped to the email resource", () => {
  assertEquals(action.type, "read");
  assertEquals(action.resource, "email");
  assertEquals(action.params?.find((p) => p.key === "email")?.required, true);
  assertEquals(action.params?.find((p) => p.key === "ipAddress")?.required, undefined);
});
