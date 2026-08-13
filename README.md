# Payment Gateway Portal

A full-stack payment gateway application built using React, Node.js, Express, PostgreSQL, JWT authentication, and Razorpay.

The application allows users to register, log in, make secure test payments through Razorpay, track successful and failed transactions, and view payment analytics from a dashboard.

---

## Features

- User registration and login
- Password hashing using bcrypt
- JWT-based authentication
- Protected frontend routes
- Protected backend APIs
- Razorpay payment integration
- Razorpay order creation
- Server-side payment signature verification
- Successful payment tracking
- Failed payment tracking
- Payment failure reason storage
- Duplicate payment prevention
- User-specific transaction history
- Dashboard payment statistics
- Monthly payment analytics
- Recent transaction display
- Detailed transaction view

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
- JWT
- bcrypt
- Razorpay SDK

### Database

- PostgreSQL

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
│   │   └── users.js
│   │
│   ├── db.js
│   ├── server.js
│   ├── package.json
│   └── package-lock.json
│
├── client/
│   ├── public/
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
│   └── package.json
│
├── .gitignore
└── README.md