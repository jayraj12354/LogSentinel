<div align="center">

# 🛡️ LogSentinel

**Real-time log monitoring, threat detection & alert triage — all in one desktop app**

[![Node.js](https://img.shields.io/badge/Node.js-20+-339933?logo=node.js&logoColor=white)](https://nodejs.org/)
[![React](https://img.shields.io/badge/React-18-61DAFB?logo=react&logoColor=black)](https://react.dev/)
[![Electron](https://img.shields.io/badge/Electron-Desktop-47848F?logo=electron&logoColor=white)](https://www.electronjs.org/)
[![PostgreSQL](https://img.shields.io/badge/PostgreSQL-Database-4169E1?logo=postgresql&logoColor=white)](https://www.postgresql.org/)
[![License](https://img.shields.io/badge/License-MIT-green)](LICENSE)

[🚀 Live Demo](https://drive.google.com/drive/folders/1ch8OhoiWkofaTtYlsb-q8xOhVBlGMSzw) · [📖 API Docs](docs/API.md) · [🗃️ Database Schema](docs/ERD.md)

</div>

---

## 📌 Overview

**LogSentinel** is a full-stack desktop application that centralises application and system log management. It lets you import log files or watch them live, spot suspicious patterns using configurable detection rules, and triage security alerts — all from a clean, responsive dashboard.

```
┌─────────────────────────────────────────────────────────┐
│  Electron Shell                                         │
│  ┌────────────────────┐   ┌────────────────────────┐   │
│  │  React + Vite UI   │   │   Node.js / Express    │   │
│  │   (Dashboard)      │◄──│   REST API + SSE       │   │
│  └────────────────────┘   └──────────┬─────────────┘   │
│                                      │                  │
│                            ┌─────────▼──────────┐       │
│                            │   PostgreSQL + Prisma│      │
│                            └─────────────────────┘      │
└─────────────────────────────────────────────────────────┘
```

---

## ✨ Features

| Feature | Description |
|---|---|
| 📂 **Log Import** | Drag-and-drop or browse to import `.log` files in GENERIC or Apache ACCESS format |
| 👁️ **Live Watching** | Stream new log lines in real-time as files grow on disk |
| 🔎 **Smart Filtering** | Filter by severity, source, date range, IP address, and free-text search |
| 🚨 **Alert Engine** | Policy-based alerting with configurable thresholds, windows, and severity levels |
| 📊 **Analytics** | Trend charts, top offenders, moving averages, and anomaly detection queries |
| 🔔 **Notifications** | Native desktop notifications for new critical or high-severity alerts |
| 👤 **Role-based Access** | Separate Administrator and Viewer roles with JWT-secured endpoints |
| 📤 **Data Export** | Export filtered log data for downstream investigation |

---

## 🧰 Tech Stack

<table>
<tr>
<td><strong>Frontend</strong></td>
<td>React 18, Vite, React Router, Context API</td>
</tr>
<tr>
<td><strong>Desktop</strong></td>
<td>Electron, IPC bridge, system tray, native notifications</td>
</tr>
<tr>
<td><strong>Backend</strong></td>
<td>Node.js, Express, Server-Sent Events (SSE), JWT auth</td>
</tr>
<tr>
<td><strong>Database</strong></td>
<td>PostgreSQL, Prisma ORM, window functions, triggers</td>
</tr>
<tr>
<td><strong>Testing</strong></td>
<td>Jest, Supertest</td>
</tr>
</table>

---

## 🚀 Getting Started

### Prerequisites

- **Node.js** v20 or later
- **PostgreSQL** running locally (or via Docker)
- **npm** v9+

### Installation

```bash
# 1. Clone the repo
git clone https://github.com/your-username/major_project.git
cd major_project

# 2. Install all workspace dependencies
npm install

# 3. Configure your environment
cp .env.example .env
# Edit .env to set DATABASE_URL, JWT_SECRET, etc.

# 4. Set up the database (runs migrations + seed)
npm run setup

# 5. Start everything in development mode
npm run dev
```

> `npm run dev` concurrently starts the **Express API**, the **Vite dev server**, and the **Electron** desktop window.

---

## 🔐 Demo Credentials

| Role | Username | Password |
|---|---|---|
| 👑 Administrator | `admin` | `admin123` |
| 👀 Viewer | `viewer` | `viewer123` |

---

## 📁 Project Structure

```
major_project/
├── client/          # React + Vite frontend
│   └── src/
│       ├── pages/   # Dashboard, Logs, Alerts, Analytics …
│       ├── components/
│       └── api/
├── server/          # Express REST API
│   └── src/
│       ├── controllers/
│       ├── services/    # logParser, alertEngine, LogWatcher …
│       ├── routes/v1/
│       └── middleware/
├── electron/        # Desktop shell
│   ├── main.js
│   ├── preload.js
│   └── ipc/
├── db/              # Raw SQL scripts, seed data, analytics queries
├── docs/            # API reference, ERD, demo script
└── scripts/         # Setup, log generator, attack simulator
```

---

## 🌐 Deployment

A hosted version of the application is available here:

**[▶ Open deployed app](https://drive.google.com/drive/folders/1ch8OhoiWkofaTtYlsb-q8xOhVBlGMSzw)**

---

<p align="center">
  <sub>Built to make log investigations clearer and faster. ⚡</sub>
</p>
