# Rayen menu assistant

The floating **Ask about our menu** button is available on customer pages. It opens a keyboard-accessible dialog with suggestions, a bounded conversation, loading feedback, retry and clear controls. Escape closes it and returns focus to the launcher. Enter sends; Shift+Enter inserts a newline. It does not change the cart, book tables, edit dishes, access customer records or take payments.

## Setup

Requires the project's Java 21, PostgreSQL and Node setup. No new dependency is required. The provider adapter uses Java's HTTP client and OpenAI's official HTTPS Responses API.

1. Obtain an OpenAI API key privately and select a model enabled for your API project that supports the Responses API and strict `text.format` JSON Schema outputs. Configure a project spend limit as well.
2. Set `OPENAI_API_KEY` and `OPENAI_MODEL` **only in the Spring Boot process environment**, not React/Vite. Neither has a default. With either missing/blank the endpoint returns HTTP 503 and **Assistant is not configured yet**. There are no simulated AI replies.
3. Restart Spring Boot, then start the frontend as usual. Vite already proxies `/api` to port 8080. In production route `/api` to the backend on the same origin.

PowerShell 7 example (from the repository root):

```powershell
$env:OPENAI_API_KEY = Read-Host 'OpenAI API key' -MaskInput
$env:OPENAI_MODEL = Read-Host 'Responses model ID'
.\start-backend.ps1
```

In another terminal:

```powershell
cd restaurant-frontend
npm run dev
```

[.env.example](.env.example) is a credential-free reference. Spring Boot does **not** auto-load it; configure environment variables in your shell, IDE or deployment secret manager. `.env` and local variants are ignored by Git. Never create `VITE_OPENAI_API_KEY`, expose the key in browser code, or commit a populated environment file. The adapter's production URL is fixed to `https://api.openai.com/v1/responses` and does not follow redirects.

## Grounding and safety

`POST /api/menu-assistant/chat` accepts `{ "message": "...", "history": [{ "role": "user", "content": "..." }] }`. It permits guests but still requires the normal CSRF token from `/api/auth/csrf`. All existing admin/auth/booking security rules stay intact. Responses have `Cache-Control: no-store`.

`MenuAiProvider` isolates the AI integration. `OpenAiMenuProvider` asks the model for **only an intent and up to four dish IDs**, using strict structured output. No model-written prose, prices, links, hours, contacts or allergy claims are displayed. User questions, history, names and descriptions are untrusted user-data inside one data envelope, separate from fixed instructions. No AI tools or database-write capabilities exist.

