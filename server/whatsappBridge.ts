import * as baileys from "@whiskeysockets/baileys";
import pino from "pino";
import QRCode from "qrcode";
import fs from "fs";
import path from "path";

const makeWASocket = (baileys.default || baileys.makeWASocket) as any;
const { useMultiFileAuthState, DisconnectReason } = baileys;

export interface WhatsAppStatus {
  status: "disconnected" | "connecting" | "qr_ready" | "connected";
  qrCode: string | null;
  connectedPhone: string | null;
  connectedName: string | null;
  connectedAt: string | null;
  lastError: string | null;
}

class WhatsAppBridgeService {
  private sock: any = null;
  private status: "disconnected" | "connecting" | "qr_ready" | "connected" = "disconnected";
  private qrCode: string | null = null;
  private connectedPhone: string | null = null;
  private connectedName: string | null = null;
  private connectedAt: string | null = null;
  private lastError: string | null = null;
  private authDir: string;
  private isInitializing: boolean = false;
  private reconnectAttempts: number = 0;
  private maxReconnectAttempts: number = 5;

  constructor() {
    this.authDir = path.join(process.cwd(), ".whatsapp_auth");
    if (!fs.existsSync(this.authDir)) {
      try {
        fs.mkdirSync(this.authDir, { recursive: true });
      } catch (e) {
        console.warn("[WhatsApp Bridge] Could not create auth directory:", e);
      }
    }
  }

  public getStatus(): WhatsAppStatus {
    return {
      status: this.status,
      qrCode: this.qrCode,
      connectedPhone: this.connectedPhone,
      connectedName: this.connectedName,
      connectedAt: this.connectedAt,
      lastError: this.lastError,
    };
  }

  public async init(forceFresh: boolean = false): Promise<WhatsAppStatus> {
    if (this.isInitializing) {
      return this.getStatus();
    }

    if (forceFresh) {
      await this.disconnect();
    }

    this.isInitializing = true;
    this.status = "connecting";
    this.lastError = null;

    try {
      if (!fs.existsSync(this.authDir)) {
        fs.mkdirSync(this.authDir, { recursive: true });
      }

      const { state, saveCreds } = await useMultiFileAuthState(this.authDir);

      this.sock = makeWASocket({
        auth: state,
        logger: pino({ level: "silent" }),
        printQRInTerminal: false,
        browser: ["Superior College Jahanian ERP", "Chrome", "3.0.0"],
        syncFullHistory: false,
        connectTimeoutMs: 60000,
        keepAliveIntervalMs: 25000,
      });

      this.sock.ev.on("creds.update", saveCreds);

      this.sock.ev.on("connection.update", async (update: any) => {
        const { connection, lastDisconnect, qr } = update;

        if (qr) {
          try {
            this.qrCode = await QRCode.toDataURL(qr, {
              width: 320,
              margin: 2,
              color: {
                dark: "#053d38",
                light: "#ffffff",
              },
            });
            this.status = "qr_ready";
            console.log("[WhatsApp Bridge] Generated fresh QR code for linking device.");
          } catch (qrErr: any) {
            console.error("[WhatsApp Bridge] Failed to render QR code image:", qrErr);
            this.lastError = qrErr.message;
          }
        }

        if (connection === "open") {
          this.status = "connected";
          this.qrCode = null;
          this.reconnectAttempts = 0;
          this.connectedAt = new Date().toISOString();

          // Extract phone number from WhatsApp ID
          const userJid = this.sock?.user?.id || "";
          const rawNum = userJid.split(":")[0]?.split("@")[0] || "";
          this.connectedPhone = rawNum ? `+${rawNum}` : "+92 300 0000000";
          this.connectedName = this.sock?.user?.name || "Superior College Host Gateway";

          console.log(`[WhatsApp Bridge] Successfully connected to WhatsApp as ${this.connectedPhone} (${this.connectedName})`);
        }

        if (connection === "close") {
          const statusCode = (lastDisconnect?.error as any)?.output?.statusCode;
          const shouldReconnect = statusCode !== DisconnectReason.loggedOut;

          console.log(`[WhatsApp Bridge] Connection closed. Reason code: ${statusCode}. Reconnecting: ${shouldReconnect}`);

          if (statusCode === DisconnectReason.loggedOut) {
            this.cleanAuthDir();
            this.status = "disconnected";
            this.qrCode = null;
            this.connectedPhone = null;
            this.connectedName = null;
          } else if (shouldReconnect && this.reconnectAttempts < this.maxReconnectAttempts) {
            this.reconnectAttempts++;
            const delay = Math.min(5000 * this.reconnectAttempts, 20000);
            console.log(`[WhatsApp Bridge] Reconnecting in ${delay / 1000}s (Attempt ${this.reconnectAttempts}/${this.maxReconnectAttempts})...`);
            setTimeout(() => {
              this.isInitializing = false;
              this.init(false);
            }, delay);
          } else {
            this.status = "disconnected";
            this.qrCode = null;
          }
        }
      });

      return this.getStatus();
    } catch (err: any) {
      console.error("[WhatsApp Bridge] Initialization error:", err);
      this.status = "disconnected";
      this.lastError = err.message;
      return this.getStatus();
    } finally {
      this.isInitializing = false;
    }
  }

