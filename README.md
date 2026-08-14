# Payment Processing Portal

A full-stack payment processing portal built using **React, Node.js, Express, PostgreSQL, JWT, and Razorpay**.

The application integrates Razorpay Checkout for payment processing and provides authentication, server-side payment verification, webhook-based payment event handling, transaction tracking, failure monitoring, and dashboard analytics.

> This project integrates Razorpay as the payment gateway rather than implementing a payment gateway from scratch.

---

## Features

- User registration and login
- Password hashing using bcrypt
- JWT-based authentication
- Protected frontend routes
- Protected backend APIs
- Razorpay Checkout integration
- Razorpay order creation
- Server-side payment signature verification
- Successful payment tracking
- Failed payment tracking
- Payment failure reason storage
- Razorpay Order ID and Payment ID tracking
- Duplicate payment prevention
- Razorpay webhook integration
- Webhook signature verification
- Server-to-server payment event handling
- Idempotent webhook processing
- Duplicate webhook event protection
- User-specific transaction history
- Expandable transaction details
- Dashboard payment statistics
- Monthly payment analytics
- Recent transaction display

---

## Tech Stack

### Frontend

- React
- Vite
- React Router
- Chart.js
- react-chartjs-2
- CSS

### Backend

- Node.js
- Express.js
- JSON Web Tokens (JWT)
- bcrypt
- Razorpay Node.js SDK

### Database

- PostgreSQL

### Development / Testing

- Razorpay Test Mode
- ngrok for local webhook testing
- Git & GitHub

---

## Project Structure

```text
payment-gateway-portal/
│
├── backend/
│   ├── config/
│   │   └── razorpay.js
│   │
│   ├── middleware/
│   │   └── auth.js
│   │
│   ├── routes/
│   │   ├── dashboard.js
│   │   ├── payments.js
│   │   ├── users.js
│   │   └── webhook.js
│   │
│   ├── db.js
│   ├── server.js
│   ├── package.json
│   └── package-lock.json
│
├── client/
│   ├── public/
│   │   └── favicon.svg
│   │
│   ├── src/
│   │   ├── components/
│   │   │   └── ProtectedRoute.jsx
│   │   │
│   │   ├── pages/
│   │   │   ├── Dashboard.jsx
│   │   │   ├── Dashboard.css
│   │   │   ├── Login.jsx
│   │   │   ├── Register.jsx
│   │   │   ├── MakePayment.jsx
│   │   │   ├── MakePayment.css
│   │   │   ├── PaymentHistory.jsx
│   │   │   └── PaymentHistory.css
│   │   │
│   │   ├── App.jsx
│   │   ├── index.css
│   │   └── main.jsx
│   │
│   ├── package.json
│   └── vite.config.js
│
├── .gitignore
└── README.md
```

---

## Authentication Flow

```text
User Login
    ↓
Backend validates credentials
    ↓
bcrypt verifies password
    ↓
JWT token generated
    ↓
Token stored in browser
    ↓
Token sent with protected API requests
    ↓
JWT middleware verifies token
    ↓
Protected resource returned
```

The backend derives the authenticated user's ID from the verified JWT instead of trusting a `user_id` supplied by the frontend.

---

## Payment Flow

```text
User enters payment amount
        ↓
React requests Razorpay order
        ↓
Backend creates Razorpay order
        ↓
Razorpay Checkout opens
        ↓
User completes payment
        ↓
Frontend receives payment response
        ↓
Backend verifies Razorpay signature
        ↓
Backend fetches Razorpay payment
        ↓
Order ownership verified
        ↓
Payment amount verified
        ↓
Payment status verified
        ↓
Transaction stored in PostgreSQL
```

The payment amount stored in the database is obtained from the Razorpay order rather than trusting the frontend amount.

---

## Failed Payment Flow

```text
Payment fails in Razorpay
        ↓
Razorpay payment.failed event
        ↓
Frontend sends failure information
        ↓
Backend verifies Razorpay order
        ↓
Payment information retrieved
        ↓
Actual payment method recorded
        ↓
Failure reason stored
        ↓
FAILED transaction saved in PostgreSQL
```

Failed transactions store information including:

- Razorpay Order ID
- Razorpay Payment ID
- Payment method
- Failure reason
- Internal transaction reference

---

## Webhook Flow

Razorpay webhooks provide a **server-to-server reliability layer** so payment status updates do not depend only on the browser callback.

```text
                 Razorpay
                    ↓
       payment.captured / payment.failed
                    ↓
       POST /api/webhooks/razorpay
                    ↓
          Verify webhook signature
                    ↓
         Check Razorpay Event ID
                    ↓
          Duplicate event check
                    ↓
           Fetch Razorpay order
                    ↓
       Validate user and payment amount
                    ↓
        ┌───────────┴───────────┐
        ↓                       ↓
 payment.captured         payment.failed
        ↓                       ↓
 Store / update           Store / update
    SUCCESS                  FAILED
        └───────────┬───────────┘
                    ↓
              PostgreSQL
```

The application currently handles:

- `payment.captured`
- `payment.failed`

Webhook event IDs are stored in the `webhook_events` table to prevent duplicate processing.

Webhook processing uses a PostgreSQL transaction so that the webhook event and transaction update are committed together.

---

## Idempotency and Duplicate Protection

Payment systems may receive the same callback or webhook event more than once.

The application protects against duplicate processing at multiple levels:

### Payment ID Protection

`razorpay_payment_id` is unique in the transactions table.

This prevents the same Razorpay payment from being inserted multiple times.

### Webhook Event Protection

Each Razorpay webhook contains an event ID.

Processed event IDs are stored in:

```text
webhook_events
```

If the same webhook event is delivered again, the backend detects it and safely ignores the duplicate.

### Payment State Protection

