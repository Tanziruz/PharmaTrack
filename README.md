# PharmaTrack — Pharmacy Inventory Management

A web-based inventory management system for pharmacists to track stock, purchases, sales, and medicines that need to be reordered.

---

## Features

- **Purchases** — Record every incoming batch of medicines with batch number, MRP, expiry date, and quantity
- **Stocks** — Live inventory automatically updated from purchases and sales; colour-coded rows for low stock and expiring medicines; inline editable reorder level per batch
- **Sales** — Record every sale to a customer; automatically decrements stock
- **To Be Ordered** — Auto-populated when stock runs low, hits zero, or is expiring soon; also supports manual entries
- **Dashboard** — At-a-glance summary of total products, low stock count, expiring-soon count, today's revenue, and pending orders
- **Multi-device** — Backed by Supabase (cloud PostgreSQL); all devices see live changes instantly via Realtime

---

## Tech Stack

| Layer                   | Technology                                                 |
| ----------------------- | ---------------------------------------------------------- |
| Framework               | Next.js 16 (App Router, Server Components, Server Actions) |
| Database                | Supabase (PostgreSQL)                                      |
| UI                      | shadcn/ui + Radix UI + Tailwind CSS v4                     |
| Language                | TypeScript                                                 |
| Runtime/Package Manager | Bun                                                        |

---

## Prerequisites

