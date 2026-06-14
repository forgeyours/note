/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import express from "express";
import path from "path";
import { createServer as createViteServer } from "vite";
import { GoogleGenAI } from "@google/genai";
import dotenv from "dotenv";

dotenv.config();

async function startServer() {
  const app = express();
  const PORT = 3000;

  // Read post body values and JSON payloads
  app.use(express.json());

  // API Route: Server-side Gemini chat and summarization gateway
  app.post("/api/ai/chat", async (req, res) => {
    const { prompt, systemInstruction, apiKeyOverride } = req.body;

    // Use user-supplied key override if set, otherwise default to secret environmental key
    const apiKey = apiKeyOverride || process.env.GEMINI_API_KEY;

    if (!apiKey) {
      return res.status(400).json({ 
        error: "Gemini API key is unconfigured. Please define a key in secrets or supply one in settings." 
      });
    }

    try {
      const ai = new GoogleGenAI({
        apiKey,
        httpOptions: {
          headers: {
            'User-Agent': 'aistudio-build',
          }
        }
      });

      // Query modern, high-speed 'gemini-3.5-flash' model
      const response = await ai.models.generateContent({
        model: "gemini-3.5-flash",
        contents: prompt,
        config: {
          systemInstruction: systemInstruction || "You are FY Note's collegiate study assistant.",
          temperature: 0.4
        }
      });

      res.json({ text: response.text });
    } catch (e: any) {
      console.error("Gemini API server-route call failed:", e);
      res.status(500).json({ error: e.message || "Failed to contact Gemini engine" });
    }
  });

  // Hot Module Replacement (HMR) and Vite bundling configuration
  if (process.env.NODE_ENV !== "production") {
    console.log("Starting server in development mode. Mounting Vite middleware...");
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: "spa",
    });
    app.use(vite.middlewares);
  } else {
    console.log("Starting server in production mode. Serving static files from disk...");
    const distPath = path.join(process.cwd(), 'dist');
    app.use(express.static(distPath));
    app.get('*', (req, res) => {
      res.sendFile(path.join(distPath, 'index.html'));
    });
  }

  app.listen(PORT, "0.0.0.0", () => {
    console.log(`FY Note dev server booted successfully! Open live at: http://localhost:${PORT}`);
  });
}

startServer();