A transaction already marked as:

```text
SUCCESS
```

is not downgraded to:

```text
FAILED
```

if webhook events arrive in an unexpected order.

---

## Security Features

- Passwords are hashed using bcrypt
- JWT authentication protects backend APIs
- Protected React routes prevent unauthenticated navigation
- Backend authorization does not rely on frontend user IDs
- Razorpay Checkout signatures are verified using HMAC-SHA256
- Razorpay webhook signatures are verified using HMAC-SHA256
- Payment ownership is validated using Razorpay order metadata
- Payment amount is validated against the Razorpay order
- Payment status is verified before recording success
- Duplicate payments are prevented
- Duplicate webhook events are ignored
- PostgreSQL transactions are used during webhook processing
- Razorpay secret keys remain on the backend
- Environment files are excluded from Git

---

## Dashboard Analytics

The dashboard provides:

- Total successful payment amount
- Total number of transactions
- Successful transaction count
- Failed transaction count
- Recent transactions
- Monthly successful payment analytics
- Chart-based payment visualization

---

## Payment History

Users can view their complete payment history.

The main transaction table displays:

- Amount
- Payment method
- Status
- Transaction reference
- Date

Each transaction also provides an expandable **View Details** section containing:

- Amount
- Currency
- Status
- Payment method
- Internal transaction reference
- Razorpay Order ID
- Razorpay Payment ID
- Date and time
- Failure reason for failed payments

---

## Database

The project uses PostgreSQL.

### Main Tables

```text
users
transactions
webhook_events
```

### Transactions Table

The `transactions` table stores information such as:

```text
id
user_id
amount
currency
status
payment_method
transaction_reference
razorpay_payment_id
razorpay_order_id
failure_reason
created_at
```

### Webhook Events Table

The `webhook_events` table stores processed Razorpay webhook events:

```text
id
event_id
event_type
processed_at
```

The unique `event_id` prevents the same webhook from being processed multiple times.

---

## API Routes

### Authentication

```text
POST /api/users/register
POST /api/users/login
```

### Payments

```text
POST /api/payments/create-order
POST /api/payments/verify-payment
POST /api/payments/record-failure
GET  /api/payments/history
GET  /api/payments/:transaction_reference
```

### Dashboard

```text
GET /api/dashboard
```

### Razorpay Webhooks

```text
POST /api/webhooks/razorpay
```

---

## Running the Project Locally

### Prerequisites

Install:

- Node.js
- PostgreSQL
- npm
- Razorpay Test Mode account

---

### 1. Clone the Repository

```bash
git clone <repository-url>
cd payment-gateway-portal
```

---

### 2. Backend Setup

```bash
cd backend
npm install
```

Create:

```text
backend/.env
```

Add:

```env
PORT=5000

DB_USER=your_postgres_user
DB_HOST=localhost
DB_NAME=payment_gateway
DB_PASSWORD=your_postgres_password
DB_PORT=5432

JWT_SECRET=your_jwt_secret

RAZORPAY_KEY_ID=your_razorpay_key_id
RAZORPAY_KEY_SECRET=your_razorpay_key_secret

RAZORPAY_WEBHOOK_SECRET=your_webhook_secret
```

Never commit the `.env` file.

Start the backend in development mode:

```bash
npm run dev
```

Or start normally:

```bash
npm start
```

Backend:

```text
http://localhost:5000
```

---

### 3. Frontend Setup

Open another terminal:

```bash
cd client
npm install
```

Create:

```text
client/.env
```

Add:

```env
VITE_RAZORPAY_KEY_ID=your_razorpay_key_id
```

Start the frontend:

```bash
npm run dev
```

Frontend:

```text
http://localhost:5173
```

---

## Testing Razorpay Webhooks Locally

Razorpay cannot directly send webhooks to:

```text
localhost
```

A tunneling service such as ngrok can expose the backend temporarily.

With the backend running on port `5000`:

```bash
ngrok http 5000
```

ngrok provides a public HTTPS URL such as:

```text
https://example.ngrok-free.app
```

Configure the Razorpay Test Mode webhook URL as:

```text
https://example.ngrok-free.app/api/webhooks/razorpay
```

Use the same webhook secret configured in:

```env
RAZORPAY_WEBHOOK_SECRET
```

Enable:

```text
payment.captured
payment.failed
```

---

## Environment Variables

### Backend

```text
PORT
DB_USER
DB_HOST
DB_NAME
DB_PASSWORD
DB_PORT
JWT_SECRET
RAZORPAY_KEY_ID
RAZORPAY_KEY_SECRET
RAZORPAY_WEBHOOK_SECRET
```

### Frontend

```text
VITE_RAZORPAY_KEY_ID
```

---

## Key Engineering Concepts Demonstrated

This project demonstrates practical implementation of:

- REST API development
- Authentication and authorization
- Password hashing
- JWT middleware
- Relational database design
- SQL aggregation
- Third-party payment API integration
- Server-side payment verification
- HMAC signature verification
- Webhook processing
- Event-driven backend communication
- Idempotency
- Duplicate-event handling
- Database transactions
- Error handling
- Protected frontend routing
- Payment analytics
- Full-stack application architecture

---

## Future Improvements

- Deploy frontend and backend
- HttpOnly cookie-based authentication
- Refresh token implementation
- Payment history pagination
- Transaction search and filtering
- Downloadable payment receipts
- Refund handling
- Payment reconciliation
- Additional webhook events
- Automated testing

---

## Disclaimer

This project uses **Razorpay Test Mode** and was developed for educational and portfolio purposes.

Razorpay handles the underlying payment gateway infrastructure. This application implements the surrounding payment-processing workflow, including authentication, order creation, verification, transaction management, webhooks, and analytics.

---

## Author

**Aryan Kumar**