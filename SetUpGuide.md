# CareerOS AI — Complete Setup & Developer Guide

A comprehensive, step-by-step guide for setting up and running **CareerOS AI** on both **macOS / Linux** and **Windows**.

---

## Architecture & Port Mapping

CareerOS AI is structured as a monorepo using npm workspaces (`apps/*`, `packages/*`, `services/*`). When running in development mode, the following microservices and applications start concurrently:

| Component | Type | Port | Path | Proxied by Web (`/api/v1/*`) |
|---|---|---|---|---|
| **Web Frontend** | Vite + React + TS | `5173` | `apps/web` | Main Entry (`http://localhost:5173`) |
| **Auth Service** | Express Microservice | `3001` | `services/auth` | `/api/v1/auth` & `/api` |
| **Profile Service** | Express Microservice | `3002` | `services/profile` | `/api/v1/profile` |
| **Career Goals Service** | Express Microservice | `3003` | `services/career-goals` | `/api/v1/career-goals` |
| **Resume Service** | Express Microservice | `3004` | `services/resume` | `/api/v1/resume` |
| **Digital Twin Service** | Express Microservice | `3005` | `services/digital-twin` | `/api/v1/digital-twin` |
| **Roadmap Engine Service** | Express Microservice | `3006` | `services/roadmap-engine` | `/api/v1/roadmaps` |
| **Health Check Service** | Express Microservice | - | `services/health-check` | Diagnostics & monitoring |

---

## Prerequisites

Before starting, ensure your system meets the following requirements:

