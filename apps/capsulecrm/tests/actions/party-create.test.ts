import { assertEquals } from "@std/assert";
import { mockCtx } from "../_helpers.ts";
import action from "../../actions/party-create.ts";

Deno.test("party-create: POSTs /parties with a person body", async () => {
  const { ctx, calls } = mockCtx([{ status: 201, body: { party: { id: 100 } } }]);
  const out = await action.execute(
    { type: "person", firstName: "Scott", lastName: "Spacey" },
    ctx,
  );
  assertEquals(calls[0].url, "https://api.capsulecrm.com/api/v2/parties");
  assertEquals(calls[0].method, "POST");
  assertEquals(JSON.parse(calls[0].body!), {
    party: { type: "person", firstName: "Scott", lastName: "Spacey" },
  });
  assertEquals(out, { party: { id: 100 } });
});

Deno.test("party-create: an organisation body carries name instead of firstName/lastName", async () => {
  const { ctx, calls } = mockCtx([{ status: 201, body: { party: { id: 101 } } }]);
  await action.execute({ type: "organisation", name: "Acme INC" }, ctx);
  assertEquals(JSON.parse(calls[0].body!), { party: { type: "organisation", name: "Acme INC" } });
});

Deno.test("party-create: links a person to an organisation by id", async () => {
  const { ctx, calls } = mockCtx([{ status: 201, body: { party: {} } }]);
  await action.execute({ type: "person", firstName: "Jo", organisationId: 1234 }, ctx);
  assertEquals(JSON.parse(calls[0].body!), {
    party: { type: "person", firstName: "Jo", organisation: { id: 1234 } },
  });
});
