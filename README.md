# Cloth Brand App

This repository contains a small clothing brand app with a web storefront and admin backend.

## What is included

- `server.js` - Express backend serving API routes and static files
- `public/` - customer and admin UI, plus PWA support
- `data/` - JSON storage for products, orders, and users
- `package.json` - scripts and dependencies

## Run locally

```bash
cd "C:/Users/pc user/Desktop/cloth brand"
npm install
npm start
```

If you want the app to stay online without manually typing `npm start` every time, use PM2:

```bash
npm install
npm run pm2-start
```

This setup uses `watch: false`, so the app will not restart automatically when you update the customer or admin website files. It will stay online and only restart if the process crashes or if you manually restart it with:

```bash
npm run pm2-stop
npm run pm2-start
```

Then open:

- `http://localhost:3000` for the customer storefront
- `http://localhost:3000/admin.html` for the admin panel

If you want to use the app from another device on your local network, open it with your PC's local IP address, for example:
- `http://192.168.1.100:3000`

## Web-ready features

- PWA install support via `public/manifest.json` and `public/sw.js`
- Static assets and frontend served from `public/`
- API routes available at `/api/*`
- Production-ready port selection via `process.env.PORT`

## Deploy to a Node web host

You can deploy this app to any host that supports Node.js, such as Render, Railway, Fly.io, or Heroku.

### Railway deployment

1. Connect your GitHub repo to Railway.
2. Set the start command to:
   ```bash
   npm start
   ```
3. Make sure `PORT` is defined by Railway (default behavior).
4. If you want to prevent the server from attempting to open a browser on the host, set:
   ```bash
   OPEN_BROWSER=false
   ```

### Recommended deployment

1. Connect your GitHub repo.
2. Set the start command to:
   ```bash
   npm start
   ```
3. Set the root directory to the repository root.
4. Use the default `PORT` environment variable provided by the host.

## Notes for Vercel

This app currently uses an Express server in `server.js`, which is easiest to deploy on a generic Node host.

If you want to deploy the frontend separately, you can host the `public/` folder as a static site and point API calls to a separate backend deployment.
