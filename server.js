const crypto = require("crypto");
const path = require("path");
const express = require("express");
const helmet = require("helmet");
const cookieParser = require("cookie-parser");
const bcrypt = require("bcryptjs");
const { rateLimit } = require("express-rate-limit");
const { pool, migrate } = require("./db");

const app = express();
const isProduction = process.env.NODE_ENV === "production";
const host = process.env.HOST || (isProduction ? "0.0.0.0" : "127.0.0.1");
const port = Number(process.env.PORT || 3000);
const sessionCookie = "newja_session";
const sessionMaxAgeMs = 7 * 24 * 60 * 60 * 1000;
const projectIds = new Set(["portfolio-site", "roblox-mmorpg", "future-ai-lab"]);

app.set("trust proxy", isProduction ? 1 : false);
app.use(helmet({
  contentSecurityPolicy: {
    directives: {
      defaultSrc: ["'self'"],
      imgSrc: ["'self'", "data:"],
      styleSrc: ["'self'"],
      scriptSrc: ["'self'"],
      connectSrc: ["'self'"],
      objectSrc: ["'none'"],
      baseUri: ["'self'"],
      frameAncestors: ["'none'"]
    }
  }
}));
app.use(express.json({ limit: "32kb" }));
app.use(cookieParser());

const authLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  limit: 12,
  standardHeaders: "draft-8",
  legacyHeaders: false,
  message: { error: "Too many attempts. Please try again in 15 minutes." }
});

function normalizeEmail(value) {
  return String(value || "").trim().toLowerCase();
}

function publicUser(user) {
  return {
    id: user.id,
    username: user.username,
    email: user.email,
    age: user.age,
    role: user.role,
    isActive: user.is_active,
    createdAt: user.created_at
  };
}

function getClientIp(request) {
  return request.ip || request.socket.remoteAddress || null;
}

async function writeLog(request, action, options = {}) {
  const actor = options.actor || request.user || null;
  await pool.query(
    `INSERT INTO audit_logs
      (user_id, actor_email, action, target_type, target_id, detail, ip_address)
     VALUES ($1, $2, $3, $4, $5, $6::jsonb, $7)`,
    [
      actor?.id || null,
      actor?.email || options.actorEmail || null,
      action,
      options.targetType || null,
      options.targetId || null,
      JSON.stringify(options.detail || {}),
      getClientIp(request)
    ]
  );
}

function hashToken(token) {
  return crypto.createHash("sha256").update(token).digest("hex");
}

async function createSession(request, response, user) {
  const token = crypto.randomBytes(32).toString("base64url");
  const expiresAt = new Date(Date.now() + sessionMaxAgeMs);
  await pool.query(
    `INSERT INTO sessions (user_id, token_hash, ip_address, user_agent, expires_at)
     VALUES ($1, $2, $3, $4, $5)`,
    [user.id, hashToken(token), getClientIp(request), request.get("user-agent") || null, expiresAt]
  );
  response.cookie(sessionCookie, token, {
    httpOnly: true,
    secure: isProduction,
    sameSite: "lax",
    maxAge: sessionMaxAgeMs,
    path: "/"
  });
}

function clearSessionCookie(response) {
  response.clearCookie(sessionCookie, {
    httpOnly: true,
    secure: isProduction,
    sameSite: "lax",
    path: "/"
  });
}

async function optionalAuth(request, response, next) {
  try {
    const token = request.cookies[sessionCookie];
    if (!token) return next();

    const result = await pool.query(
      `SELECT u.*
       FROM sessions s
       JOIN users u ON u.id = s.user_id
       WHERE s.token_hash = $1 AND s.expires_at > NOW() AND u.is_active = TRUE`,
      [hashToken(token)]
    );

    if (!result.rows[0]) {
      clearSessionCookie(response);
      return next();
    }

    request.user = result.rows[0];
    request.sessionTokenHash = hashToken(token);
    next();
  } catch (error) {
    next(error);
  }
}

function requireAuth(request, response, next) {
  if (!request.user) return response.status(401).json({ error: "Please log in first." });
  next();
}

function requireAdmin(request, response, next) {
  if (!request.user) return response.status(401).json({ error: "Please log in first." });
  if (request.user.role !== "admin") return response.status(403).json({ error: "Admin access required." });
  next();
}

app.use("/api", optionalAuth);

app.get("/health", async (_request, response, next) => {
  try {
    await pool.query("SELECT 1");
    response.json({ ok: true, service: "newja-portfolio" });
  } catch (error) {
    next(error);
  }
});

