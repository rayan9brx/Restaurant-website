# Rayen Restaurant

A full-stack restaurant project built with React, Vite, Java Spring Boot and PostgreSQL. The frontend uses a cream, dark green and gold design for menu browsing, a local cart, table reservation requests and owner administration.

## Features

- Responsive homepage with a controllable promotional carousel, category navigation, Bestsellers, booking form and About Us section.
- Menu pages for burgers, pizza, salads, drinks and desserts, with current database prices, sale prices, availability, uploaded photos and recorded dietary information.
- Browser-local cart with quantity controls, removal and totals based on loaded menu prices. Bestsellers are owner selections, with legacy name-based defaults—not sales analytics.
- Customer registration, session-based login/logout, BCrypt password hashing, CSRF protection and backend-enforced `CLIENT`/`ADMIN` permissions.
- Reservation availability checks, pending-confirmation requests, customer reservation history and cancellation. Owner tools include confirmation/rejection, filtering and a month/day calendar. Reservation dates and times use `Europe/Berlin`.
- Owner menu management: create, edit and delete dishes; manage availability, sales, Bestseller flags, ingredients, allergens and dietary flags; upload JPEG, PNG or WebP images.
- Implemented, read-only AI menu assistant with suggested questions, conversation history, loading feedback, errors, retry and clearing. Responses use current available dishes, validated menu links and backend-calculated euro totals.

## Repository structure

```text
.
├── Restaurant/                 # Spring Boot backend; note the capital R
│   ├── src/main/java/com/rayen/Restaurant/
│   ├── src/main/resources/application.properties
│   ├── src/test/               # Backend tests and isolated H2 configuration
│   ├── pom.xml
│   ├── mvnw
│   └── mvnw.cmd
├── restaurant-frontend/        # React/Vite frontend
│   ├── public/
│   ├── src/
│   ├── scripts/                # Frontend checks
│   └── package.json
├── portfolio-capture/          # Portfolio images and capture resources
├── .env.example                # AI environment reference; no credentials
├── start-backend.ps1           # Optional Windows backend launcher
├── AUTHENTICATION.md
├── BOOKINGS.md
├── MENU_MANAGEMENT.md
└── MENU_ASSISTANT.md
```

## Requirements

- **JDK 21**, as configured in `Restaurant/pom.xml`, with `JAVA_HOME` pointing to the JDK.
- **Node.js and npm**. The locked Vite/ESLint engine requirements support Node **20.19+ on 20.x**, **22.13+ on 22.x**, or **24+**.
- **PostgreSQL** running locally. The default connection is `localhost:5432/restaurant_db`, with username `postgres` and password supplied through `DB_PASSWORD`.
- Internet access for the initial Maven/npm dependency downloads. The backend includes Maven wrappers; a separate Maven installation is not required.
- An OpenAI API key and compatible model are optional; the rest of the website works without the assistant provider configured.

## Local setup

The commands below use PowerShell and start from the repository root. Replace every `<placeholder>` with your own value; do not store real credentials in tracked files.

### 1. Prepare PostgreSQL

Create the database if it does not already exist, using your PostgreSQL client:

```sql
CREATE DATABASE restaurant_db;
```

Review [application.properties](Restaurant/src/main/resources/application.properties) if your connection differs from the defaults. Development startup uses `spring.jpa.hibernate.ddl-auto=update` to create/update tables. It does **not** automatically seed menu dishes or create an owner account.

### 2. Start the backend

```powershell
$env:JAVA_HOME = '<path-to-jdk-21>'
$env:DB_PASSWORD = '<postgres-password>'
cd Restaurant
.\mvnw.cmd spring-boot:run
```

The backend normally listens on `http://localhost:8080`. On macOS/Linux, set the equivalent environment variables and run `./mvnw spring-boot:run` from `Restaurant/`.

Alternatively, from the repository root with the same environment variables set:

```powershell
.\start-backend.ps1
```

The Windows launcher can fall back to a local IntelliJ database-password setting and a specific user-local JDK installation. Set `DB_PASSWORD` and `JAVA_HOME` explicitly for a reproducible setup on another machine.

### 3. Start the frontend

In another terminal, from the repository root:

```powershell
cd restaurant-frontend
npm ci
npm run dev
```

Open the URL printed by Vite, normally `http://localhost:5173`. Both development and preview proxy `/api` to `http://localhost:8080`. A fresh database has an empty menu; create the owner account below, then add dishes through Menu Management.

### 4. Create the first owner account

Stop the backend first. In the backend terminal, return to the repository root and keep `JAVA_HOME` and `DB_PASSWORD` set. Supply these four environment variables for one setup run:

```powershell
$env:RESTAURANT_OWNER_SETUP = 'true'
$env:RESTAURANT_OWNER_NAME = '<owner-name>'
$env:RESTAURANT_OWNER_EMAIL = '<valid-owner-email>'
$env:RESTAURANT_OWNER_PASSWORD = '<strong-owner-password>'
.\start-backend.ps1
```

Owner setup validates a nonblank name of at most 100 characters, a valid email of at most 254 characters, and a nonblank password of at most 72 UTF-8 bytes. Choose a strong password within that limit. Email addresses are trimmed and lowercased.

After successful startup, stop the backend with Ctrl+C. Remove the setup variables and restart normally:

```powershell
Remove-Item Env:RESTAURANT_OWNER_SETUP, Env:RESTAURANT_OWNER_NAME, Env:RESTAURANT_OWNER_EMAIL, Env:RESTAURANT_OWNER_PASSWORD -ErrorAction SilentlyContinue
.\start-backend.ps1
```

