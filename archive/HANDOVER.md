# RoboLedgers.com - Laptop Switch Handover (2026-01-17)

## 📌 Current Project State
The project is in **V4 (Supabase Upgrade Phase)**. Core functionality has been ported to AG Grid, and the **Self-Learning AI Brain** is mostly implemented.

### Recent Major Updates:
- **Self-Learning Brain:** `merchant-dictionary.js` can now learn from AI results.
- **UI Progress:** AI Audit panel is added to the Vendors page.
- **Code Health:** All local changes are committed and pushed to `main` on GitHub.

## 🚀 Laptop Setup Steps
1. **Clone Repo:**
   ```bash
   git clone https://github.com/asmian84/roboledgers.com.git
   cd roboledgers.com
   ```
2. **Install Dependencies:**
   ```bash
   npm install
   ```
3. **Environment Setup:**
   - Copy `.env.example` to `.env`
   - Ensure `VITE_SUPABASE_URL` and `VITE_SUPABASE_ANON_KEY` are set correctly.
4. **Data:**
   - The project uses Google Drive for storage (G: drive). Ensure Google Drive desktop is installed and synced.

## 🔜 Next Steps for Development:
- [ ] **Data Sync:** Continue testing Supabase sync for incremental updates.
- [ ] **AI Accuracy:** Verify fuzzy matching in the brain against real-world dirty descriptions.
- [ ] **Roadmap:** Proceed with Phase 2 (Pattern Recognition) of the AI Brain.

---
**GitHub Repository:** [https://github.com/asmian84/roboledgers.com](https://github.com/asmian84/roboledgers.com)