app.post("/api/auth/register", authLimiter, async (request, response, next) => {
  try {
    const username = String(request.body.username || "").trim();
    const email = normalizeEmail(request.body.email);
    const password = String(request.body.password || "");
    const age = Number(request.body.age);

    if (username.length < 2 || username.length > 80) {
      return response.status(400).json({ error: "Username must be 2-80 characters." });
    }
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
      return response.status(400).json({ error: "Please enter a valid email address." });
    }
    if (password.length < 10 || !/[A-Z]/.test(password) || !/[a-z]/.test(password)
      || !/\d/.test(password) || !/[^A-Za-z0-9]/.test(password)) {
      return response.status(400).json({
        error: "Password needs 10+ characters with uppercase, lowercase, number, and symbol."
      });
    }
    if (!Number.isInteger(age) || age < 1 || age > 120) {
      return response.status(400).json({ error: "Please enter a valid age." });
    }

    const passwordHash = await bcrypt.hash(password, 12);
    const result = await pool.query(
      `INSERT INTO users (username, email, password_hash, age, role)
       VALUES ($1, $2, $3, $4, 'user')
       RETURNING *`,
      [username, email, passwordHash, age]
    );
    const user = result.rows[0];
    await createSession(request, response, user);
    await writeLog(request, "USER_REGISTERED", {
      actor: user,
      targetType: "user",
      targetId: user.id
    });
    response.status(201).json({ user: publicUser(user) });
  } catch (error) {
    if (error.code === "23505") {
      return response.status(409).json({ error: "This email is already registered." });
    }
    next(error);
  }
});

app.post("/api/auth/login", authLimiter, async (request, response, next) => {
  try {
    const email = normalizeEmail(request.body.email);
    const password = String(request.body.password || "");
    const result = await pool.query("SELECT * FROM users WHERE email = $1", [email]);
    const user = result.rows[0];
    const valid = user && await bcrypt.compare(password, user.password_hash);

    if (!valid || !user.is_active) {
      await writeLog(request, "LOGIN_FAILED", {
        actorEmail: email,
        targetType: "user",
        detail: { reason: user && !user.is_active ? "inactive" : "invalid_credentials" }
      });
      return response.status(401).json({ error: "Email or password is incorrect." });
    }

    await createSession(request, response, user);
    await writeLog(request, "LOGIN_SUCCEEDED", {
      actor: user,
      targetType: "user",
      targetId: user.id
    });
    response.json({ user: publicUser(user) });
  } catch (error) {
    next(error);
  }
});

app.post("/api/auth/logout", requireAuth, async (request, response, next) => {
  try {
    await writeLog(request, "LOGOUT");
    await pool.query("DELETE FROM sessions WHERE token_hash = $1", [request.sessionTokenHash]);
    clearSessionCookie(response);
    response.status(204).end();
  } catch (error) {
    next(error);
  }
});

app.get("/api/auth/me", (request, response) => {
  response.json({ user: request.user ? publicUser(request.user) : null });
});

app.get("/api/projects/likes", async (request, response, next) => {
  try {
    const counts = await pool.query(
      "SELECT project_id, COUNT(*)::int AS count FROM project_likes GROUP BY project_id"
    );
    const mine = request.user
      ? await pool.query("SELECT project_id FROM project_likes WHERE user_id = $1", [request.user.id])
      : { rows: [] };
    response.json({
      counts: Object.fromEntries(counts.rows.map((row) => [row.project_id, Number(row.count)])),
      likedProjectIds: mine.rows.map((row) => row.project_id)
    });
  } catch (error) {
    next(error);
  }
});

app.post("/api/projects/:projectId/like", requireAuth, async (request, response, next) => {
  try {
    const { projectId } = request.params;
    if (!projectIds.has(projectId)) {
      return response.status(404).json({ error: "Project not found." });
    }

    const existing = await pool.query(
      "SELECT 1 FROM project_likes WHERE user_id = $1 AND project_id = $2",
      [request.user.id, projectId]
    );
    const liked = existing.rowCount === 0;
    if (liked) {
      await pool.query(
        "INSERT INTO project_likes (user_id, project_id) VALUES ($1, $2)",
        [request.user.id, projectId]
      );
    } else {
      await pool.query(
        "DELETE FROM project_likes WHERE user_id = $1 AND project_id = $2",
        [request.user.id, projectId]
      );
    }
    await writeLog(request, liked ? "PROJECT_LIKED" : "PROJECT_UNLIKED", {
      targetType: "project",
      targetId: projectId
    });
    response.json({ liked });
  } catch (error) {
    next(error);
  }
});

app.get("/api/admin/overview", requireAdmin, async (request, response, next) => {
  try {
    const [users, likes, logs] = await Promise.all([
      pool.query(
        `SELECT id, username, email, age, role, is_active, created_at
         FROM users ORDER BY created_at DESC`
      ),
      pool.query(
        `SELECT pl.project_id, u.username, u.email
         FROM project_likes pl
         JOIN users u ON u.id = pl.user_id
         ORDER BY pl.created_at DESC`
      ),
      pool.query(
        `SELECT id, actor_email, action, target_type, target_id, detail, ip_address, created_at
         FROM audit_logs ORDER BY created_at DESC LIMIT 200`
      )
    ]);
    const likesByProject = likes.rows.reduce((groups, row) => {
      if (!groups[row.project_id]) {
        groups[row.project_id] = { project_id: row.project_id, count: 0, users: [] };
      }
      groups[row.project_id].count += 1;
      groups[row.project_id].users.push({ username: row.username, email: row.email });
      return groups;
    }, {});

    response.json({
      users: users.rows.map(publicUser),
      likes: Object.values(likesByProject),
      logs: logs.rows
    });
  } catch (error) {
    next(error);
  }
});

