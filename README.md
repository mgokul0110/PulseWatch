# PulseWatch – API Uptime & Performance Monitoring

PulseWatch is a full-stack API monitoring platform that continuously monitors API endpoints, tracks uptime and response times, and detects service disruptions through incident tracking.

**Live Demo:** https://pulse-watch-ashy.vercel.app

**Backend API:** https://pulsewatch-api-6xln.onrender.com/api/health

## Features

- **User Authentication:** Secure registration and login using JWT and bcrypt.
- **API Monitoring:** Add, configure, update, pause, resume and delete API monitors.
- **Automated Monitoring:** Scheduled health checks based on configured monitoring intervals.
- **Performance Tracking:** Record HTTP status codes and response times.
- **Incident Management:** Automatically detect failures and resolve incidents when services recover.
- **Dashboard Analytics:** View monitored APIs, healthy services, incidents and average response time.
- **Monitoring History:** Review historical checks and incident records.
- **SSRF Protection:** Validate URLs, inspect DNS resolutions, block private IP destinations and pin requests to validated addresses.

## Tech Stack

| Layer | Technologies |
|---|---|
| Frontend | React, TypeScript, Vite, Tailwind CSS |
| Backend | Node.js, Express.js |
| Database | PostgreSQL (Neon) |
| Authentication | JWT, bcrypt |
| HTTP Client | Axios |
| Deployment | Vercel, Render |
| Version Control | Git, GitHub |

## Architecture

```text
                 USER
                  |
                  v
        React + TypeScript Frontend
                Vercel
                  |
             REST API
                  |
                  v
          Node.js + Express
                Render
                  |
       +----------+-----------+
       |          |           |
       v          v           v
 Authentication  Monitor   Dashboard
    (JWT)       Service    Analytics
                  |
                  v
           Monitoring Scheduler
                  |
                  v
           External API Endpoints
                  |
                  v
           PostgreSQL (Neon)
       Users | Monitors | Checks
                Incidents
```

## Project Structure

```text
PulseWatch/
├── frontend/
│   ├── src/
│   │   ├── components/
│   │   ├── pages/
│   │   ├── services/
│   │   └── ...
│   └── package.json
│
├── server/
│   ├── config/
│   ├── controllers/
│   ├── database/
│   ├── middleware/
│   ├── routes/
│   ├── services/
│   ├── server.js
│   └── package.json
│
└── README.md
```

## Getting Started

### Prerequisites

- Node.js and npm
- PostgreSQL database
- Git

### 1. Clone the repository

```bash
git clone https://github.com/mgokul0110/PulseWatch.git
cd PulseWatch
```

### 2. Configure the backend

```bash
cd server
npm install
```

Create a `.env` file:

```env
PORT=5001
DATABASE_URL=your_postgresql_connection_string
JWT_SECRET=your_secure_secret
FRONTEND_URL=http://localhost:5173
NODE_ENV=development
```

Initialize the database using the project's database initialization script, if the database has not already been initialized.

Start the backend:

```bash
npm run dev
```

### 3. Configure the frontend

Open another terminal:

```bash
cd frontend
npm install
```

Create a `.env` file:

```env
VITE_API_BASE_URL=http://localhost:5001/api
```

Start the frontend:

```bash
npm run dev
```

Open the local Vite URL shown in your terminal.

## Environment Variables

| Variable | Purpose |
|---|---|
| `PORT` | Backend server port |
| `DATABASE_URL` | PostgreSQL connection string |
| `JWT_SECRET` | Secret used to sign JWTs |
| `FRONTEND_URL` | Allowed frontend origin(s) |
| `NODE_ENV` | Application environment |
| `VITE_API_BASE_URL` | Frontend API base URL |

Never commit `.env` files or expose database credentials and JWT secrets.

## Core API Routes

| Method | Endpoint | Purpose |
|---|---|---|
| POST | `/api/auth/register` | Register a user |
| POST | `/api/auth/login` | Authenticate a user |
| GET | `/api/monitors` | Retrieve monitors |
| POST | `/api/monitors` | Create a monitor |
| GET | `/api/monitors/:id` | Retrieve monitor details |
| PUT | `/api/monitors/:id` | Update a monitor |
| DELETE | `/api/monitors/:id` | Delete a monitor |
| POST | `/api/checks/:id` | Trigger a manual check |
| GET | `/api/dashboard/stats` | Retrieve dashboard statistics |
| GET | `/api/monitor-status` | Retrieve monitor statuses |
| GET | `/api/check-history/:id` | Retrieve check history |
| GET | `/api/incidents/:id` | Retrieve incident history |
| GET | `/api/health` | Check API health |

Protected endpoints require a JWT Bearer token.

## Security

- Password hashing with bcrypt.
- JWT-based authentication.
- User-scoped monitor access.
- URL and protocol validation.
- Private and reserved IP address blocking.
- DNS resolution validation and IP pinning to mitigate DNS rebinding.
- Redirects disabled during monitoring requests.
- Environment-based secret management.

## Deployment

- Frontend: Vercel
- Backend: Render
- Database: Neon PostgreSQL

**Note:** The current Render free instance can spin down after inactivity. This can delay requests and interrupt continuous monitoring. See the production reliability section before relying on PulseWatch for critical uptime monitoring.

## Future Improvements

- Email and notification alerts.
- Public status pages.
- Historical uptime reports.
- Multi-region monitoring.
- Advanced performance analytics.
- More reliable background job scheduling.

## Author

**Gokul M**

Computer Science and Engineering

GitHub: https://github.com/mgokul0110

---

*PulseWatch – Monitor smarter. Detect faster. Stay reliable.*
