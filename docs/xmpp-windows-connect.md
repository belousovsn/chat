# Windows XMPP Connect

Short manual for connecting a Windows Jabber client to production.

Use these exact values:

- JID: `demoa@xmpp.memdecks.com`
- password: `TSAbLDf1jn_1mperAAJ7qR2b`
- host: `xmpp.memdecks.com`
- port: `5222`
- security: `STARTTLS`
- proxy: `none`

Second demo account for message tests:

- JID: `demob@xmpp.memdecks.com`
- password: `SOh9FI1xTzokyUwvC8hirHn9`

## Gajim Steps

1. Open Gajim.
2. Choose to log into an existing XMPP account.
3. Enter the full JID `demoa@xmpp.memdecks.com`.
4. Enter the password.
5. Open the advanced connection settings before finishing.
6. Set host to `xmpp.memdecks.com`.
7. Set port to `5222`.
8. Set security or encryption mode to `STARTTLS`.
9. Make sure proxy is disabled.
10. Finish setup and connect.

Expected certificate details:

- common name: `xmpp.memdecks.com`
- issuer: `Let's Encrypt`

## If It Stays On Connecting

- Use the full JID, not just `demoa`.
- Use `xmpp.memdecks.com`, not `chat.memdecks.com`.
- Use `STARTTLS`, not `Direct TLS`, `Legacy SSL`, `SSL/TLS`, `BOSH`, or `WebSocket`.
- If you first created the account with wrong security settings, delete that account in the client and create it again from scratch.
- Make sure Windows date and time are correct.
- If the client shows a certificate prompt, the host name should be `xmpp.memdecks.com`.

Quick network check in PowerShell:

```powershell
Test-NetConnection xmpp.memdecks.com -Port 5222
```

What `kinzul` and `da_test` mean:

- those usernames are in `XMPP_ADMIN_USERS` for the web app dashboard
- they are not XMPP accounts unless they were also created inside `ejabberd`

Presence note:

- direct messages can work even when contacts still look offline
- for live online/offline status, the users usually need a roster subscription relationship
- in this repo that can be created from the server with [ops/scripts/xmpp-link-users.sh](/C:/Users/sbelousov/Documents/Projects/DA_hackaton_chat/ops/scripts/xmpp-link-users.sh)

Current server-side validation on 2026-04-22:

- TCP on `5222` is reachable from the public internet
- STARTTLS is advertised
- the certificate for `xmpp.memdecks.com` validates successfully
- demo account login succeeds from a Windows machine using the exact values above
