Backend Engineering Assessment – FX Trading App 
Context 
You’re tasked with building the backend for an FX Trading App where users can trade currencies, including Naira (NGN) and other international currencies. Users should be able to: 
● Register and verify their email. 
● Fund their wallet and perform transfers. 
● Trade Naira (NGN) against other currencies (USD, EUR, GBP, etc.) and vice versa. 
Your system must fetch real-time FX rates, manage wallets, and allow secure currency conversion and trading. 
Tech Stack 
● Backend Framework: NestJS 
● ORM: TypeORM 
● Database: PostgreSQL (this project uses PostgreSQL) 
● You may use any mail provider (like Gmail SMTP) for sending emails.
● API documentation: OpenAPI (Swagger); expose Swagger UI and keep spec in sync with the API. 
Functional Requirements 
1. User Registration, Email Verification & Auth 
○ Users can register with an email and receive an OTP for verification. 
○ After verifying OTP, users can log in (e.g. POST /auth/login) and receive a token (e.g. JWT) for protected routes. 
○ Only verified users (email verified) can access wallet and related features; only KYC-verified users can access trading (convert/trade).
2. KYC (Know Your Customer) 
○ After email verification, users may submit KYC data (e.g. full name, DOB, address, ID type/number) for compliance. 
○ Support KYC status (e.g. pending, verified, rejected) and gate trading/higher limits by KYC status. 
○ Optional: document upload (ID, proof of address). Document assumptions (manual vs automated review, retention) in README.
3. User Wallet 
○ Each user has a wallet with an initial balance. 
○ The wallet should support multiple currencies (e.g., NGN, USD, EUR). 
○ Users can fund their wallets, starting with Naira (NGN), and hold balances in various currencies. 
○ Optional: support transfers (e.g. between own wallets or to another user); if so, define POST /wallet/transfer and document behaviour.
4. FX Rate Integration 
○ Fetch real-time FX rates from a third-party API (e.g., 
https://www.exchangerate-api.com or any reliable FX API). 
○ Store these rates temporarily in cache or in-memory for performance.
5. Currency Conversion & Trading 
○ Users can convert or trade: 
■ Naira → Other Currencies 
■ Other Currencies → Naira 
○ Use real-time FX rates for conversions. 
○ Ensure accurate balance updates and rate usage.
6. Example Use Cases 
○ Convert 1000 NGN to USD. 
○ Convert 50 EUR to NGN.
7. Transaction History 
○ Maintain a transaction history for all actions: funding, conversion, trades. 
○ Include details such as amount, rate used, transaction type, timestamp, and status.
8. Security & Compliance 
○ Rate limiting on auth (login, OTP send/verify) and on high-value endpoints (e.g. fund, trade). 
○ Idempotency: for fund, convert, and trade, accept an optional idempotency key and return the same response for duplicate keys to prevent double-spend. 
○ Audit trail: log material events (registration, verification, login, KYC, wallet operations) for compliance; do not log sensitive data (passwords, full tokens).
Constraints & Guidelines 
● This project uses PostgreSQL. 
● Think critically about how to model multi-currency wallet balances. ● Prevent double-spending and handle insufficient balance scenarios carefully. ● Validate all inputs and ensure data consistency and atomic operations. ● Handle external API failures gracefully (e.g., rate fallback, retries, error reporting). 
● Design your solution to be scalable and easy to extend to support additional currencies or trading pairs in the future. 
Deliverables 
1. A GitHub repository containing: 
○ Complete implementation of the backend system. 
○ A README.md that includes: 
■ Setup instructions 
■ Key assumptions 
■ API documentation via OpenAPI (Swagger); link to Swagger UI and/or export spec; Postman import optional 
■ Summary of architectural decisions 
○ (Optional but encouraged) Unit or integration tests for critical logic. 
2. (Optional, Bonus): 
○ Flow diagrams or architectural charts to illustrate trading logic, wallet management, or currency exchange handling.
Evaluation Criteria 
Area What We Look For 
System Design Clean architecture, modularity, scalability, and clarity in modeling wallet logic 
Security Attention to race conditions, validation, transaction atomicity, and safe APIs 
Code Quality Clean, consistent code following NestJS best practices 

Problem Solving 
Creative and thoughtful handling of edge cases and design constraints 

Best Practices Usage of patterns (e.g., CQRS, services, repositories), modular structure Clarity Clear README, well-documented assumptions, and API explanations Testability (Optional) Tests covering wallet and trading logic 
Bonus (Optional) 
● Role-based access: e.g., Admin vs. regular users 
● Caching: Use Redis or similar for storing FX rates temporarily 
● Transaction verification: Handle duplicates, retries, and ensure idempotency ● Analytics: Track and log trades, FX trends, and user activity 
Key API Endpoints 
| Method | Path | Description |
|--------|------|-------------|
| POST | /auth/register | Register a user and trigger OTP email |
| POST | /auth/verify | Verify OTP and activate account |
| POST | /auth/login | Log in (email/password); return token for protected routes |
| GET | /wallet | Get user wallet balances by currency |
| POST | /wallet/fund | Fund wallet in NGN or other currencies |
| POST | /wallet/convert | Convert between currencies using real-time FX rates |
| POST | /wallet/trade | Trade Naira with other currencies and vice versa |
| GET | /fx/rates | Retrieve current FX rates for supported currency pairs |
| GET | /transactions | View transaction history |
| POST | /kyc/submit | Submit or update KYC data (authenticated) |
| GET | /kyc/status | Get current KYC verification status (authenticated) |
| (optional) | POST /kyc/documents | Upload KYC documents (e.g. ID, proof of address) | 
Final Notes 
● Consider how you would scale this if you had millions of users. 
● Document all assumptions—especially around FX rates and wallet design. 
● While testing is optional, we strongly encourage tests for wallet balance, currency conversion, and transaction logic.