  public async disconnect(): Promise<void> {
    try {
      if (this.sock) {
        try {
          await this.sock.logout();
        } catch {
          this.sock.end(undefined);
        }
        this.sock = null;
      }
    } catch (e) {
      console.warn("[WhatsApp Bridge] Error during socket closure:", e);
    }

    this.cleanAuthDir();
    this.status = "disconnected";
    this.qrCode = null;
    this.connectedPhone = null;
    this.connectedName = null;
    this.connectedAt = null;
    this.lastError = null;
  }

  private cleanAuthDir(): void {
    try {
      if (fs.existsSync(this.authDir)) {
        fs.rmSync(this.authDir, { recursive: true, force: true });
        fs.mkdirSync(this.authDir, { recursive: true });
      }
    } catch (e) {
      console.warn("[WhatsApp Bridge] Error cleaning auth directory:", e);
    }
  }

  public normalizePhoneNumber(phone: string): string {
    if (!phone) return "";
    let cleaned = phone.replace(/[^\d+]/g, "");

    // Format local Pakistani numbers: 03001234567 -> 923001234567
    if (cleaned.startsWith("03")) {
      cleaned = "92" + cleaned.slice(1);
    } else if (cleaned.startsWith("+92")) {
      cleaned = cleaned.replace("+", "");
    } else if (cleaned.startsWith("92")) {
      // already good
    } else if (cleaned.startsWith("+")) {
      cleaned = cleaned.replace("+", "");
    }

    return cleaned;
  }

  public async sendMessage(
    phone: string,
    message: string
  ): Promise<{ success: boolean; messageId?: string; error?: string }> {
    if (!this.sock || this.status !== "connected") {
      return {
        success: false,
        error: "WhatsApp is not connected. Please scan the QR code first in WhatsApp Center.",
      };
    }

    const normalized = this.normalizePhoneNumber(phone);
    if (!normalized || normalized.length < 10) {
      return {
        success: false,
        error: `Invalid phone number format: '${phone}'. Required e.g. 0301-4455891 or 923014455891`,
      };
    }

    const jid = `${normalized}@s.whatsapp.net`;

    try {
      const sentMsg = await this.sock.sendMessage(jid, { text: message });
      return {
        success: true,
        messageId: sentMsg?.key?.id || `msg-${Date.now()}`,
      };
    } catch (err: any) {
      console.error(`[WhatsApp Bridge] Failed to send message to ${jid}:`, err);
      return {
        success: false,
        error: err?.message || "Failed to deliver message through WhatsApp socket.",
      };
    }
  }

  public async sendBulk(
    items: Array<{ id: string; phone: string; name: string; message: string }>,
    delaySeconds: number = 3
  ): Promise<Array<{ id: string; success: boolean; error?: string; messageId?: string }>> {
    const results = [];

    for (let i = 0; i < items.length; i++) {
      const item = items[i];
      const res = await this.sendMessage(item.phone, item.message);
      results.push({
        id: item.id,
        success: res.success,
        error: res.error,
        messageId: res.messageId,
      });

      // Anti-ban random delay
      if (i < items.length - 1) {
        const jitter = (Math.random() * 2 - 1) * 1000;
        const actualDelay = Math.max(2000, delaySeconds * 1000 + jitter);
        await new Promise((r) => setTimeout(r, actualDelay));
      }
    }

    return results;
  }
}

export const whatsappBridge = new WhatsAppBridgeService();
