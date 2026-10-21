# Rayen Restaurant — portfolio captures

Captured on 20 October 2026 from the current local React/Vite application and its real Spring Boot backend. The website was not redesigned or recreated for these images.

**No MP4 is included.** The connected browser exposes no recording API, and no usable installed recorder was available through the supported controls. No slideshow or synthetic video was substituted.

## Files

- `screenshots/`: 18 individual PNGs. Complete sections and tall forms are cropped from genuine browser captures, without retouching their UI.
- `gallery-1440x900/`: 16 desktop gallery exports, each exactly 1440 × 900. These proportionally scale the screenshot onto a cream frame with a short feature caption; they are framed exports, not additional raw captures.
- `restaurant-website-admin-cover.png`: 1600 × 1000 cover composed only from the actual homepage, admin dashboard, and mobile screenshots.
- `capture-manifest.json`: exact dimensions of every delivered PNG.

Screenshot subjects: homepage/banner/navigation (01), menu categories (02), Burgers category and complete dish card (03), Bestsellers (04), booking (05), About Us (06), admin inventory/filtering (07), Add Dish (08), Edit Dish (09), month/day reservation calendar (10), reservation details (11), mobile homepage/stacked cards (12), cart (13), and current footer (14).

## Demo data and isolation

- The capture preview used port 5181 and a separate backend on port 8090, connected to `jdbc:h2:mem:portfolio-demo`. It did not use the restaurant PostgreSQL database.
- Five menu fixtures populated the demo inventory. Featured dish names/prices retained the observed current favourites; ingredients and other fixture details are demonstration data. All photographs and category illustrations came from the existing project.
- The admin account was fictional. All guest names, `example.com` emails, 202-555-01xx phone numbers, references, and five seeded October 2026 reservations are fictional.
- No booking was submitted, reservation status changed, dish deleted, or dish save completed. Only the demo browser's local cart changed during the walkthrough checks.
- No passwords, tokens, session cookies, real customer records, or runtime configuration are included in this delivery.

## Verification and capture limits

- Verified in the live UI: category navigation; adding one Beef Burger; a cart quantity of 1 and €12.50 total; opening Add/Edit Dish; calendar month/day views; opening and closing reservation details; and booking slot selection without submission.
- Mobile capture used a 390 × 844 CSS viewport; no horizontal overflow was detected. This is browser viewport testing, not a physical-device test.
- Desktop capture normally used 1440 × 900 CSS pixels. Add/Edit forms used a 1440 × 2200 viewport to avoid sticky controls covering fields. Full-page captures preserve complete tall forms, cards, and calendar rows.
- The browser screenshot service supplies JPEG bytes and sometimes omits scrollbar width or scales viewport output slightly. Final files are PNG conversions. Native dimensions therefore vary; the gallery exports provide consistent 1440 × 900 framing.
- Fonts and relevant food images were loaded for capture. Browser chrome and developer tools are absent. Native page scrollbars and genuine input/focus styling remain where present.
- The footer still contains the project's real, clearly marked contact/social placeholders. They were not replaced with invented business information.
- Dish uploads/saves, booking submission, reservation status changes, checkout, and payments were not verified. No checkout/payment functionality is claimed.
- Source files and production data were unchanged. Nothing was committed, pushed, or deployed. The temporary local servers were stopped after capture.

## Unrecorded 55-second video plan

If recording is resumed with an available recorder, use the same isolated demo setup: homepage (0–8s), category navigation and cart (8–20s), booking interface without submitting (20–29s), admin inventory and Edit Dish (29–42s), then calendar and fictional reservation details (42–55s). Suggested short captions: “Browse the menu”, “Add favourites to your cart”, “Request a table”, “Manage dishes”, and “Plan reservations”. This plan has not been recorded.
