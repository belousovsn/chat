import assert from "node:assert/strict";
import { test } from "node:test";
import {
  buildXmppAccount,
  buildXmppStatus,
  linkXmppUsers,
  type XmppRuntimeConfig,
  unlinkXmppUsers,
  upsertXmppUser
} from "./service.js";

const baseRuntime = (): XmppRuntimeConfig => ({
  xmppAdminJid: "xmppadmin@localhost",
  xmppAdminPort: 5443,
  xmppApiBaseUrl: "http://xmpp:5281/api",
  xmppApiPass: "secret",
  xmppApiUser: "xmppapi@localhost",
  xmppClientPort: 5222,
  xmppComposeProfile: "xmpp",
  xmppDomain: "localhost",
  xmppEnabled: true,
  xmppFederationEnabled: false,
  xmppFederationPort: 5269,
  xmppHost: "localhost",
  xmppUserProvisioningEnabled: true,
  xmppUserProvisioningStrict: false
});

test("buildXmppStatus returns disabled thin-slice guidance when xmpp is off", async () => {
  const status = await buildXmppStatus({
    ...baseRuntime(),
    xmppEnabled: false
  });

  assert.equal(status.enabled, false);
  assert.equal(status.metrics.connectedUsers, null);
  assert.match(status.warnings.join(" "), /disabled/i);
});

test("buildXmppStatus reads ejabberd metrics when api is configured", async () => {
  const calls: string[] = [];
  const fetchImpl: typeof fetch = (async (input) => {
    const url = String(input);
    calls.push(url);

    const command = url.split("/").at(-1);
    const payload = command === "connected_users_number"
      ? 3
      : command === "incoming_s2s_number"
        ? 1
        : command === "outgoing_s2s_number"
          ? 2
          : [{
              connection: "c2s",
              ip: "127.0.0.1",
              jid: "alice@localhost/psi",
              node: "ejabberd@localhost",
              port: 5222,
              priority: 0,
              resource: "psi",
              status: "chat",
              statustext: "",
              uptime: 42
            }];

    return new Response(JSON.stringify(payload), {
      headers: { "Content-Type": "application/json" },
      status: 200
    });
  }) as typeof fetch;

  const status = await buildXmppStatus(baseRuntime(), fetchImpl);

  assert.equal(status.metrics.connectedUsers, 3);
  assert.equal(status.metrics.incomingS2S, 1);
  assert.equal(status.metrics.outgoingS2S, 2);
  assert.equal(status.metrics.sampleSessions[0]?.jid, "alice@localhost/psi");
  assert.equal(calls.length, 4);
});

test("buildXmppAccount reports current user JID and lookup result", async () => {
  const fetchImpl: typeof fetch = (async () => (
    new Response("0", {
      headers: { "Content-Type": "application/json" },
      status: 200
    })
  )) as typeof fetch;

  const account = await buildXmppAccount(baseRuntime(), "alice", fetchImpl);

  assert.equal(account.jid, "alice@localhost");
  assert.equal(account.exists, true);
  assert.equal(account.passwordManaged, true);
});

test("upsertXmppUser registers when account does not exist", async () => {
  const commands: Array<{ body: string; url: string }> = [];
  const fetchImpl: typeof fetch = (async (input, init) => {
    const url = String(input);
    commands.push({
      body: String(init?.body ?? ""),
      url
    });

    const payload = url.endsWith("/check_account") ? "1" : "\"\"";
    return new Response(payload, {
      headers: { "Content-Type": "application/json" },
      status: 200
    });
  }) as typeof fetch;

  const result = await upsertXmppUser(baseRuntime(), "alice", "secret-pass", fetchImpl);

  assert.equal(result.created, true);
  assert.equal(commands.length, 2);
  assert.match(commands[1]?.url ?? "", /register$/);
  assert.match(commands[1]?.body ?? "", /"password":"secret-pass"/);
});

test("upsertXmppUser changes password when account already exists", async () => {
  const commands: string[] = [];
  const fetchImpl: typeof fetch = (async (input) => {
    const url = String(input);
    commands.push(url);

    const payload = url.endsWith("/check_account") ? "0" : "\"\"";
    return new Response(payload, {
      headers: { "Content-Type": "application/json" },
      status: 200
    });
  }) as typeof fetch;

  const result = await upsertXmppUser(baseRuntime(), "alice", "new-pass", fetchImpl);

  assert.equal(result.created, false);
  assert.equal(commands.at(-1)?.endsWith("/change_password"), true);
});

test("linkXmppUsers and unlinkXmppUsers update both roster directions", async () => {
  const commands: string[] = [];
  const fetchImpl: typeof fetch = (async (input) => {
    commands.push(String(input));
    return new Response("\"\"", {
      headers: { "Content-Type": "application/json" },
      status: 200
    });
  }) as typeof fetch;

  await linkXmppUsers(baseRuntime(), "alice", "bob", fetchImpl);
  await unlinkXmppUsers(baseRuntime(), "alice", "bob", fetchImpl);

  assert.deepEqual(commands.map((url) => url.split("/").at(-1)), [
    "add_rosteritem",
    "add_rosteritem",
    "delete_rosteritem",
    "delete_rosteritem"
  ]);
});
