# Baspin Tests

The test suite should verify both software behavior and governance behavior.

## Required MVP Acceptance Tests

1. A critical unresolved conflict prevents `ready` status.
2. A missing mandatory department approval prevents final approval.
3. AI-generated content cannot create an approval record by itself.
4. A material requirement change invalidates affected approvals.
5. An approved requirement preserves its provenance chain.
6. OKF generation excludes rejected and unresolved requirements from final truth.
7. A project becomes ready only when every mandatory readiness check passes.
8. Blocked status includes an explicit reason and responsible owner.

The insurance example should be used as the first end-to-end fixture.
