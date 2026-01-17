# New Laptop Setup Instructions - RoboLedgers.com

Follow these steps to get an exact clone of your workspace and resume development seamlessly.

## 1. Set Up Google Drive (The "G:" Drive)
Install **Google Drive for Desktop** on your new laptop.
- Sign in with the same Google account.
- Ensure the drive is mapped to **G:** (standard for Windows).
- Ensure the `AutoBookkeeping` folder is set to **"Mirror files"** or "Available offline" in Google Drive settings.

## 2. Clone the Repository
Open a terminal (PowerShell) and run:
```powershell
cd "G:\My Drive\AutoBookkeeping"
git clone https://github.com/asmian84/roboledgers.com.git AutoBookkeeping-V4
```

## 3. Install Dependencies
Navigate into the project folder and install Node modules:
```powershell
cd AutoBookkeeping-V4
npm install
```

## 4. Environment Configuration
Ensure your `.env` file is present. If not, create it:
```powershell
cp .env.example .env
```
> [!IMPORTANT]
> Verify that `VITE_SUPABASE_URL` and `VITE_SUPABASE_ANON_KEY` are correctly filled in your `.env` file.

## 5. Resume Development
Start the development server:
```powershell
npm run dev
```

---
**Current Dev State:** Pick up at Version 4.1.1 (Self-Learning AI Brain finalized).
**GitHub Repo:** [https://github.com/asmian84/roboledgers.com](https://github.com/asmian84/roboledgers.com)