app.patch("/api/admin/users/:userId", requireAdmin, async (request, response, next) => {
  try {
    const { userId } = request.params;
    const role = request.body.role;
    const isActive = request.body.isActive;
    const targetResult = await pool.query("SELECT * FROM users WHERE id = $1", [userId]);
    const target = targetResult.rows[0];
    if (!target) return response.status(404).json({ error: "User not found." });
    if (target.id === request.user.id && (role === "user" || isActive === false)) {
      return response.status(400).json({ error: "You cannot remove your own admin access." });
    }
    if (role !== undefined && !["admin", "user"].includes(role)) {
      return response.status(400).json({ error: "Invalid role." });
    }
    if (isActive !== undefined && typeof isActive !== "boolean") {
      return response.status(400).json({ error: "Invalid account status." });
    }

    const updated = await pool.query(
      `UPDATE users SET
        role = COALESCE($2, role),
        is_active = COALESCE($3, is_active),
        updated_at = NOW()
       WHERE id = $1 RETURNING *`,
      [userId, role ?? null, isActive ?? null]
    );
    if (isActive === false) await pool.query("DELETE FROM sessions WHERE user_id = $1", [userId]);
    await writeLog(request, "ADMIN_USER_UPDATED", {
      targetType: "user",
      targetId: userId,
      detail: { email: target.email, role, isActive }
    });
    response.json({ user: publicUser(updated.rows[0]) });
  } catch (error) {
    next(error);
  }
});

app.delete("/api/admin/users/:userId", requireAdmin, async (request, response, next) => {
  try {
    const { userId } = request.params;
    if (userId === request.user.id) {
      return response.status(400).json({ error: "You cannot delete your own account." });
    }
    const target = await pool.query("SELECT email FROM users WHERE id = $1", [userId]);
    if (!target.rows[0]) return response.status(404).json({ error: "User not found." });
    await writeLog(request, "ADMIN_USER_DELETED", {
      targetType: "user",
      targetId: userId,
      detail: { email: target.rows[0].email }
    });
    await pool.query("DELETE FROM users WHERE id = $1", [userId]);
    response.status(204).end();
  } catch (error) {
    next(error);
  }
});

const staticOptions = { maxAge: isProduction ? "1h" : 0 };
app.use("/assets", express.static(path.join(__dirname, "assets"), staticOptions));
app.get(["/", "/index.html"], (_request, response) => {
  response.sendFile(path.join(__dirname, "index.html"));
});
app.get("/styles.css", (_request, response) => {
  response.sendFile(path.join(__dirname, "styles.css"));
});
app.get("/app.js", (_request, response) => {
  response.sendFile(path.join(__dirname, "app.js"));
});
app.use((_request, response) => {
  response.status(404).send("404 Not Found");
});

app.use((error, _request, response, _next) => {
  console.error(error);
  response.status(500).json({ error: "Internal server error." });
});

async function seedAdmin() {
  const email = normalizeEmail(process.env.ADMIN_EMAIL);
  const password = String(process.env.ADMIN_PASSWORD || "");
  if (!email || !password) {
    if (isProduction) throw new Error("ADMIN_EMAIL and ADMIN_PASSWORD are required in production.");
    console.warn("ADMIN_EMAIL/ADMIN_PASSWORD not set. No admin account was seeded.");
    return;
  }
  if (password.length < 12) throw new Error("ADMIN_PASSWORD must be at least 12 characters.");

  const passwordHash = await bcrypt.hash(password, 12);
  await pool.query(
    `INSERT INTO users (username, email, password_hash, age, role)
     VALUES ($1, $2, $3, $4, 'admin')
     ON CONFLICT (email) DO UPDATE SET
       role = 'admin',
       is_active = TRUE,
       password_hash = EXCLUDED.password_hash,
       updated_at = NOW()`,
    [process.env.ADMIN_NAME || "New JA Admin", email, passwordHash, 17]
  );
}

async function start() {
  await migrate();
  await pool.query("DELETE FROM sessions WHERE expires_at <= NOW()");
  await seedAdmin();
  app.listen(port, host, () => {
    const displayHost = host === "0.0.0.0" ? "localhost" : host;
    console.log(`New JA portfolio server running at http://${displayHost}:${port}`);
  });
}

start().catch((error) => {
  console.error("Failed to start server:", error);
  process.exit(1);
});
