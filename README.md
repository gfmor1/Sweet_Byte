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

   Both build and run the backend on :8080 and the frontend on :3000. Add `--build-only` (`-BuildOnly` on Windows) to build without running.
   On Windows you can also use Git Bash or WSL with the `.sh` script. If PowerShell blocks the script, run `powershell -ExecutionPolicy Bypass -File scripts\build-local.ps1`.
2. Verify: `http://localhost:8080/api/events` returns `[]`, then open `http://localhost:3000`.

## Configuration

All config is hardcoded in `application.properties` (class project, no env vars).

- DB uses the Supabase **session pooler** host, because the direct host is IPv6-only.
- `ddl-auto=update` lets Hibernate create the tables on first run. Switch to `validate` once migrations exist.
- `app.cors.allowed-origins` must match the frontend's URL.

## Event log

Order and menu-item state changes are recorded as `DomainEvent` rows (`EventService`).
`GET /api/events` returns the latest 100; add `?entityType=Order&entityId=5` for one entity's history.
