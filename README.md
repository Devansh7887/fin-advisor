# FinAdvisor – AI-Powered Financial Advisory Platform

<div align="center">

**Built for GenAI4GenZ Program 2025**

![License](https://img.shields.io/badge/license-MIT-blue.svg)
![Next.js](https://img.shields.io/badge/Next.js-14.1-black)
![NestJS](https://img.shields.io/badge/NestJS-10.3-red)
![MongoDB](https://img.shields.io/badge/MongoDB-Atlas-green)

*An experimental AI-driven platform focused on intelligent financial assistance*

[Features](#features) • [Tech Stack](#tech-stack) • [Getting Started](#getting-started) • [Architecture](#architecture) • [Contributing](#contributing)

</div>

---

## 📖 About

**FinAdvisor** is a full-stack, AI-powered financial advisory platform developed as part of the **GenAI4GenZ Program 2026**.  
The project explores how **Generative AI**, real-time market data, and modern web technologies can be combined to assist users in understanding investments, managing portfolios, and planning financial goals.

Rather than replacing professional financial advice, FinAdvisor focuses on **education, insights, and decision support** for beginner and intermediate investors.

### 🎯 Project Goal
To design and build a scalable, AI-assisted financial platform that demonstrates:
- Real-world GenAI integration
- Secure, real-time system architecture
- Practical finance-focused use cases

---

## ✨ Features

### 🤖 AI-Powered Chat Assistant
- Context-aware conversations using maintained chat history
- Supports queries related to stocks, SIP planning, portfolio reviews, and market concepts
- Streaming responses using WebSockets for better UX
- Powered by **Google Gemini 1.5 Pro** via the Generative Language API
- Graceful fallback handling for API limits and failures

---

### 📊 Portfolio Management
- Support for managing multiple portfolios
- Real-time price updates using WebSockets
- Portfolio-level metrics such as gains/losses and allocation
- AI-assisted insights focused on diversification and risk awareness
- Interactive visual analytics for better understanding (Recharts)

---

### 🎯 Goal-Based Investing
- Define custom financial goals (retirement, education, savings, etc.)
- Track progress based on linked portfolio performance
- AI-generated suggestions aligned with user-defined risk preferences
- Visual progress indicators and timeline-based projections

---

### 📈 Market Intelligence
- Detection of common technical patterns (Head & Shoulders, Double Top/Bottom, Triangles)
- Historical price analysis with standard technical indicators
- Batch analysis for multiple symbols within a portfolio
- Real-time alerts for detected patterns and significant movements

---

### 📰 News & Sentiment Analysis
- Market news aggregation using Yahoo Finance
- AI-based sentiment classification (Bullish / Bearish / Neutral)
- Portfolio-focused news feed for tracked assets
- Sentiment distribution and trend overview

---

### 🔔 Smart Notifications
- Price-based alerts for selected assets
- Pattern detection notifications
- Goal milestone alerts
- Live portfolio update notifications via WebSockets

---

## 🛠️ Tech Stack

### Frontend
- **Framework**: Next.js 14.1 (App Router)
- **Language**: TypeScript
- **Styling**: Tailwind CSS
- **UI Components**: Radix UI, Lucide Icons
- **Charts**: Recharts
- **State Management**: Zustand
- **Real-time Communication**: Socket.IO Client
- **HTTP Client**: Axios

---

### Backend
- **Framework**: NestJS 10.3
- **Language**: TypeScript
- **Database**: MongoDB Atlas (Mongoose)
- **Cache**: Redis
- **Authentication**: JWT + Passport.js
- **Real-time**: Socket.IO (WebSockets)
- **Scheduling**: NestJS Schedule
- **Validation**: class-validator, class-transformer

---

### AI & Data Services
- **AI Model**: Google Gemini 1.5 Pro
- **Market Data**: Yahoo Finance
- **Technical Analysis**: technicalindicators library
- **Pattern Detection**: Custom rule-based logic with AI-assisted insights

---

### Infrastructure & Tooling
- PM2-ready backend setup
- Centralized logging using Winston
- Global exception handling and validation pipes
- Swagger / OpenAPI documentation support

---

## 🚀 Getting Started

### Prerequisites
- Node.js v18+
- MongoDB (Atlas or local)
- Redis (local or cloud)
- Google Gemini API Key (Google AI Studio)

---

### Installation

#### 1. Clone the Repository

git clone <repository-url>
cd GENAIFORGENZ

### Backend Setup 
cd backend
npm install
### Development with auto-reload
npm run start:dev  
# OR Production mode
npm start          

### Frontend Setup
cd frontend
npm install
npm run dev
