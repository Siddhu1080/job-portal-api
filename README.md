# Job Portal API

REST API for a job portal. Employers post jobs and manage applications; candidates search jobs, apply and track applications. Node.js, Express, MongoDB Atlas (Mongoose), JWT, bcrypt, express-validator. No frontend.

## Setup

```powershell
npm install
Copy-Item .env.example .env   # then edit .env
npm run dev                   # or: npm start
```

### MongoDB Atlas
1. Atlas > Database > `LibraryCluster` > **Connect** > **Drivers** > copy the connection string.
2. Paste it into `MONGODB_URI` in `.env`. Replace `<db_password>` with the password of the application user (`library_api_user`) and make sure the database name in the path is `job_portal` (before the `?`).
3. Atlas > **Network Access**: allow your current IP.
4. Atlas > **Database Access**: the user needs read/write access to `job_portal`.
5. URL-encode special characters in the password (for example `@` becomes `%40`).

Never commit `.env`. The collections (`users`, `jobs`, `applications`) are created automatically on first use.

### Environment variables
| Name | Purpose |
|---|---|
| `PORT` | Server port (3000) |
| `MONGODB_URI` | Atlas connection string including `/job_portal` |
| `JWT_SECRET` | Long random string; generate one with `node -e "console.log(require('crypto').randomBytes(32).toString('hex'))"` |
| `JWT_EXPIRES_IN` | Token lifetime (`1d`) |

The server exits with a clear message if a variable is missing, placeholders are still present, or Atlas cannot be reached.

## Endpoints
| Method | Endpoint | Access |
|---|---|---|
| POST | `/api/auth/register` | Public |
| POST | `/api/auth/login` | Public |
| GET | `/api/auth/me` | Logged in |
| POST | `/api/jobs` | Employer |
| GET | `/api/jobs` | Public (`search, location, type, skill, minSalary, sort, page, limit`) |
| GET | `/api/jobs/:id` | Public |
| PUT | `/api/jobs/:id` | Job owner |
| PATCH | `/api/jobs/:id/close` | Job owner |
| DELETE | `/api/jobs/:id` | Job owner (also deletes its applications) |
| GET | `/api/jobs/:id/stats` | Job owner (aggregation: `$match` + `$group`) |
| POST | `/api/jobs/:id/apply` | Candidate |
| GET | `/api/jobs/:id/applications` | Job owner (`?status=`) |
| GET | `/api/applications/my` | Candidate |
| PATCH | `/api/applications/:id/status` | Job owner |
| DELETE | `/api/applications/:id` | Applicant (withdraw) |

List response: `{ "success": true, "total": 42, "page": 1, "pages": 5, "count": 10, "data": [] }`
Error response: `{ "success": false, "message": "..." }`
Status codes: 201 created, 200 OK, 400 validation/invalid ID/invalid transition/invalid query, 401 auth, 403 role or ownership, 404 not found, 409 duplicate or closed job, 500 unexpected.

## Collections and relationships
- **User**: name, unique lowercase email, bcrypt password (never returned), role (`candidate`/`employer`), companyName (employers only).
- **Job**: title, description, companyName, location, type, salary (per month), skills, status (`open`/`closed`), `postedBy` -> User.
- **Application**: `job` -> Job, `candidate` -> User, coverLetter, status. Unique compound index `{ job, candidate }` blocks duplicate applications at database level.

One Employer has many Jobs; one Job has many Applications; one Candidate has many Applications.

## Status transitions
```
applied -> shortlisted -> hired
applied -> rejected
shortlisted -> rejected
```
`hired` and `rejected` are final. Anything else returns 400 (for example "An application cannot move from hired to rejected"). Withdrawal is allowed only while status is `applied`.

## Postman
Files in `postman/`: `Job-Portal-API.postman_collection.json` and `Job-Portal-API.postman_environment.json` (variables `baseUrl`, `employerToken`, `candidateToken`, `jobId`, `applicationId`, plus helpers for the second employer/candidate and extra jobs).

1. Postman > Import both files, select the **Job Portal API - Local** environment, set `baseUrl`.
2. Use an empty database, then run the folders in order: Auth, Jobs, Applications. Login requests save tokens; create/apply requests save IDs; every request has test scripts asserting the expected status.
3. The collection includes a saved example for every request. After running against Atlas you can replace them with "Save as example" on each response.
4. To publish: open the collection > **View complete collection documentation** > **Publish**, then share the public link.
5. To re-export: collection `...` > Export > Collection v2.1, save into `postman/`.
6. A 500 example: while the server runs, break the DB connection (for example disconnect the network), then call any DB endpoint and save the response.

## Git commits (at least 10)
```powershell
git add .gitignore .env.example package.json package-lock.json; git commit -m "chore: initialize project and dependencies"
git add config server.js;                      git commit -m "feat: add Atlas connection and server bootstrap"
git add models/userModel.js;                   git commit -m "feat: add User model with bcrypt hashing"
git add models/jobModel.js;                    git commit -m "feat: add Job model"
git add models/applicationModel.js;            git commit -m "feat: add Application model with unique compound index"
git add middleware/asyncHandler.js middleware/errorHandler.js; git commit -m "feat: add async handler and central error handling"
git add middleware/auth.js controllers/authController.js routes/authRoutes.js; git commit -m "feat: add JWT auth and role middleware"
git add middleware/validators.js;              git commit -m "feat: add express-validator rules"
git add controllers/jobController.js routes/jobRoutes.js; git commit -m "feat: add job CRUD, search, stats and apply endpoints"
git add controllers/applicationController.js routes/applicationRoutes.js; git commit -m "feat: add application endpoints and status transitions"
git add postman;                               git commit -m "docs: add Postman collection and environment"
git add README.md;                             git commit -m "docs: add README"
```
Run these after your first `git init` and before `git add .`, then push to GitHub.
