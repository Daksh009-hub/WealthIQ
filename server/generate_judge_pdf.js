// server/generate_judge_pdf.js
// Generates the comprehensive WealthIQ Architecture & Judge Defense Handbook PDF

import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import PDFDocument from 'pdfkit';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const outputPath = path.resolve(__dirname, '../WEALTHIQ_Architecture_Judge_Handbook.pdf');

const doc = new PDFDocument({
  size: 'A4',
  margins: { top: 40, bottom: 45, left: 45, right: 45 },
  bufferPages: true,
  autoFirstPage: true
});

const stream = fs.createWriteStream(outputPath);
doc.pipe(stream);

// Color Palette
const navy = '#0f172a';
const primaryIndigo = '#312e81';
const accentIndigo = '#4338ca';
const cyanAccent = '#0284c7';
const emeraldAccent = '#059669';
const slateDark = '#1e293b';
const slateMuted = '#475569';
const slateLight = '#f8fafc';
const borderSlate = '#cbd5e1';

function drawHeader(title, subtitle) {
  doc.rect(45, 30, 505, 4).fill(accentIndigo);
  doc.moveDown(0.5);
  doc.font('Helvetica-Bold').fontSize(18).fillColor(primaryIndigo).text(title, 45, 42);
  if (subtitle) {
    doc.font('Helvetica-Bold').fontSize(9).fillColor(cyanAccent).text(subtitle, 45, 64);
  }
  doc.strokeColor(borderSlate).lineWidth(0.8).moveTo(45, 80).lineTo(550, 80).stroke();
  doc.y = 90;
}

function drawSectionHeading(num, title) {
  const y = doc.y;
  doc.rect(45, y, 4, 16).fill(accentIndigo);
  doc.font('Helvetica-Bold').fontSize(12).fillColor(primaryIndigo).text(`  ${num}. ${title}`, 52, y + 2);
  doc.y = y + 24;
}

function drawSubheading(title) {
  doc.font('Helvetica-Bold').fontSize(10).fillColor(accentIndigo).text(title);
  doc.moveDown(0.2);
}

function drawParagraph(text) {
  doc.font('Helvetica').fontSize(8.5).fillColor(slateDark).text(text, { align: 'justify', lineGap: 1.8 });
  doc.moveDown(0.4);
}

function drawBullet(boldPrefix, text) {
  doc.font('Helvetica-Bold').fontSize(8.5).fillColor(slateDark).text(`•  ${boldPrefix}: `, { continued: true });
  doc.font('Helvetica').fontSize(8.5).fillColor(slateMuted).text(text, { lineGap: 1.5 });
  doc.moveDown(0.3);
}

function drawCallout(title, body, bg = '#f1f5f9', border = '#94a3b8') {
  const startY = doc.y;
  doc.rect(45, startY, 505, 44).fillAndStroke(bg, border);
  doc.font('Helvetica-Bold').fontSize(9.5).fillColor(primaryIndigo).text(title, 55, startY + 6);
  doc.font('Helvetica').fontSize(8).fillColor(slateMuted).text(body, 55, startY + 20, { width: 485, lineGap: 1.5 });
  doc.y = startY + 52;
}

// ==================== PAGE 1: EXECUTIVE OVERVIEW & PROBLEM ====================
drawHeader('WEALTHIQ: Architecture & Defense Handbook', 'YOUR WEALTH. ONE INTELLIGENT VIEW. | Comprehensive Evaluation Manual for Hackathon & Pitch Judges');

drawSectionHeading('1', 'Executive Value Proposition & The Problem We Solve');
drawParagraph('Modern affluent and aspirational families in India hold wealth scattered across multiple banks, demat accounts, mutual fund houses (AMCs), physical real estate, sovereign & physical gold, insurance policies, and vehicles. While platforms like Zerodha, Groww, and INDmoney offer point-in-time tracking for select financial instruments, they operate as ISOLATED SILOS. Investors have zero unified visibility into total family net worth, cross-holding exposure, or macroeconomic sensitivity.');

drawCallout('The Core Innovation: Look-Through Mutual Fund Deconstruction',
  'Holding Infosys directly (₹2.60L), plus an index fund (Nifty 50), plus a Flexi Cap fund, plus a Tech thematic fund means technology exposure is secretly 29.4% of total equity. When tech corrections hit, investors suffer simultaneous compounding drawdowns across direct shares and mutual fund NAVs without realizing they were over-invested.');

