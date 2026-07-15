# North Travena Server

Backend API for **North Travena** (vehicle booking and services). This repository implements a **REST API** with **Node.js 18+**, **Express 4**, **TypeScript**, and **MongoDB** (via **Mongoose 8**), replacing the earlier Firebase/Firestore data model with a server-owned database and **JWT** authentication.

---

## What has been built so far

### Core platform

| Area | Description |
|------|-------------|
| **HTTP API** | All routes are under the prefix **`/api/v1`**. |
| **Config** | Environment variables via **dotenv** (loads **`.env`** from project root, then **`src/.env`** with override). |
| **Database** | **MongoDB** connection in `src/config/db.ts`; optional **DNS** (`1.1.1.1`, `8.8.8.8`) before connecting to help SRV/Atlas on some networks. |
| **Security** | **helmet**, **cors**, JSON body parser, **bcrypt**-hashed passwords, **JWT** bearer auth, role-based **admin** checks. |
| **Logging** | **morgan** (dev-style request logs). |
| **Errors** | Central **`errorHandler`**: `ApiError` for operational errors, Mongoose validation/cast/duplicate key handling, generic 500 in production. |

### Authentication and users

| Feature | Details |
|---------|---------|
| **Register** | `POST /api/v1/auth/register` — creates a user with **`role: "user"`** only (no client-chosen admin). Fields: `email`, `fullName`, `phoneNo`, `password` (min 6 chars). |
| **Login** | `POST /api/v1/auth/login` — returns JWT + user summary. |
| **Current user** | `GET /api/v1/auth/me` — requires `Authorization: Bearer <token>`. |
| **Admin role** | Not exposed on register. Set `role: "admin"` in MongoDB for a user, then **log in again** so the JWT includes `admin`. |

### Domain models (MongoDB / Mongoose)

Collections map roughly to the old Firestore structure, with clearer types (numbers for money/rates where Firestore used strings).

| Model | File | Purpose |
|-------|------|---------|
| **User** | `src/models/user.model.ts` | `email`, `fullName`, `phoneNo`, `role` (`user` \| `admin`), `password` (hashed, `select: false`), `createdAt`. |
| **Booking** | `src/models/booking.model.ts` | Map/route trip: locations (text + lat/lng), pickup/drop date-time strings, `tripType`, `workingDays`, pricing, `status`, optional vehicle link/label, `paymentSkipped`. |
| **UserService** | `src/models/userService.model.ts` | User “service request” / daily-style booking (vehicle + service type + amount + status). |
| **Service** | `src/models/service.model.ts` | Admin **catalog** (“Our Services”): vehicle + category + pricing; `status` **active** \| **inactive**. |
| **ServiceType** | `src/models/serviceType.model.ts` | Category names (e.g. Luxury Booking, Family Tours). |
| **VehicleRate** | `src/models/vehicleRate.model.ts` | One document per **`one_way`**, **`round`**, **`monthly`** with a **map** of vehicle key → rate. |
| **Notification** | `src/models/notification.model.ts` | User notifications; optional `bookingData` snapshot. |
| **PasswordReset** | `src/models/passwordReset.model.ts` | Schema for reset tokens + **TTL** on `expiresAt`. **No HTTP routes yet** — ready for a forgot-password flow later. |

### Constants

| File | Content |
|------|---------|
| `src/constants/roles.ts` | `user`, `admin`. |
| `src/constants/statuses.ts` | Booking statuses, user-service statuses, `tripType` values for bookings, vehicle-rate trip keys. |

**Booking `tripType` (API):** `oneWay`, `roundTrip`, `monthly` (aliases like `oneway` are normalized in the booking controller).

**Booking `status`:** `Pending`, `Approved`, `Completed`, `Canceled`.

**UserService `status`:** `Pending`, `Approved`, `Cancelled`, `Completed`.

**Vehicle rate URL segment (admin PUT):** `one_way`, `round`, `monthly` (underscore on `one_way`).

---

## Project layout

```
src/
├── app.ts                 # Express app: middleware, /api/v1 routes, 404, error handler
├── server.ts              # connectDb(), listen(PORT)
├── config/
│   ├── db.ts              # DNS + mongoose.connect
│   └── env.ts             # env validation / dotenv paths
├── constants/             # roles, statuses
├── controllers/           # HTTP handlers (thin; use catchAsync)
├── middleware/
│   ├── auth.ts            # requireAuth, requireAdmin (JWT)
│   └── errorHandler.ts
├── models/                # Mongoose schemas
├── routes/                # Route modules mounted in routes/index.ts
├── services/
│   └── auth.service.ts    # register/login/signToken
├── types/
│   └── express.d.ts       # req.user typing
└── utils/
    ├── ApiError.ts
    ├── catchAsync.ts
    └── mongoose.ts        # parseObjectId helper
```

---

## Environment variables

Copy **`.env.example`** to **`.env`** at the **project root** (recommended). `env.ts` also loads **`src/.env`** if present (overrides root).

| Variable | Description |
|----------|-------------|
| `NODE_ENV` | `development` (default) or `production`. |
| `PORT` | HTTP port (default **5000**). |
| `MONGODB_URI` | Mongo connection string (local or Atlas). **Required** for a real deploy; dev fallback may point to localhost. |
| `JWT_SECRET` | Secret for signing JWTs. **Required** in production. |
| `JWT_EXPIRES_IN` | JWT expiry (default `7d`). |

