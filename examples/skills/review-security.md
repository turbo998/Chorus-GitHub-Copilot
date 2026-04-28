---
name: review-security
description: Security-focused code review checklist
triggers:
  - security
  - review
  - audit
priority: 20
---

# Security Review Checklist

When reviewing code for security issues, check for:

1. **Input Validation** — All user inputs are validated and sanitized
2. **SQL Injection** — Parameterized queries are used, no string concatenation
3. **XSS** — Output is properly escaped in HTML contexts
4. **Authentication** — Auth checks on all protected endpoints
5. **Authorization** — Role-based access control is enforced
6. **Secrets** — No hardcoded credentials, API keys, or tokens
7. **Dependencies** — No known vulnerabilities in dependencies
8. **HTTPS** — All external calls use TLS
9. **Error Handling** — Errors don't leak internal details
10. **Logging** — Sensitive data is not logged