drawSectionHeading('2', 'The Two Core Differentiators Against Existing Apps');
drawBullet('1. True Look-Through Portfolio Dissection', 'Unlike traditional aggregators that treat a mutual fund as a single black box asset, WealthIQ dynamically parses the fund scheme fact-sheet down to constituent equity weights. Direct equity shares and indirect mutual fund equities are aggregated into a single true issuer ledger (e.g. Total Infosys = ₹2.60L direct + ₹56K indirect = ₹3.16L total true exposure).');
drawBullet('2. Holding-Specific News Sensitivity Engine', 'Instead of bombarding users with generic CNBC/Moneycontrol feeds, WealthIQ filters live financial wires exclusively to companies the user actually owns. It calculates exact rupee and percentage sensitivity deltas. Every alert features a clickable "WHY?" expander that exposes the underlying mathematical formula and asset breakdown.');

drawSectionHeading('3', 'Target Audience & Problem Validation');
drawBullet('Affluent Salaried Professionals & HNWIs', 'Individuals with 15+ scattered accounts across EPF, PPF, direct equities, 8+ mutual funds, employer RSUs, home loans, and car loans.');
drawBullet('Multi-Generational Indian Families', 'Households where parents own ancestral property, gold, and post office FDs, while adult children hold equities, crypto, and auto loans. WealthIQ provides consolidated family wealth under granular consent control.');

// ==================== PAGE 2: LAYERED ARCHITECTURE & TECH STACK ====================
doc.addPage();
drawHeader('System Architecture & Technology Stack', 'Layered Decoupled Architecture | Non-Negotiable Determinism & Zero LLM Hallucinations');

drawSectionHeading('4', 'Decoupled 5-Tier Architecture');
drawParagraph('WealthIQ is engineered with strict separation of concerns to guarantee bank-grade arithmetic determinism, sub-second UI responsiveness, and state-of-the-art AI reasoning without risk of financial hallucination:');

drawBullet('Tier 1: Asset Ingestion & Multi-Member Consent', 'server/services/assetAggregator.js coordinates user assets, liabilities, and multi-member family ledgers. Implements granular Account Aggregator consent gates (Granted vs Pending) that dynamically re-compute net worth upon consent withdrawal.');
drawBullet('Tier 2: Deterministic Calculation Engine', 'server/services/portfolioEngine.js handles 100% of arithmetic, sector look-through aggregation, company overlaps, and baseline 5-pillar health scores in pure deterministic JavaScript. No generative AI is ever allowed near primary arithmetic.');
drawBullet('Tier 3: AI Dynamic Stressed Risk Engine', 'server/services/aiCalculationEngine.js evaluates real-world market covariance, sector betas (Tech 1.38x), forced liquidation haircuts (15-25% on real estate), and dynamic macro shock regimes. Bridges the gap between static theoretical formulas and real-world market crashes.');
drawBullet('Tier 4: Live Market RSS Wire & Sensitivity Parser', 'server/services/liveNewsService.js continuously ingests breaking news from financial RSS wires, maps headlines to the user\'s exact ticker holdings, and computes holding-specific rupee sensitivity.');
drawBullet('Tier 5: Gemini 3.5/3.8 Conversational Intelligence', 'server/services/gemini.js connects to official Google Gemini 3.5 & 3.8 Flash via @google/genai SDK. Follows a strict FACT, ANALYSIS, RISK, SUGGESTION prompt schema to deliver grounded financial guidance.');

drawSectionHeading('5', 'Technology Stack & Architectural Decisions');
drawBullet('Frontend Single-Page App', 'React 19 + Vite 6: Fast modern single-page application with instant HMR and optimized tree-shaking.');
drawBullet('Styling & Design System', 'Tailwind CSS v4: Minimalist modern fintech aesthetic (Stripe/Linear inspired) with generous whitespace, subtle slate borders, and electric indigo/cyan accents.');
drawBullet('Interactive Visualizations', 'Recharts (AreaChart, PieChart, Donut, Stacked BarChart) + Custom SVG HealthRing: High-density interactive charts with custom tooltips, active dot animations, and responsive containers.');
drawBullet('Backend Server & APIs', 'Node.js v25 + Express 4: Lightweight RESTful API server running on port 5000 with CORS, JSON body parsers, and static client delivery.');
drawBullet('Generative AI Framework', 'Google Gemini 3.5 Flash & 3.8 Flash with automated model fallback and a robust local deep-reasoning financial engine when offline.');

// ==================== PAGE 3: FEATURE-BY-FEATURE DEEP DIVE ====================
doc.addPage();
drawHeader('Feature Deep-Dive & Code Walkthrough', 'Screen-by-Screen Technical Implementation & Directory Map');

drawSectionHeading('6', 'Module-by-Module Code Walkthrough');