- [Node.js 18+](https://nodejs.org/) or [Bun](https://bun.sh/)
- A free [Supabase](https://supabase.com) account

---

## Setup

### 1. Clone and install dependencies

```bash
git clone <your-repo-url>
cd PharmaTrack
bun install
```

### 2. Create a Supabase project

1. Go to [supabase.com](https://supabase.com) and create a new project
2. Wait for it to finish provisioning (~1 minute)

### 3. Run the database schema

1. In your Supabase project, open the **SQL Editor** (left sidebar)
2. Click **New query**
3. Copy the full contents of [`supabase/schema.sql`](supabase/schema.sql) and paste it in
4. Click **Run** (or press `Ctrl+Enter`)
5. You should see **"Success. No rows returned"** — this is correct

This creates:

- 4 tables: `stocks`, `purchases`, `sales`, `to_be_ordered`
- 3 database triggers (purchase → upsert stock, sale → decrement stock, stock change → auto-fill to_be_ordered)
- Row Level Security policies
- Realtime enabled on all tables

### 4. Configure environment variables

Create a `.env.local` file in the project root:

```env
NEXT_PUBLIC_SUPABASE_URL=https://your-project-id.supabase.co
NEXT_PUBLIC_SUPABASE_PUBLISHABLE_DEFAULT_KEY=sb_publishable_...
```

To find these values:

1. In your Supabase project go to **Project Settings → API**
2. Copy the **Project URL** → `NEXT_PUBLIC_SUPABASE_URL`
3. Copy the **Publishable (anon) key** → `NEXT_PUBLIC_SUPABASE_PUBLISHABLE_DEFAULT_KEY`

### 5. Start the development server

```bash
bun run dev
```

Open [http://localhost:3000](http://localhost:3000).

---

## How to Use

### Dashboard

The home page shows 5 summary cards:

- **Total Products** — number of unique medicine batches in stock
- **Low Stock** — batches below their reorder level (with out-of-stock count)
- **Expiring Soon** — batches expiring within the next 60 days
- **Today's Sales** — total revenue from sales recorded today
- **Pending Orders** — medicines waiting to be reordered

---

### Recording a Purchase (incoming stock)

When a new batch of medicines arrives at the pharmacy:

1. Go to **Purchases** in the sidebar
2. Click **Add Purchase**
3. Fill in the form:
   - **Medicine Name** — e.g. `Paracetamol 500mg`
   - **Batch Number** — printed on the packaging, e.g. `BT-2025-001`
   - **Quantity** — number of units received
   - **MRP** — Maximum Retail Price printed on the box
   - **Expiry Date** — expiry date printed on the box
   - **Purchase Date** — defaults to today
4. Click **Record Purchase**

**What happens automatically:**

- A row is added to the Purchases log (permanent, never changes)
- The Stocks table is updated — if this batch exists, its quantity increases; if it's a new batch, a new stock row is created
- If the expiry date is within 60 days, the batch is flagged in To Be Ordered

---

### Checking Stock

Go to **Stocks** in the sidebar.

The table shows every medicine batch with:

- **Qty Available** — current units remaining (decreases as you sell)
- **Reorder Level** — the threshold below which the batch is flagged for reordering (default: 10)
- **Status** badge — In Stock / Low Stock / Out of Stock / Expiring Soon / Expired

**Row colours:**

- 🔴 Red background — expiry within 60 days or already expired
- 🟠 Orange background — quantity below reorder level
- ⚫ Grey text — out of stock (quantity = 0)

**Editing the reorder level:**
Hover over the reorder level number for any row → click the pencil icon → type the new value → press Enter or click the checkmark. This lets you set different thresholds per medicine (e.g., fast-moving medicines need a higher reorder level).

---

### Recording a Sale (outgoing)

When a customer buys medicines:

1. Go to **Sales** in the sidebar
2. Click **Record Sale**
3. Select the batch from the dropdown — it shows medicine name, batch number, and units available
4. Enter:
   - **Quantity to Sell** — units sold
   - **Selling Price** — actual price charged (can differ from MRP, e.g. with discount)
   - **Sale Date** — defaults to today
5. Click **Record Sale**

> If you try to sell more units than are available, the form will reject it and show how many units are left.

**What happens automatically:**

- A row is added to the Sales log (permanent)
- The stock quantity decreases by the sold amount
- If the remaining quantity hits zero or drops below the reorder level, the batch appears in To Be Ordered

---

### Managing the To Be Ordered list

Go to **To Be Ordered** in the sidebar.

This shows two sections:

**Pending** — medicines that still need to be ordered, grouped by reason:

- 🟠 **Low Stock** — quantity is below the reorder level
- ⚫ **Out of Stock** — quantity reached zero
- 🔴 **Expiring Soon** — expiry date is within 60 days
- 🔵 **Manual** — you added it yourself

**Actions per row:**

- **Ordered** button — marks the entry as ordered (moves it to the Ordered section with a strikethrough)
- **Trash** icon — permanently removes the entry from the list

**Adding a manual entry:**
If you know you need to order something (e.g. a medicine not yet in stock), click **Add Manually** and fill in the medicine name and optional notes.

---

## Project Structure

```
PharmaTrack/
├── app/
│   ├── page.tsx              # Dashboard
│   ├── purchases/page.tsx    # Purchases page
│   ├── sales/page.tsx        # Sales page
│   ├── stocks/page.tsx       # Stocks page
│   └── to-order/page.tsx     # To Be Ordered page
├── components/
│   ├── app-sidebar.tsx               # Main navigation sidebar
│   ├── purchases/
│   │   └── add-purchase-dialog.tsx   # Add Purchase form dialog
│   ├── sales/
│   │   └── record-sale-dialog.tsx    # Record Sale form dialog
│   ├── stocks/
│   │   └── stocks-table.tsx          # Interactive stock table
│   └── to-order/
│       ├── to-order-table.tsx        # To-order table with actions
│       └── add-manual-order-dialog.tsx
├── lib/
│   ├── actions/
│   │   ├── purchases.ts    # Server actions for purchases
│   │   ├── sales.ts        # Server actions for sales
│   │   ├── stocks.ts       # Server actions for stocks
│   │   └── to-order.ts     # Server actions for to-order
│   └── types/
│       └── database.ts     # TypeScript types for all tables
├── supabase/
│   └── schema.sql          # Full database schema — run this in Supabase
└── utils/
    └── supabase/
        ├── client.ts       # Browser Supabase client
        └── server.ts       # Server-side Supabase client (async cookies)
```

---

## Available Scripts

```bash
bun run dev      # Start development server at http://localhost:3000
bun run build    # Build for production
bun run start    # Start production server
bun run lint     # Run ESLint
```

---

## How the Database Logic Works

All inventory math is handled by **PostgreSQL triggers in Supabase** — not in the frontend. This means:

1. **Purchase recorded** → trigger upserts `stocks` (adds quantity if batch exists, creates row if new)
2. **Sale recorded** → trigger decrements `stocks.quantity_available` by the sold amount
3. **Stock row changes** → trigger checks if quantity is zero, below reorder level, or expiry ≤ 60 days → inserts into `to_be_ordered` automatically

This ensures consistency regardless of how many devices or users are accessing the app simultaneously.
