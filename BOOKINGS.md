# Table reservations

The booking section uses the existing Spring session login and CSRF token helper.
Visitors can fill out the form; submitting opens the existing login dialog and
resumes the request after login. Form values and retry keys stay in React memory
only, so reloading or leaving the page clears an unfinished form.

Reservations are stored in PostgreSQL alongside existing users. Start the backend
with `./start-backend.ps1` from the project folder, then run `npm run dev` in
`restaurant-frontend`. The existing Vite proxy forwards API requests to Spring.
The existing development `ddl-auto=update` setting creates the reservation and
booking-lock tables on startup; no existing menu or user data is replaced.

## Demo settings

Edit `Restaurant/src/main/resources/application.properties`, or use Spring's
environment overrides such as `RESTAURANT_BOOKING_CAPACITY`.

| Property under `restaurant.booking` | Initial setting |
| --- | --- |
| `opens` / `closes` | 12:00 / 22:00, daily |
| `closed-days` | Empty; e.g. `MONDAY,TUESDAY` closes those days |
| `interval-minutes` | 30 |
| `duration-minutes` | 90; last seating is 20:30 |
| `max-party-size` | 8 |
| `capacity` | 40 guests simultaneously |

All calendar dates and times use Europe/Berlin, including daylight saving.
Creation timestamps are UTC instants. Opening hours must fall within one day.
Duration is stored as each reservation's end time, so later configuration changes
do not shorten existing reservations. Initial settings are examples, not a claim
about the restaurant's real opening hours or capacity.

Pending and confirmed bookings occupy seats for their full duration. Rejected and
cancelled bookings occupy none. Every creation and status change holds the same
database row lock until its transaction commits, including across application
instances. Availability is a snapshot; submission checks again under that lock.
Retrying the same request key returns the original booking instead of inserting
another row. Use the same key after a network error. Changing the form starts a
new request.

## Try the flow

1. Open Make a Booking, choose a future date, party size and available time, then
   enter contact details. Submit while logged out and log in (or sign up, then log
   in). The entered details remain and the request resumes.
2. Check the saved reference, date/time, party size and **Pending confirmation**.
   Open **My reservations** (`/reservations`) and refresh to verify persistence.
3. Log in with the existing ADMIN account. Open **Reservations**
   (`/admin/reservations`), filter by date or status, and confirm or reject a pending
   booking. Customers cannot access these APIs.
4. Return as the booking customer to see the status. Cancel a future pending or
   confirmed booking. Its capacity becomes available again. Another customer
   cannot cancel it, even by directly calling its API.
5. Try a past date, an excessive party size, a closed time or a fully occupied
   slot. The backend rejects invalid requests even if browser validation is bypassed.

## Automated checks

From `restaurant-frontend`: `npm run build`, `npm run lint`, `npm run test:cart`,
and `npm run test:menu`.

From `Restaurant`, with Java 21: `./mvnw.cmd -B test`.
If the sandbox cannot create Maven cache lock files, cached dependencies can be
used with `./mvnw.cmd -B -o -Daether.syncContext.named.factory=rwlock-local test`.

Backend tests use the existing isolated H2 test profile in PostgreSQL compatibility
mode, never the restaurant database. Booking tests exercise persistence, retry
deduplication, field validation, overlapping/adjacent capacity, concurrent requests,
CSRF, authentication, ownership, ADMIN permissions, filtering, confirmation,
rejection and cancellation. H2 tests do not replace a PostgreSQL deployment check.
No email or payments are sent.

## Admin reservation calendar

From **Admin Dashboard**, choose **Reservation Calendar**, or visit
`/admin/reservations/calendar` while logged in as ADMIN. The existing reservation
list remains available beside the calendar.

- The calendar starts in the current Berlin month. Use Previous/Next, Today,
  Month/Day and the status filter to explore reservations.
- Choose a date or **+ more** for the complete day in time order. Mobile displays
  a monthly agenda instead of the seven-column grid.
- Choose a reservation to open its details. Pending requests have Confirm and
  Reject actions; completed status changes refresh both the calendar and details.
  With the Pending filter active, a confirmed/rejected request disappears from
  the calendar but its details remain open with its updated status.
- Tab reaches every control. Date buttons also support arrow keys, Home/End and
  Page Up/Down. Escape closes details; focus returns to the opener or calendar
  heading if the opener disappeared after a status change.

The calendar reuses `GET /api/admin/reservations` with inclusive `start` and `end`
dates plus the optional existing `status` filter. A single-day range is valid;
missing, reversed or malformed ranges return 400. Use either the existing `date`
parameter or a range. `GET /api/admin/reservations/{id}` refreshes selected details.
Both routes require ADMIN; no contact data was added to public availability.
Existing POST status actions, CSRF tokens and capacity rules are unchanged.

Run `npm run test:calendar` for month boundaries, leap years, DST and Berlin's
current-date calculations. Backend booking tests also cover range boundaries,
chronological ordering, detail permissions, filtered status updates and rejected
status transitions. All backend tests continue to use isolated H2 test databases.
