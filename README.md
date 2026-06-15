# Concierge os

Backend API for **Concierge OS** — a hotel and property management platform that powers an owner dashboard and an embeddable guest booking widget. Property owners manage rooms, services, staff, and bookings; guests book rooms and request concierge services through a public widget.

## Features

### Property & room management
- Register properties (Hotel, Villa, Apartment, Dorm)
- Define room types with pricing, capacity, and tags
- Create individual rooms with floor, status, and image uploads (AWS S3)
- Track room availability and maintenance status

### Service catalog
- Create hotel-specific services (spa, dining, amenities, etc.)
- Add service items with quantity- or person-based pricing
- Support free and paid items with auto-inclusion flags
- Map staff members to services for automatic assignment

### Bookings
- **Room bookings** — check-in/check-out, guest details, pricing, and status lifecycle (`pending` → `confirmed` → `checked_in` → `checked_out` / `cancelled`)
- **Service bookings** — guests request items during an active stay; staff are auto-assigned from service mappings
- Automated cron jobs for no-show warnings and cancellations

### Payments
- Razorpay integration for room and service payments
- JWT-based payment tokens for secure checkout pages
- Webhook handler for `payment.captured` events with confirmation emails

### Authentication
- **Dashboard users** (owners) — email/password signup with OTP verification, JWT access/refresh tokens, Google OAuth
- **Widget guests** — separate guest accounts for the embeddable booking widget

### Dashboard analytics
- Overview metrics (bookings, check-ins, services, staff) with week/month/year timeframes
- Room and service booking charts
- Latest bookings feed

### Notifications
- HTML email templates for OTP, booking confirmation, service bookings, check-in warnings, and cancellations (Nodemailer)

## Tech stack

| Layer | Technology |
|-------|------------|
| Runtime | Node.js 20 |
| Language | TypeScript |
| Framework | Express 5 |
| Database | MongoDB (Mongoose) |
| Validation | Zod |
| Auth | JWT, bcrypt |
| Payments | Razorpay |
| File storage | AWS S3 (multer-s3) |
| Email | Nodemailer |
| Scheduling | node-cron |
| Security | Helmet, CORS, express-rate-limit (optional) |

## Architecture

The API exposes two route namespaces with different CORS policies:

```
┌─────────────────────────────────────────────────────────────┐
│                     Concierge AI Backend                     │
├──────────────────────────┬──────────────────────────────────┤
│   /api/v1/*              │   /widget/*                       │
│   Owner dashboard APIs   │   Public embeddable widget APIs   │
│   CORS: CLIENT_URL       │   CORS: *                         │
│   Bearer JWT (owners)    │   Bearer JWT (widget guests)      │
└──────────────────────────┴──────────────────────────────────┘
                              │
                    ┌─────────┴─────────┐
                    │     MongoDB       │
                    └───────────────────┘
                              │
              ┌───────────────┼───────────────┐
              │               │               │
         AWS S3          Razorpay        SMTP (email)
```

## Project structure

```
concierge-ai/
├── src/
│   ├── app.ts                 # Express app, middleware, route mounting
│   ├── server.ts              # Entry point, DB connection
│   ├── controllers/           # Request handlers
│   ├── database/              # MongoDB connection
│   ├── helper/                # Shared utilities (charts, JWT helpers)
│   ├── jobs/                  # Cron jobs (booking cleanup, warnings)
│   ├── middlewares/           # Auth, file upload, role checks
│   ├── models/                # Mongoose schemas
│   ├── routes/                # Route definitions
│   ├── templates/             # HTML email templates
│   ├── types/                 # TypeScript types
│   ├── utils/                 # JWT, AWS, Razorpay, email, Zod helpers
│   └── validators/            # Zod validation schemas
├── Dockerfile                 # Multi-stage production build
├── docker-compose.yml         # Container deployment
├── dev.html                   # Widget embed example
├── package.json
└── tsconfig.json
```

## Getting started

### Prerequisites

- Node.js 20+
- MongoDB instance (local or Atlas)
- AWS S3 bucket (for room image uploads)
- Razorpay account (for payments)
- SMTP credentials (for transactional email)

