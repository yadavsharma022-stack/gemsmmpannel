# GemsSMM Panel

Social Media Marketing (SMM) reseller panel powered by smmreseller.in API.

## Quick Start

```bash
cd gemsmmpannel
npm install
npm start
```

Open **http://localhost:3847**

## Default Accounts

| Role     | Username | Password     |
|----------|----------|--------------|
| Admin    | admin    | admin123     |
| Reseller | reseller | reseller123  |

Customers can register at `/register.html`

## Features

- **Customer Panel** - Browse services, place orders, add funds via UPI
- **Admin Panel** - Manage products/prices, approve payments, sync SMM services
- **Reseller Panel** - View customers, services, and orders
- **UPI Payments** - QR code scan + transaction ID/screenshot upload
- **SMM API** - Integrated with smmreseller.in API v2

## Payment

- UPI ID: `yadav022@fam`
- Customers scan QR or pay manually, then submit txn ID or screenshot
- Admin approves payments to add balance

## Configuration

Edit `.env` file for API key, UPI ID, and port settings.
