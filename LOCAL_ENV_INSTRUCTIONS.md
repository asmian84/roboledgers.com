# Local Test Environment Setup

You have successfully initialized the local test environment configuration!

## 🚧 Requirement: Node.js
Because neither Node.js nor Python were found on your system, you must install **Node.js** to run this environment.

### Installation Check
1.  Download Node.js (LTS version) from [nodejs.org](https://nodejs.org).
2.  Install it.
3.  Restart your terminal/VS Code.
4.  Run `node -v` to confirm installation.

## 🚀 How to Run

Once Node.js is installed, run the following commands in this directory:

### 1. Install Dependencies
Run this once to download the tools (Live Server, Jest, Prettier):
```bash
npm install
```

### 2. Start Local Server
This starts a live-reloading web server at http://localhost:3000
```bash
npm start
```
*The app will automatically open in your browser and refresh whenever you save a file.*

### 3. Run Automated Tests
To run the test suite (currently a sanity check):
```bash
npm test
```
To run tests in watch mode (re-runs on save):
```bash
npm run test:watch
```

## 🛠 What's Included?
- **package.json**: Defines the project scripts and dependencies.
- **live-server**: A development server with hot-reload capability.
- **jest**: A professional testing framework for validating your JavaScript logic.
- **prettier**: A code formatter to keep your code style consistent.

## 🚑 Troubleshooting

### Error: "Cannot find module ... npm-cli.js"
If you see an error like `Error: Cannot find module '...\npm-cli.js'` when running npm:

1.  **Close your current terminal/command prompt completely.**
2.  Open a **new** terminal.
3.  Navigate to your project folder first! Do not run commands from `Program Files`.
    ```bash
    cd c:\Users\swift\Documents\AutoBookkeeping
    ```
4.  Try running `npm install` again.
5.  **If it still fails:** The Node.js installation might be corrupted.
    *   Or, download the installer again and choose "Repair".

### Error: "npm.ps1 cannot be loaded because running scripts is disabled"
This is a standard Windows security setting. You have two easy solutions:

**Option A: Use Command Prompt (Recommended)**
Close PowerShell and open "Command Prompt" (cmd.exe). It does not have this restriction.

**Option B: Allow Scripts in PowerShell**
Run this command in PowerShell to allow scripts for your user account only:
```powershell
Set-ExecutionPolicy RemoteSigned -Scope CurrentUser
```
(Type 'Y' and press Enter if asked to confirm).
After that, try `npm install` again.

