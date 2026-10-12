# Employee Management System — Elasticsearch Primary Datastore Architecture

## 1. Architectural Overview

The Employee Management System has been fully migrated from MySQL/JPA to **Elasticsearch 9.4.5** as its primary and authoritative datastore:

- **Frontend**: Angular 21 (Signals, standalone components, Lucide icons, responsive sidebar, strict UUID typing).
- **Backend**: Spring Boot (v4.1.1) running Java 21 with no Lombok.
- **Primary Datastore**: Elasticsearch 9.4.5 Docker container (`http://localhost:9200`).
- **Security & RBAC**: JWT-based authentication with BCrypt password hashing, role enforcement (`ROLE_ADMIN`, `ROLE_EMP`), strict user-employee ownership verification, and salary masking.
- **Concurrency & Integrity**: Atomic admission barrier, 409 conflict-driven email reservations, and a durable per-entity mutation journal.
- **MySQL Decoupling**: All regular application runtime persistence beans (`AuthService`, `CustomUserDetailsService`, `EmployeeService`) operate purely against Elasticsearch. Normal runtime configuration excludes MySQL and JPA autoconfiguration.

---

## 2. Elasticsearch Data Model & Indices

| Index / Alias | Entity | Primary ID | Key Characteristics |
|---|---|---|---|
| `employees` | `EmployeeDocument` | UUID (String) | Primary employee directory; scaledFloat salary with 2 decimal precision; search analyzer |
| `users` | `UserDocument` | UUID (String) | User accounts with BCrypt password hashes, roles, and creation timestamps |
| `user_emails` | `EmailReservationDocument` | Normalized Email | Atomic reservation using `OpType.Create` with 409 conflict detection |
| `mutation_journal` | `MutationJournalDocument` | UUID `opId` | Durable mutation journal with monotonic sequence and per-entity ordering |

---

## 3. Security, RBAC & Ownership Model

1. **Authentication**: BCrypt hashed passwords, JWT token issue/validate on `/api/auth/login`. Passwords are never stored in plaintext or exposed in API responses.
2. **Registration**: `/api/auth/register` creates atomic email reservation before persisting user documents; public registrations are strictly assigned `ROLE_EMP`.
3. **Role Enforcement**:
   - `ROLE_ADMIN`: Full CRUD permissions across all employee records, unmasked salaries, delete permissions.
   - `ROLE_EMP`: Can view directory and search; can only update their own linked employee profile; salaries of other employees are strictly masked (`null`).
4. **Ownership Verification**: Enforced strictly via authenticated user UUID linkages, not mere email equality.

---

## 4. Migration & Disaster Recovery Tooling

- `DataMigrationService`: Non-destructive migration service that reads legacy MySQL data, populates isolated `*_v1_<runId>` staging indices, and executes deep document-level verification across counts, IDs, hashes, salaries, and relationships.
- `AliasCutoverService`: Safe concrete-to-alias cutover with automated pre-cutover backups (`<target>_backup_<runId>`), verified count parity, and atomic alias swaps.
- `ReverseDataMigrationService`: Journal replayer for disaster recovery that replays Elasticsearch journal events into MySQL in strict sequential order.
- `AtomicAdmissionBarrier`: Read-write lock admission barrier ensuring active writes drain before cutover or recovery.

---

## 5. Verification Commands

### Backend Test Suite (41 tests, 0 failures)
```powershell
cd employee-management
.\mvnw.cmd test
```

### Angular Production Build
```powershell
cd employee-management-angular
npm run build
```

### Elasticsearch Cluster State Check
```powershell
Invoke-RestMethod -Uri http://localhost:9200/_cat/indices?v
```
