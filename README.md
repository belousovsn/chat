# Classic Chat MVP

Classic web chat application with:

- email/password registration and login
- public and private rooms
- direct chats between friends
- friend requests and user blocking
- online / AFK / offline presence over Socket.IO
- persistent messages with reply/edit/delete
- file and image uploads stored on local disk
- room moderation, admins, bans, and session management

## Run

Requirements:

- Docker Desktop or Docker Engine with Compose v2

Start:

```bash
docker compose up --build
```

Open:

- App: `http://localhost:8080`
- Mailpit: `http://localhost:8025`

The app container runs migrations and demo seed data on startup.

## Demo Accounts

- `alice@example.com` / `password123`
- `bob@example.com` / `password123`
- `carol@example.com` / `password123`

## Notes

- Attachments persist in Docker volume `uploads`.
- Password reset emails are visible in Mailpit.
- Presence is single-node, in-memory aggregation by active browser tabs.
- Progress log lives in [docs/progress-history.md](/c:/Users/sbelousov/Documents/Projects/DA_hackaton_chat/docs/progress-history.md).