1. **Node.js**: Version **>= 20.0.0** is required.
   - Verify: `node -v`
   - *Tip (macOS/Linux)*: Use `nvm` (`nvm install 20 && nvm use 20`).
   - *Tip (Windows)*: Use `nvm-windows` or download from [nodejs.org](https://nodejs.org/).
2. **npm**: Version **>= 9.0.0** (bundled with Node.js 20+).
   - Verify: `npm -v`
3. **Git**: Installed and accessible in your terminal.
4. **MongoDB**:
   - **Recommended**: Free [MongoDB Atlas](https://www.mongodb.com/cloud/atlas) cluster connection string (`mongodb+srv://...`).
   - **Alternative**: Local MongoDB running on `mongodb://localhost:27017/careeros`.
5. **Google Gemini API Key**:
   - Obtain a free API key from [Google AI Studio](https://aistudio.google.com/).
6. **Cloudinary (Optional)**:
   - For resume file uploads. The repository includes default development credentials in `.env_Example`, or you can supply your own Cloudinary cloud credentials.

---

## Step-by-Step Setup Instructions

### Step 1: Clone the Repository & Install Dependencies

Open your terminal (Terminal on macOS/Linux, or PowerShell / Command Prompt / Git Bash on Windows):

```bash
# Clone the repository
git clone https://github.com/Yesha0405/CareerOS.git
cd CareerOS

# Install dependencies across all workspaces
npm install
```

> **Note**: `npm install` at the root automatically installs dependencies across all workspaces (`apps/*`, `packages/*`, and `services/*`), including `cross-env`, `mongodb`, `tsx`, and `concurrently`. **No manual edits to `package.json` are needed.**

---

### Step 2: Configure Environment Variables

Create your local `.env` configuration file from `.env_Example`:

#### On macOS / Linux:
```bash
cp .env_Example .env
```

#### On Windows (PowerShell):
```powershell
Copy-Item .env_Example .env
```

#### On Windows (Command Prompt):
```cmd
copy .env_Example .env
```

Now open `.env` in your editor and configure the keys:

```env
# MongoDB Connection String (Replace with your Atlas connection string or local MongoDB)
DATABASE_URL=mongodb+srv://<username>:<password>@<cluster-url>/careeros?retryWrites=true&w=majority

# Optional: Public DNS servers if your network or VPN causes ECONNREFUSED on MongoDB Atlas SRV lookups
DNS_SERVERS=1.1.1.1,8.8.8.8

# Cloudinary (Used by Resume service; you may use default dev keys or your own)
CLOUDINARY_CLOUD_NAME=your_cloud_name
CLOUDINARY_API_KEY=your_cloud_key
CLOUDINARY_API_SECRET=your_secret_key

# AI Configuration (Gemini)
AI_PROVIDER=gemini
GEMINI_API_KEY=your_gemini_api_key
AI_DEFAULT_MODEL=gemini-1.5-flash
AI_FALLBACK_MODEL=gemini-1.5-pro

# Security
JWT_SECRET=your-random-jwt-secret-string-at-least-32-chars
```

> [!IMPORTANT]
> In MongoDB Atlas, ensure your current IP address is whitelisted (or `0.0.0.0/0` is allowed for development) under **Network Access** in the MongoDB Atlas dashboard.

---

### Step 3: Build Shared Packages (Required)

CareerOS AI relies on shared TypeScript packages (`@careeros/shared-types`, `@careeros/database`, `@careeros/errors`, `@careeros/logger`, `@careeros/event-bus`, `@careeros/validation`, `@careeros/ai-client`).

You **must build the packages** once before starting tests or services:

```bash
npm run build
```

This compiles TypeScript project references across `packages/*/dist` and `services/*/dist`.

---

### Step 4: Verify Database Connectivity

Verify that your MongoDB connection string and network access are working:

```bash
node test-mongo-connection.js
```

**Expected output:**
```text
🔍 Testing MongoDB connection...
📍 Connection URL: mongodb+srv://<user>:****@<cluster>/...
✅ MongoDB connection successful!
📊 Database: careeros
🏠 Host: <cluster-host>
```

If this fails, refer to the [Troubleshooting](#troubleshooting) section below.

---

### Step 5: Run Tests (Verification)

Run the automated test suite to ensure all microservices and shared libraries are healthy:

```bash
npm test
```

All 15 test suites (Auth, Profile, Career Goals, Resume, Digital Twin, Health Check, AI Client, etc.) should pass.

---

### Step 6: Start the Development Server

Start all microservices and the web frontend simultaneously:

```bash
npm run dev
```

This command runs `concurrently` using `cross-env` across both Windows and macOS/Linux. It boots:
- `[AUTH]` at `http://localhost:3001`
- `[PROFILE]` at `http://localhost:3002`
- `[GOALS]` at `http://localhost:3003`
- `[RESUME]` at `http://localhost:3004`
- `[TWIN]` at `http://localhost:3005`
- `[ROADMAP]` at `http://localhost:3006`
- `[WEB]` at `http://localhost:5173`

#### Alternative Run Modes:
- **Backend Services Only**:
  ```bash
  npm run dev:services
  ```
- **Web Frontend Only**:
  ```bash
  npm run dev --workspace=@careeros/web
  ```

---

### Step 7: Access the Web Application

1. Open your browser and navigate to **[http://localhost:5173/](http://localhost:5173/)**.
2. Click **Sign Up** to create a new user account.
3. Complete the multi-step Onboarding flow:
   - Fill in your background, education, and skills (Profile Service).
   - Set your target role and timeline (Career Goals Service).
   - Upload your resume (Resume Service).
4. Access the **Dashboard** to view your active career goal, profile summary, and interactive **Career Digital Twin Graph**.

---

## Available NPM Scripts

Run from the root directory:

| Script | Command | Purpose |
|---|---|---|
| `dev` | `npm run dev` | Runs all 5 backend services and the Vite web app concurrently with live reloading. |
| `dev:services` | `npm run dev:services` | Runs only the 5 backend services. |
| `build` | `npm run build` | Cleans previous builds (`prebuild`) and compiles TypeScript for all packages and services. |
| `test` | `npm test` | Runs all Vitest test suites. |
| `test:watch` | `npm run test:watch` | Runs Vitest in watch mode. |
| `lint` | `npm run lint` | Runs ESLint across `packages` and `services`. |
| `format` | `npm run format` | Runs Prettier across all files. |

---

## Troubleshooting

### 1. MongoDB Connection: `ECONNREFUSED` or `querySrv ENOTFOUND`
- **Cause**: Node.js DNS resolver failing to resolve MongoDB Atlas SRV records, often caused by local router DNS, Windows DNS cache, or VPN resolvers.
- **Solution 1**: Add public DNS servers to your `.env` file:
  ```env
  DNS_SERVERS=1.1.1.1,8.8.8.8
  ```
- **Solution 2**: Ensure your IP address is whitelisted in MongoDB Atlas:
  1. Go to [MongoDB Cloud Console](https://cloud.mongodb.com/).
  2. Under **Security**, click **Network Access**.
  3. Click **Add IP Address** and choose **Allow Access From Anywhere** (`0.0.0.0/0`) for development, or add your current IP address.

### 2. Windows-Specific Issues

#### A. PowerShell: `running scripts is disabled on this system`
- **Cause**: Windows PowerShell execution policy restriction.
- **Solution**: Open PowerShell as Administrator and run:
  ```powershell
  Set-ExecutionPolicy -Scope CurrentUser -ExecutionPolicy RemoteSigned
  ```

#### B. Port Already in Use (`EADDRINUSE: address already in use :::3001` or `5173`)
- **Solution**: Find and terminate the process holding the port:
  ```powershell
  # Find PID holding the port (e.g. 3001)
  netstat -ano | findstr :3001

  # Kill the process by PID
  taskkill /PID <PID_NUMBER> /F
  ```

#### C. Git Long Path Warning
- **Solution**: Enable long paths in Git:
  ```cmd
  git config --system core.longpaths true
  ```

### 3. macOS / Linux Specific Issues

#### A. Port Conflict (`EADDRINUSE: address already in use :::3001` - `3005`, `5173`)
- **Solution**: Kill any lingering background node processes:
  ```bash
  # Check which process is using the ports
  lsof -i :3001,3002,3003,3004,3005,5173

  # Kill all processes on those ports
  kill -9 $(lsof -ti:3001,3002,3003,3004,3005,5173)
  ```

#### B. Node Version Mismatch
- If `node -v` shows a version lower than `v20.0.0`:
  ```bash
  nvm install 20
  nvm use 20
  ```

### 4. Package Import / Vite Entry Errors: `Failed to resolve entry for package @careeros/...`
- **Cause**: `@careeros/*` workspace packages point to `./dist/index.js` in `package.json`, but `npm run build` has not been run yet.
- **Solution**: Run:
  ```bash
  npm run build
  ```
  Then re-run `npm test` or `npm run dev`.
