# WEALTHIQ

> **Your wealth. One intelligent view.**  
> AI Assistant: **Gemini Wealth Copilot**

[![Live Demo](https://img.shields.io/badge/Live%20Demo-wealth--iq--umber.vercel.app-000000?style=for-the-badge&logo=vercel&logoColor=white)](https://wealth-iq-umber.vercel.app/)
[![Tech Stack](https://img.shields.io/badge/Stack-React%2019%20%7C%20Node.js%20%7C%20Tailwind%20%7C%20Gemini-6366f1?style=for-the-badge)](#tech-stack)
[![AI Engine](https://img.shields.io/badge/AI-Google%20Gemini%203.5%20%2F%203.8%20Flash-06b6d4?style=for-the-badge)](#gemini-wealth-copilot)

🔗 **Live Production URL:** [https://wealth-iq-umber.vercel.app/](https://wealth-iq-umber.vercel.app/)  
📄 **Architecture & Judge Defense Handbook:** [WEALTHIQ_Architecture_Judge_Handbook.pdf](./WEALTHIQ_Architecture_Judge_Handbook.pdf)

**WEALTHIQ** is a next-generation, evidence-based wealth intelligence platform that eliminates portfolio blind spots. While investors hold assets across direct stocks, mutual funds, gold, fixed deposits, insurance, real estate, and vehicles, they typically lack a single consolidated view. More critically, traditional tools fail to detect **hidden look-through overlap**: owning individual stocks (like Infosys) directly while simultaneously holding index and thematic mutual funds creates high, unmonitored concentration.

WEALTHIQ solves this by unifying deterministic look-through calculations with Google Gemini for real-world stress testing, live market news sensitivity, and explainable conversational AI.

---

## 🚀 Core Features & Differentiators

### 1. Hidden Look-Through Exposure Dissection
* Dissects broad-market index funds (`Nifty 50 Index`) and thematic funds (`Flexi Cap`, `Technology Opportunities`, `Mid Cap`) down to their underlying company weights.
* Aggregates direct equity shares with mutual fund allocations (e.g. Infosys held directly at ₹2.60L + ₹63.4k across 3 funds = **₹3.23 Lakh total look-through exposure**, representing **19.4% of total equity**).
* Identifies single-sector concentration risks (e.g. Technology representing **29.4% of total equity**) that remain invisible on standard brokerage apps.

### 2. AI Dynamic Real-World Calculation Model vs. Static Formulas
* **Why Static Formulas Fail**: Static formulas (`topSector% - 22`) assume an ideal, independent market. In reality, **Technology has a high beta (1.38x)**, direct stocks and mutual funds drop simultaneously, and physical property incurs a **15% to 25% forced liquidation haircut** in emergencies.
* **Dual Calculation Engine**:
  * **Static Heuristic Baseline**: Ideal-condition heuristic score (`84 / 100`).
  * **AI Real-World Stress-Tested Model**: Incorporates sector beta covariance, debt-service EMI drag, and illiquidity haircuts (`47 to 72 / 100` depending on volatility).
  * **Macro Regime Selector**: Switch between *Normal Market*, *⚡ High Volatility & Tech Pullback*, and *📈 Rising Rates*.

### 3. Real-Time Live News & Quantified Rupee Sensitivity
* Pulls breaking financial market wires directly via real-time RSS feeds with 30-second live auto-polling.
* Automatically identifies affected companies and sectors in your portfolio.
* Calculates the **estimated net rupee and percentage portfolio impact** (e.g. `+₹2,369 (+0.04%)` or `-₹14,500 (-0.22%)`) broken down by direct equity shares and mutual fund NAVs.
* **Interactive Market Shock Simulator**: Test custom macroeconomic shocks (*Tech Pullback -6%*, *RBI Rate Hike +50bps*, *Crude Spike $95/bbl*, *Broad Rally +4.5%*) with a live severity slider (0.5x to 2.5x).

### 4. Gemini Wealth Copilot (Evidence-Based Conversational AI)
* Powered by Google's latest **Gemini Flash models** (`gemini-3.5-flash` / `gemini-3.8-flash`) via the official `@google/genai` SDK.
* Enforces an evidence-based mandate using 4 labelled sections:
  * **FACT**: Verified numerical ledger data and look-through weights.
  * **ANALYSIS**: Look-through overlap dynamics, sector covariance, and macro implications.
  * **POTENTIAL RISK**: Specific downside vulnerability scenarios.
  * **SUGGESTION**: Actionable educational rebalancing considerations (non-promissory).
* Includes a **Deep Contextual Local Engine** that answers custom questions about Tata Motors, Real Estate, Gold, Family Wealth, and Taxes even when offline.

### 5. Multi-Member Family Wealth & Privacy Consent Gates
* Consolidated view combining Aarav, Father, and Mother into a unified ₹1.42 Crore family wealth view.
* Demonstrates RBI Account Aggregator privacy controls: clickable **Consent Chips** (`Granted` vs `Pending`) dynamically include or mask family member assets and recalculate family concentration risks.

### 6. Simulated Broker Sync
* Real-time broker simulation: sells ₹40,000 of Tata Motors shares and credits proceeds to HDFC Savings with an instant toast notification.
* Automatically recalculates net worth, allocation, concentration, and health scores without a page reload.

---

## 📊 Minimalist, Graph-Rich UI Design

* **Wealth Trajectory Area Chart**: Smooth gradient area chart on Overview tracking 12-month wealth history with interactive time toggles (`3M`, `6M`, `1Y`) and crosshairs.
* **7-Category Donut Allocation**: Minimal thin-ring chart with center portfolio totals and hover tooltips.
* **Look-Through Sector Bar Chart**: Stacked visual comparison of direct stock holdings vs. underlying mutual fund weights.
* **Side-by-Side Multi-Factor Bar Chart**: Visual comparison of Static Heuristic vs. AI Real-World scores across Concentration, Liquidity, Illiquid Allocation, Diversification, and Tail Drawdown.
* **Categorized Asset Explorer**:
  * Summary metrics ribbon (Total Value, Invested Capital, Net P&L).
  * Interactive category pills with live asset counts and rupee values (`Stocks ₹8.6L`, `Mutual Funds ₹8.1L`, `Property ₹37.0L`, `Gold ₹7.5L`, `Cash & FDs ₹18.2L`, etc.).
  * Multi-factor filters: Member filter, Performance filter (+Gainers / -Losers), Sort dropdown.
  * Clean Card Grid View with underlying mutual fund holdings preview + Compact Table View switch.

---

## 🛠️ Tech Stack

| Layer | Technology |
|---|---|
| **Frontend** | React 19, Vite, Tailwind CSS v4, Recharts, Lucide React |
| **Backend** | Node.js, Express 4, CORS, Dotenv |
| **AI / Copilot** | Official `@google/genai` SDK (`gemini-3.5-flash` / `gemini-3.8-flash`) |
| **Live News** | Real-Time Financial RSS Engine + Google Search Grounding |
| **Data Layer** | In-Memory Sandbox Ledger with Account Aggregator Consent Mock |

---

## 🏗️ Architecture

```
User (Browser)
     │
     ▼
Frontend (React 19 + Vite + Tailwind CSS + Recharts)
     │
     ├── Overview Tab (Wealth Trajectory Area Chart, Allocation Donut, Family Cards)
     ├── Asset Explorer (Category Pills, Multifactor Filters, Grid/Table Switch)
     ├── Portfolio Health (AI Dynamic Comparator, Sector Stacking, Overlap Explorer)
     ├── Live Market & News (Real-time Feed, Impact Calculator, Shock Simulator)
     └── Gemini Copilot (Evidence-based Conversational AI with FACT/ANALYSIS/RISK/SUGGESTION)
     │
     ▼ REST API
Backend Server (Node.js + Express, Port 5000)
     │
     ├── /api/portfolio          # Net worth, P&L, 7-category allocation
     ├── /api/portfolio/health   # Look-through sector exposure & overlaps
     ├── /api/portfolio/ai-dynamic # AI Dynamic Real-World Model vs Static Heuristic
     ├── /api/portfolio/trend    # 12-month historical & projected trend data
     ├── /api/assets             # Granular asset ledger with performance metrics
     ├── /api/family             # Consolidated family wealth & consent states
     ├── /api/news               # Live financial news with rupee sensitivity calculation
     ├── /api/news/simulate-shock # Scenario stress testing engine
     ├── /api/sync               # Broker rebalance simulation (Tata Motors -> Savings)
     ├── /api/ai/analyze         # Copilot chat & diagnostic synthesis
     └── /api/config/key         # 1-Click Gemini API key configuration
```

---

## ⚡ Quick Start & Installation

### Prerequisites
* **Node.js** v18+ (tested on Node v25)
* **npm** v9+

### 1. Clone the Repository
```bash
git clone https://github.com/Daksh009-hub/WealthIQ.git
cd WealthIQ
```

### 2. Install Dependencies
```bash
npm run install:all
```
*(Or run `npm install` in root, `server/`, and `client/`)*

### 3. Environment Setup
Copy `.env.example` to `.env`:
```bash
cp .env.example .env
```
Contents of `.env`:
```env
GEMINI_API_KEY=your_gemini_api_key_here
GEMINI_MODEL=gemini-3.5-flash
PORT=5000
```
> **Note**: WEALTHIQ works completely out-of-the-box even with **zero API key** using its local contextual reasoning engine. You can also paste your Gemini API key directly inside the app using the **"Gemini Key"** button in the header.

### 4. Run the Application
```bash
npm run dev
```
* **Client**: `http://localhost:5173` (with hot module reload and API proxy)
* **Server**: `http://localhost:5000`

### 5. Production Build & Run
```bash
npm run build
npm start
```
The server on `http://localhost:5000` automatically serves both the API endpoints and the compiled React production client.

---

## ⏱️ 2-Minute Demo Flow

> 🌐 **Try it Live right now:** [https://wealth-iq-umber.vercel.app/](https://wealth-iq-umber.vercel.app/)

1. **Overview & Wealth Trajectory**:
   * Open [https://wealth-iq-umber.vercel.app/](https://wealth-iq-umber.vercel.app/) (or local `http://localhost:5000`).
   * Inspect the total net worth (₹65.80 Lakh) and the interactive **Wealth Trajectory Area Chart** (`3M`, `6M`, `1Y`).
   * Switch to **FAMILY PORTFOLIO** to view consolidated wealth (₹1.42 Cr) and toggle Father or Mother's **Consent Chip** to demo RBI Account Aggregator privacy gates.
2. **Asset Explorer & Multifactor Filters**:
   * Navigate to **Asset Explorer**.
   * Click through category pills (`Stocks ₹8.6L`, `Mutual Funds ₹8.1L`, `Property ₹37.0L`, etc.).
   * Filter by performance (+Gainers / -Losers) and toggle between Grid Cards and Table View.
3. **Portfolio Health & AI Dynamic Model**:
   * Open **Portfolio Health**.
   * Inspect the **AI Dynamic Model vs. Static Formula** comparator. Switch between *Normal Market*, *High Volatility*, and *Rising Rates* to see real-world beta and illiquidity haircuts in action.
   * Review **Hidden Overlap Detected**: note how **Infosys** is held across 4 distinct routes totaling ₹3.23 Lakh (19.4% of equity).
4. **Live Market News & Shock Simulator**:
   * Open **Live Market & News**.
   * Review real-time news headlines with live rupee portfolio impact pills (`+₹2,369 (+0.04%)`).
   * Use the **Market Shock Simulator** to test a -6% Tech Pullback with the live severity slider.
5. **Gemini Wealth Copilot**:
   * Open **Gemini Copilot**.
   * Ask: *"Where am I over-invested and what should I review?"* or *"What is the status of my Tata Motors holding post-sync?"*.
   * Verify the structured response: **FACT**, **ANALYSIS**, **POTENTIAL RISK**, and **SUGGESTION**.
6. **Simulated Broker Sync**:
   * Click the **Sync Portfolio** button in the top bar.
   * Watch Tata Motors sell ₹40,000, credited into Savings, and see all metrics and charts update live without a page reload.

---

## 🔒 Security & Privacy

* **Zero API Key Leakage**: The Gemini API key remains strictly on the server and is never exposed to client-side code.
* **Safe Sandbox Ledger**: All financial data is simulated sandbox mock data. PAN numbers alone do not provide unrestricted financial access.
* **Explicit Consent Controls**: Family members' assets are strictly gated behind simulated Account Aggregator consent permissions.
* **Probabilistic Educational Copy**: Enforces non-promissory terminology (*may, potential impact, consider reviewing*) and refrains from price predictions or guaranteed advice.

---

## 📄 License
MIT License. Built for demonstration and educational wealth intelligence.
