import { assertEquals } from "@std/assert";
import clientList from "../../actions/client-list.ts";
import { API_PATH, mockCtx, pathOf } from "../_helpers.ts";

Deno.test("client-list: GETs the account-level /clients.json and returns the array", async () => {
  const clients = [
    { ClientID: "4a397ccaaa55eb4e6aa1221e1e2d7122", Name: "Client One" },
    { ClientID: "a206def0582eec7dae47d937a4109cb2", Name: "Client Two" },
  ];
  const { ctx, calls } = mockCtx([{ body: clients }]);

  const out = await clientList.execute({}, ctx);

  assertEquals(calls.length, 1);
  assertEquals(calls[0].method, "GET");
  // Account-level: no id in the path.
  assertEquals(pathOf(calls[0].url), `${API_PATH}/clients.json`);
  assertEquals(out, clients);
});

Deno.test("client-list: asks for JSON, because XML is this API's default", async () => {
  const { ctx, calls } = mockCtx([{ body: [] }]);
  await clientList.execute({}, ctx);
  assertEquals(calls[0].headers["accept"], "application/json");
});