drawSubheading('Screen 1: Overview & Wealth Trajectory (client/src/pages/Overview.jsx)');
drawBullet('Key Components', 'TrendChart.jsx, Donut Allocation, Consolidated Family Wealth, Consent Chips.');
drawBullet('Capabilities', 'Net Worth headline (₹65.80L), Daily (+₹12.4K) and Monthly (+₹1.85L) deltas, Gross Assets vs Liabilities meter, 12-Month Interactive Wealth Trajectory Area Chart with 3M/6M/1Y filters, 7-category Donut allocation, and Family Member Consent Chips with 1-click toggling.');

drawSubheading('Screen 2: Asset Explorer & Multifactor Filters (client/src/pages/Assets.jsx)');
drawBullet('Key Components', 'Filter Ribbon, 8 Category Pills with Live Rupee Sums, Card Grid & Table Toggle.');
drawBullet('Capabilities', 'Real-time category breakdown (Stocks ₹14.5L, Mutual Funds ₹9.2L, Property ₹32.0L, Gold ₹5.6L, Cash/FDs ₹4.5L, Insurance ₹2.0L, Vehicles ₹6.0L). Multi-factor filtering across family members (Aarav, Father, Mother) and performance (Top Gainers vs Drawdown). Cards expand to reveal mutual fund underlying constituents.');

drawSubheading('Screen 3: Portfolio Health & AI Dynamic Model (client/src/pages/Health.jsx)');
drawBullet('Key Components', 'AIDynamicComparator.jsx, Look-Through Sector Contribution BarChart, WhyPanel.jsx.');
drawBullet('Capabilities', '5-Component Breakdown (Concentration 65/100, Liquidity 78/100, Allocation 88/100, Diversification 82/100, Volatility 72/100). Highlights the AI Dynamic Real-World Model: explains why static formulas show an optimistic 84/100 while real-world stressed beta puts the portfolio at 68/100 due to Tech sector covariance (1.38x) and illiquid real estate drag.');

drawSubheading('Screen 4: Live Market News & Shock Simulator (client/src/pages/Market.jsx)');
drawBullet('Key Components', 'MarketShockSimulator.jsx, Live News Polling Wire, Impact Badges, Recharts BarChart.');
drawBullet('Capabilities', 'Live RSS financial wire ingestion with 30-second auto-polling. Real-time ticker matching showing specific rupee impact (e.g. Infosys +₹7,800 on Q3 margin expansion). Interactive Market Shock Simulator with adjustable severity slider (0.5x to 2.5x) simulating global tech correction, RBI rate hike, and crude oil surge.');

drawSubheading('Screen 5: Gemini Wealth Copilot (client/src/pages/Copilot.jsx)');
drawBullet('Key Components', 'services/gemini.js, @google/genai, ApiKeyModal.jsx, Structured Chat Bubble UI.');
drawBullet('Capabilities', 'Evidence-based conversational chat adhering to FACT, ANALYSIS, POTENTIAL RISK, and SUGGESTION framework. Connects to live Gemini Cloud models with in-app 1-click key configurator, and features a local contextual financial engine for offline reasoning.');

// ==================== PAGE 4: SOURCING PHYSICAL ASSETS ====================
doc.addPage();
drawHeader('Physical Asset Ingestion Architecture', 'How WealthIQ Sources Non-Aggregator Assets (Land, Gold, Cars, Real Estate)');

drawSectionHeading('7', 'The Account Aggregator Limitation & The Real-World Solution');
drawParagraph('A critical technical question judges ask: "Account Aggregators (AAs) are regulated by RBI to fetch financial data (bank balances, demat stocks, mutual funds, insurance). How can you possibly extract physical assets like Land, Gold, and Cars?" The answer is that production WealthIQ uses a 4-pillar enterprise API & vision pipeline:');

drawSubheading('Pillar 1: Vehicles & Automobiles (Cars, Two-Wheelers)');
drawBullet('Data Source', 'MoRTH Vahan National Register API (Ministry of Road Transport and Highways).');
drawBullet('Ingestion Flow', 'The user enters their Vehicle Registration Number (e.g., KA-01-MJ-5020). The Vahan G2B API returns vehicle make, model, variant, registration year, fuel type, and insurance status.');
drawBullet('Valuation Engine', 'Integrated with Automated Valuation Models (AVMs) from Spinny, Cars24, or Droom Orange Book Value (OBV) API. Factors in IRDAI statutory depreciation slabs, mileage, and real-time used-car market liquidity to calculate live fair market value.');

drawSubheading('Pillar 2: Gold & Precious Bullion (Physical, Digital, SGBs)');
drawBullet('SGBs & Gold ETFs', 'Already in demat accounts! Extracted automatically via Account Aggregator through CDSL/NSDL depositories without manual entry.');
drawBullet('Digital Gold', 'Direct partner API integration with regulated digital gold vault custodians: MMTC-PAMP, SafeGold, and Augmont.');
drawBullet('Physical Jewellery & Coins', 'User enters gram weight and karat purity (18K, 22K, 24K) once. WealthIQ continuously marks-to-market using the India Bullion and Jewellers Association (IBJA) Live Spot Rate API, updated twice daily.');

