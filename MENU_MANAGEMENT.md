# Adding dishes as the owner

Run `./start-backend.ps1` from the project root, and `npm run dev` from `restaurant-frontend`. Restart the backend after pulling these changes. Keep PostgreSQL running and use your existing owner login; no credentials were changed.

1. Log in, open **Admin Dashboard**, then **Menu Management**.
2. Click **Add Dish**. Enter a name, choose an existing category, enter a euro price greater than zero with no more than two decimal places, and add a description.
3. Choose a JPEG, PNG or WebP photo up to 5 MB. Check the preview. Photos must be at most 6000 pixels on either side and at most 16 million pixels in total.
4. Leave Available enabled, or switch it off for Sold out. Ingredients, allergens and dietary checkboxes are optional. Vegan dishes are also marked vegetarian.
5. Click **Save Dish** once. The success message and new card confirm the save. Open the customer menu and select the category to see the dish. Other browser sessions can refresh to retrieve the latest menu.

## Storage configuration

`RESTAURANT_UPLOAD_DIR` configures the persistent photo directory. Its default is `${user.home}/.rayen-restaurant/uploads` (outside this repository). For example, set `$env:RESTAURANT_UPLOAD_DIR = 'D:\RayenData\dish-photos'` in the terminal before starting the backend. Give the backend account read/write access. Never put this directory under source code, frontend public assets, a web server executable directory, or a temporary build directory.

The server checks actual image decoding, format, file size and dimensions. It converts accepted images into PNG pixels with generated UUID filenames; original filenames, metadata and appended content are discarded. PostgreSQL stores the generated photo reference, and `/api/dish-photos/{filename}` serves only generated PNG filenames. A failed database save removes its photo. A process crash between file creation and database commit can leave an unreferenced file; include periodic orphan-file review in operational maintenance.

For deployment, mount a persistent writable volume at `RESTAURANT_UPLOAD_DIR` and back it up together with PostgreSQL. Container-local disks and ephemeral hosting filesystems will lose images on replacement. Multiple backend instances need shared persistent storage or a future object-storage adapter. Keep frontend and API under the same origin (or proxy `/api`); the Vite development proxy is not a production deployment proxy. Configure the host's request-body limit to allow a 5 MB image plus multipart overhead. Retain HTTPS/session-cookie configuration from `AUTHENTICATION.md`.

## Existing database and files changed

The existing `dishes` table is extended with nullable `photo`, `ingredients`, `allergens`, `vegetarian` and `vegan` columns. Existing rows and categories remain unchanged. The local `ddl-auto=update` setting adds these columns on backend startup. Existing dishes without a usable photo show “Photo coming soon”. For production, apply equivalent additive schema migrations through your migration process instead of relying on automatic schema updates.

- `Dish.java`: extends the existing entity and exposes a public photo URL; price stays `BigDecimal` / `numeric(10,2)`.
- `menu/DishRequest.java`, `DishInputException.java`, `MenuErrors.java`, `UploadErrors.java`: input validation and readable field errors.
- `menu/MenuManagementController.java`, `DishCreationService.java`: ADMIN list and multipart creation, database persistence, and failed-save cleanup.
- `menu/PhotoStorage.java`, `DishPhotoController.java`: decoded-image validation, persistent storage and public read-only photos.
- `auth/AdminController.java`: replaces the placeholder dashboard message.
- `auth/SecurityConfig.java`: preserves session and CSRF authentication, protects management/upload routes, permits customer photo GETs.
- `application.properties`, `pom.xml`: upload limits/directory and TwelveMonkeys WebP decoder.
- `auth/MenuManagement.jsx` and `.css`, `AdminDashboard.jsx`, `App.jsx`: grouped owner list, responsive creation form, preview, messages and shared customer-menu refresh.
- `components/DishPhoto.jsx`, `Menu.jsx`, `Menu.css`: uploaded photos, fallback and optional dietary information on customer cards.
- `MenuManagementTests.java`: isolated H2 transactions and temporary photo files, never production PostgreSQL data.

## Validation

Backend: from `Restaurant`, use Java 21 and run `.\mvnw.cmd test`. New tests cover ADMIN creation and public photo retrieval, preserving old rows, available/sold-out defaults, PNG/JPEG/WebP decoding, missing/forged/GIF/truncated/oversized photos, dimension limits, invalid fields and prices, anonymous/CLIENT rejection and missing CSRF rejection. Tests roll back their database changes and clean only their own temporary photo directory.

Frontend: from `restaurant-frontend`, run `npm run build` and `npm run lint`.

API: `GET /api/admin/dishes` and `POST /api/admin/dishes` require ADMIN. POST uses multipart parts named `dish` (JSON) and `photo` (file), plus the existing session CSRF header. Public `GET /api/dishes` remains the customer menu source. There is no edit, delete, category-management or separate public upload endpoint.

Verified: all 16 backend tests passed, frontend build and lint passed, owner form and photo preview checked in the browser, mobile width checked without horizontal overflow, and a real HTTP upload over 5 MB returned the expected 413 JSON field error. The original three PostgreSQL dishes were retained; no test dishes were added to PostgreSQL.

WebP decoding dependency: [TwelveMonkeys ImageIO](https://github.com/haraldk/TwelveMonkeys/releases/tag/twelvemonkeys-3.13.0).

## Sale prices and Bestsellers

In Add Dish, enter the regular price. To offer a discount, check **Put this dish on sale** and enter a sale price. It must be positive, lower than the regular price and have no more than two decimal places. The customer menu, admin list and Bestsellers cards show the regular price crossed out beside the sale price and a Sale badge. Leaving the sale option off stores no sale price.

Check **Show in Bestsellers** to feature the new dish in the customer Bestsellers section, using its uploaded photo. The original two favourites remain in place. New entries come from PostgreSQL and are matched by ID to avoid duplicate cards. These are owner selections, not an automatic ranking by order volume.

`Dish.java` adds nullable `sale_price numeric(10,2)` and `bestseller boolean` columns, so old dishes keep their prices and data. Startup adds these columns with the existing development schema-update setting. The ADMIN-only multipart endpoint validates and saves both fields; session and CSRF rules remain unchanged. `DishPrice.jsx` and `.css` share sale display across customer/admin cards. `Bestsellers.jsx` includes owner-selected dishes. Additional isolated backend tests cover persistence, public API data, defaults and invalid sale prices.
