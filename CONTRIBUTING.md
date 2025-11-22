# Contributing to Live Engine

First off, thank you for considering contributing to Live Engine! 🎉

Live Engine is a universal real-time trading platform, and we welcome contributions from the community.

## 📋 Table of Contents

- [Code of Conduct](#code-of-conduct)
- [How Can I Contribute?](#how-can-i-contribute)
- [Development Setup](#development-setup)
- [Coding Standards](#coding-standards)
- [Commit Guidelines](#commit-guidelines)
- [Pull Request Process](#pull-request-process)
- [Community](#community)

## 📜 Code of Conduct

This project and everyone participating in it is governed by our [Code of Conduct](CODE_OF_CONDUCT.md). By participating, you are expected to uphold this code.

## 🤝 How Can I Contribute?

### Reporting Bugs

Before creating bug reports, please check existing issues to avoid duplicates. When creating a bug report, include:

- **Clear title and description**
- **Steps to reproduce** the issue
- **Expected vs actual behavior**
- **Environment details** (OS, Node version, browser, etc.)
- **Screenshots** if applicable
- **Error logs** or stack traces

Use the [bug report template](.github/ISSUE_TEMPLATE/bug_report.md) when available.

### Suggesting Enhancements

Enhancement suggestions are tracked as GitHub issues. When creating an enhancement suggestion, include:

- **Clear title and description**
- **Use case** explaining why this would be useful
- **Possible implementation** if you have ideas
- **Alternatives considered**

Use the [feature request template](.github/ISSUE_TEMPLATE/feature_request.md) when available.

### Code Contributions

1. **Fork the repository**
2. **Create a feature branch** (`git checkout -b feature/amazing-feature`)
3. **Make your changes**
4. **Test thoroughly**
5. **Commit with conventional commits** (see below)
6. **Push to your fork**
7. **Open a Pull Request**

## 💻 Development Setup

### Prerequisites

- Node.js 20+
- pnpm 10+
- Git

### Setup Steps

```bash
# Clone your fork
git clone https://github.com/YOUR_USERNAME/live-engine.git
cd live-engine

# Install dependencies
pnpm install

# Copy environment variables
cp .env.example .env.local
# Fill in your API keys

# Run development server
pnpm dev
```

### Project Structure

```
src/
├── app/              # Next.js App Router pages
├── components/       # React components (shadcn/ui)
├── lib/              # Core libraries (Supabase, Redis, AI, etc.)
├── hooks/            # React hooks
└── cli/              # CLI commands
```

## 📝 Coding Standards

### TypeScript

- Use **TypeScript strict mode**
- Define interfaces for all data structures
- Avoid `any` types
- Use proper type inference

### Code Style

- **Format**: Prettier (configured via Next.js defaults)
- **Linting**: ESLint (configured via Next.js)
- **Naming**:
  - Components: `PascalCase`
  - Functions/variables: `camelCase`
  - Constants: `UPPER_SNAKE_CASE`
  - Files: `kebab-case.ts` or `PascalCase.tsx`

### React/Next.js

- Use **Server Components** by default
- Use `'use client'` only when necessary
- Prefer **composition** over prop drilling
- Keep components **small and focused**
- Use **shadcn/ui** for UI components

### API Routes

- Return consistent JSON responses
- Use proper HTTP status codes
- Include error handling
- Add request validation
- Document with JSDoc comments

### Example

```typescript
/**
 * Convert Python code to TypeScript using Grok AI
 *
 * @param pythonCode - Python source code
 * @param context - Optional context about the code
 * @returns Conversion result with TypeScript code
 */
export async function convertPythonToTypescript(
  pythonCode: string,
  context?: string
): Promise<ConversionResult> {
  // Implementation
}
```

## 🔖 Commit Guidelines

We follow [Conventional Commits](https://www.conventionalcommits.org/):

### Format

```
<type>(<scope>): <subject>

<body>

<footer>
```

### Types

- `feat`: New feature
- `fix`: Bug fix
- `docs`: Documentation changes
- `style`: Code style changes (formatting, etc.)
- `refactor`: Code refactoring
- `perf`: Performance improvements
- `test`: Adding or updating tests
- `chore`: Build process, dependencies, etc.
- `ci`: CI/CD changes

### Examples

```bash
feat(api): add Python to TypeScript conversion endpoint

Add /api/convert endpoint that uses Grok AI to convert Python
trading strategies to TypeScript. Includes validation and explanation.

Closes #42
```

```bash
fix(websocket): reconnect on connection loss

WebSocket now properly reconnects when connection is lost,
with exponential backoff to prevent hammering the server.
```

```bash
docs(readme): update deployment instructions

Add section about Vercel deployment and environment variables.
```

## 🔄 Pull Request Process

1. **Update documentation** if adding features
2. **Add tests** if applicable
3. **Ensure all tests pass**
4. **Update CHANGELOG.md** (if exists)
5. **Link related issues** in PR description
6. **Request review** from maintainers
7. **Address review feedback**

### PR Title Format

Use conventional commit format:

```
feat(broker): add support for Kraken exchange
fix(charts): resolve TradingView rendering issue
docs(api): document historical data endpoint
```

### PR Description Template

```markdown
## Description
Brief description of changes

## Type of Change
- [ ] Bug fix
- [ ] New feature
- [ ] Breaking change
- [ ] Documentation update

## Testing
- [ ] Tested locally
- [ ] Added/updated tests
- [ ] All tests passing

## Screenshots (if applicable)

## Related Issues
Fixes #123
Relates to #456
```

## 🧪 Testing

Before submitting a PR, ensure:

- Code builds successfully: `pnpm build`
- Development server runs: `pnpm dev`
- No TypeScript errors
- No ESLint warnings

### Manual Testing Checklist

- [ ] Landing page loads
- [ ] Dashboard is accessible (with auth)
- [ ] API endpoints respond correctly
- [ ] WebSocket connection works
- [ ] Grok AI conversion works
- [ ] No console errors

## 📚 Additional Notes

### Adding New Dependencies

- Prefer established, well-maintained packages
- Check bundle size impact
- Document why the dependency is needed
- Use exact versions in `package.json`

### Adding New API Routes

1. Create route in `src/app/api/`
2. Add proper TypeScript types
3. Include error handling
4. Add JSDoc comments
5. Test with curl/Postman
6. Document in README or instructions

### Working with Trading Brokers

- Always test with **testnet/paper trading** first
- Never commit API keys
- Use environment variables
- Add safety checks for live trading
- Document broker-specific requirements

## 🌟 Recognition

Contributors will be recognized in:
- GitHub contributors page
- CHANGELOG.md (for significant contributions)
- Special thanks in releases

## 📞 Community

- **GitHub Issues**: Bug reports and feature requests
- **GitHub Discussions**: Questions and ideas
- **Pull Requests**: Code contributions

## 🙏 Thank You

Your contributions make Live Engine better for everyone. Whether it's:
- Reporting a bug
- Suggesting a feature
- Improving documentation
- Writing code
- Helping other users

...every contribution is valuable!

---

**Happy Contributing!** 🚀

Made with ❤️ by the Live Engine community