Sign in through the normal login form, then open **Admin Dashboard** (`/#admin`). There are no default owner credentials or public admin-registration endpoints. Setup creates only the first `ADMIN`; an existing `ADMIN` at that email is left unchanged, including its password. An email belonging to a `CLIENT`, a different existing owner, or invalid input causes setup to refuse. See [authentication and owner setup](AUTHENTICATION.md).

## Environment configuration

Set these in the **backend process environment**, shell or IDE run configuration:

| Variable | Purpose |
| --- | --- |
| `DB_PASSWORD` | Password for the configured PostgreSQL user. |
| `JAVA_HOME` | JDK installation used by the Maven wrapper/Windows launcher. |
| `RESTAURANT_UPLOAD_DIR` | Optional persistent image directory; defaults to `${user.home}/.rayen-restaurant/uploads`. |
| `OPENAI_API_KEY` | Optional server-side OpenAI credential. |
| `OPENAI_MODEL` | Optional model ID supporting Responses API strict JSON Schema output. No default model is configured. |
| `RESTAURANT_OWNER_SETUP`, `RESTAURANT_OWNER_NAME`, `RESTAURANT_OWNER_EMAIL`, `RESTAURANT_OWNER_PASSWORD` | One-time owner setup, described above. |

[.env.example](.env.example) contains credential-free AI configuration placeholders. **Spring Boot does not automatically load that file.** Never put API keys in React code or `VITE_` variables. Uploaded photos need a persistent writable directory and backups alongside the database; see [menu management and storage](MENU_MANAGEMENT.md).

## AI menu assistant

The implementation exists in [the React assistant](restaurant-frontend/src/assistant/) and [the Spring Boot assistant package](Restaurant/src/main/java/com/rayen/Restaurant/assistant/). Its dedicated endpoint is `POST /api/menu-assistant/chat`, available to guests with the existing CSRF protection.

To enable real provider requests, set both variables before starting/restarting the backend:

```powershell
$env:OPENAI_API_KEY = '<openai-api-key>'
$env:OPENAI_MODEL = '<compatible-responses-model-id>'
```

With either value missing or blank, the UI reports **Assistant is not configured yet**. It does not simulate AI responses. Source availability does not establish that any particular running installation has valid provider credentials or model access; no real AI request was verified for this README update.

The isolated provider adapter calls OpenAI's Responses API for an intent and dish IDs. Backend code validates the selection, refreshes availability/prices and constructs factual replies, links and totals. It uses recorded dietary flags and allergy information; visitors must confirm allergy needs with staff. It cannot book tables, edit dishes, access customer records or take payments.

When configured, requests send the visitor's question, bounded recent conversation, public available-menu fields and limited booking instructions to OpenAI. Customer/reservation database records are not included. Requests, history, output, frequency and timeouts are bounded; quotas are in-memory per backend instance. See [assistant setup, data sharing, limits and mocked-provider tests](MENU_ASSISTANT.md) for details.

## Build and checks

Run from `restaurant-frontend/`:

```powershell
npm run build
npm run lint
npm run test:header
npm run test:menu
npm run test:cart
npm run test:admin
npm run test:calendar
npm run test:assistant
```

`npm run build` writes `restaurant-frontend/dist/`. `npm run preview` serves that build locally; it is not a production deployment command.

Run backend tests from `Restaurant/` with JDK 21:

```powershell
.\mvnw.cmd test
```

The existing backend suites use isolated H2 test databases; AI provider tests use mocks/local HTTP fixtures, not real AI credentials. These checks do not establish live PostgreSQL, provider-account or production-deployment behavior. This documentation update reviewed source/configuration; it did not rerun application builds or tests.

## Limitations

- The cart is stored in browser `localStorage`; there is **no checkout, order-submission workflow or payment integration**.
- Reservations are requests requiring restaurant confirmation, not instant confirmed bookings. The configured reservation hours/capacity are demo settings, not verified business opening hours. No email notification service is implemented.
- Bundled food/venue imagery includes AI-generated illustrative assets. In particular, the [About Us interior](restaurant-frontend/src/assets/about/README.md) does not depict an actual restaurant; [Bestseller images](restaurant-frontend/src/assets/bestsellers/README.md) are illustrative, not evidence of sales rankings.
- Contact/social settings are currently empty. The footer shows a contact-details fallback and hides unconfigured social links; the assistant has no verified opening hours or contact source.
- These are local-development instructions; no live deployment is verified or linked here. Production hosting needs SPA route fallback, `/api` routing, HTTPS/session-cookie configuration, persistent uploads and managed database migrations instead of relying on development schema updates.
- No license file is currently included in this repository.

## Further documentation

- [Authentication and owner setup](AUTHENTICATION.md)
- [Reservations and admin calendar](BOOKINGS.md)
- [Menu management, photos, sales and Bestsellers](MENU_MANAGEMENT.md)
- [AI assistant configuration, data handling and limits](MENU_ASSISTANT.md)
- [Frontend details](restaurant-frontend/README.md)

## Acknowledgements

OpenAI Codex helped develop this project and assisted with implementing the AI menu assistant. Codex was a **development tool** used to help write and refine the application. The running website's optional AI service is the **OpenAI Responses API**, called by the Spring Boot backend with the configured key and model; it does not run Codex as its menu assistant.