`MenuAssistantService` checks IDs against current available menu records, checks saved dietary flags, reloads the selected dishes after the provider call (clearing the request's JPA cache), and builds fixed factual replies. Unknown IDs fail closed. Deleted/sold-out dishes are omitted. Only the frontend's supported categories/aliases get links. Unknown dietary flags are never inferred from names or descriptions.

Prices follow the menu's valid-sale-price rule. The backend sums `BigDecimal` values for **one portion of each distinct selected dish**. Budget replies require an explicit euro amount in the question (or recent user history for a budget follow-up), and the combined refreshed total must be strictly below that amount. If it cannot verify a plan under the budget it says so; there is no invented meal or price. This version does not support quantities, currency conversion or splitting meals between people.

Allergy questions display recorded ingredients/allergens, label missing values **Not recorded**, and warn about incomplete records and cross-contact. They never declare a dish safe or allergen-free. Long record fields are visibly shortened with a link to full menu details. The panel also always advises confirming allergy needs with staff.

Booking instructions use the existing login, pending-confirmation and Berlin-time behavior plus `BookingSettings.maxPartySize`. Reservation time configuration is **not** advertised as verified opening hours. The current footer has no configured contacts; the assistant has no verified contact or opening-hour source and says this honestly. If public restaurant facts are added later, expose an explicit public-data source before adding them to assistant context. It never queries reservations or user repositories.

## Data sent to OpenAI

Only when configured and a visitor sends a message:

- The current question (max 600 characters).
- Up to six recent conversation entries (max 1200 characters each), including prior selected dish IDs/names for follow-ups. Client history is not trusted as authority.
- Eligible available dish IDs, names (up to 255 characters), normalized menu links/categories, effective euro prices, description excerpts (300 characters), ingredient/allergen excerpts (500 each), and nullable vegetarian/vegan flags. No photos are sent. Only fields already available on the public menu are used.
- The restaurant name and the booking instructions/max party size above; fixed safety instructions and output schema.

No account/session identifiers, IP addresses, authentication headers from visitors, reservation records, payment details, private contacts, or customer database records are added to the provider request. Visitors can type personal information themselves, so the panel asks them not to share it. The API key is sent only as the provider Authorization header.

`store: false` disables Responses application-state storage; it does not promise zero retention or remove provider abuse-monitoring policies. Review OpenAI's data controls for your project. The app does not persist chat transcripts or log provider bodies/messages. The browser keeps at most 20 messages in component memory, sends only six as context, and clears them on Clear conversation, component unmount, or reload. Closing the panel retains the conversation while the component stays mounted. Clearing cancels the browser's request and discards stale UI results, but an already-started provider call may still be billed and runs for at most the server timeout.

## Cost and resource limits

- Request JSON body: 36,000 bytes before parsing; message/history limits above are validated before a provider call.
- Catalog: at most 100 database rows, 44,000 context characters, 56,000 serialized user-input characters. Oversized menus fail honestly and link visitors to browse instead of silently sampling records.
- Output: at most 600 provider tokens, 65,536 HTTP response bytes, 2,000 plan characters, four dish IDs. Rendered answers are bounded server-authored text plus four bounded record cards. All React content is escaped plain text; there is no HTML/Markdown execution.
- Connect timeout: 4 seconds; full provider request/body deadline: 15 seconds; browser wait: 22 seconds. No automatic retries; the visitor must explicitly retry, which uses another request allowance.
- Per backend instance: six valid chat attempts per remote IP per 60-second window, 120 attempts per hour globally, two active requests. All attempts reaching the service, including missing configuration and provider errors, consume limits. Address bookkeeping is capped at 4096 active windows and old windows expire. Client-supplied `X-Forwarded-For` is ignored. Responses use HTTP 429 for limits.
- Limits are **in-memory, per process** and reset on restart. Behind an unconfigured proxy all visitors may share its IP; do not trust arbitrary forwarding headers. For multiple instances or public production scale use a trusted gateway/shared quota store and provider-side spend caps. These local guards are not an account-wide billing ceiling.

## Verification

Run backend tests with the isolated H2 `test` profile used by the existing suites:

```powershell
cd Restaurant
.\mvnw.cmd test
```

`MenuAssistantServiceTests`, `AssistantEndpointTests`, `AssistantLimitsTests`, and `OpenAiMenuProviderTests` cover configuration, CSRF/authorization, request bounds, quotas/concurrency/windows, provider request shape, errors, refusal, malformed/incomplete output, timeouts, body caps, grounding, recorded dietary/allergy fields, updated availability/prices, deterministic totals and valid links. Provider HTTP tests use an in-process loopback mock server and dummy credentials. No real AI request is needed for tests.

Frontend:

```powershell
cd restaurant-frontend
npm run build
npm run lint
npm run test:assistant
```

A real provider request was **not** tested during implementation. After setting your own key/model, manually confirm an answer with your account's model access. Model/schema compatibility and live provider billing behavior remain unverified until then.

Official documentation checked during implementation (21 October 2026):

- [OpenAI text generation / Responses REST request and output](https://developers.openai.com/api/docs/guides/text)
- [Structured outputs: strict text.format JSON Schema, refusals and incomplete responses](https://developers.openai.com/api/docs/guides/structured-outputs)
- [OpenAI data controls and retention](https://developers.openai.com/api/docs/guides/your-data)
