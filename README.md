# SweetByte
### SOEN 343 Project 
## Overview 
**SweetByte** is an online dessert ordering and delivery platform that connects customers with restaurants and couriers. The platform allows customers to browse menus, place orders, and pay for their meals, restaurants to manage their menus and orders, couriers to handle deliveries, and operators to oversee and manage overall platform activity.

## Authors 

| Name                      | Student Number | GitHub username |
|---------------------------|----------------|-----------------|
| Nadine Seba (team leader) |    40300673    | Nadine-seb      |
| Rada Arsan                |    40370448    | cvwetw          |
| Idriss Benabdessadek      |    40248720    | idrissben03     |
| Gerom Fazaa               |    40274250    | jeromefazaa     |
| Octavian Mihai            |    40304833    | Octavian-Mihai  |
| Gianfranco Morabito       |    40312184    | gfmor1          |

## Tech Stack

| Part | Stack | Dir |
|---|---|---|
| Frontend | Next.js | `FrontEnd/` |
| Backend | Spring Boot (Java 21), Maven | `backend/` |
| Database | Supabase Postgres | — |

## Build & run locally

Requires Java 21 and Node 22.

1. From the repo root, run the script for your OS:

   | OS | Command |
   |---|---|
   | macOS / Linux | `scripts/build-local.sh` |
   | Windows (PowerShell) | `scripts\build-local.ps1` |

   Both build and run the backend on :8080 and the frontend on :3001. Add `--build-only` (`-BuildOnly` on Windows) to build without running.
   On Windows you can also use Git Bash or WSL with the `.sh` script. If PowerShell blocks the script, run `powershell -ExecutionPolicy Bypass -File scripts\build-local.ps1`.
2. Verify: `http://localhost:8080/api/events` returns `[]`, then open `http://localhost:3001`.

## Configuration

Non-secret config is in `application.properties`. Secrets are never committed: put them in
`backend/src/main/resources/application-local.properties` (gitignored, loaded automatically):

```properties
spring.datasource.password=<Supabase DB password>
```

Login is handled by the backend: passwords are stored as BCrypt hashes in `users.password_hash`,
and `/api/auth/login` and `/api/auth/register/*` return a JWT signed with `app.jwt.secret`
(`JWT_SECRET` env var, 32+ characters). Without it a random key is used at each start, which logs
everyone out on restart. Accounts created in the old Supabase Auth have no password here: the seeder
gives seeded accounts their `demo123` password; other old accounts must register again.
The frontend's address search needs `NEXT_PUBLIC_GEOAPIFY_API_KEY` in `FrontEnd/.env.local` (see `.env.example`).

- DB uses the Supabase **session pooler** host, because the direct host is IPv6-only.
- `ddl-auto=update` lets Hibernate create the tables on first run. Switch to `validate` once migrations exist.
- `app.cors.allowed-origins` must match the frontend's URL.

## Demo platform

The course demo platform runs `demo/compose.yaml`: `web` (nginx, public) in front of `frontend`
(Next.js) and `backend` (Spring Boot), with a local Postgres `db`. Images are published by
`.github/workflows/publish-demo-images.yml` on every push to `main`. It needs no external service
and no secret. Details: `docs/demo-platform/README.md`.

Demo logins (password `demo123`, created by the seeder at startup):

| Role | Email |
|---|---|
| Customer | `customer@sweetbyte.test` |
| Restaurant owner | `restaurant@sweetbyte.test` (also `owner2` … `owner7@sweetbyte.test`) |
| Courier | `courier@sweetbyte.test` |
| Operator | `operator@sweetbyte.test` |

## Event log

Order and menu-item state changes are recorded as `DomainEvent` rows (`EventService`).
`GET /api/events` returns the latest 100; add `?entityType=Order&entityId=5` for one entity's history.


## Run the published Docker image

The CI publishes the image to GitHub Container Registry (GHCR) on every merge to `main`:
`ghcr.io/gfmor1/sweet_byte`. The image is private, so you have to log in once before pulling it.

### 1. Install and start Docker

| OS | Install |
|---|---|
| macOS | `brew install --cask docker`, then `open -a Docker` |
| Windows | Install [Docker Desktop](https://www.docker.com/products/docker-desktop/), then start it |
| Linux | Install Docker Engine for your distro |

Wait until Docker Desktop shows **Engine running**, then check:

```bash
docker version
```

The output should include a `Server:` section.

### 2. Log in to GHCR (once per machine)

1. On GitHub: **Settings → Developer settings → Personal access tokens → Tokens (classic) → Generate new token**.
   Select only the `read:packages` scope. Copy the token.
2. Log in, using your GitHub username, and paste the token when asked for a password:

   ```bash
   docker login ghcr.io -u <your-github-username>
   ```

   You should see `Login Succeeded`.

> **Never paste the token into a command, a chat or a file.** If it leaks, delete it on GitHub
> and create a new one. You need access to the `gfmor1/Sweet_Byte` repo to pull the image.

### 3. Pull the image

```bash
docker pull ghcr.io/gfmor1/sweet_byte:latest
```

Docker picks the right build for your machine (Intel/AMD or Apple Silicon/ARM).
Other tags: `sha-<short commit>` (a specific commit) and `vX.Y.Z` (releases).

### 4. Run it

```bash
docker run --rm -p 8080:8080 -p 3001:3001 --name sweetbyte ghcr.io/gfmor1/sweet_byte:latest
```

Wait for both lines in the logs: Spring Boot's `Started ... in X seconds` and Next.js `Ready`.

### 5. Check it works

```bash
curl http://localhost:8080/api/events   # backend: returns JSON ([] on a fresh database)
curl -I http://localhost:3001           # frontend: HTTP 200
```

Then open http://localhost:3001.

### 6. Stop it

Press `Ctrl+C`, or run `docker stop sweetbyte` from another terminal.
The container is deleted when it stops (`--rm`). The data is in Supabase, not in the container, so nothing is lost.

### Troubleshooting

| Error | Fix |
|---|---|
| `failed to connect to the docker API at unix:///var/run/docker.sock` | Docker isn't running. Start Docker Desktop (`open -a Docker` on macOS) and wait for **Engine running**. |
| `unauthorized` / `denied` on pull | Not logged in, the token is missing `read:packages`, or your account has no access to the repo. Redo step 2. |
| `no matching manifest for linux/arm64/v8` | The image was built before multi-arch support. Use `docker pull --platform linux/amd64 ...` and add `--platform linux/amd64` to `docker run`. It runs under emulation (slower). |
| `port is already allocated` | Something else is using 8080 or 3001, for example `scripts/build-local.sh`. Stop it first. |
