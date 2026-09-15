# Deploying to Netlify (Pure Node.js & Serverless)

Your backend has been completely migrated from **Express.js** to **pure native Node.js** (`node:http`) with serverless support ready for Netlify!

---

## 🚀 How It Works

1. **Zero Express Dependencies**: The server now runs entirely on standard Node.js built-ins (`http`, `fs`, `path`, `url`, `crypto`).
2. **Netlify Functions Compatible**: The API logic is extracted into `api-handler.js`, and hooked into `netlify/functions/api.js`.
3. **Pre-configured `netlify.toml`**: All redirects and headers are already configured:
   - `/api/*` requests automatically proxy to the Netlify Serverless Function (`/.netlify/functions/api/:splat`).
   - Direct navigation to `/admin` routes directly to `admin.html`.
   - All other routes serve the responsive portfolio `index.html`.

---

## 📦 Deployment Options

### Option 1: Netlify Git Integration (Recommended)
1. Push your repository to **GitHub**, **GitLab**, or **Bitbucket**.
2. Log in to [Netlify](https://app.netlify.com) and click **"Add new site"** > **"Import an existing project"**.
3. Select your repository.
4. Netlify will auto-detect the configuration from `netlify.toml`:
   - **Publish directory**: `.` (or root)
   - **Functions directory**: `netlify/functions`
5. Click **Deploy site**!

---

### Option 2: Netlify CLI
From your terminal:
```bash
# 1. Install Netlify CLI (if not already installed)
npm install -g netlify-cli

# 2. Deploy directly
netlify deploy --prod
```

---

### Option 3: Netlify Drag & Drop
You can drag and drop your project directory directly into the [Netlify Drop](https://app.netlify.com/drop) dashboard.
