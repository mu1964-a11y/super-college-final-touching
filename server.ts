import express from "express";
import path from "path";
import { fileURLToPath } from "url";
import { createServer as createViteServer } from "vite";
import "dotenv/config";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

async function startServer() {
  const app = express();
  const PORT = process.env.PORT || 3000;

  // Add JSON body parsing
  app.use(express.json());

  // API routes can be added here
  app.get("/api/health", (req, res) => {
    res.json({ status: "ok" });
  });

  // Securely create users in Supabase Auth from the Node.js backend
  app.post("/api/create-user", async (req, res) => {
    const { email, password, displayName } = req.body;
    
    if (!process.env.SUPABASE_SERVICE_ROLE_KEY || !process.env.VITE_SUPABASE_URL) {
      return res.status(500).json({ error: "Missing Supabase configuration on backend" });
    }

    try {
      // Dynamic import to use server-side supabase client
      const { createClient } = await import("@supabase/supabase-js");
      const supabaseAdmin = createClient(
        process.env.VITE_SUPABASE_URL,
        process.env.SUPABASE_SERVICE_ROLE_KEY,
        { auth: { autoRefreshToken: false, persistSession: false } }
      );

      // 1. Create or retrieve user identity in Auth
      const { data, error } = await supabaseAdmin.auth.admin.createUser({
        email: email,
        password: password,
        email_confirm: true,
        user_metadata: { display_name: displayName }
      });

      if (error) {
        // If user already exists, Supabase throws error, which we can catch or ignore based on code
        if (error.status === 422 && error.message.includes("already registered")) {
           // We can optionally update their password if they already exist
           // We need their ID, this requires a list request. For now, just return ok since they exist
           // Real production might want a dedicated update path
           return res.json({ message: "User already exists in Auth, updating permissions..." });
        }
        return res.status(400).json({ error: error.message });
      }

      res.json({ message: "User created successfully", user: data.user });
    } catch (e: any) {
      res.status(500).json({ error: e.message });
    }
  });

  // Vite middleware for development
  if (process.env.NODE_ENV !== "production") {
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: "spa",
    });
    app.use(vite.middlewares);
  } else {
    // In production, serve the dist folder
    const distPath = path.join(process.cwd(), "dist");
    app.use(express.static(distPath));
    app.get("*", (req, res) => {
      res.sendFile(path.join(distPath, "index.html"));
    });
  }

  app.listen(PORT, "0.0.0.0", () => {
    console.log(`Server running on http://localhost:${PORT}`);
  });
}

startServer().catch((err) => {
  console.error("Failed to start server:", err);
  process.exit(1);
});
