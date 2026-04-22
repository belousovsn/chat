Status: ready on Docker-capable machine; blocked on this machine if Docker unavailable
Goal: Verify clone-to-run Docker path end to end and fix Docker-only issues with minimal unrelated churn.
Dependencies: machine with Docker Desktop or Docker Engine + Compose v2.
Required context: repo root only.
Allowed files: `docker-compose.yml`, Dockerfiles, startup scripts, `.env.example`, `README.md`, and small code fixes only if container run proves they are necessary.
Do not edit: broad unrelated frontend/backend modules unless Docker run reproduces a real break there.
Start here:
- `docker-compose.yml`
- `README.md`
- `apps/server/Dockerfile`
- `apps/server/src/index.ts`
- `apps/server/src/app.ts`
Focus:
- run `docker compose up --build`
- verify app on `http://localhost:8080`
- verify Mailpit on `http://localhost:8025`
- verify `GET /api/health`
- verify seeded accounts can sign in, at minimum `alice@example.com` / `password123`
- if practical, verify one message send and one upload path inside Docker flow
- fix only Docker-specific defects discovered during the run
Acceptance checks:
- `docker compose up --build` succeeds without manual patching inside containers
- health endpoint responds from host
- web UI loads from host
- Mailpit loads from host
- seeded sign-in works from host
- if code/docs changed, explain exact Docker-only defect fixed
Notes:
- If Docker is absent on the machine, stop immediately and report environment blocker instead of attempting local non-Docker substitutes.
- Prefer narrow fixes in startup/config/docs before touching feature code.
