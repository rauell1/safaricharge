# ☀️ SafariCharge Solar Dashboard

A modern web dashboard for monitoring, managing, and analyzing solar energy systems.
The platform provides a structured interface for viewing solar performance data, managing uploaded records, and generating downloadable reports for energy system analysis.

Built using a modern full-stack JavaScript architecture, the dashboard is designed to support scalable solar monitoring systems, data visualization, and operational insights for renewable energy deployments.

---

# 🚀 Key Features

* 📊 **Solar Data Visualization** – Interactive charts and tables for monitoring system performance
* 📁 **File Upload & Download Management** – Store and retrieve solar monitoring data
* 🗄️ **Database Integration** – Structured data storage using Prisma ORM
* ⚡ **Modern Dashboard UI** – Built with Tailwind CSS and reusable UI components
* 📱 **Responsive Design** – Works across desktop, tablet, and mobile devices
* 🔄 **Scalable Architecture** – Built using Next.js App Router for modern web applications

---

# 🧰 Technology Stack

## Core Framework

* **Next.js** – Production-ready React framework with App Router
* **TypeScript** – Type-safe JavaScript for improved maintainability
* **Node.js** – Runtime environment

## UI & Frontend

* **Tailwind CSS** – Utility-first styling framework
* **shadcn/ui** – Accessible, reusable component library
* **Lucide React** – Modern icon library
* **Framer Motion** – Smooth animations and transitions

## State Management & Data Fetching

* **Zustand** – Lightweight global state management
* **TanStack Query** – Efficient server state synchronization

## Data & Backend

* **Prisma ORM** – Type-safe database access
* **SQLite / Configurable Database** – Local or remote database via Prisma

## Data Visualization

* **Recharts** – Interactive charts and dashboards

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
cd SafariCharge Solar Dashboard
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

Create an environment configuration file in the project root:

```
.env
```

Example configuration:

```
DATABASE_URL="file:./dev.db"
```

Additional variables may be added depending on deployment configuration.

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
SafariCharge Solar Dashboard
│
├── prisma/          Database schema and migrations
├── src/             Main application source code
│   ├── app/         Next.js App Router pages
│   ├── components/  Reusable UI components
│   ├── hooks/       Custom React hooks
│   └── lib/         Utility functions and configurations
│
├── public/          Static assets
├── db/              Local database files
├── upload/          Uploaded files storage
├── download/        Generated export files
│
├── package.json     Project dependencies and scripts
├── next.config.ts   Next.js configuration
├── tailwind.config.ts  Tailwind configuration
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

# 🌍 Deployment

The dashboard can be deployed using platforms such as:

* **Vercel**
* **Docker containers**
* **Cloud virtual machines**
* **Self-hosted Node.js servers**

Ensure environment variables and database connections are properly configured in the deployment environment.

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
