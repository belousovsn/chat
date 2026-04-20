Status: blocked
Goal: Verify clone-to-run path on machine with Docker available and fix Docker-only issues.
Dependencies: separate machine with Docker.
Required context: repo root, `docker-compose.yml`, `apps/server/Dockerfile`, `README.md`.
Allowed files: root compose, Dockerfile, env docs, startup scripts, small code fixes discovered by container run.
Do not edit: broad unrelated frontend/backend modules unless Docker run proves they are broken.
Start here:
- `docker-compose.yml`
- `apps/server/Dockerfile`
- `README.md`
Acceptance checks:
- `docker compose up --build` succeeds
- app health endpoint responds
- web UI loads
- Mailpit loads
- seeded accounts can sign in
Notes:
- Park this until separate machine is ready.