### Installation

```bash
git clone <repository-url>
cd concierge-ai
npm install
```

### Environment variables

Create a `.env` file in the project root:

```env
# Server
PORT=3000
CLIENT_URL=http://localhost:5173

# Database
MongodbURI=mongodb://localhost:27017/concierge

# JWT
AccessTokenSecret=your-access-token-secret
RefreshTokenSecret=your-refresh-token-secret
PaymentJwtSecret=your-payment-jwt-secret
JWT_SECRET=your-jwt-secret

# Email (Nodemailer)
EMAIL_USER=your-email@gmail.com
EMAIL_PASS=your-app-password

# AWS S3
Aws_Region=ap-south-1
Aws_Access_Key_Id=your-access-key
Aws_Access_Key_Secret=your-secret-key
Aws_Bucket_Name=your-bucket-name

# Razorpay
RazorpayKeyId=your-razorpay-key-id
RazorpayKeySecret=your-razorpay-key-secret
WEBHOOK_SECRET=your-razorpay-webhook-secret
```

### Development

```bash
npm run dev
```

The server starts at `http://localhost:3000` (or the port set in `PORT`).

### Production build

```bash
npm run build
npm start
```

Compiled output is written to `dist/`.

## API overview

All dashboard routes are prefixed with `/api/v1`. Widget routes mirror key endpoints under `/widget`.

### Authentication (`/api/v1/auth` and `/widget/auth`)

| Method | Endpoint | Description |
|--------|----------|-------------|
| POST | `/signup` | Register property owner |
| POST | `/verify` | Verify OTP and receive tokens |
| POST | `/login` | Owner login |
| POST | `/resend-otp` | Resend verification OTP |
| POST | `/google-auth` | Google OAuth login |
| POST | `/refresh-accesstoken` | Refresh access token |
| GET | `/userDetails` | Get authenticated owner profile |
| POST | `/registerWidgetUser` | Register widget guest |
| POST | `/loginWidgetUser` | Widget guest login |
| POST | `/logoutWidgetUser` | Widget guest logout |
| GET | `/widget-user` | Get widget guest profile |

### Property (`/api/v1/property`)

| Method | Endpoint | Auth | Description |
|--------|----------|------|-------------|
| POST | `/register-property` | Owner | Register a new property |
| GET | `/property-details/:id` | — | Get property by ID |

### Rooms (`/api/v1/room`)

| Method | Endpoint | Auth | Description |
|--------|----------|------|-------------|
| POST | `/create-type` | Owner | Create room type |
| GET | `/get-type` | — | List room types |
| POST | `/create-room` | Owner | Create room (with images) |
| GET | `/get-rooms` | — | List rooms |
| GET | `/get-room-status` | — | Room availability status |
| GET | `/get-room-types` | — | Room types with counts (widget) |
| GET | `/get-rooms-for-widget` | Widget guest | Rooms for booking widget |

### Room bookings (`/api/v1/room-bookings`)

| Method | Endpoint | Auth | Description |
|--------|----------|------|-------------|
| POST | `/book-room` | — | Book room via guest ID |
| POST | `/` | Owner | Create room booking |
| GET | `/get-bookings` | — | List bookings |
| GET | `/get-bookings/upcoming` | — | Upcoming bookings |
| GET | `/dynamic-bookings` | — | Dynamic booking data |
| PUT | `/:id` | — | Update booking |
| DELETE | `/:id` | — | Cancel booking |

### Services (`/api/v1/services`)

| Method | Endpoint | Auth | Description |
|--------|----------|------|-------------|
| POST | `/` | Owner | Create service |
| GET | `/` | — | List services |
| GET | `/:id` | — | Get service by ID |
| PUT | `/:id` | Owner | Update service |
| DELETE | `/:id` | Owner | Delete service |

### Service items (`/api/v1/service-items`)

| Method | Endpoint | Auth | Description |
|--------|----------|------|-------------|
| POST | `/` | Owner | Create service item |
| GET | `/` | Owner | List items |
| PUT | `/:id` | Owner | Update item |
| DELETE | `/:id` | Owner | Delete item |

