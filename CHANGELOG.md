# Changelog

All notable changes to this project will be documented in this file.

The format is based on [Keep a Changelog](https://keepachangelog.com/en/1.0.0/),
and this project adheres to [Semantic Versioning](https://semver.org/spec/v2.0.0.html).

## [Unreleased]

### Planned
- TradingView chart integration
- Real-time WebSocket data display
- Historical data visualization
- Strategy backtesting engine
- Mobile responsive dashboard improvements

## [0.1.0] - 2025-11-22

### Added
- Initial project setup with Next.js 16, TypeScript, and Tailwind CSS v4
- Clerk authentication with protected routes
- Supabase PostgreSQL integration for market data storage
- Upstash Redis for caching and queuing
- xAI Grok integration for Python → TypeScript code conversion via AI SDK v5
- LangSmith observability for all AI SDK calls
- Binance WebSocket client for real-time market data
- ccxt broker wrapper for live trading on 100+ exchanges
- Paper trading mode with simulated accounts
- Landing page with feature showcase
- Dashboard with market overview
- Assets page with multi-asset support
- Paper trading interface
- Live trading interface with broker configuration
- API routes:
  - `/api/websocket` - Start/stop WebSocket feed
  - `/api/historical` - Fetch and store historical candles
  - `/api/execute` - Python code execution stub
  - `/api/convert` - Python → TypeScript conversion using Grok AI
- shadcn/ui component library integration
- CLI mode foundation
- Complete documentation (README, CONTRIBUTING, CODE_OF_CONDUCT, SECURITY)
- MIT License
- GitHub issue and PR templates

### Technical Details
- Next.js 16.0.3 with App Router and Turbopack
- TypeScript 5.9.3 in strict mode
- Tailwind CSS v4.1.17
- AI SDK v5.0.99 with xAI provider
- ccxt v4.5.20 for universal exchange support
- LangSmith v0.3.81 for AI observability
- Clerk v6.35.4 for authentication
- Supabase v2.84.0 for database
- Upstash Redis v1.35.6 for caching

### Infrastructure
- GitHub repository created
- MIT License applied
- Community guidelines established
- Security policy documented

---

## Version History

### [0.1.0] - 2025-11-22
First public release of Live Engine

---

## Contributing

See [CONTRIBUTING.md](CONTRIBUTING.md) for ways to contribute to this project.

## License

This project is licensed under the MIT License - see the [LICENSE](LICENSE) file for details.
