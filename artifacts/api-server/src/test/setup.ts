// Quiet the pino logger during tests and avoid the pino-pretty worker transport.
process.env.LOG_LEVEL = "silent";
process.env.NODE_ENV = "test";
// Deterministic base for any URLs the handlers build.
process.env.REPLIT_DOMAINS = process.env.REPLIT_DOMAINS ?? "localhost:80";