### Staff (`/api/v1/staff`)

| Method | Endpoint | Auth | Description |
|--------|----------|------|-------------|
| POST | `/` | Owner | Create staff member |
| GET | `/` | Owner | List staff |
| GET | `/staff-list` | Owner | Staff list (simplified) |
| DELETE | `/:id` | Owner | Remove staff |

### Staff–service mappings (`/api/v1/staff-service-mappings`)

| Method | Endpoint | Auth | Description |
|--------|----------|------|-------------|
| POST | `/` | Owner | Map staff to service |
| GET | `/:id` | Owner | Get mappings |
| PUT | `/:id` | Owner | Update mapping |
| DELETE | `/:id` | Owner | Delete mapping |

### Service bookings (`/api/v1/bookings`)

| Method | Endpoint | Auth | Description |
|--------|----------|------|-------------|
| GET | `/browse` | — | Browse available services |
| POST | `/` | Widget guest | Create service booking |
| GET | `/` | Owner | List bookings |
| GET | `/:id` | — | Get booking by ID |
| PUT | `/:id` | — | Update booking status |

### Overview / analytics (`/api/v1/overview`)

| Method | Endpoint | Auth | Description |
|--------|----------|------|-------------|
| GET | `/` | Owner | Dashboard overview (`?timeframe=week\|month\|year`) |
| GET | `/room-bookings` | Owner | Room booking chart data |
| GET | `/service-bookings` | Owner | Service booking chart data |
| GET | `/latest-bookings` | Owner | Recent bookings |

### Payments (`/api/v1/payment`)

| Method | Endpoint | Description |
|--------|----------|-------------|
| GET | `/:id` | Fetch payment details from JWT token |
| POST | `/razorpay` | Razorpay webhook (signature verified) |

## Widget integration

Guests interact with properties through an embeddable widget. Add the following snippet to any webpage (see `dev.html` for a working example):

```html
<div
  data-booking-widget
  data-hotel-name="Your Hotel Name"
  data-hotel-id="<property-mongodb-id>"
></div>
<script
  type="module"
  src="https://widget.conciergeservice.in/widget.js"
></script>
```

Widget routes under `/widget` expose auth, property, room, room-booking, services, and service-booking endpoints without dashboard CORS restrictions.

## Scheduled jobs

Cron jobs start automatically when the server boots (`src/jobs/booking.ts`):

| Job | Schedule | Action |
|-----|----------|--------|
| `sendWarningCron` | Every hour | Email guests who missed check-in (2+ hours past check-in) |
| `cancelBookingCron` | Every hour at :10 | Cancel bookings 3+ hours past check-in and notify guests |
| `startBookingCron` | Every 5 min *(disabled)* | Cancel pending bookings older than 30 minutes |

## Docker deployment

Build and run with Docker:

```bash
docker build -t concierge-backend .
docker run -p 8000:8000 --env-file .env concierge-backend
```

Or use Docker Compose:

```bash
docker compose up -d
```

The production image exposes port **8000**. Set `PORT=8000` in your `.env` when deploying via Docker.

## Data models

| Model | Purpose |
|-------|---------|
| `User` | Property owners (`owner`), staff, guests, admins |
| `WidgetUser` | Guest accounts for the booking widget |
| `Property` | Hotels, villas, apartments, dorms |
| `RoomType` | Room categories with pricing and capacity |
| `Room` | Individual rooms with images and status |
| `RoomBooking` | Stay reservations with check-in/out lifecycle |
| `Service` | Hotel service categories (spa, dining, etc.) |
| `ServiceItem` | Bookable items within a service |
| `Staff` | Hotel staff with availability flags |
| `StaffServiceMapping` | Links staff to services for auto-assignment |
| `Booking` | Service item requests tied to a room stay |

## Scripts

| Command | Description |
|---------|-------------|
| `npm run dev` | Start dev server with hot reload (`ts-node-dev`) |
| `npm run build` | Compile TypeScript to `dist/` |
| `npm start` | Run compiled production server |

## License

ISC
