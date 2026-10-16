# Restaurant frontend

React/Vite frontend for Rayen Restaurant.

## Run locally

```powershell
npm install
npm run dev
```

Open the URL printed by Vite, normally http://localhost:5173.

Start the Spring Boot backend on port 8080 with PostgreSQL running. From the project root, `./start-backend.ps1` uses the existing database configuration. Both Vite development and preview forward `/api` requests to that backend.

Category cards open `/menu/burgers`, `/menu/pizza`, `/menu/salads`, `/menu/drinks`, and `/menu/desserts`. React Router handles navigation and dish anchors. Vite supports direct URLs and refresh; any future production host must also serve `index.html` for frontend routes while forwarding `/api` to Spring Boot.

Uploaded photos take priority. Dishes without an exact photo use an existing category image labelled **Category image**. Failed images fall back once per URL, then display a neutral placeholder if no image loads. The bundled Beef Burger and Margherita photos remain available.

Backend uploads are stored at `${user.home}/.rayen-restaurant/uploads` by default, independently of the working directory. If setting `RESTAURANT_UPLOAD_DIR`, use the same persistent directory across restarts and give the backend read/write access. Keep this directory and the database together in backups. Photos are publicly served by GET `/api/dish-photos/{filename}`; admin upload/replacement still requires owner access and CSRF protection.

## Checks

```powershell
npm run lint
npm run test:menu
npm run build
```

Backend photo/menu tests: run `./mvnw.cmd '-Dtest=MenuManagementTests' test` in the backend `Restaurant` directory with Java 21. Tests use isolated H2 and temporary uploads, leaving PostgreSQL records unchanged.

## Build

```powershell
npm run build
```
