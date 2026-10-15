# Rayen Restaurant authentication

The existing website and Vite `/api` proxy are preserved. Spring Boot 4.1.1 manages the compatible Spring Security 7.1.1 dependencies. PostgreSQL credentials have not been changed. Only HttpOnly and SameSite=Lax session-cookie settings were added to the existing application properties.

## New files

- `Restaurant/src/main/java/com/rayen/Restaurant/auth/AppUser.java`, `Role.java`, and `UserRepository.java`: the `users` table and account storage. Fields are `id`, `name`, `email`, `password_hash`, `role`, and `created_at`. Emails are trimmed and lowercased; a database unique constraint prevents duplicates.
- `RegistrationRequest.java`, `RegistrationService.java`, and `AuthErrors.java`: backend validation, BCrypt hashing, CLIENT-only registration, and readable error responses. Passwords must be nonblank and at most 72 UTF-8 bytes, the BCrypt limit. A supplied `role` field cannot change the assigned CLIENT role.
- `UserDetailsResponse.java` and `AuthController.java`: safe account responses, registration, current-user lookup, and CSRF tokens. No password or hash appears in account responses.
- `SecurityConfig.java`: Spring Security handles login, session ID rotation, logout, CSRF, and role checks. Public GET `/api/dishes` remains accessible. All `/api/admin/**` routes require ADMIN on the backend.
- `OwnerSetup.java`: optional first-owner setup; no public admin-registration API.
- `AdminController.java`: a protected dashboard placeholder, without management features.
- `restaurant-frontend/src/auth/`: API helpers, login-state restoration, the login/sign-up dialog, styles, and a minimal dashboard view. `App.jsx` connects them to the existing navigation.
- `Restaurant/src/test/resources/application-test.properties`: isolated H2 test database. The auth tests and existing context test activate this profile; they do not access PostgreSQL or change restaurant data.

## Authentication flow

1. On page load, React calls GET `/api/auth/me`. A 401 means the visitor is signed out.
2. Before each POST, React gets a fresh token from GET `/api/auth/csrf` and sends it in the header named by the response. The token is tied to the browser session; CSRF protection stays enabled.
3. Sign-up sends JSON to POST `/api/auth/register`. The backend validates and saves a CLIENT with a BCrypt hash. Registration does not log the customer in: the form switches to login with a success message.
4. Login sends URL-encoded `email` and `password` to POST `/api/auth/login`, handled by Spring Security. Incorrect credentials produce the same generic error. A successful login rotates the session ID; React then fetches the safe current-user details.
5. The browser keeps the HttpOnly `JSESSIONID` cookie. React does not store passwords, session IDs or tokens in localStorage. Login state is restored through `/api/auth/me` after refresh.
6. POST `/api/auth/logout` requires a fresh CSRF token, invalidates the session and deletes its cookie.
7. The owner sees an Admin Dashboard link to `#admin`. That view requests GET `/api/admin/dashboard`, which rejects unauthenticated visitors and CLIENT accounts even if they manually enter the URL.

Use the existing Vite development server with `npm run dev`; its proxy connects to the backend on port 8080. `vite preview` does not use the development proxy. For an eventual HTTPS deployment, enable `server.servlet.session.cookie.secure=true` and serve frontend and backend under the same origin. Nothing has been deployed.

## Create the restaurant owner

The backend requires the existing `DB_PASSWORD` environment variable. Run `./start-backend.ps1` from the project root to start it. The launcher uses your supplied `DB_PASSWORD`, or reads the existing value from this project's local IntelliJ run configuration. It never prints or copies that password into source files. Database credentials remain unchanged. The launcher uses the installed Java 21 when `JAVA_HOME` is unset.

Owner setup runs only when `RESTAURANT_OWNER_SETUP=true`. Supply all three additional environment variables:

- `RESTAURANT_OWNER_NAME`: the owner's name.
- `RESTAURANT_OWNER_EMAIL`: a valid email that is not already registered as CLIENT.
- `RESTAURANT_OWNER_PASSWORD`: a strong password meeting the same validation rules as sign-up.

For PowerShell, run from the `Restaurant` backend directory. This prompts for account details instead of placing a real password in this document or your command history:

```powershell
$env:JAVA_HOME = 'C:\Users\rayen\.jdks\ms-21.0.12.1'
$env:RESTAURANT_OWNER_SETUP = 'true'
$env:RESTAURANT_OWNER_NAME = Read-Host 'Owner name'
$env:RESTAURANT_OWNER_EMAIL = Read-Host 'Owner email'
$ownerSecret = Read-Host 'Owner password' -AsSecureString
$env:RESTAURANT_OWNER_PASSWORD = [System.Net.NetworkCredential]::new('', $ownerSecret).Password
try {
    ..\start-backend.ps1
} finally {
    Remove-Item Env:RESTAURANT_OWNER_SETUP, Env:RESTAURANT_OWNER_NAME, Env:RESTAURANT_OWNER_EMAIL, Env:RESTAURANT_OWNER_PASSWORD -ErrorAction SilentlyContinue
    $ownerSecret.Dispose()
}
```

After the successful initial startup, stop the backend with Ctrl+C and start it normally without owner setup. In IntelliJ, the same environment variables can be supplied in the run configuration for the initial run; remove them afterward. Do not save real owner credentials in tracked files.

Setup creates only the first ADMIN. If that email already belongs to ADMIN, setup leaves the existing account and password unchanged. If the email belongs to CLIENT, or another ADMIN already exists, setup refuses and does not promote or replace anyone. Invalid setup details fail without logging the password. Sign in through the normal login form using the owner account.

## Verification

Frontend: `npm run build` and `npm run lint` from `restaurant-frontend`.

Backend: use Java 21 and run `.\mvnw.cmd test` from `Restaurant`. The isolated tests cover registration persistence and hashing, email normalization and database uniqueness, validation, forged ADMIN registration, login/session restoration/session ID rotation, generic incorrect-login errors, logout, real CSRF tokens and rotation, public menu access, CLIENT admin denial, ADMIN access, and owner setup safeguards.

The automated tests use H2 in PostgreSQL compatibility mode, not a live PostgreSQL server.

Verified during implementation: frontend build and lint passed; all 10 backend tests passed. A temporary `spring-boot:test-run` server using the test profile also passed browser sign-up, login with a differently capitalized email, refresh restoration, customer dashboard rejection, and logout through the existing Vite proxy. That temporary server was stopped after verification, and its in-memory test account was not stored in PostgreSQL.

The later startup issue was resolved by supplying the existing `DB_PASSWORD` from IntelliJ. The actual owner account was created in PostgreSQL through opt-in setup. Login, safe current-user details showing ADMIN, protected dashboard access, and logout were verified through the Vite proxy against PostgreSQL. The local database password was not changed.

Spring references: [form login](https://docs.spring.io/spring-security/reference/servlet/authentication/passwords/form.html), [CSRF protection](https://docs.spring.io/spring-security/reference/servlet/exploits/csrf.html), and [Maven test runtime](https://docs.spring.io/spring-boot/maven-plugin/run.html).