---

## Scripts

| Command | Description |
|---------|-------------|
| `npm run dev` | Run **`src/server.ts`** with **tsx** (watch mode). Use this while developing. |
| `npm run build` | Compile TypeScript to **`dist/`**. |
| `npm start` | Run **`dist/server.js`** (run **`npm run build`** first after changes). |
| `npm run typecheck` | `tsc --noEmit` type check. |

**Prerequisites:** Node **18+**, running **MongoDB** (or Atlas URI in `.env`).

---

## API reference

Base URL: **`http://localhost:<PORT>/api/v1`** (replace `<PORT>` with your `PORT`).

### Public (no auth)

| Method | Path | Description |
|--------|------|-------------|
| GET | `/health` | Liveness / uptime JSON. |
| POST | `/auth/register` | Register user (`email`, `fullName`, `phoneNo`, `password`). |
| POST | `/auth/login` | Login (`email`, `password`) → `token`. |
| GET | `/services` | Active catalog; optional query `?serviceType=...` (match stored category string). |
| GET | `/services/:id` | Single **active** catalog item. |
| GET | `/service-types` | List all service type (category) documents. |
| GET | `/vehicle-rates` | List all vehicle rate documents (`tripType` + `rates` object). |

### Authenticated user (`Authorization: Bearer <token>`)

| Method | Path | Description |
|--------|------|-------------|
| GET | `/auth/me` | Current user profile. |
| GET | `/bookings` | Own map bookings; optional `?status=Pending` (etc.). |
| POST | `/bookings` | Create map booking (see controller for required fields: locations, dates, `tripType`, amounts, etc.). |
| PATCH | `/bookings/:id/cancel` | User cancel own booking if **Pending** or **Approved**. |
| GET | `/user-services` | Own service requests; optional `?status=...`. |
| POST | `/user-services` | Create service request. |
| PATCH | `/user-services/:id/cancel` | Cancel own request if **Pending**. |
| GET | `/notifications` | Own notifications; optional `?read=true` \| `false`. |
| PATCH | `/notifications/:id/read` | Mark one notification read. |

### Admin (`Bearer` token + user `role: "admin"` in DB)

All under **`/admin`**, same auth header.

| Method | Path | Description |
|--------|------|-------------|
| GET | `/admin/users` | List users; optional `?role=user\|admin`, `?q=` search email/name/phone. |
| GET | `/admin/users/:id` | Single user (no password). |
| GET | `/admin/bookings` | All bookings; optional `?status=`. |
| GET | `/admin/bookings/:id` | One booking (+ populated `userId` summary). |
| PATCH | `/admin/bookings/:id` | Body `{ "status": "Approved" \| ... }`. |
| GET | `/admin/user-services` | All user service rows; optional `?status=`. |
| PATCH | `/admin/user-services/:id` | Body `{ "status": "..." }`. |
| GET | `/admin/services` | Catalog (all statuses); optional `?serviceType=`, `?status=active\|inactive`. |
| POST | `/admin/services` | Create catalog row. |
| GET | `/admin/services/:id` | One catalog row (any status). |
| PATCH | `/admin/services/:id` | Partial update. |
| DELETE | `/admin/services/:id` | Soft delete → `inactive`. |
| POST | `/admin/service-types` | Body `{ "name": "Luxury Booking" }`. |
| PUT | `/admin/vehicle-rates/:tripType` | `:tripType` = `one_way` \| `round` \| `monthly`; body `{ "rates": { "TZ": 400, ... } }`. |

---

## Response shape

- Success: typically `{ "success": true, "data": ... }` (some list endpoints also include `count`).
- Errors: `{ "success": false, "message": "..." }` with appropriate HTTP status (`400`, `401`, `403`, `404`, `409`, `500`).

---

## Postman tips

1. Use an **Environment** with `baseUrl` = `http://localhost:5000/api/v1`.
2. After **login**, save `data.token` and use **Authorization → Bearer Token**.
3. After promoting a user to **admin** in MongoDB, **login again** to refresh the JWT.

---

## Not implemented yet (intentional / next steps)

- **Forgot password / reset email** — `PasswordReset` model exists; no routes or mailer wired.
- **Payments** — bookings support `paymentSkipped`; no gateway or transactions collection usage yet.
- **Google Maps / geocoding / directions** — pricing fields are accepted as sent by the client; server does not call Google APIs yet.
- **Automatic notifications** when booking status changes — `Notification` CRUD exists; no hooks from booking updates yet.
- **Pagination** on large lists (users, bookings, etc.) — currently returns full result sets.
- **Admin self-service** — no secure “create first admin” or invite flow; admin is set in the database.

---

## Troubleshooting

| Symptom | Likely cause |
|---------|----------------|
| **`ECONNREFUSED` / Mongo errors** | Mongo not running, wrong `MONGODB_URI`, or network/DNS; confirm Atlas IP allowlist for Atlas. |
| **`404` `Route not found` on new routes** | Server process running **old code** — stop and **`npm run dev`** again; if using **`npm start`**, run **`npm run build`** first. |
| **`403` on `/admin/*`** | JWT user is not `admin`, or token issued before role change — **login again**. |

---

## License / ownership

Private project (**`"private": true`** in `package.json`). Adjust this section for your organization as needed.
