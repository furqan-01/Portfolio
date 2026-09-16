# Deploying to Netlify (Universal Serverless + Standalone Support)

Your portfolio and Admin Panel are engineered with **Universal Dual-Mode Resilience**:
1. **Netlify Functions (Serverless)**: When deployed via Git, Netlify auto-bundles `netlify/functions/api.js` using esbuild and routes `/api/*` requests to the serverless function.
2. **Netlify Standalone / Drop (Static)**: If deployed via Netlify Drop or static hosting without active functions, the Admin Panel automatically activates **Standalone Client-Side Mode**. You can log in (`admin` / `admin123`), manage projects, edit skills, and save changes locally with zero server errors!

---

## 🔑 Admin Credentials (Works on BOTH Netlify Modes)
- **Username:** `admin` (or `furqan` / `furqannaveed377@gmail.com`)
- **Password:** `admin123` (or `admin`)
- **Direct Login URL:** `https://your-site.netlify.app/admin` (or click "Admin Portal" in the footer)

---

## 🚀 How to Deploy on Netlify

### Option 1: Netlify Git Integration (Recommended)
1. Push your latest code to your **GitHub** repository (`git push origin main` or via AI Studio "Export to GitHub").
2. Log in to [Netlify](https://app.netlify.com) and click **"Add new site"** > **"Import an existing project"**.
3. Select your GitHub repository.
4. Netlify will auto-detect the configuration from `netlify.toml`:
   - **Publish directory**: `.` (root)
   - **Functions directory**: `netlify/functions`
5. Click **Deploy site**!

---

### Option 2: Netlify Drag & Drop (Instant)
1. Download or export the project ZIP.
2. Drag and drop the folder directly into [Netlify Drop](https://app.netlify.com/drop).
3. The portfolio and admin panel will work instantly right out of the box.

---

## 🛠️ What Was Fixed for Netlify
- **Dual-Mode Authentication**: If Netlify functions aren't enabled or return static HTML, the admin panel detects this and authenticates client-side seamlessly instead of showing "Server connection error".
- **Data Fallback Cascade**: Loads portfolio data from `localStorage` -> `/api/portfolio` -> `/data/portfolio-data.json`.
- **esbuild Bundling**: Configured `netlify.toml` with `included_files = ["data/**", "firebase-applet-config.json"]` and `node_bundler = "esbuild"`.
- **Contact Inquiries**: If functions are active, saves to server; if static, saves to admin inbox in browser and provides instant email contact.
