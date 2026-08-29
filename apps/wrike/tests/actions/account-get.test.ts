import { assertEquals } from "@std/assert";
import accountGet from "../../actions/account-get.ts";
import { envelope, mockWrikeCtx, pathOf } from "../_helpers.ts";

Deno.test("account-get: GETs /account and returns it verbatim — no secret field to strip", async () => {
  const { ctx, calls } = mockWrikeCtx([
    {
      status: 200,
      body: envelope([{
        id: "A1",
        name: "Acme",
        rootFolderId: "R1",
        recycleBinId: "RB1",
        subscription: { type: "Business", paid: true, userLimit: 50, suspended: false },
      }]),
    },
  ]);
  const out = await accountGet.execute({}, ctx) as {
    id: string;
    rootFolderId: string;
    subscription: { userLimit: number };
  };
  assertEquals(pathOf(calls[0].url), "/api/v4/account");
  assertEquals(out.id, "A1");
  assertEquals(out.rootFolderId, "R1");
  assertEquals(out.subscription.userLimit, 50);
});
