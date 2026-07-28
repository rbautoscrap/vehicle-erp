# Vehicle Auction

A simple timed vehicle auction web app.

## Features

- **Sign up / Sign in**: Register as a regular user and sign in
- **Admin**: Profile settings, vehicle info & photo uploads, start/end times
- **Users**: Browse live auctions and place sealed bids (ended auctions are hidden automatically)

## Sealed bidding

- Users cannot see other users' bid amounts or bid history
- Bids must be multiples of ₩1,000 and at least the starting price
- Admins can see all bids and the current highest bid

## Run

```bash
npm install
npm run dev
```

Or double-click `start-server.bat` and **keep that window open**.

Open in Chrome (or any browser):

- Preferred: http://127.0.0.1:3000  
- Also works: http://localhost:3000  

If the server window is closed, the site will not load in any browser. Start it again with `npm run dev` or `start-server.bat`.

If pages fail with errors after a crash, clear the cache and restart:

```bash
npm run dev:clean
```

If there is no admin account yet, delete `data/store.json` and restart —
an admin (`admin` / `admin123`) will be created automatically.
