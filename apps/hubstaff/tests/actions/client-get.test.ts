import { assertEquals } from "@std/assert";
import { envelope, mockCtx, pathOf } from "../_helpers.ts";
import action from "../../actions/client-get.ts";

Deno.test("client-get: GETs /v2/clients/{client_id}", async () => {
  const body = envelope("client", { id: 3, name: "Big Corp", emails: ["ap@example.com"] });
  const { ctx, calls } = mockCtx([{ status: 200, body }]);
  const result = await action.execute!({ client_id: 3 }, ctx) as typeof body;

  assertEquals(pathOf(calls[0].url), "/v2/clients/3");
  assertEquals(result.client.emails, ["ap@example.com"]);
});
