import { createServer } from "http";
import { log } from "./vite";
import { Express } from "express";

let reqCount = 0;

export async function registerRoutes(app: Express) {
  // Create a server so we can attach the WebSocket server
  const httpServer = createServer(app);

  // WebSocket Setup
  let wsClients: Set<WebSocket> = new Set();
  const WebSocket = (await import("ws")).WebSocket;
  const wsServerOptions = { noServer: true };
  const wsServer = new WebSocket.Server(wsServerOptions);

  httpServer.on("upgrade", (request, socket, head) => {
    const url = new URL(request.url || "", `http://${request.headers.host}`);
    const { pathname } = url;

    // Handle Translate Requests
    if (pathname === "/translate") {
      wsServer.handleUpgrade(request, socket, head, (ws) => {
        wsServer.emit("connection", ws, request);
        wsClients.add(ws);

        log(`WebSocket client connected to /translate, total: ${wsClients.size}`);

        ws.addEventListener("message", (event) => {
          try {
            const data = JSON.parse(event.data.toString());
            handleWsMessage(ws, data);
          } catch (e) {
            log(`Failed to parse WebSocket message: ${e}`);
          }
        });

        ws.addEventListener("close", () => {
          wsClients.delete(ws);
          log(`WebSocket client disconnected, total: ${wsClients.size}`);
        });
      });
    } else {
      socket.destroy();
    }
  });

  // Ping API Endpoint
  app.get("/api/ping", (_req, res) => {
    res.json({ message: "pong" });
  });

  // Translation Endpoint (Fallback for WebSocket)
  app.post("/api/translate", async (req, res) => {
    const { text, source, target } = req.body;
    let srcLang = source || "auto";
    const targetLang = target || "en";

    if (!text) {
      return res.status(400).json({ error: "Missing text parameter" });
    }

    try {
      log(`Translation request: ${text.substring(0, 30)}${text.length > 30 ? "..." : ""}`);
      
      // Add a delay to simulate translation process
      await new Promise(resolve => setTimeout(resolve, 500));
      
      // Simple "translation" - just add some prefix/suffix
      let translatedText = `[${targetLang}] ${text} [translated from ${srcLang}]`;
      
      return res.json({
        success: true,
        translation: translatedText,
        source: srcLang,
        target: targetLang
      });
    } catch (error) {
      console.error("Translation error:", error);
      return res.status(500).json({
        error: "Translation failed",
        details: error.message
      });
    }
  });

  // Example API
  app.get("/api/example", (_req, res) => {
    reqCount++;
    res.json({
      message: "Hello from the API!",
      count: reqCount,
      time: new Date().toISOString(),
    });
  });

  // WebSocket Message Handler
  function handleWsMessage(ws: WebSocket, data: any) {
    const { action } = data;

    // User Language Preference
    if (action === "setUserLanguage") {
      const { language } = data;
      log(`Set user language: ${language}`);
      ws.send(JSON.stringify({
        type: "connection",
        status: "established",
        message: "WebSocket connection established"
      }));
      return;
    }

    // Heartbeat
    if (action === "heartbeat") {
      ws.send(JSON.stringify({
        type: "heartbeat",
        timestamp: new Date().toISOString()
      }));
      return;
    }

    // Translation Request
    if (action === "translate") {
      const { messageId, text, targetLanguage, sourceLanguage } = data;
      
      if (!text || !messageId) {
        ws.send(JSON.stringify({
          type: "error",
          messageId,
          error: "Missing required fields"
        }));
        return;
      }

      log(`WebSocket translation request: ${messageId}`);
      
      // Send status update
      ws.send(JSON.stringify({
        type: "translation-status",
        messageId,
        status: "processing"
      }));

      // Simulate translation process with delay
      setTimeout(() => {
        const srcLang = sourceLanguage || "auto";
        const tgtLang = targetLanguage || "en";
        
        // Simple translation simulation 
        const translatedText = `[${tgtLang}] ${text} [translated from ${srcLang}]`;
        
        // Send translation result
        ws.send(JSON.stringify({
          type: "translation-result",
          messageId,
          translatedText,
          sourceLanguage: srcLang,
          targetLanguage: tgtLang
        }));
        
        log(`WebSocket translation completed: ${messageId}`);
      }, 1000);
      return;
    }

    // Unknown action
    log(`Unknown WebSocket action: ${action}`);
    ws.send(JSON.stringify({
      type: "error",
      error: `Unknown action: ${action}`
    }));
  }

  return httpServer;
}
