# 🏛️ Blockchain-Based Secure Land Registration System

A **hybrid land registry** for Kenya's Ardhi Sasa platform that uses **Ethereum blockchain as a tamper-proof verification layer** alongside a conventional database — proving data integrity without replacing the existing system.

![Status](https://img.shields.io/badge/status-prototype-blue)
![License](https://img.shields.io/badge/license-MIT-green)
![Node](https://img.shields.io/badge/node-%3E%3D18-brightgreen)
![Solidity](https://img.shields.io/badge/solidity-0.8.19-363636)
![React](https://img.shields.io/badge/react-18-61DAFB)
![TypeScript](https://img.shields.io/badge/typescript-5-3178C6)

---

## 📖 Why this project exists

Kenya's **Ardhi Sasa** platform digitized land services but kept a **centralized architecture** — a single database controlled by one authority. That creates a single point of failure and mutability problems: audit logs can be altered, records can be tampered with, and insider threats are hard to detect.

This project demonstrates that **blockchain can be layered on top of the existing platform** (not replace it) to:
- Store a **SHA-256 hash** of every land record on-chain
- Detect **tampering** by comparing database hash vs blockchain hash
- Enforce **multi-signature approval** (2 officers required for every action)
- Provide an **immutable audit trail** admissible as forensic evidence

---

## ✨ Features

| Category | Feature |
|----------|---------|
| **Registration** | Citizens register land with Kenyan parcel ID validation (`LR12345/2025`, `KSM/12345`, `Nairobi/Block/123/Plot/456`) |
| **Approval** | Two different officers (Registrar + Surveyor) must approve every registration and transfer |
| **Transfer** | Ownership changes require multi-signature approval, updates blockchain hash |
| **Verification** | Anyone can verify a land record against blockchain — no login required |
| **Audit** | Immutable log of every action, tamper alerts, CSV export |
| **Title Deeds** | Registrar generates Kenyan-format title deed with blockchain QR code |
| **Admin** | Level-2 approval — admin must approve new citizen accounts before login |
| **Dashboards** | Role-based views: Citizen, Registrar, Surveyor, Auditor, Admin |
| **Search & Filter** | Full-text search, status filters, date range on all dashboards |

---

## 🏗️ Architecture

┌─────────────────────────────────────────────────────────────────┐
│ PRESENTATION (React + Vite) │
│ Citizen · Registrar · Surveyor · Auditor · Admin Dashboards │
└─────────────────────────┬───────────────────────────────────────┘
│ HTTPS / JWT
┌─────────────────────────▼───────────────────────────────────────┐
│ APPLICATION (Node.js + Express) │
│ Auth · Lands · Approvals · Transfers · Logs · Blockchain │
└──────────┬───────────────────────────────────┬──────────────────┘
│ │
┌──────▼──────┐ ┌────────▼────────┐
│ SQLite DB │ │ Ethereum (Ganache) │
│ (Prisma) │ │ LandRegistry.sol │
│ │ │ - storeHash() │
│ Land data │◄── hash link ────►│ - getHash() │
│ Users │ │ - verifyHash() │
│ Logs │ │ - Events │
└─────────────┘ └────────────────────┘


**The hybrid insight:** Operational data lives off-chain (fast, queryable). Only **cryptographic hashes** live on-chain (immutable, verifiable). Both must match for a record to be valid.

---

## 🛠️ Tech Stack

| Layer | Technologies |
|-------|-------------|
| **Frontend** | React 18, TypeScript, Vite, TailwindCSS, Zustand, Axios, React Router 6 |
| **Backend** | Node.js, Express, TypeScript, Prisma ORM, Zod |
| **Database** | SQLite (dev), PostgreSQL-ready (prod) |
| **Blockchain** | Solidity 0.8.19, Ethereum, Ganache, Ethers.js v5, Remix |
| **Security** | JWT + refresh tokens, bcrypt, Helmet, rate limiting, RBAC |

---

## 🚀 Quick Start (5 minutes)

### Prerequisites

- Node.js 18+
- [Ganache](https://trufflesuite.com/ganache/) (GUI or CLI)
- Browser access to [Remix IDE](https://remix.ethereum.org)

### 1️⃣ Clone

```bash
git clone https://github.com/YOUR_USERNAME/land-registry-system.git
cd land-registry-system
2️⃣ Deploy the Smart Contract

    Start Ganache on port 7545

    Open Remix, paste smart-contracts/LandRegistry.sol

    Compile with Solidity 0.8.19 (enable optimizer, runs 200)

    Deploy using Web3 Provider → http://localhost:7545

    Copy the deployed contract address

3️⃣ Configure Backend
cd backend
cp .env.example .env
Edit backend/.env and set:

    BLOCKCHAIN_CONTRACT_ADDRESS → the address from step 2

    BLOCKCHAIN_PRIVATE_KEY → first Ganache account's private key

    JWT_SECRET and JWT_REFRESH_SECRET → any long random strings

Then:
bash

npm install
npx prisma generate
npx prisma migrate dev --name init
npx prisma db seed
npm run dev

Backend will start on http://localhost:5000.

After deploy, register 3 officers in the contract (via Remix):
solidity

registerOfficer("0xBACKEND_WALLET_ADDRESS")   // signing wallet
registerOfficer("0xOFFICER1_ADDRESS")          // registrar
registerOfficer("0xOFFICER2_ADDRESS")          // surveyor

4️⃣ Configure Frontend
bash

cd ../frontend
cp .env.example .env
npm install
npm run dev

Frontend will start on http://localhost:5173.
🔑 Test Credentials
Role	Email	Password
👤 Citizen	citizen@example.com	password123
📋 Registrar	officer1@example.com	password123
📐 Surveyor	officer2@example.com	password123
👁️ Auditor	auditor@example.com	password123
⚙️ Admin	admin@example.com	password123
🧪 Demo Walkthrough

    Login as Citizen → Register land LR99999/2025

    Login as Registrar → Approve it (1/2 approvals)

    Login as Surveyor → Approve it (2/2 → status becomes APPROVED)

    Login as Auditor → Click "Verify" → shows ✅ VALID (matches blockchain)

    Tamper test: Edit the land's dataHash directly in Prisma Studio → Verify again → shows ⚠️ TAMPERED

    Login as Registrar → Open land → Issue Title Deed (Kenyan format, printable)

    Login as Citizen → Request transfer to another citizen → two officers approve → ownership changes and new hash is stored on-chain
📸 Screenshots

    Drop screenshots into docs/screenshots/ — the README will render them here

Homepage	Citizen Dashboard
https://docs/screenshots/homepage.png	https://docs/screenshots/citizen-dashboard.png
Registrar Approvals	Auditor Verification
https://docs/screenshots/registrar-dashboard.png	https://docs/screenshots/auditor-dashboard.png
Title Deed	Blockchain Verification
https://docs/screenshots/title-deed.png	https://docs/screenshots/verification.png
📁 Project Structure
text

land-registry-system/
├── backend/
│   ├── prisma/
│   │   ├── schema.prisma        # DB schema (SQLite)
│   │   ├── migrations/          # Migration history
│   │   └── seed.ts              # Test data seeding
│   └── src/
│       ├── config/blockchain.ts # Ethers.js contract interface
│       ├── controllers/         # Request handlers
│       ├── middleware/          # Auth, RBAC, error, logging
│       ├── routes/              # REST endpoints
│       ├── services/            # Business logic
│       ├── schemas/             # Zod validation
│       ├── utils/               # Helpers (crypto, prisma, errors)
│       └── server.ts            # Express entry point
│
├── frontend/
│   └── src/
│       ├── components/          # Reusable UI (ProtectedRoute, TitleDeed)
│       ├── pages/               # Route pages (dashboards, login, etc.)
│       ├── services/            # Axios client
│       ├── store/               # Zustand stores
│       └── utils/               # Validation helpers
│
├── smart-contracts/
│   └── LandRegistry.sol         # Solidity contract
│
└── docs/                        # Screenshots + documentation

🔐 Security Model
Layer	Mechanism
Authentication	JWT access (15 min) + refresh (7 days) tokens, bcrypt password hashing
Level-2 Auth	Admin must approve new accounts before first login
Authorization	Role-Based Access Control (5 roles, endpoint-level enforcement)
Transaction Auth	2-of-2 officer multi-signature for all approvals
Data Integrity	SHA-256 hash on Ethereum blockchain — any tamper → mismatch
Immutable Audit	Every action written to append-only log
🧭 Design Decisions

    Hybrid > Replacement: A full blockchain rewrite of Ardhi Sasa is impractical. This project demonstrates incremental security — a smart layer, not a rebuild.

    Hash excludes timestamps: Critical for reproducibility. Deterministic hashing means verification always matches (a real bug we hit and fixed).

    String comparison, not bytes32: Off-chain hashes stored as strings to avoid conversion complexity in the verification path.

    Multi-officer approval = real fraud deterrence: A single compromised account can't move land. Two colluding accounts can, but that's a much higher bar.

⚠️ Known Limitations

    The prototype runs on Ganache (local). Production requires a public testnet → mainnet deployment, plus HSM for key storage.

    Document uploads store only the hash (via IPFS integration is a planned enhancement).

    Notifications (email/SMS) are not yet implemented.

    No formal security audit has been performed.

🗺️ Roadmap

    □

    IPFS integration for document storage
    □

    Email/SMS notifications
    □

    Deploy to Sepolia testnet
    □

    Mobile-responsive polish + mobile app
    □

    Admin analytics charts
    □

    Formal security audit

📜 License

MIT © Mulela James Mwongela

👤 Author
Mulela James Mwongela
BSc. Computer Security and Forensics
Meru University of Science and Technology

Project Supervisor: Dr. Dorothy Bundi,
                    Lecturer, Meru University
