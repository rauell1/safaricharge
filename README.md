# ☀️ SafariCharge Solar Dashboard

A modern web dashboard for monitoring, managing, and analyzing solar energy systems.
The platform provides a structured interface for viewing solar performance data, managing uploaded records, and generating downloadable reports for energy system analysis.

Built using a modern full-stack JavaScript architecture, the dashboard is designed to support scalable solar monitoring systems, data visualization, and operational insights for renewable energy deployments.

---

# 🚀 Key Features

* 📊 **Solar Data Visualization** - Interactive charts and tables for monitoring system performance
* 📁 **File Upload & Download Management** - Store and retrieve solar monitoring data
* 🗄️ **Database Integration** - Structured data storage using Prisma ORM
* ⚡ **Modern Dashboard UI** - Built with Tailwind CSS and reusable UI components
* 📱 **Responsive Design** - Works across desktop, tablet, and mobile devices
* 🔄 **Scalable Architecture** - Built using Next.js App Router for modern web applications

---

# 🧰 Technology Stack

## Core Framework

* **Next.js** - Production-ready React framework with App Router
* **TypeScript** - Type-safe JavaScript for improved maintainability
* **Node.js** - Runtime environment

## UI & Frontend

* **Tailwind CSS** - Utility-first styling framework
* **shadcn/ui** - Accessible, reusable component library
* **Lucide React** - Modern icon library
* **Framer Motion** - Smooth animations and transitions

## State Management & Data Fetching

* **Zustand** - Lightweight global state management
* **TanStack Query** - Efficient server state synchronization

## Data & Backend

* **Prisma ORM** - Type-safe database access
* **SQLite / Configurable Database** - Local or remote database via Prisma

## Data Visualization

* **Recharts** - Interactive charts and dashboards

---

# 📋 System Requirements

Before running the project locally, ensure the following tools are installed:

* **Node.js (v18 or later recommended)**
* **npm** (comes with Node.js)
* **Git**
* **A code editor such as Visual Studio Code**

Verify installation:

```bash
node -v
npm -v
```

---

# 📥 Installation

## 1. Clone the Repository

```bash
git clone https://github.com/YOUR_USERNAME/YOUR_REPOSITORY_NAME.git
```

Navigate to the project folder:

```bash
cd dashboard
```

---

## 2. Install Dependencies

Install all required packages:

```bash
npm install
```

This installs all dependencies listed in `package.json`.

---

# ⚙️ Environment Configuration

Copy the provided template and fill in your values:

```bash
cp .env.example .env
```

Next.js loads both `.env` and `.env.local`; use `.env.local` for local overrides (it is gitignored).

| Variable | Required | Description |
|---|---|---|
| `DATABASE_URL` | Yes | Prisma database connection string, e.g. `file:./dev.db` |
| `GEMINI_API_KEY` | Optional | Google Gemini API key for SafariCharge AI. Get one at [aistudio.google.com/apikey](https://aistudio.google.com/apikey). Without it the app falls back to the Z.AI SDK. |

**Gemini AI**: The app tries, in order: `gemini-2.5-flash`, `gemini-2.5-flash-lite`, `gemini-1.5-flash`, `gemini-1.5-pro`, `gemini-2.0-flash`. If all fail, the Z.AI SDK is used. Restart the dev server after changing the key. For "Model unavailable" or key errors, create a new key at [aistudio.google.com/apikey](https://aistudio.google.com/apikey).

---

# 🗄️ Database Setup (Prisma)

Run Prisma migrations to create the database schema.

Development setup:

```bash
npx prisma migrate dev
```

Generate the Prisma client:

```bash
npx prisma generate
```

For deployment environments:

```bash
npx prisma migrate deploy
```

---

# ▶️ Running the Application

Start the development server:

```bash
npm run dev
```

The application will start locally at:

```
http://localhost:3000
```

---

# 🏗️ Build for Production

Create a production build:

```bash
npm run build
```

Start the production server:

```bash
npm start
```

---

# 📁 Project Structure

```
dashboard/
├── prisma/           Database schema and migrations
├── src/
│   ├── app/         Next.js App Router (pages, API routes)
│   ├── components/  Reusable UI components
│   └── lib/         Utilities and config
├── public/           Static assets
├── .env.example      Environment template
├── package.json      Dependencies and scripts
├── next.config.ts    Next.js config
└── README.md
```

---

# 📊 Development Notes

Some folders are generated automatically and are intentionally excluded from Git:

* `node_modules`
* `.next`
* `upload`
* `download`
* `.env`

These will be created automatically during development.

---

# ⚡ Simulation Design: 420 Data Points Per Day

The physics simulation uses a fixed time step of **24 h ÷ 420 = ~3.43 minutes** per sample.  
This gives exactly **420 data points per simulated day** for every simulation speed:

| Speed | Steps per tick | Ticks to complete 1 day |
|---|---|---|
| x1 | 1 | 420 |
| x5 | 5 | 84 |
| x20 | 20 | 21 |
| x100 | 100 | ~4 |
| x1000 | 420 | 1 |

The simulation always starts at **midnight (00:00)** so that every simulated day (including the very first one) is a complete 24-hour cycle.  
Report generation and energy calculations use the same `24/420` constant, keeping kWh totals consistent regardless of the speed chosen.

---

# 👥 Running With Multiple Concurrent Users

The **simulation engine runs entirely in the browser** (React state + `setInterval`).  
The Next.js server only handles three API routes:

| Route | Purpose | Notes |
|---|---|---|
| `/api/safaricharge-ai` | AI chat assistant | Tries Gemini, falls back to Z.AI SDK. Per-request 10 s timeout prevents slow calls from blocking others. |
| `/api/export-report` | CSV / Excel export | Capped at ~3.8 M records (~25 years) to protect server memory. |
| `/api/formal-report` | HTML/PDF report | Same 3.8 M record cap. |

Because simulation state is isolated in each user's browser:

* **10 (or more) users can simulate simultaneously without any server-side coordination.**
* Server load only increases when users request AI answers or generate reports.
* For heavy production loads consider deploying behind a reverse proxy (the included `Caddyfile.txt` shows a Caddy setup) and scaling the Next.js process with a process manager (e.g. PM2 cluster mode).

---

# Deployment

Deploy the dashboard to any Node.js host:

* **Vercel** – Connect the repo and set `DATABASE_URL` and optional `GEMINI_API_KEY`. Use Vercel Postgres or an external DB for production.
* **Docker** – Use the project Dockerfile (if present) or run `npm run build && npm start` in a Node image.
* **VPS / self-hosted** – Run `npm run build`, then `npm start` (or use the standalone output). Set env vars and use a process manager (e.g. PM2).

Ensure `DATABASE_URL` and, for the AI assistant, `GEMINI_API_KEY` are set in the deployment environment.

---

# 📈 Future Improvements

Potential enhancements for the dashboard include:

* Real-time solar monitoring integrations
* EV charging system monitoring integration
* Automated energy analytics
* Predictive maintenance insights
* Multi-site solar farm monitoring

---

# 🤝 Contributing

Contributions and improvements are welcome.

If you would like to contribute:

1. Fork the repository
2. Create a feature branch
3. Commit your changes
4. Submit a pull request

---

# 📄 License

This project is intended for research, development, and renewable energy system monitoring applications.
