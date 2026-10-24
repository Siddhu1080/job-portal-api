# Job Portal API

REST API for a job portal. Employers post jobs and manage applications; candidates search jobs, apply and track applications. Node.js, Express, MongoDB Atlas (Mongoose), JWT, bcrypt, express-validator. No frontend.


## Prerequisites

- Node.js and npm installed.
- A MongoDB Atlas account and an accessible database cluster.
- Git installed.
- Postman (optional, for testing API requests).

Verify your installation:

```powershell
node --version
npm --version
git --version
```


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



## Authentication and Authorization

The API uses JSON Web Tokens (JWT) to authenticate users.

### Registration and login

- Register using `POST /api/auth/register`.
- Log in using `POST /api/auth/login`.
- Use the returned JWT as a Bearer token for protected endpoints.
- Retrieve the current user's profile using `GET /api/auth/me`.

### Roles and permissions

| Role | Permissions |
|---|---|
| Public | Register, log in, and browse jobs |
| Candidate | Apply for jobs, view personal applications, and withdraw eligible applications |
| Employer | Create and manage owned jobs, view applications for owned jobs, and update application statuses |

Protected requests must include:

```http
Authorization: Bearer <your_jwt_token>
```

The API checks authentication, role permissions, and resource ownership where required. Do not share real JWT tokens or store them in source control.



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


## Job Search and Management

Users can browse jobs without logging in. Employers must authenticate to create, update, close, or delete jobs they own.

The job listing endpoint supports these query parameters:

| Parameter | Purpose |
|---|---|
| `search` | Search job listings |
| `location` | Filter by location |
| `type` | Filter by employment type |
| `skill` | Filter by skill |
| `minSalary` | Filter by minimum salary |
| `sort` | Control result ordering |
| `page` | Select the results page |
| `limit` | Set the number of results per page |

Example request:

```http
GET /api/jobs?location=Pune&type=full-time&page=1&limit=5
```

Job owners can retrieve a job's application statistics and close a job to prevent further applications. Deleting a job also deletes its associated applications.


## Collections and relationships
- **User**: name, unique lowercase email, bcrypt password (never returned), role (`candidate`/`employer`), companyName (employers only).
- **Job**: title, description, companyName, location, type, salary (per month), skills, status (`open`/`closed`), `postedBy` -> User.
- **Application**: `job` -> Job, `candidate` -> User, coverLetter, status. Unique compound index `{ job, candidate }` blocks duplicate applications at database level.

One Employer has many Jobs; one Job has many Applications; one Candidate has many Applications.


## Application Management

Candidates can apply for an open job with a cover letter, view their own applications, and withdraw an application while its status is `applied`.

Employers can view applications for jobs they own and update application statuses according to the permitted transitions.

### Application endpoints

| Method | Endpoint | Purpose |
|---|---|---|
| POST | `/api/jobs/:id/apply` | Apply to a job |
| GET | `/api/jobs/:id/applications` | View applications for an owned job |
| GET | `/api/applications/my` | View the candidate's applications |
| PATCH | `/api/applications/:id/status` | Update an application's status |
| DELETE | `/api/applications/:id` | Withdraw an eligible application |

The API prevents duplicate applications to the same job by the same candidate. Applications also enforce ownership checks so users cannot manage other users' applications without authorization.


## Status transitions
```
applied -> shortlisted -> hired
applied -> rejected
shortlisted -> rejected
```
`hired` and `rejected` are final. Anything else returns 400 (for example "An application cannot move from hired to rejected"). Withdrawal is allowed only while status is `applied`.



## API Response Examples

### Successful response

A successful request returns a JSON response with a `success` field and the relevant data.

```json
{
  "success": true,
  "data": []
}
```

### Error response

Errors return a JSON response containing a message describing the problem.

```json
{
  "success": false,
  "message": "Route not found"
}
```

### Common HTTP status codes

| Status | Meaning |
|---|---|
| 200 | Request succeeded |
| 201 | Resource created |
| 400 | Invalid input or request |
| 401 | Authentication required or invalid |
| 403 | Insufficient permission |
| 404 | Resource or route not found |
| 409 | Conflict, such as a duplicate application |
| 500 | Unexpected server error |

The exact response body depends on the endpoint and error condition.


## Postman
Files in `postman/`: `Job-Portal-API.postman_collection.json` and `Job-Portal-API.postman_environment.json` (variables `baseUrl`, `employerToken`, `candidateToken`, `jobId`, `applicationId`, plus helpers for the second employer/candidate and extra jobs).

1. Postman > Import both files, select the **Job Portal API - Local** environment, set `baseUrl`.
2. Use an empty database, then run the folders in order: Auth, Jobs, Applications. Login requests save tokens; create/apply requests save IDs; every request has test scripts asserting the expected status.
3. The collection includes a saved example for every request. After running against Atlas you can replace them with "Save as example" on each response.
4. To publish: open the collection > **View complete collection documentation** > **Publish**, then share the public link.
5. To re-export: collection `...` > Export > Collection v2.1, save into `postman/`.
6. A 500 example: while the server runs, break the DB connection (for example disconnect the network), then call any DB endpoint and save the response.



## Testing Checklist

Use the Postman collection to verify these scenarios:

- [ ] Register an employer and a candidate.
- [ ] Log in and obtain JWT tokens for both roles.
- [ ] Create a job as an employer.
- [ ] Confirm that public job listing and filtering work.
- [ ] Apply to an open job as a candidate.
- [ ] Confirm that a duplicate application is rejected.
- [ ] Confirm that applying to a closed job is rejected.
- [ ] Confirm that an employer can manage applications for their own jobs.
- [ ] Confirm that users cannot manage resources they do not own.
- [ ] Confirm that invalid input and missing authentication return appropriate errors.

Run these checks against a test database. Do not include real credentials or access tokens in published examples.


## Postman Collection Files

The `postman/` directory contains the API collection and local environment JSON files, along with saved Postman workspace request files.

- `Job-Portal-API.postman_collection.json`: collection of representative API requests.
- `Job-Portal-API.postman_environment.json`: local environment configuration.

The environment uses `baseUrl` to target the local server at `http://localhost:3000`. Protected endpoints require a valid JWT for the appropriate user role.

Import the JSON files using a Postman version or workspace that supports collection and environment JSON imports. If using Postman's Local Mode, the existing workspace request files can also be used directly.


## Deployment Notes

Before deploying the API:

1. Set `NODE_ENV=production` in the deployment environment if supported by the application.
2. Configure `PORT`, `MONGODB_URI`, `JWT_SECRET`, and `JWT_EXPIRES_IN` securely.
3. Use a MongoDB Atlas database user with only the required permissions.
4. Restrict database network access to trusted sources.
5. Keep `.env` and all credentials out of Git.
6. Verify the deployed API using an HTTP client and review server logs for errors.

Never commit production credentials, JWT secrets, or real user tokens. Use HTTPS when exposing the API publicly.


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

## Verify the API

1. Install dependencies using `npm install`.
2. Configure `.env` using `.env.example`.
3. Start the development server using `npm run dev`.
4. Open `http://localhost:3000/api/jobs` in a browser or API client.
5. Confirm the API returns a JSON response.

The jobs list may initially be empty if no jobs have been created.

## Security notes

- Keep `.env` out of version control.
- Use a strong, unique `JWT_SECRET`.
- Give the MongoDB application user only the database permissions it needs.
- Restrict MongoDB Atlas network access to trusted IP addresses.
- Never include real passwords, JWT tokens, or database credentials in screenshots or published examples.


