# Security Policy

## Supported Versions

We release patches for security vulnerabilities. Which versions are eligible for receiving such patches depends on the CVSS v3.0 Rating:

| Version | Supported          |
| ------- | ------------------ |
| 0.1.x   | :white_check_mark: |

## Reporting a Vulnerability

**Please do not report security vulnerabilities through public GitHub issues.**

If you discover a security vulnerability within Live Engine, please send an email to the maintainers. All security vulnerabilities will be promptly addressed.

### What to Include

When reporting a vulnerability, please include:

- Type of issue (e.g. buffer overflow, SQL injection, cross-site scripting, etc.)
- Full paths of source file(s) related to the manifestation of the issue
- The location of the affected source code (tag/branch/commit or direct URL)
- Any special configuration required to reproduce the issue
- Step-by-step instructions to reproduce the issue
- Proof-of-concept or exploit code (if possible)
- Impact of the issue, including how an attacker might exploit it

### What to Expect

- **Acknowledgment**: We will acknowledge your email within 48 hours
- **Communication**: We will keep you informed about the progress of fixing the vulnerability
- **Credit**: We will credit you in the security advisory (unless you prefer to remain anonymous)
- **Timeline**: We aim to patch critical vulnerabilities within 7 days

## Security Best Practices for Users

### API Keys and Secrets

- **Never commit** API keys or secrets to the repository
- Use **environment variables** (`.env.local`) for sensitive data
- Rotate API keys regularly
- Use different API keys for development and production
- Enable **IP whitelisting** on exchange APIs when possible

### Trading Security

- **Start with testnet/paper trading** before using real funds
- Use **API keys with minimal permissions** (read-only for data, trading for execution)
- **Never use root API keys** or keys with withdrawal permissions
- Set **spending limits** on exchange API keys
- Monitor trades and set up **alerts for unusual activity**

### Deployment Security

- Use **environment-specific secrets** (development, staging, production)
- Enable **HTTPS only** in production
- Configure **CORS** appropriately
- Use **rate limiting** on API endpoints
- Enable **Vercel Authentication** for sensitive routes
- Review **Clerk security settings** regularly

### Database Security

- Use **Row Level Security (RLS)** in Supabase
- Never expose **service role keys** to the client
- Use **parameterized queries** to prevent SQL injection
- Regularly **backup** your database
- Monitor **database access logs**

### Code Security

- Keep **dependencies up to date**
- Run `pnpm audit` regularly
- Use **TypeScript strict mode** to catch type errors
- Validate **all user input** on both client and server
- Sanitize data before **displaying or storing**

## Known Security Considerations

### 1. Python Code Execution

The `/api/execute` endpoint currently **does not execute Python code directly** for security reasons. Instead, it recommends using the `/api/convert` endpoint to convert Python to TypeScript.

If you need to execute arbitrary Python code:
- Use a **sandboxed environment** (Docker container, AWS Lambda, etc.)
- Implement **strict input validation**
- Set **execution timeouts**
- Limit **resource usage** (CPU, memory)
- **Never execute on the main application server**

### 2. API Key Storage

- API keys are stored in **environment variables**
- Never log API keys
- Use **Vercel environment variables** for production
- Rotate keys if compromised

### 3. Trading Execution

- All live trading should go through **ccxt library** (battle-tested)
- Implement **order validation** before execution
- Set **maximum order sizes**
- Use **testnet first** before live trading
- Implement **kill switch** for emergency stops

### 4. WebSocket Connections

- WebSocket connections are **read-only** (no writing to exchange)
- Implement **reconnection logic** with exponential backoff
- Validate **all incoming WebSocket messages**
- Set **rate limits** on message processing

### 5. AI Code Conversion

- Grok AI conversion is a **black box** - always review generated code
- Implement **code validation** before execution
- Set **timeouts** on AI API calls
- Monitor **AI API costs** and set limits
- **Never execute generated code without review**

## Security Updates

We will publish security advisories for:
- Critical vulnerabilities (CVSS >= 9.0)
- High severity vulnerabilities (CVSS >= 7.0)
- Other significant security issues

Security updates will be released as:
- **Patch releases** (0.1.x) for minor issues
- **Minor releases** (0.x.0) for significant changes
- **Major releases** (x.0.0) for breaking changes

## Disclosure Policy

- **Private disclosure** for 90 days after fix
- **Public disclosure** after patch is available
- **CVE assignment** for critical vulnerabilities

## Compliance

Live Engine aims to comply with:
- OWASP Top 10 security risks
- General Data Protection Regulation (GDPR) for user data
- Industry best practices for financial applications

## Security Checklist for Contributors

When contributing code, please ensure:

- [ ] No hardcoded secrets or API keys
- [ ] Input validation on all user-provided data
- [ ] Proper error handling (no sensitive data in error messages)
- [ ] HTTPS enforced for all external connections
- [ ] Dependencies are up to date
- [ ] No known security vulnerabilities introduced
- [ ] Authentication checks on protected routes
- [ ] Authorization checks for user-specific data
- [ ] Rate limiting considered for API endpoints
- [ ] SQL injection prevention (use parameterized queries)
- [ ] XSS prevention (sanitize output)
- [ ] CSRF protection (Next.js handles this)

## Third-Party Security

We rely on several third-party services. Please review their security policies:

- **Clerk**: https://clerk.com/security
- **Supabase**: https://supabase.com/security
- **Upstash**: https://upstash.com/docs/redis/security
- **Vercel**: https://vercel.com/security
- **xAI**: https://x.ai/security
- **Binance**: https://www.binance.com/en/support/faq/security
- **Bybit**: https://www.bybit.com/en-US/help-center/bybitHC_Category?id=360001063213

## Contact

For security issues: Create a private security advisory on GitHub or open an issue with the **security** label.

For general questions: Open a public GitHub issue.

---

**Stay safe and trade responsibly!** 🔒