drawSubheading('Pillar 3: Real Estate & Land (Apartments, Plots, Commercial)');
drawBullet('Government Registries', 'State Land & Revenue Registries (Kaveri & Bhoomi in Karnataka, IGR Inspector General of Registration in Maharashtra, Dharani in Telangana) queried via Property ID (PID) or Survey/Khata number.');
drawBullet('Valuation Engine', 'PropTech Automated Valuation Models (AVMs) such as Zapkey, SquareYards, and Propworth. Analyzes registered sale deed comps in the same pin code/society within the last 90 days to derive true square-foot valuation.');

drawSubheading('Pillar 4: Gemini Multimodal Vision Document Onboarding');
drawBullet('Zero-Friction Ingestion', 'Users snap a photo of their Property Sale Deed, Municipal Tax Receipt, Vehicle RC Smart Card, or Hallmark Gold Purchase Invoice.');
drawBullet('Vision Processing', 'Google Gemini Multimodal Vision API extracts property area, survey number, vehicle VIN, and gold weight automatically, eliminating tedious manual data entry.');

// ==================== PAGE 5: JUDGE DEFENSE CHEAT SHEET ====================
doc.addPage();
drawHeader('Judge Defense Cheat Sheet & Competition Q&A', 'Winning Technical & Business Answers to Tough Evaluator Inquiries');

drawSectionHeading('8', 'Anticipated Judge Questions & Bulletproof Answers');

drawSubheading('Q1: "Why not let Gemini or an LLM do the portfolio math directly?"');
drawParagraph('ANSWER: LLMs are probabilistic token predictors, not calculators. Financial applications require 100% deterministic arithmetic integrity. Letting an LLM calculate net worth leads to hallucinated numbers, incorrect percentages, and regulatory non-compliance. WealthIQ computes 100% of math in deterministic JavaScript; Gemini is used solely for evidence-based explanation, scenario stress-testing, and conversational synthesis.');

drawSubheading('Q2: "Why do you claim static formulas fail in real-world scenarios?"');
drawParagraph('ANSWER: Static formulas (e.g. subtracting 3 points if top sector > 22%) assume linear, independent market conditions. In real crashes, Technology has an aggressive 1.38x beta, dropping 2x to 3x faster than defensive sectors. Furthermore, holding Infosys directly and in 3 mutual funds creates high covariance—they crash simultaneously. Our AI Dynamic Model incorporates sector betas, emergency debt-service EMI drag, and illiquid asset haircuts (15-25% forced discount on property).');

drawSubheading('Q3: "How do you ensure user privacy and security?"');
drawParagraph('ANSWER: Zero API keys are ever sent to client-side code. All data operates in sandbox mode. Furthermore, WealthIQ implements RBI Account Aggregator consent gates: each family member has a clickable Consent Chip (Granted vs Pending) that instantly masks their holdings and recalculates family exposure if consent is withheld.');

drawSubheading('Q4: "What is your commercialization and monetization roadmap?"');
drawParagraph('ANSWER: 1. B2C Freemium: Free portfolio tracking; ₹499/mo Pro tier for deep look-through deconstruction, tax harvesting alerts, and unlimited Gemini Copilot scenario simulations.\n2. B2B WealthTech White-Label: Licensing our Look-Through Exposure & Stress Engine to SEBI Registered Investment Advisors (RIAs), private wealth desks, and neo-banks.');

drawSectionHeading('9', 'The 60-Second Winning Elevator Pitch');
drawCallout('The Pitch to Memorize for the Judges',
  '"Judges, you know that Indian investors are investing more than ever, but their wealth is scattered. Today, if you ask an investor what their total exposure to Infosys or the Tech sector is, they have no idea because half of it is buried inside 4 different mutual funds. WealthIQ solves this with true look-through deconstruction, dynamic AI stress-testing, and family consent aggregation. We replace blind spots with clarity."',
  '#f0fdf4', '#86efac');

// Page Footers
const pages = doc.bufferedPageRange();
for (let i = 0; i < pages.count; i++) {
  doc.switchToPage(i);
  doc.font('Helvetica').fontSize(7.5).fillColor('#94a3b8').text(
    `WEALTHIQ Architecture & Defense Handbook  |  Page ${i + 1} of ${pages.count}  |  CONFIDENTIAL - FOR JUDGES & EVALUATORS ONLY`,
    45,
    800,
    { align: 'center', width: 505 }
  );
}

doc.end();

stream.on('finish', () => {
  console.log(`PDF successfully generated with ${pages.count} pages at:`, outputPath);
});
