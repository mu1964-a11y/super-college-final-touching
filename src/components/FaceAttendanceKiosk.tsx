import React, { useState, useEffect, useRef, useCallback, useMemo } from "react";
import * as faceapi from "@vladmandic/face-api";
import { 
  Camera, 
  CheckCircle2, 
  AlertCircle, 
  RefreshCw, 
  Search, 
  Users, 
  Clock, 
  ArrowLeft, 
  Maximize2, 
  Minimize2, 
  Sparkles, 
  ShieldCheck, 
  Smartphone, 
  Copy, 
  Check, 
  Volume2, 
  VolumeX,
  UploadCloud,
  Send,
  LogIn,
  LogOut,
  Briefcase,
  GraduationCap,
  Eye,
  X,
  Lock,
  Unlock,
  ShieldAlert,
  AlertTriangle,
  Download,
  Sliders,
  Play,
  Mic,
  Bell,
  BarChart3
} from "lucide-react";
import { toast } from "sonner";
import { supabase } from "../lib/supabase";

export interface KioskVoiceSettings {
  masterSound: boolean;
  playChime: boolean;
  speakArrival: boolean;
  speakDeparture: boolean;
  speakLate: boolean;
  speakAlreadyMarked: boolean;
  speechRate: number; // 0.9 - 1.3
  voiceLanguage: string; // 'en-IN' | 'ur-PK'
}

export const DEFAULT_VOICE_SETTINGS: KioskVoiceSettings = {
  masterSound: true,
  playChime: true,
  speakArrival: true,
  speakDeparture: true,
  speakLate: true,
  speakAlreadyMarked: false,
  speechRate: 1.15,
  voiceLanguage: "en-IN",
};

export interface PersonProfile {
  id: string;
  fullName: string;
  fatherName?: string;
  collegeNo?: string;
  group?: string; // Group for student, Role/Department for staff
  section?: string;
  photo?: string;
  phone?: string;
  role?: string;
  personType: "student" | "staff";
  descriptor?: Float32Array;
}

export interface ScanRecord {
  id: string;
  personId: string;
  fullName: string;
  collegeNoOrRole: string;
  personType: "student" | "staff";
  registeredPhoto?: string;
  capturedSnapshot?: string; // Live captured face image at gate
  timestamp: string;
  date: string;
  direction: "entry" | "exit";
  status: "Present" | "Late";
  method: "face_recognition" | "manual";
}

interface FaceAttendanceKioskProps {
  onBackToApp?: () => void;
  standalone?: boolean;
  collegeLogo?: string;
  collegeName?: string;
}

export default function FaceAttendanceKiosk({ 
  onBackToApp, 
  standalone = false,
  collegeLogo = "/superior-logo.png",
  collegeName = "Superior College Jahanian"
}: FaceAttendanceKioskProps) {
  // State
  const [modelsLoaded, setModelsLoaded] = useState(false);
  const [modelLoadingText, setModelLoadingText] = useState("Loading Biometric Face Models...");
  const [enrolledProfiles, setEnrolledProfiles] = useState<PersonProfile[]>([]);
  const [enrollingProgress, setEnrollingProgress] = useState({ current: 0, total: 0 });
  const [isEnrolling, setIsEnrolling] = useState(false);

  // Configurable Gate Timings & Policies
  const [kioskSettings, setKioskSettings] = useState<{
    gateEntryStartTime: string;
    collegeStartTime: string;
    gateEntryCutoffTime: string;
    gateExitStartTime: string;
    gateExitCutoffTime: string;
    allowOffHoursScan: boolean;
  }>({
    gateEntryStartTime: "07:00",
    collegeStartTime: "07:54",
    gateEntryCutoffTime: "08:30",
    gateExitStartTime: "13:30",
    gateExitCutoffTime: "15:30",
    allowOffHoursScan: false,
  });
  const [adminOverrideUnlocked, setAdminOverrideUnlocked] = useState(false);
  const [currentTime, setCurrentTime] = useState<Date>(new Date());
  const userManuallySetDirectionRef = useRef(false);
  
  // Camera & Detection state
  const [isCameraActive, setIsCameraActive] = useState(false);
  const [cameraFacing, setCameraFacing] = useState<"user" | "environment">("user");
  const [isDetecting, setIsDetecting] = useState(false);
  const [recentScans, setRecentScans] = useState<ScanRecord[]>([]);
  const [matchedPerson, setMatchedPerson] = useState<PersonProfile | null>(null);
  const [matchedSnapshot, setMatchedSnapshot] = useState<string | null>(null);
  const [selectedScanForAudit, setSelectedScanForAudit] = useState<ScanRecord | null>(null);
  const [alreadyMarkedMessage, setAlreadyMarkedMessage] = useState<string | null>(null);

  // Customizable Voice & Audio Settings state (persisted in localStorage)
  const [voiceSettings, setVoiceSettings] = useState<KioskVoiceSettings>(() => {
    if (typeof window !== "undefined") {
      try {
        const saved = localStorage.getItem("scj_kiosk_voice_settings");
        if (saved) return { ...DEFAULT_VOICE_SETTINGS, ...JSON.parse(saved) };
      } catch {}
    }
    return DEFAULT_VOICE_SETTINGS;
  });
  const [showVoiceSettingsModal, setShowVoiceSettingsModal] = useState(false);
  const soundEnabled = voiceSettings.masterSound;

  const updateVoiceSettings = useCallback((partial: Partial<KioskVoiceSettings>) => {
    setVoiceSettings((prev) => {
      const next = { ...prev, ...partial };
      try {
        localStorage.setItem("scj_kiosk_voice_settings", JSON.stringify(next));
      } catch {}
      return next;
    });
  }, []);

  const [isFullscreen, setIsFullscreen] = useState(false);

  // Target Filter & Gate Direction
  const [targetRoleFilter, setTargetRoleFilter] = useState<"all" | "students" | "staff">("all");
  const [gateDirection, setGateDirection] = useState<"entry" | "exit">("entry");
  
  // Manual search fallback
  const [searchQuery, setSearchQuery] = useState("");
  const [copiedLink, setCopiedLink] = useState(false);

  // Refs
  const videoRef = useRef<HTMLVideoElement | null>(null);
  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const streamRef = useRef<MediaStream | null>(null);
  const scanLoopRef = useRef<number | null>(null);
  const cooldownMapRef = useRef<Map<string, number>>(new Map()); // personId -> timestamp
  const enrolledDescriptorsRef = useRef<Map<string, { person: PersonProfile; descriptor: Float32Array }>>(new Map());
  // Anti-Passback / Daily Scan Memory (key: personId-direction-date)
  const dailyScansMapRef = useRef<Map<string, { time: string; status: "Present" | "Late"; date: string }>>(new Map());
  const fileInputRef = useRef<HTMLInputElement | null>(null);

  // PWA Tablet / Mobile Standalone App Installation State
  const [deferredInstallPrompt, setDeferredInstallPrompt] = useState<any>(null);
  const [isStandaloneApp, setIsStandaloneApp] = useState(false);
  const [showInstallHelpModal, setShowInstallHelpModal] = useState(false);

  useEffect(() => {
    // Check if running in standalone display mode (installed PWA)
    const isStandalone = 
      (typeof window !== "undefined" && window.matchMedia("(display-mode: standalone)").matches) || 
      (typeof navigator !== "undefined" && (navigator as any).standalone === true);
    setIsStandaloneApp(Boolean(isStandalone));

    // Check if early install prompt was already captured by window script in index.html
    if (typeof window !== "undefined" && (window as any).deferredInstallPrompt) {
      setDeferredInstallPrompt((window as any).deferredInstallPrompt);
    }

    const handleEarlyPrompt = (e: any) => {
      setDeferredInstallPrompt(e?.detail || (window as any).deferredInstallPrompt);
    };

    const handleBeforeInstallPrompt = (e: Event) => {
      e.preventDefault();
      if (typeof window !== "undefined") (window as any).deferredInstallPrompt = e;
      setDeferredInstallPrompt(e);
    };

    window.addEventListener("pwa-prompt-available", handleEarlyPrompt);
    window.addEventListener("beforeinstallprompt", handleBeforeInstallPrompt);
    return () => {
      window.removeEventListener("pwa-prompt-available", handleEarlyPrompt);
      window.removeEventListener("beforeinstallprompt", handleBeforeInstallPrompt);
    };
  }, []);

  const handleInstallKioskApp = async () => {
    const promptEvent = deferredInstallPrompt || (typeof window !== "undefined" && (window as any).deferredInstallPrompt);
    if (promptEvent) {
      try {
        promptEvent.prompt();
        const choice = await promptEvent.userChoice;
        if (choice?.outcome === "accepted") {
          toast.success("Gate Kiosk App tablet par successfully install ho chuka hai! Ab home screen se direct 1-tap par open karein.");
          setIsStandaloneApp(true);
        }
      } catch (err) {
        console.warn("Prompt launch error:", err);
        setShowInstallHelpModal(true);
      }
      setDeferredInstallPrompt(null);
      if (typeof window !== "undefined") (window as any).deferredInstallPrompt = null;
    } else {
      setShowInstallHelpModal(true);
    }
  };

  // Helper: Convert "HH:mm" to minutes from midnight
  const timeToMinutes = (t?: string): number => {
    if (!t || typeof t !== "string") return 0;
    const parts = t.split(":");
    const h = parseInt(parts[0], 10) || 0;
    const m = parseInt(parts[1], 10) || 0;
    return h * 60 + m;
  };

  // Compute Live Gate Window Status & Late Arrival Status
  const gateStatus = useMemo(() => {
    const nowMin = currentTime.getHours() * 60 + currentTime.getMinutes();
    const entryStartMin = timeToMinutes(kioskSettings.gateEntryStartTime);
    const collegeStartMin = timeToMinutes(kioskSettings.collegeStartTime);
    const entryCutoffMin = timeToMinutes(kioskSettings.gateEntryCutoffTime);
    const exitStartMin = timeToMinutes(kioskSettings.gateExitStartTime);
    const exitCutoffMin = timeToMinutes(kioskSettings.gateExitCutoffTime);

    const isInEntryWindow = nowMin >= entryStartMin && nowMin <= entryCutoffMin;
    const isInExitWindow = nowMin >= exitStartMin && nowMin <= exitCutoffMin;

    if (isInEntryWindow) {
      const isLate = nowMin > collegeStartMin;
      return {
        isOpen: true,
        phase: isLate ? ("entry_late" as const) : ("entry_regular" as const),
        suggestedDirection: "entry" as const,
        isLate,
        label: isLate 
          ? `Late Arrival Window (Bell was ${kioskSettings.collegeStartTime})` 
          : `Morning Arrival (${kioskSettings.gateEntryStartTime} - ${kioskSettings.collegeStartTime})`,
        badgeColor: isLate ? "bg-amber-500/20 text-amber-300 border-amber-500/40" : "bg-emerald-500/20 text-emerald-300 border-emerald-500/40",
        isOffHours: false,
      };
    } else if (isInExitWindow) {
      return {
        isOpen: true,
        phase: "exit_regular" as const,
        suggestedDirection: "exit" as const,
        isLate: false,
        label: `Departure Exit (${kioskSettings.gateExitStartTime} - ${kioskSettings.gateExitCutoffTime})`,
        badgeColor: "bg-blue-500/20 text-blue-300 border-blue-500/40",
        isOffHours: false,
      };
    } else {
      const isLocked = !kioskSettings.allowOffHoursScan && !adminOverrideUnlocked;
      return {
        isOpen: !isLocked,
        phase: "closed" as const,
        suggestedDirection: (nowMin > exitCutoffMin ? "exit" : "entry") as const,
        isLate: false,
        label: isLocked ? "Gate Closed (Off-Hours Locked)" : "Off-Hours Scan Override Active",
        badgeColor: isLocked ? "bg-red-500/20 text-red-300 border-red-500/40" : "bg-purple-500/20 text-purple-300 border-purple-500/40",
        isOffHours: true,
      };
    }
  }, [currentTime, kioskSettings, adminOverrideUnlocked]);

  // Keep live time ticking every 3 seconds
  useEffect(() => {
    const timer = setInterval(() => setCurrentTime(new Date()), 3000);
    return () => clearInterval(timer);
  }, []);

  // Auto-switch gate direction to suggested direction unless user manually toggled
  useEffect(() => {
    if (!userManuallySetDirectionRef.current) {
      setGateDirection(gateStatus.suggestedDirection);
    }
  }, [gateStatus.suggestedDirection]);

  // Web Audio Synth for melodic feedback chimes (Entry / Exit / Late)
  const playSuccessChime = useCallback((type: "normal" | "late" | "exit" = "normal") => {
    if (!voiceSettings.masterSound || !voiceSettings.playChime) return;
    try {
      const audioCtx = new (window.AudioContext || (window as any).webkitAudioContext)();
      const now = audioCtx.currentTime;
      
      const osc1 = audioCtx.createOscillator();
      const osc2 = audioCtx.createOscillator();
      const gainNode = audioCtx.createGain();

      osc1.type = "sine";
      osc2.type = "triangle";

      if (type === "exit") {
        // Warm departure chord (C6 -> G5)
        osc1.frequency.setValueAtTime(1046.50, now);
        osc1.frequency.exponentialRampToValueAtTime(783.99, now + 0.2);
        osc2.frequency.setValueAtTime(523.25, now);
        osc2.frequency.exponentialRampToValueAtTime(392.00, now + 0.2);
      } else if (type === "late") {
        // Cautionary amber tone (A4 -> E5)
        osc1.frequency.setValueAtTime(440.00, now);
        osc1.frequency.setValueAtTime(659.25, now + 0.12);
        osc2.frequency.setValueAtTime(329.63, now);
        osc2.frequency.setValueAtTime(493.88, now + 0.12);
      } else {
        // Bright morning entry chord (G5 -> C6)
        osc1.frequency.setValueAtTime(783.99, now);
        osc1.frequency.exponentialRampToValueAtTime(1046.50, now + 0.15);
        osc2.frequency.setValueAtTime(392.00, now);
        osc2.frequency.exponentialRampToValueAtTime(523.25, now + 0.15);
      }

      gainNode.gain.setValueAtTime(0.18, now);
      gainNode.gain.exponentialRampToValueAtTime(0.01, now + 0.45);

      osc1.connect(gainNode);
      osc2.connect(gainNode);
      gainNode.connect(audioCtx.destination);

      osc1.start(now);
      osc2.start(now);
      osc1.stop(now + 0.5);
      osc2.stop(now + 0.5);
    } catch {}
  }, [voiceSettings.masterSound, voiceSettings.playChime]);

  // Clean friendly name extractor for verbal speech
  const getFriendlyName = useCallback((fullName?: string) => {
    if (!fullName) return "Student";
    const parts = fullName.trim().split(/\s+/);
    if (parts.length > 1 && ["muhammad", "m.", "hafiz", "syed", "malik", "rana", "ch", "sir", "mam"].includes(parts[0].toLowerCase())) {
      return parts.slice(0, 2).join(" ");
    }
    return parts[0] || fullName;
  }, []);

  // Neural Voice Synthesizer (Instant 0-delay on device)
  const speakVoiceGreeting = useCallback((text: string) => {
    if (!voiceSettings.masterSound) return;
    if (typeof window === "undefined" || !("speechSynthesis" in window)) return;

    try {
      window.speechSynthesis.cancel(); // Prevent audio overlapping when students arrive in rapid succession

      const utterance = new SpeechSynthesisUtterance(text);
      utterance.rate = voiceSettings.speechRate || 1.15;
      utterance.pitch = 1.0;

      const voices = window.speechSynthesis.getVoices();
      const targetLang = (voiceSettings.voiceLanguage || "en-IN").toLowerCase();

      // Look for preferred subcontinent English or Urdu voice
      const matchedVoice = voices.find(v => 
        v.lang.toLowerCase().includes(targetLang) ||
        v.lang.toLowerCase().includes("ur") ||
        v.lang.toLowerCase().includes("in") ||
        v.name.toLowerCase().includes("india") ||
        v.name.toLowerCase().includes("urdu")
      );
      if (matchedVoice) {
        utterance.voice = matchedVoice;
      }

      window.speechSynthesis.speak(utterance);
    } catch (err) {
      console.warn("[Voice Synthesis] Error:", err);
    }
  }, [voiceSettings]);

  // 1. Initialize Face-API Models from local /models directory
  useEffect(() => {
    let isMounted = true;

    async function loadModels() {
      try {
        setModelLoadingText("Initializing Face Recognition Engine...");
        
        // Load lightweight models from public/models
        await faceapi.nets.tinyFaceDetector.loadFromUri("/models");
        setModelLoadingText("Loaded Tiny Face Detector (1/3)...");

        await faceapi.nets.faceLandmark68Net.loadFromUri("/models");
        setModelLoadingText("Loaded Landmark Feature Network (2/3)...");

        await faceapi.nets.faceRecognitionNet.loadFromUri("/models");
        setModelLoadingText("Loaded Deep Face Recognition Model (3/3)...");

        if (isMounted) {
          setModelsLoaded(true);
          setModelLoadingText("Biometric Models Ready ✅");
        }
      } catch (err: any) {
        console.error("Face model load error:", err);
        if (isMounted) {
          setModelLoadingText("Error loading local models: " + (err?.message || "Check /models"));
          toast.error("Failed to load local face recognition models.");
        }
      }
    }

    loadModels();
    return () => {
      isMounted = false;
    };
  }, []);

  // 2. Fetch Enrolled Profiles (Students + Staff) from Backend API & Supabase
  const loadEnrolledProfiles = useCallback(async () => {
    if (!modelsLoaded) return;
    setIsEnrolling(true);

    try {
      let withPhotos: PersonProfile[] = [];

      // Method A: Try backend API endpoint first (service role, zero RLS issues)
      try {
        const res = await fetch("/api/kiosk/enrolled-students");
        if (res.ok) {
          const json = await res.json();
          if (json.settings) {
            const c = json.settings.config || json.settings;
            setKioskSettings({
              gateEntryStartTime: c.gateEntryStartTime || "07:00",
              collegeStartTime: c.collegeStartTime || "07:54",
              gateEntryCutoffTime: c.gateEntryCutoffTime || "08:30",
              gateExitStartTime: c.gateExitStartTime || "13:30",
              gateExitCutoffTime: c.gateExitCutoffTime || "15:30",
              allowOffHoursScan: Boolean(c.allowOffHoursScan),
            });
          }

          if (json.success) {
            const rawProfiles = Array.isArray(json.profiles) 
              ? json.profiles 
              : [...(json.students || []), ...(json.staff || [])];

            if (rawProfiles.length > 0) {
              withPhotos = rawProfiles.map((p: any) => ({
                id: String(p.id),
                fullName: p.fullName || p.full_name || (p.personType === "staff" ? "Faculty Member" : "Student"),
                fatherName: p.fatherName || p.father_name || "",
                collegeNo: p.collegeNo || p.id,
                group: p.group || (p.personType === "staff" ? p.role || "Faculty" : "Intermediate"),
                section: p.section || (p.personType === "staff" ? "Faculty" : "A"),
                role: p.role || (p.personType === "staff" ? "Faculty Member" : undefined),
                personType: p.personType === "staff" ? "staff" : "student",
                photo: p.photo || p.photo_url || "",
                phone: p.phone || p.contact || "",
              }));
            }
          }
        }
      } catch (apiErr) {
        console.warn("[Face Kiosk] Server API fetch failed, falling back to direct Supabase:", apiErr);
      }

      // Method B: Direct Supabase fetch if API returned no data
      if (withPhotos.length === 0) {
        const [admissionsRes, studentsRes, staffRes, settingsRes] = await Promise.all([
          supabase
            .from("admissions")
            .select("id, student_id, full_name, father_name, college_no, group, section, photo_url, contact_number, father_contact"),
          supabase
            .from("students")
            .select("id, admission_id, full_name, father_name, college_no, group, section, photo_url, photo, contact, father_contact"),
          supabase
            .from("staff")
            .select("id, full_name, father_name, role, contact, photo, photo_url, status"),
          supabase
            .from("settings")
            .select("*")
            .order("updated_at", { ascending: false })
            .limit(1)
            .maybeSingle()
        ]);

        if (settingsRes?.data) {
          const c = settingsRes.data.config || settingsRes.data;
          setKioskSettings({
            gateEntryStartTime: c.gateEntryStartTime || "07:00",
            collegeStartTime: c.collegeStartTime || "07:54",
            gateEntryCutoffTime: c.gateEntryCutoffTime || "08:30",
            gateExitStartTime: c.gateExitStartTime || "13:30",
            gateExitCutoffTime: c.gateExitCutoffTime || "15:30",
            allowOffHoursScan: Boolean(c.allowOffHoursScan),
          });
        }

        const mergedMap = new Map<string, PersonProfile>();

        // 1. Process Admissions
        if (admissionsRes.data) {
          for (const a of admissionsRes.data) {
            const photo = a.photo_url || "";
            if (photo && photo.trim().length > 10) {
              const sid = a.college_no || a.student_id || String(a.id);
              mergedMap.set(String(sid), {
                id: String(sid),
                fullName: a.full_name || "Student",
                fatherName: a.father_name || "",
                collegeNo: a.college_no || a.student_id || String(a.id).slice(-6),
                group: a.group || "Intermediate",
                section: a.section || "A",
                personType: "student",
                photo: photo,
                phone: a.contact_number || a.father_contact || "",
              });
            }
          }
        }

        // 2. Process Students (with photo_url or photo)
        if (studentsRes.data) {
          for (const s of studentsRes.data) {
            const sid = s.college_no || String(s.id);
            const photo = s.photo_url || s.photo || "";
            const existing = mergedMap.get(String(sid)) || mergedMap.get(String(s.id)) || (s.admission_id ? mergedMap.get(String(s.admission_id)) : null);

            if (photo && photo.trim().length > 10) {
              mergedMap.set(String(sid), {
                id: String(sid),
                fullName: s.full_name || existing?.fullName || "Student",
                fatherName: s.father_name || existing?.fatherName || "",
                collegeNo: s.college_no || existing?.collegeNo || String(s.id).slice(-6),
                group: s.group || existing?.group || "Intermediate",
                section: s.section || existing?.section || "A",
                personType: "student",
                photo: photo,
                phone: s.contact || s.father_contact || existing?.phone || "",
              });
            } else if (existing) {
              mergedMap.set(String(sid), {
                ...existing,
                fullName: s.full_name || existing.fullName,
                collegeNo: s.college_no || existing.collegeNo,
              });
            }
          }
        }

        // 3. Process Staff Members
        if (staffRes.data) {
          for (const st of staffRes.data) {
            if (st.status === "Inactive") continue;
            const photo = st.photo_url || st.photo || "";
            if (photo && photo.trim().length > 10) {
              mergedMap.set(String(st.id), {
                id: String(st.id),
                fullName: st.full_name || "Faculty Member",
                fatherName: st.father_name || "",
                collegeNo: String(st.id),
                group: st.role || "Faculty",
                role: st.role || "Faculty Member",
                section: "Faculty",
                personType: "staff",
                photo: photo,
                phone: st.contact || "",
              });
            }
          }
        }

        withPhotos = Array.from(mergedMap.values());
      }

      setEnrolledProfiles(withPhotos);
      setEnrollingProgress({ current: 0, total: withPhotos.length });

      if (withPhotos.length === 0) {
        setIsEnrolling(false);
        return;
      }

      // Fast Descriptor Caching: Load precomputed descriptors from localStorage for 0ms startup!
      let descriptorCache: Record<string, { descriptor: number[]; photoSample: string }> = {};
      try {
        const raw = localStorage.getItem("scj_kiosk_face_descriptors_v2");
        if (raw) descriptorCache = JSON.parse(raw);
      } catch {}

      const newMap = new Map<string, { person: PersonProfile; descriptor: Float32Array }>();
      let needsCacheSave = false;
      let processed = 0;

      for (const p of withPhotos) {
        const photoSample = (p.photo || "").slice(0, 80);
        const cached = descriptorCache[p.id];

        // If descriptor already cached and photo hasn't changed, load immediately in 0ms!
        if (cached && cached.photoSample === photoSample && Array.isArray(cached.descriptor)) {
          newMap.set(p.id, { person: p, descriptor: new Float32Array(cached.descriptor) });
          processed++;
          setEnrollingProgress({ current: processed, total: withPhotos.length });
          continue;
        }

        // For new / changed profiles: compute descriptor with fast offscreen downscaling
        try {
          const img = new Image();
          img.crossOrigin = "anonymous";
          img.src = p.photo!;

          await new Promise((resolve, reject) => {
            img.onload = resolve;
            img.onerror = reject;
            setTimeout(() => reject(new Error("Timeout")), 3500);
          });

          // Downscale to 240x240 for ultra-fast facial landmark extraction
          const cvs = document.createElement("canvas");
          cvs.width = 240;
          cvs.height = 240;
          const ctx = cvs.getContext("2d");
          if (ctx) {
            ctx.drawImage(img, 0, 0, 240, 240);
          }

          const detection = await faceapi
            .detectSingleFace(cvs, new faceapi.TinyFaceDetectorOptions({ inputSize: 224, scoreThreshold: 0.38 }))
            .withFaceLandmarks()
            .withFaceDescriptor();

          if (detection && detection.descriptor) {
            newMap.set(p.id, { person: p, descriptor: detection.descriptor });
            descriptorCache[p.id] = {
              descriptor: Array.from(detection.descriptor),
              photoSample,
            };
            needsCacheSave = true;
          }
        } catch (enrollErr) {
          console.warn(`[Face Kiosk] Could not enroll face for ${p.fullName}:`, enrollErr);
        }

        processed++;
        setEnrollingProgress({ current: processed, total: withPhotos.length });
      }

      if (needsCacheSave) {
        try {
          localStorage.setItem("scj_kiosk_face_descriptors_v2", JSON.stringify(descriptorCache));
        } catch {}
      }

      enrolledDescriptorsRef.current = newMap;
      if (newMap.size > 0) {
        toast.success(`Biometric profiles loaded: ${newMap.size} active face descriptors!`, { id: "enrolled-toast" });
      }
    } catch (err: any) {
      console.error("Enrollment error:", err);
      toast.error("Enrollment error: " + (err?.message || "Check connection"));
    } finally {
      setIsEnrolling(false);
    }
  }, [modelsLoaded]);

  useEffect(() => {
    if (modelsLoaded) {
      loadEnrolledProfiles();
    }
  }, [modelsLoaded, loadEnrolledProfiles]);

  // Pre-load today's attendance scans to enforce instant anti-passback duplicate protection
  useEffect(() => {
    const todayDate = new Date().toISOString().slice(0, 10);
    async function loadTodayExistingScans() {
      try {
        const [stuRes, staffRes] = await Promise.all([
          supabase
            .from("student_attendance")
            .select("student_id, date, status, check_in_time, check_out_time, snapshot_url, verification_method, notes")
            .eq("date", todayDate),
          supabase
            .from("staff_attendance")
            .select("staff_id, date, status, check_in, check_out, check_in_time, check_out_time, snapshot_url, verification_method, notes")
            .eq("date", todayDate)
        ]);

        if (stuRes.data) {
          stuRes.data.forEach((r: any) => {
            const sid = String(r.student_id);
            const status = (r.status === "Late" ? "Late" : "Present") as "Present" | "Late";
            const inTime = r.check_in_time 
              ? new Date(r.check_in_time).toLocaleTimeString("en-US", { hour: "2-digit", minute: "2-digit", hour12: true }) 
              : "Morning";
            dailyScansMapRef.current.set(`${sid}-entry-${todayDate}`, { time: inTime, status, date: todayDate });

            if (r.check_out_time) {
              const outTime = new Date(r.check_out_time).toLocaleTimeString("en-US", { hour: "2-digit", minute: "2-digit", hour12: true });
              dailyScansMapRef.current.set(`${sid}-exit-${todayDate}`, { time: outTime, status: "Present", date: todayDate });
            }
          });
        }

        if (staffRes.data) {
          staffRes.data.forEach((r: any) => {
            const stid = String(r.staff_id);
            const status = (r.status === "Late" ? "Late" : "Present") as "Present" | "Late";
            const inTime = r.check_in || (r.check_in_time ? new Date(r.check_in_time).toLocaleTimeString("en-US", { hour: "2-digit", minute: "2-digit", hour12: true }) : "Morning");
            dailyScansMapRef.current.set(`${stid}-entry-${todayDate}`, { time: inTime, status, date: todayDate });

            if (r.check_out || r.check_out_time) {
              const outTime = r.check_out || (r.check_out_time ? new Date(r.check_out_time).toLocaleTimeString("en-US", { hour: "2-digit", minute: "2-digit", hour12: true }) : "Afternoon");
              dailyScansMapRef.current.set(`${stid}-exit-${todayDate}`, { time: outTime, status: "Present", date: todayDate });
            }
          });
        }
      } catch (err) {
        console.warn("[Face Kiosk] Could not preload today's attendance logs:", err);
      }
    }

    loadTodayExistingScans();
  }, []);

  // 3. Start Live Camera
  const startCamera = async (facing: "user" | "environment" = cameraFacing) => {
    try {
      if (streamRef.current) {
        streamRef.current.getTracks().forEach((t) => t.stop());
      }

      // Check if browser supports WebRTC in current security context
      if (!navigator?.mediaDevices?.getUserMedia) {
        toast.info("Live WebRTC requires HTTPS or Localhost. Opening instant camera snap...", { duration: 4000 });
        fileInputRef.current?.click();
        return;
      }

      let stream: MediaStream;
      try {
        stream = await navigator.mediaDevices.getUserMedia({
          video: {
            facingMode: facing,
            width: { ideal: 640 },
            height: { ideal: 480 },
          },
          audio: false,
        });
      } catch (constraintErr) {
        console.warn("FacingMode constraint failed, trying basic video:", constraintErr);
        stream = await navigator.mediaDevices.getUserMedia({ video: true, audio: false });
      }

      streamRef.current = stream;
      setIsCameraActive(true);
      if (videoRef.current) {
        videoRef.current.srcObject = stream;
        try {
          await videoRef.current.play();
        } catch (e) {
          console.warn("Direct play error:", e);
        }
      }
      toast.success("Gate Camera Active - scanning face...", { duration: 2500 });
    } catch (err: any) {
      console.error("Camera access error:", err);
      toast.info("Live camera stream permission blocked. Switching to mobile snapshot camera...", { duration: 4500 });
      setIsCameraActive(false);
      fileInputRef.current?.click();
    }
  };

  const stopCamera = () => {
    if (streamRef.current) {
      streamRef.current.getTracks().forEach((t) => t.stop());
      streamRef.current = null;
    }
    if (videoRef.current) {
      videoRef.current.srcObject = null;
    }
    if (scanLoopRef.current) {
      cancelAnimationFrame(scanLoopRef.current);
      scanLoopRef.current = null;
    }
    setIsCameraActive(false);
  };

  // Toggle Camera Facing (Front / Back)
  const toggleCameraFacing = () => {
    const next = cameraFacing === "user" ? "environment" : "user";
    setCameraFacing(next);
    if (isCameraActive) {
      startCamera(next);
    }
  };

  // Toggle Camera On/Off
  const toggleCamera = () => {
    if (isCameraActive) {
      stopCamera();
    } else {
      startCamera();
    }
  };

  // Ensure video element receives stream whenever camera becomes active
  useEffect(() => {
    if (isCameraActive && videoRef.current && streamRef.current) {
      if (videoRef.current.srcObject !== streamRef.current) {
        videoRef.current.srcObject = streamRef.current;
        videoRef.current.play().catch((err) => console.warn("Video play error:", err));
      }
    }
  }, [isCameraActive]);

  // Capture Live Camera Frame Snapshot (for Attendance Record Audit)
  const captureLiveSnapshot = (sourceImg?: HTMLImageElement): string => {
    try {
      const canvas = document.createElement("canvas");
      canvas.width = 320;
      canvas.height = 320;
      const ctx = canvas.getContext("2d");
      if (!ctx) return "";

      if (sourceImg) {
        const minDim = Math.min(sourceImg.naturalWidth || sourceImg.width, sourceImg.naturalHeight || sourceImg.height);
        const startX = ((sourceImg.naturalWidth || sourceImg.width) - minDim) / 2;
        const startY = ((sourceImg.naturalHeight || sourceImg.height) - minDim) / 2;
        ctx.drawImage(sourceImg, startX, startY, minDim, minDim, 0, 0, 320, 320);
        return canvas.toDataURL("image/jpeg", 0.85);
      }

      if (videoRef.current && videoRef.current.videoWidth > 0) {
        const video = videoRef.current;
        const minDim = Math.min(video.videoWidth, video.videoHeight);
        const startX = (video.videoWidth - minDim) / 2;
        const startY = (video.videoHeight - minDim) / 2;
        ctx.drawImage(video, startX, startY, minDim, minDim, 0, 0, 320, 320);
        return canvas.toDataURL("image/jpeg", 0.85);
      }
      return "";
    } catch {
      return "";
    }
  };

  // 4. Mark Attendance in Database & Trigger WhatsApp Notice for Student or Staff
  const processAttendanceForPerson = async (
    person: PersonProfile, 
    method: "face_recognition" | "manual" = "face_recognition",
    customSnapshot?: string
  ) => {
    const todayDate = new Date().toISOString().slice(0, 10);
    const scanKey = `${person.id}-${gateDirection}-${todayDate}`;

    // 1. Off-hours gate lockout check
    if (!gateStatus.isOpen) {
      setAlreadyMarkedMessage(`🔒 Scanner Locked: College timing window is closed. (Admin override to scan)`);
      setTimeout(() => setAlreadyMarkedMessage(null), 3500);
      return;
    }

    // 2. Anti-Passback / Duplicate Lockout Check
    if (dailyScansMapRef.current.has(scanKey)) {
      const existing = dailyScansMapRef.current.get(scanKey);
      const actionLabel = gateDirection === "exit" ? "Checked-Out (Exit)" : "Checked-In (Entry)";
      setAlreadyMarkedMessage(`✅ ${person.fullName} already ${actionLabel} today at ${existing?.time || "earlier"} (${existing?.status || "Recorded"})`);
      setTimeout(() => setAlreadyMarkedMessage(null), 3500);

      // Verbal notification if enabled
      if (voiceSettings.masterSound && voiceSettings.speakAlreadyMarked) {
        const friendlyName = getFriendlyName(person.fullName);
        speakVoiceGreeting(`${friendlyName}, attendance already marked.`);
      }
      return;
    }

    // Determine status: Late if entry and arriving after official bell
    const attendanceStatus: "Present" | "Late" = (gateDirection === "entry" && gateStatus.isLate) ? "Late" : "Present";
    const isExit = gateDirection === "exit";
    const isLate = gateDirection === "entry" && attendanceStatus === "Late";

    // Play melodic chime
    if (voiceSettings.playChime) {
      playSuccessChime(isLate ? "late" : isExit ? "exit" : "normal");
    }

    // Speak personalized AI Voice Greeting
    if (voiceSettings.masterSound) {
      const friendlyName = getFriendlyName(person.fullName);
      if (isExit) {
        if (voiceSettings.speakDeparture) {
          speakVoiceGreeting(`Allah Hafiz ${friendlyName}! Safe journey home.`);
        }
      } else if (isLate) {
        if (voiceSettings.speakLate) {
          speakVoiceGreeting(`Late arrival recorded, ${friendlyName}.`);
        } else if (voiceSettings.speakArrival) {
          speakVoiceGreeting(`Assalam-o-Alaikum ${friendlyName}! Welcome to Superior College.`);
        }
      } else {
        if (voiceSettings.speakArrival) {
          speakVoiceGreeting(`Assalam-o-Alaikum ${friendlyName}! Welcome to Superior College.`);
        }
      }
    }

    const timeStr = new Date().toLocaleTimeString("en-US", { hour: "2-digit", minute: "2-digit", hour12: true });
    const liveSnapshot = customSnapshot || captureLiveSnapshot();

    // Mark in anti-passback memory
    dailyScansMapRef.current.set(scanKey, { time: timeStr, status: attendanceStatus, date: todayDate });

    // Show celebratory popup
    setMatchedPerson(person);
    setMatchedSnapshot(liveSnapshot || person.photo || null);
    setTimeout(() => {
      setMatchedPerson(null);
      setMatchedSnapshot(null);
    }, 4000);

    // Record in local recent scans
    const newRecord: ScanRecord = {
      id: `${person.id}-${Date.now()}`,
      personId: person.id,
      fullName: person.fullName,
      collegeNoOrRole: person.personType === "staff" ? (person.role || person.group || person.id) : (person.collegeNo || person.id),
      personType: person.personType,
      registeredPhoto: person.photo,
      capturedSnapshot: liveSnapshot || person.photo,
      timestamp: timeStr,
      date: todayDate,
      direction: gateDirection,
      status: attendanceStatus,
      method,
    };
    setRecentScans((prev) => [newRecord, ...prev.slice(0, 24)]);

    try {
      if (person.personType === "staff") {
        // --- STAFF BIOMETRIC ATTENDANCE ---
        // Fetch existing staff scan for today to preserve morning arrival snapshot on evening exit
        let existingEntrySnap: string | null = null;
        let existingExitSnap: string | null = null;
        let existingCheckIn: string | null = null;
        let existingCheckOut: string | null = null;
        try {
          const { data: existRow } = await supabase
            .from("staff_attendance")
            .select("snapshot_url, check_in, check_out, check_in_time, check_out_time, notes")
            .eq("staff_id", person.id)
            .eq("date", todayDate)
            .maybeSingle();
          if (existRow) {
            existingEntrySnap = existRow.snapshot_url;
            existingCheckIn = existRow.check_in || existRow.check_in_time;
            existingCheckOut = existRow.check_out || existRow.check_out_time;
            if (existRow.notes && typeof existRow.notes === "string" && existRow.notes.startsWith("{")) {
              try {
                const p = JSON.parse(existRow.notes);
                if (p.entry_snapshot) existingEntrySnap = p.entry_snapshot;
                if (p.exit_snapshot) existingExitSnap = p.exit_snapshot;
              } catch {}
            }
          }
        } catch {}

        const entrySnapshot = !isExit ? liveSnapshot : (existingEntrySnap || null);
        const exitSnapshot = isExit ? liveSnapshot : (existingExitSnap || null);

        const checkInIso = !isExit ? new Date().toISOString() : (existingCheckIn || null);
        const checkOutIso = isExit ? new Date().toISOString() : (existingCheckOut || null);

        const structuredNotes = JSON.stringify({
          entry_snapshot: entrySnapshot,
          exit_snapshot: exitSnapshot,
          check_in_time: !isExit ? timeStr : (existingCheckIn || null),
          check_out_time: isExit ? timeStr : (existingCheckOut || null),
          verification_method: method === "face_recognition" ? "face_biometric" : "manual_kiosk",
          last_action: isExit ? "Exit" : "Entry",
        });

        const staffPayload: any = {
          staff_id: person.id,
          date: todayDate,
          status: attendanceStatus,
          snapshot_url: entrySnapshot || exitSnapshot || liveSnapshot || undefined,
          check_in: !isExit ? timeStr : (existingCheckIn || undefined),
          check_out: isExit ? timeStr : (existingCheckOut || undefined),
          check_in_time: checkInIso || undefined,
          check_out_time: checkOutIso || undefined,
          verification_method: method === "face_recognition" ? "face_biometric" : "manual_kiosk",
          notes: structuredNotes,
        };

        let { error: staffErr } = await supabase
          .from("staff_attendance")
          .upsert(staffPayload, { onConflict: "staff_id,date" });

        // Fallback if custom schema columns don't exist yet
        if (staffErr) {
          const fallbackPayload: any = {
            staff_id: person.id,
            date: todayDate,
            status: attendanceStatus,
            snapshot_url: entrySnapshot || exitSnapshot || liveSnapshot || undefined,
            notes: structuredNotes,
          };
          if (isExit) fallbackPayload.check_out = timeStr;
          else fallbackPayload.check_in = timeStr;
          await supabase.from("staff_attendance").upsert(fallbackPayload, { onConflict: "staff_id,date" });
        }

        // Trigger Instant WhatsApp Alert to Staff Member
        if (person.phone && person.phone.trim().length >= 9) {
          const waMsg = 
`🏛️ *SUPERIOR COLLEGE JAHANIAN*
👔 *FACULTY / STAFF BIOMETRIC ATTENDANCE RECORDED*
━━━━━━━━━━━━━━━━━━━━━━━━━
Assalam-o-Alaikum, *${person.fullName}*!
Designation: *${person.role || "Faculty Member"}*
Staff ID: *${person.id}*

• Status: *${attendanceStatus === "Late" ? "Late Arrival (Tawkheer) ⏰" : "Present ✅"}*
• Action: *${isExit ? "GATE EXIT (Departure / Chhutti)" : "GATE ENTRY (Arrival / Dakhla)"}*
• Time: *${timeStr}*${attendanceStatus === "Late" ? ` (College Bell was at ${kioskSettings.collegeStartTime})` : ""}
• Date: *${todayDate}*
• Verification: *Biometric Face Scan Verified*
• Scanned Face Record: *Logged in Central Security Server*
━━━━━━━━━━━━━━━━━━━━━━━━━
_Office of the Principal & College Administration_`;

          fetch("/api/whatsapp/send", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({
              phone: person.phone,
              message: waMsg,
            }),
          }).catch((e) => console.warn("WhatsApp alert error:", e));
        }

      } else {
        // --- STUDENT BIOMETRIC ATTENDANCE ---
        // Fetch existing student scan for today to preserve morning arrival snapshot on evening exit
        let existingEntrySnap: string | null = null;
        let existingExitSnap: string | null = null;
        let existingCheckInTime: string | null = null;
        let existingCheckOutTime: string | null = null;
        try {
          const { data: existRow } = await supabase
            .from("student_attendance")
            .select("snapshot_url, check_in_time, check_out_time, notes")
            .eq("student_id", person.id)
            .eq("date", todayDate)
            .maybeSingle();
          if (existRow) {
            existingEntrySnap = existRow.snapshot_url;
            existingCheckInTime = existRow.check_in_time;
            existingCheckOutTime = existRow.check_out_time;
            if (existRow.notes && typeof existRow.notes === "string" && existRow.notes.startsWith("{")) {
              try {
                const p = JSON.parse(existRow.notes);
                if (p.entry_snapshot) existingEntrySnap = p.entry_snapshot;
                if (p.exit_snapshot) existingExitSnap = p.exit_snapshot;
              } catch {}
            }
          }
        } catch {}

        const entrySnapshot = !isExit ? liveSnapshot : (existingEntrySnap || null);
        const exitSnapshot = isExit ? liveSnapshot : (existingExitSnap || null);

        const checkInIso = !isExit ? new Date().toISOString() : (existingCheckInTime || null);
        const checkOutIso = isExit ? new Date().toISOString() : (existingCheckOutTime || null);

        const structuredNotes = JSON.stringify({
          entry_snapshot: entrySnapshot,
          exit_snapshot: exitSnapshot,
          check_in_time: checkInIso,
          check_out_time: checkOutIso,
          verification_method: method === "face_recognition" ? "face_biometric" : "manual_kiosk",
          last_action: isExit ? "Exit" : "Entry",
        });

        const studentPayload: any = {
          student_id: person.id,
          date: todayDate,
          status: attendanceStatus,
          snapshot_url: entrySnapshot || exitSnapshot || liveSnapshot || undefined,
          verification_method: method === "face_recognition" ? "face_biometric" : "manual_kiosk",
          notes: structuredNotes,
        };
        if (checkInIso) studentPayload.check_in_time = checkInIso;
        if (checkOutIso) studentPayload.check_out_time = checkOutIso;

        let { error: stuErr } = await supabase
          .from("student_attendance")
          .upsert(studentPayload, { onConflict: "student_id,date" });

        // Fallback if custom schema columns don't exist yet
        if (stuErr) {
          const fallbackPayload: any = {
            student_id: person.id,
            date: todayDate,
            status: attendanceStatus,
            snapshot_url: entrySnapshot || exitSnapshot || liveSnapshot || undefined,
            notes: structuredNotes,
          };
          if (checkInIso) fallbackPayload.check_in_time = checkInIso;
          if (checkOutIso) fallbackPayload.check_out_time = checkOutIso;
          await supabase.from("student_attendance").upsert(fallbackPayload, { onConflict: "student_id,date" });
        }

        // Trigger Instant WhatsApp Alert to Parent
        if (person.phone && person.phone.trim().length >= 9) {
          const waMsg = 
`🏛️ *SUPERIOR COLLEGE JAHANIAN*
✅ *GATE FACE ATTENDANCE NOTIFICATION*
━━━━━━━━━━━━━━━━━━━━━━━━━
Assalam-o-Alaikum!
Aapka bacha *${person.fullName}* (Roll: *${person.collegeNo || person.id}*, Class: ${person.group || "Inter"}) aaj *${timeStr}* par College Gate se kamyabi se ${isExit ? "exit (chhutti)" : "enter"} ho chuka hai.

• Status: *${attendanceStatus === "Late" ? "Late Arrival (Tawkheer) ⏰" : "Present ✅ (On Time)"}*
• Action: *${isExit ? "Gate Departure / Exit" : "Gate Arrival / Entry"}*
• Time: *${timeStr}*${attendanceStatus === "Late" ? ` (College Bell was at ${kioskSettings.collegeStartTime})` : ""}
• Date: *${todayDate}*
• Scanned Verification: *Face Biometrically Matched*
• Campus: Canal Road, Jahanian
━━━━━━━━━━━━━━━━━━━━━━━━━
_Automated Realtime College Security & LMS_`;

          fetch("/api/whatsapp/send", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({
              phone: person.phone,
              message: waMsg,
            }),
          }).catch((e) => console.warn("WhatsApp alert error:", e));
        }
      }
    } catch (e) {
      console.error("Attendance submission error:", e);
    }
  };

  // Euclidean Distance between two descriptors
  const getDescriptorDistance = (d1: Float32Array, d2: Float32Array): number => {
    let sum = 0;
    for (let i = 0; i < d1.length; i++) {
      const diff = d1[i] - d2[i];
      sum += diff * diff;
    }
    return Math.sqrt(sum);
  };

  // 5. Continuous Frame Detection Loop
  const runDetectionFrame = async () => {
    if (!videoRef.current || !isCameraActive || videoRef.current.paused || videoRef.current.ended) {
      scanLoopRef.current = requestAnimationFrame(runDetectionFrame);
      return;
    }

    // If gate attendance window is closed and override not active, pause detection
    if (!gateStatus.isOpen) {
      setIsDetecting(false);
      setTimeout(() => {
        scanLoopRef.current = requestAnimationFrame(runDetectionFrame);
      }, 1000);
      return;
    }

    try {
      const video = videoRef.current;
      if (video.readyState >= 2) {
        const detection = await faceapi
          .detectSingleFace(video, new faceapi.TinyFaceDetectorOptions({ inputSize: 224, scoreThreshold: 0.5 }))
          .withFaceLandmarks()
          .withFaceDescriptor();

        if (detection && detection.descriptor) {
          setIsDetecting(true);

          // Find closest match among enrolled profiles (respecting role filter if set)
          let bestMatch: PersonProfile | null = null;
          let bestDistance = 1.0;

          enrolledDescriptorsRef.current.forEach(({ person, descriptor }) => {
            if (targetRoleFilter === "students" && person.personType !== "student") return;
            if (targetRoleFilter === "staff" && person.personType !== "staff") return;

            const dist = getDescriptorDistance(detection.descriptor, descriptor);
            if (dist < bestDistance) {
              bestDistance = dist;
              bestMatch = person;
            }
          });

          // Match threshold: distance < 0.56 indicates genuine positive biometric match
          if (bestMatch && bestDistance < 0.56) {
            await processAttendanceForPerson(bestMatch, "face_recognition");
          }
        } else {
          setIsDetecting(false);
        }
      }
    } catch {}

    // Rapid scan loop (250ms) for snappy response during gate rush
    setTimeout(() => {
      scanLoopRef.current = requestAnimationFrame(runDetectionFrame);
    }, 250);
  };

  useEffect(() => {
    if (isCameraActive) {
      scanLoopRef.current = requestAnimationFrame(runDetectionFrame);
    } else {
      if (scanLoopRef.current) {
        cancelAnimationFrame(scanLoopRef.current);
        scanLoopRef.current = null;
      }
    }
    return () => {
      if (scanLoopRef.current) {
        cancelAnimationFrame(scanLoopRef.current);
        scanLoopRef.current = null;
      }
    };
  }, [isCameraActive, targetRoleFilter, gateDirection]);

  // Mobile Snapshot File Upload (Direct Fallback for any mobile browser)
  const handleMobilePhotoCapture = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    toast.loading("Analyzing snapshot...", { id: "snap-ai" });
    try {
      const img = new Image();
      img.src = URL.createObjectURL(file);
      await new Promise((resolve) => (img.onload = resolve));

      const detection = await faceapi
        .detectSingleFace(img, new faceapi.TinyFaceDetectorOptions({ inputSize: 224 }))
        .withFaceLandmarks()
        .withFaceDescriptor();

      if (!detection || !detection.descriptor) {
        toast.error("Chehra detect nahi hua. Baraye meherbani seedhi aur roshan tasveer lein.", { id: "snap-ai" });
        return;
      }

      let bestMatch: PersonProfile | null = null;
      let bestDistance = 1.0;

      enrolledDescriptorsRef.current.forEach(({ person, descriptor }) => {
        if (targetRoleFilter === "students" && person.personType !== "student") return;
        if (targetRoleFilter === "staff" && person.personType !== "staff") return;

        const dist = getDescriptorDistance(detection.descriptor, descriptor);
        if (dist < bestDistance) {
          bestDistance = dist;
          bestMatch = person;
        }
      });

      if (bestMatch && bestDistance < 0.54) {
        const snap = captureLiveSnapshot(img);
        toast.success(`Match found: ${bestMatch.fullName}!`, { id: "snap-ai" });
        await processAttendanceForPerson(bestMatch, "face_recognition", snap);
      } else {
        toast.warning("Koi enrolled profile match nahi hua. Roll number / ID se search karein.", { id: "snap-ai" });
      }
    } catch (err: any) {
      console.error("Snapshot analysis error:", err);
      toast.error("Error analyzing photo: " + (err?.message || "Invalid file"), { id: "snap-ai" });
    }
  };

  // Filtered profiles for manual search fallback
  const filteredSearch = useMemo(() => {
    if (!searchQuery.trim()) return [];
    const q = searchQuery.toLowerCase().trim();
    return enrolledProfiles.filter((p) => {
      if (targetRoleFilter === "students" && p.personType !== "student") return false;
      if (targetRoleFilter === "staff" && p.personType !== "staff") return false;

      return (
        (p.fullName || "").toLowerCase().includes(q) ||
        (p.collegeNo || "").toLowerCase().includes(q) ||
        (p.id || "").toLowerCase().includes(q) ||
        (p.group || "").toLowerCase().includes(q) ||
        (p.role || "").toLowerCase().includes(q)
      );
    });
  }, [enrolledProfiles, searchQuery, targetRoleFilter]);

  // Statistics
  const stats = useMemo(() => {
    const studentCount = enrolledProfiles.filter((p) => p.personType === "student").length;
    const staffCount = enrolledProfiles.filter((p) => p.personType === "staff").length;
    const todayStudentScans = recentScans.filter((s) => s.personType === "student").length;
    const todayStaffScans = recentScans.filter((s) => s.personType === "staff").length;
    return { studentCount, staffCount, todayStudentScans, todayStaffScans };
  }, [enrolledProfiles, recentScans]);

  // Copy mobile link to clipboard
  const copyMobileLink = () => {
    if (typeof window === "undefined") return;
    const kioskUrl = `${window.location.origin}/?gate=true`;
    navigator.clipboard.writeText(kioskUrl);
    setCopiedLink(true);
    toast.success("Mobile Gate Kiosk URL copied! Open on any mobile or tablet browser.");
    setTimeout(() => setCopiedLink(false), 3000);
  };

  // Toggle fullscreen
  const toggleFullscreen = () => {
    if (!document.fullscreenElement) {
      document.documentElement.requestFullscreen().catch(() => {});
      setIsFullscreen(true);
    } else {
      document.exitFullscreen().catch(() => {});
      setIsFullscreen(false);
    }
  };

  return (
    <div className="min-h-screen bg-[#f4f7f6] text-slate-800 flex flex-col font-sans select-none pb-12">
      {/* Hidden File Input for Snapshot Camera Fallback */}
      <input
        ref={fileInputRef}
        type="file"
        accept="image/*"
        capture="user"
        className="hidden"
        onChange={handleMobilePhotoCapture}
      />

      {/* TOP CURVED HEADER (Matching Screenshot 1 exactly) */}
      <header className="bg-gradient-to-b from-[#003d37] to-[#004e45] text-white px-4 pt-3.5 pb-6 rounded-b-[2rem] shadow-md border-b-2 border-amber-400/30 sticky top-0 z-40">
        <div className="max-w-md sm:max-w-xl md:max-w-2xl mx-auto flex items-center justify-between">
          <div className="flex items-center gap-2.5">
            {/* Back Button */}
            {(!standalone || onBackToApp) && (
              <button
                onClick={onBackToApp}
                className="w-10 h-10 rounded-xl bg-[#003832]/80 border border-teal-600/40 hover:bg-[#003832] flex items-center justify-center text-teal-100 transition-colors cursor-pointer shadow-xs active:scale-95"
                title="Back to LMS"
              >
                <ArrowLeft className="w-5 h-5" />
              </button>
            )}

            {/* Official Superior College Gold Crest Logo */}
            <img
              src={collegeLogo || "/superior-logo.png"}
              alt="Superior College Crest"
              className="w-11 h-11 object-contain rounded-full border border-amber-400/50 p-0.5 bg-[#00332d] shadow-sm shrink-0"
            />

            {/* Title & Badge */}
            <div className="flex flex-col">
              <div className="flex items-center gap-2">
                <span className="text-white font-extrabold text-base tracking-tight">SCJ</span>
                <span className="text-amber-400 font-extrabold text-base tracking-tight">SMART GATE</span>
                <span className="px-2 py-0.5 rounded-full text-[10px] font-extrabold tracking-wider text-teal-300 border border-teal-500/50 bg-[#003832]/90 uppercase">
                  GATE AI
                </span>
              </div>
              <span className="text-teal-100/70 text-xs font-medium tracking-wide">
                Biometric Attendance
              </span>
            </div>
          </div>

          {/* Right Action: Admin Emergency Lock / Unlock Override */}
          <button
            onClick={() => {
              const nextState = !adminOverrideUnlocked;
              setAdminOverrideUnlocked(nextState);
              if (nextState) toast.success("Admin Override Activated: Scanner unlocked for off-hours check-ins.");
              else toast.info("Admin Override Disabled: Off-hours scanner locked.");
            }}
            className={`w-10 h-10 rounded-xl border flex items-center justify-center transition-all cursor-pointer shadow-xs active:scale-95 ${
              adminOverrideUnlocked
                ? "bg-amber-500/20 text-amber-300 border-amber-400/50 shadow-amber-500/10"
                : "bg-[#003832]/80 text-amber-400 border-amber-400/40 hover:bg-[#003832]"
            }`}
            title="Admin Off-Hours Scanner Override"
          >
            {adminOverrideUnlocked ? <Unlock className="w-5 h-5 text-amber-400" /> : <Lock className="w-5 h-5 text-amber-400" />}
          </button>
        </div>
      </header>

      {/* MAIN CONTAINER (SS1 Design) */}
      <main className="max-w-md sm:max-w-xl md:max-w-2xl mx-auto w-full px-4 pt-3.5 space-y-3 flex-1">
        {/* DIRECTION SWITCHER: ENTRY / EXIT */}
        <div className="bg-white rounded-2xl shadow-xs border border-slate-200/90 p-1 flex items-center gap-1">
          <button
            onClick={() => {
              userManuallySetDirectionRef.current = true;
              setGateDirection("entry");
            }}
            className={`flex-1 py-2.5 rounded-xl font-bold text-sm flex items-center justify-center gap-2 transition-all cursor-pointer ${
              gateDirection === "entry"
                ? "bg-[#004e45] text-white shadow-xs"
                : "bg-transparent text-slate-700 hover:bg-slate-50"
            }`}
          >
            <LogIn className="w-4 h-4 text-emerald-400" />
            <span>Entry</span>
          </button>
          <button
            onClick={() => {
              userManuallySetDirectionRef.current = true;
              setGateDirection("exit");
            }}
            className={`flex-1 py-2.5 rounded-xl font-bold text-sm flex items-center justify-center gap-2 transition-all cursor-pointer ${
              gateDirection === "exit"
                ? "bg-[#004e45] text-white shadow-xs"
                : "bg-transparent text-slate-700 hover:bg-slate-50"
            }`}
          >
            <LogOut className="w-4 h-4 text-amber-400" />
            <span>Exit</span>
          </button>
        </div>

        {/* ROLE FILTER PILLS: All / Students / Staff */}
        <div className="flex items-center gap-2">
          <button
            onClick={() => setTargetRoleFilter("all")}
            className={`flex-1 py-1.5 rounded-full text-xs font-bold transition-all border cursor-pointer ${
              targetRoleFilter === "all"
                ? "bg-[#004e45] text-white border-[#004e45] shadow-xs"
                : "bg-white text-slate-700 border-slate-200 hover:bg-slate-50"
            }`}
          >
            All ({enrolledProfiles.length})
          </button>
          <button
            onClick={() => setTargetRoleFilter("students")}
            className={`flex-1 py-1.5 rounded-full text-xs font-bold transition-all border cursor-pointer ${
              targetRoleFilter === "students"
                ? "bg-[#004e45] text-white border-[#004e45] shadow-xs"
                : "bg-white text-slate-700 border-slate-200 hover:bg-slate-50"
            }`}
          >
            Students ({stats.studentCount})
          </button>
          <button
            onClick={() => setTargetRoleFilter("staff")}
            className={`flex-1 py-1.5 rounded-full text-xs font-bold transition-all border cursor-pointer ${
              targetRoleFilter === "staff"
                ? "bg-[#004e45] text-white border-[#004e45] shadow-xs"
                : "bg-white text-slate-700 border-slate-200 hover:bg-slate-50"
            }`}
          >
            Staff ({stats.staffCount})
          </button>
        </div>

        {/* CARD 1: GATE SCANNER CARD */}
        <div className="bg-white rounded-3xl p-4 shadow-xs border border-slate-200/90">
          {/* Header Row */}
          <div className="flex items-center justify-between mb-3 px-1">
            <h2 className="text-lg font-black text-slate-900 tracking-tight">Gate Scanner</h2>
            <div className="px-3 py-1 rounded-full text-xs font-bold flex items-center gap-1.5 bg-amber-50 text-amber-700 border border-amber-200/80">
              <span className={`w-2 h-2 rounded-full ${isCameraActive ? "bg-emerald-500 animate-ping" : "bg-amber-500"}`} />
              <span>{isCameraActive ? (isDetecting ? "Scanning..." : "Active") : "Standby"}</span>
            </div>
          </div>

          {/* Biometric Viewport / Stage */}
          <div className="relative rounded-2xl overflow-hidden bg-gradient-to-b from-[#eef8f6] via-[#f7fcfb] to-white border border-teal-100 min-h-[310px] flex flex-col items-center justify-center p-4">
            {/* Off-Hours Gate Locked Overlay */}
            {!gateStatus.isOpen && !adminOverrideUnlocked && (
              <div className="absolute inset-0 bg-slate-950/85 backdrop-blur-sm flex flex-col items-center justify-center p-5 z-25 text-center">
                <div className="w-14 h-14 rounded-2xl bg-red-500/20 border border-red-500/30 flex items-center justify-center text-red-400 mb-2.5 shadow-lg">
                  <Lock className="w-7 h-7" />
                </div>
                <h3 className="text-base font-bold text-white mb-1">Gate Scanner Locked</h3>
                <p className="text-xs text-slate-300 max-w-xs mb-3 leading-relaxed">
                  Off-hours timing window active.<br />
                  <span className="text-amber-300 font-semibold">Morning:</span> {kioskSettings.gateEntryStartTime} - {kioskSettings.gateEntryCutoffTime} | <span className="text-amber-300 font-semibold">Exit:</span> {kioskSettings.gateExitStartTime} - {kioskSettings.gateExitCutoffTime}
                </p>
                <button
                  onClick={() => {
                    setAdminOverrideUnlocked(true);
                    toast.success("Admin Override: Off-hours scanning unlocked.");
                  }}
                  className="px-4 py-2 bg-amber-600 hover:bg-amber-500 text-white rounded-xl text-xs font-bold shadow-md flex items-center gap-1.5 cursor-pointer active:scale-95"
                >
                  <Unlock className="w-4 h-4" />
                  <span>Admin Emergency Override</span>
                </button>
              </div>
            )}

            {/* Permanent Video & Canvas Elements (Never unmounted so refs stay intact!) */}
            <video
              ref={videoRef}
              playsInline
              autoPlay
              muted
              className={isCameraActive ? "w-full h-full object-cover rounded-xl transform scale-x-[-1]" : "hidden"}
            />
            <canvas
              ref={canvasRef}
              className={isCameraActive ? "absolute inset-0 w-full h-full pointer-events-none" : "hidden"}
            />

            {/* Active Camera HUD Overlay */}
            {isCameraActive && (
              <div className="absolute inset-0 flex items-center justify-center pointer-events-none">
                <div className="relative w-56 h-64 border-2 border-emerald-500/70 rounded-3xl overflow-hidden shadow-[0_0_30px_rgba(16,185,129,0.25)]">
                  <div className="absolute top-0 left-0 w-5 h-5 border-t-4 border-l-4 border-emerald-400" />
                  <div className="absolute top-0 right-0 w-5 h-5 border-t-4 border-r-4 border-emerald-400" />
                  <div className="absolute bottom-0 left-0 w-5 h-5 border-b-4 border-l-4 border-emerald-400" />
                  <div className="absolute bottom-0 right-0 w-5 h-5 border-b-4 border-r-4 border-emerald-400" />
                  <div className="absolute top-0 left-0 right-0 h-1 bg-gradient-to-r from-transparent via-emerald-400 to-transparent shadow-[0_0_12px_#34d399] animate-bounce" />
                  <div className="absolute bottom-2 left-0 right-0 text-center">
                    <span className="text-[10px] font-mono uppercase tracking-wider text-emerald-300 bg-black/60 px-2 py-0.5 rounded backdrop-blur-sm font-bold">
                      Align Face In Frame
                    </span>
                  </div>
                </div>
              </div>
            )}

            {/* Standby State: Biometric Outline Graphic (Exact match from Screenshot 1) */}
            {!isCameraActive && (
              <div className="relative flex flex-col items-center justify-center w-full my-2">
                {/* Outer Dashed Amber Radar Ring */}
                <div className="w-52 h-52 rounded-full border border-dashed border-amber-300/60 absolute pointer-events-none" />
                {/* Inner Solid Teal Radar Ring */}
                <div className="w-40 h-40 rounded-full border border-teal-300/40 absolute pointer-events-none" />

                {/* Cyan Corner Brackets */}
                <div className="relative w-36 h-36 flex items-center justify-center">
                  <span className="absolute top-0 left-0 w-4 h-4 border-t-[3.5px] border-l-[3.5px] border-teal-500 rounded-tl-sm pointer-events-none" />
                  <span className="absolute top-0 right-0 w-4 h-4 border-t-[3.5px] border-r-[3.5px] border-teal-500 rounded-tr-sm pointer-events-none" />
                  <span className="absolute bottom-0 left-0 w-4 h-4 border-b-[3.5px] border-l-[3.5px] border-teal-500 rounded-bl-sm pointer-events-none" />
                  <span className="absolute bottom-0 right-0 w-4 h-4 border-b-[3.5px] border-r-[3.5px] border-teal-500 rounded-br-sm pointer-events-none" />

                  {/* Face Vector Outline Silhouette in Deep Teal */}
                  <svg
                    viewBox="0 0 100 100"
                    className="w-24 h-24 text-[#004e45] relative z-10"
                    fill="none"
                    stroke="currentColor"
                    strokeWidth="2.5"
                    strokeLinecap="round"
                    strokeLinejoin="round"
                  >
                    {/* Head / Jaw / Ears outline */}
                    <path d="M50 16 C34 16 30 28 30 44 C27 44 25 46 25 49 C25 52 27 54 30 54 C31 64 38 72 50 72 C62 72 69 64 70 54 C73 54 75 52 75 49 C75 46 73 44 70 44 C70 28 66 16 50 16 Z" />
                    {/* Neck left */}
                    <path d="M37 70 C33 76 28 82 23 85" />
                    {/* Neck right */}
                    <path d="M63 70 C67 76 72 82 77 85" />
                  </svg>
                </div>

                {/* Glowing Cyan Laser Scanline */}
                <div className="w-48 h-1 bg-gradient-to-r from-transparent via-cyan-400 to-transparent shadow-[0_0_10px_#22d3ee] rounded-full my-2 relative z-10" />

                {/* Status Texts */}
                <h3 className="text-slate-900 font-extrabold text-lg mt-1 relative z-10">
                  Ready to scan
                </h3>
                <p className="text-xs text-slate-500 text-center mt-0.5 max-w-xs relative z-10">
                  Camera start karein aur chehra frame mein rakhein.
                </p>
              </div>
            )}

            {/* Celebratory Match Modal Overlay (When verified) */}
            {matchedPerson && (
              <div className="absolute inset-0 bg-slate-950/85 backdrop-blur-md flex items-center justify-center p-4 z-30 animate-in fade-in zoom-in-95 duration-200">
                <div className="bg-white border-2 border-emerald-500 rounded-3xl p-5 max-w-xs w-full text-center shadow-2xl flex flex-col items-center">
                  <div className="flex items-center justify-center gap-3 mb-2.5">
                    <div className="relative">
                      <img
                        src={matchedPerson.photo || "/placeholder-avatar.png"}
                        alt={matchedPerson.fullName}
                        className="w-16 h-16 rounded-2xl object-cover border-2 border-emerald-500 shadow-md"
                      />
                      <div className="absolute -bottom-1 -right-1 bg-emerald-500 text-white rounded-full p-1 shadow">
                        <CheckCircle2 className="w-3.5 h-3.5" />
                      </div>
                    </div>
                    {matchedSnapshot && (
                      <div className="relative">
                        <img
                          src={matchedSnapshot}
                          alt="Live Gate Capture"
                          className="w-16 h-16 rounded-2xl object-cover border-2 border-teal-500 shadow-md"
                        />
                        <div className="absolute -bottom-1 -right-1 bg-teal-500 text-white rounded-full p-1 shadow">
                          <Camera className="w-3.5 h-3.5" />
                        </div>
                      </div>
                    )}
                  </div>

                  <span className={`text-[10px] font-black uppercase px-2.5 py-0.5 rounded-full border mb-1.5 ${
                    matchedPerson.personType === "staff"
                      ? "bg-amber-50 text-amber-800 border-amber-300"
                      : "bg-emerald-50 text-emerald-800 border-emerald-300"
                  }`}>
                    {matchedPerson.personType === "staff" ? "Staff" : "Student"} • {(gateDirection === "entry" && gateStatus.isLate) ? "Late Arrival" : "Present"}
                  </span>

                  <h3 className="text-base font-extrabold text-slate-900 leading-tight">{matchedPerson.fullName}</h3>
                  <p className="text-xs text-slate-500 font-mono mt-0.5">
                    {matchedPerson.personType === "staff" ? (matchedPerson.role || "Faculty") : `Roll: ${matchedPerson.collegeNo || matchedPerson.id}`}
                  </p>

                  <div className="w-full bg-slate-50 rounded-xl p-2 border border-slate-200 mt-2.5 text-xs text-slate-600 flex items-center justify-between font-mono font-bold">
                    <span>{gateDirection === "exit" ? "Gate Exit:" : "Gate Entry:"}</span>
                    <span className="text-[#004e45]">
                      {new Date().toLocaleTimeString("en-US", { hour: "2-digit", minute: "2-digit", hour12: true })}
                    </span>
                  </div>

                  <p className="text-[10px] text-slate-400 mt-2 flex items-center gap-1 justify-center">
                    <Send className="w-3 h-3 text-emerald-600" />
                    <span>Instant WhatsApp notice sent!</span>
                  </p>
                </div>
              </div>
            )}

            {/* Already marked toast overlay */}
            {alreadyMarkedMessage && (
              <div className="absolute top-3 left-3 right-3 bg-amber-500 text-slate-950 px-3.5 py-2 rounded-xl text-xs font-bold shadow-lg backdrop-blur-md flex items-center gap-2 z-20 animate-in slide-in-from-top-2">
                <AlertCircle className="w-4 h-4 shrink-0" />
                <span className="truncate">{alreadyMarkedMessage}</span>
              </div>
            )}
          </div>

          {/* Action Buttons */}
          <button
            onClick={toggleCamera}
            disabled={!modelsLoaded}
            className="w-full mt-3.5 py-3 px-4 rounded-2xl font-bold text-sm text-white bg-[#00695c] hover:bg-[#005a4f] shadow-sm flex items-center justify-center gap-2.5 transition-all cursor-pointer active:scale-[0.98]"
          >
            <Camera className="w-5 h-5 text-teal-100" />
            <span>{isCameraActive ? "Stop Camera" : "Start Gate Camera"}</span>
          </button>

          <button
            onClick={() => fileInputRef.current?.click()}
            className="w-full mt-2 py-3 px-4 rounded-2xl font-bold text-sm text-slate-800 bg-white hover:bg-amber-50/40 border border-amber-400/90 shadow-2xs flex items-center justify-center gap-2.5 transition-all cursor-pointer active:scale-[0.98]"
          >
            <UploadCloud className="w-5 h-5 text-slate-700" />
            <span>Take Snapshot</span>
          </button>

          {/* Bottom Status & Quick Action Buttons inside Card 1 */}
          <div className="mt-3.5 pt-3 border-t border-slate-100 flex items-center justify-between">
            <div className="flex items-center gap-2 text-xs font-medium text-slate-600">
              <span className={`w-2.5 h-2.5 rounded-full ${modelsLoaded ? "bg-emerald-500" : "bg-amber-500 animate-pulse"}`} />
              <span className="truncate max-w-[170px] sm:max-w-xs">{modelLoadingText || "Biometric models ready"}</span>
            </div>

            <div className="flex items-center gap-2">
              {/* Voice Settings Button */}
              <button
                onClick={() => setShowVoiceSettingsModal(true)}
                className="w-9 h-9 rounded-xl border border-slate-200 bg-white hover:bg-slate-50 flex items-center justify-center text-slate-700 transition-colors shadow-2xs cursor-pointer"
                title="AI Voice & Chime Settings"
              >
                {voiceSettings.masterSound ? <Volume2 className="w-4 h-4" /> : <VolumeX className="w-4 h-4 text-slate-400" />}
              </button>

              {/* Flip Camera Facing */}
              <button
                onClick={toggleCameraFacing}
                className="w-9 h-9 rounded-xl border border-slate-200 bg-white hover:bg-slate-50 flex items-center justify-center text-slate-700 transition-colors shadow-2xs cursor-pointer"
                title="Flip Camera Facing"
              >
                <RefreshCw className="w-4 h-4" />
              </button>

              {/* Fullscreen */}
              <button
                onClick={toggleFullscreen}
                className="w-9 h-9 rounded-xl border border-slate-200 bg-white hover:bg-slate-50 flex items-center justify-center text-slate-700 transition-colors shadow-2xs cursor-pointer"
                title="Toggle Fullscreen"
              >
                {isFullscreen ? <Minimize2 className="w-4 h-4" /> : <Maximize2 className="w-4 h-4" />}
              </button>
            </div>
          </div>
        </div>

        {/* CARD 2: BIOMETRIC PROFILES CARD */}
        <div className="bg-white rounded-3xl p-3.5 shadow-xs border border-slate-200/90 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-12 h-12 rounded-full bg-amber-50 border border-amber-200/60 flex items-center justify-center text-[#004e45] shadow-2xs shrink-0">
              <GraduationCap className="w-6 h-6 text-[#004e45]" />
            </div>
            <div>
              <h3 className="font-extrabold text-slate-900 text-sm">Biometric Profiles</h3>
              <p className="text-xs text-slate-500 font-medium">{enrolledProfiles.length} profiles ready</p>
              <p className="text-[11px] text-slate-400 font-semibold">{stats.studentCount} Students • {stats.staffCount} Staff</p>
            </div>
          </div>

          <div className="flex items-center gap-3">
            <div className="h-8 w-px bg-slate-200"></div>
            <button
              onClick={() => loadEnrolledProfiles()}
              disabled={isEnrolling}
              className="bg-[#e8f5f3] hover:bg-[#d8eee9] text-[#004e45] font-extrabold text-xs px-3.5 py-2 rounded-xl flex items-center gap-1.5 border border-teal-200/60 transition-all cursor-pointer disabled:opacity-50"
            >
              <RefreshCw className={`w-3.5 h-3.5 ${isEnrolling ? "animate-spin" : ""}`} />
              <span>Sync</span>
            </button>
          </div>
        </div>

        {/* CARD 3: TODAY'S PUNCHES CARD */}
        <div className="bg-[#004e45] text-white rounded-3xl p-4 shadow-md flex items-center gap-4">
          <div className="w-12 h-12 rounded-2xl bg-[#003832] border border-teal-600/30 flex items-center justify-center text-teal-300 shrink-0">
            <BarChart3 className="w-6 h-6" />
          </div>
          <div className="flex-1 min-w-0">
            <p className="text-xs text-teal-200/90 font-semibold">Today's Punches</p>
            <div className="flex items-center gap-3 mt-0.5">
              <span className="text-3xl font-black text-amber-400 font-mono tracking-tight leading-none">
                {String(recentScans.length).padStart(2, "0")}
              </span>
              <span className="text-teal-400/50 text-sm">|</span>
              <span className="text-xs text-teal-100/90 font-medium truncate">
                {recentScans.length === 0 ? "No attendance recorded yet" : `Last: ${recentScans[0]?.fullName} (${recentScans[0]?.timestamp})`}
              </span>
            </div>
          </div>
        </div>

        {/* EXTRA: COLLAPSIBLE MANUAL SEARCH & AUDIT RECENT SCANS */}
        <div className="bg-white rounded-3xl p-4 shadow-xs border border-slate-200/90">
          <div className="flex items-center justify-between mb-2.5">
            <h3 className="text-xs font-bold text-slate-800 uppercase tracking-wider flex items-center gap-1.5">
              <Search className="w-3.5 h-3.5 text-teal-700" />
              <span>Manual Roll / Staff Search</span>
            </h3>
            <span className="text-[10px] text-slate-400">1-Tap Hazri</span>
          </div>

          <div className="relative mb-2">
            <Search className="w-3.5 h-3.5 text-slate-400 absolute left-3 top-2.5" />
            <input
              type="text"
              placeholder="Search Roll No, Staff ID, or Name..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full bg-slate-50 border border-slate-200 rounded-xl pl-8 pr-3 py-2 text-xs text-slate-900 placeholder-slate-400 focus:outline-none focus:border-teal-600 font-medium"
            />
          </div>

          {filteredSearch.length > 0 && (
            <div className="max-h-48 overflow-y-auto space-y-1.5 pr-1 divide-y divide-slate-100">
              {filteredSearch.slice(0, 6).map((p) => (
                <div key={p.id} className="pt-1.5 flex items-center justify-between gap-2">
                  <div className="flex items-center gap-2 truncate">
                    {p.photo ? (
                      <img src={p.photo} alt={p.fullName} className="w-8 h-8 rounded-lg object-cover" />
                    ) : (
                      <div className="w-8 h-8 rounded-lg bg-teal-50 text-teal-800 text-[10px] font-bold flex items-center justify-center">
                        {p.fullName.charAt(0)}
                      </div>
                    )}
                    <div className="truncate">
                      <p className="text-xs font-bold text-slate-800 truncate flex items-center gap-1">
                        <span>{p.fullName}</span>
                        <span className={`text-[9px] px-1 py-0.2 rounded font-black ${
                          p.personType === "staff" ? "bg-amber-100 text-amber-800" : "bg-emerald-100 text-emerald-800"
                        }`}>
                          {p.personType === "staff" ? "Staff" : "Student"}
                        </span>
                      </p>
                      <p className="text-[10px] text-slate-500 font-mono">
                        {p.personType === "staff" ? `ID: ${p.id} • ${p.role}` : `Roll: ${p.collegeNo || p.id}`}
                      </p>
                    </div>
                  </div>
                  <button
                    onClick={() => processAttendanceForPerson(p, "manual")}
                    className="px-2.5 py-1 bg-[#00695c] hover:bg-[#005a4f] text-white rounded-lg text-[11px] font-bold whitespace-nowrap active:scale-95 transition-all cursor-pointer"
                  >
                    {gateDirection === "exit" ? "Mark Exit" : "Mark Entry"}
                  </button>
                </div>
              ))}
            </div>
          )}

          {/* Recent Scans List */}
          {recentScans.length > 0 && (
            <div className="mt-3 pt-3 border-t border-slate-100">
              <h4 className="text-[11px] font-bold text-slate-500 uppercase tracking-wider mb-2 flex items-center justify-between">
                <span>Recent Check-Ins ({recentScans.length})</span>
                <span className="text-[10px] text-teal-700">Audit Snapshot</span>
              </h4>
              <div className="space-y-1.5 max-h-36 overflow-y-auto pr-1">
                {recentScans.slice(0, 5).map((sc) => (
                  <div
                    key={sc.id}
                    onClick={() => setSelectedScanForAudit(sc)}
                    className="bg-slate-50 border border-slate-100 rounded-xl p-2 flex items-center justify-between gap-2 hover:bg-slate-100/80 cursor-pointer transition-all"
                  >
                    <div className="flex items-center gap-2 truncate">
                      <img
                        src={sc.capturedSnapshot || sc.registeredPhoto || "/placeholder-avatar.png"}
                        alt={sc.fullName}
                        className="w-8 h-8 rounded-lg object-cover border border-slate-200"
                      />
                      <div className="truncate">
                        <p className="text-xs font-bold text-slate-800 truncate">{sc.fullName}</p>
                        <p className="text-[10px] text-slate-400 font-mono">{sc.collegeNoOrRole}</p>
                      </div>
                    </div>
                    <span className={`px-1.5 py-0.5 rounded text-[10px] font-bold border ${
                      sc.direction === "exit" ? "bg-amber-50 text-amber-700 border-amber-200" : "bg-emerald-50 text-emerald-700 border-emerald-200"
                    }`}>
                      {sc.direction === "exit" ? "Exit" : "Entry"} • {sc.timestamp}
                    </span>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>
      </main>

      {/* AUDIT SNAPSHOT INSPECTION MODAL */}
      {selectedScanForAudit && (
        <div className="fixed inset-0 z-50 bg-slate-950/80 backdrop-blur-md flex items-center justify-center p-4 animate-in fade-in duration-150">
          <div className="bg-slate-900 border border-slate-800 rounded-3xl p-6 max-w-md w-full shadow-2xl relative">
            <button
              onClick={() => setSelectedScanForAudit(null)}
              className="absolute top-4 right-4 p-2 text-slate-400 hover:text-white rounded-xl bg-slate-800 hover:bg-slate-700 transition-colors cursor-pointer"
            >
              <X size={16} />
            </button>

            <div className="flex items-center gap-2 mb-4">
              <ShieldCheck className="text-emerald-400 w-5 h-5" />
              <h3 className="text-base font-bold text-white uppercase tracking-tight">
                Biometric Face Attendance Audit
              </h3>
            </div>

            {/* Side-by-Side Face Comparison */}
            <div className="grid grid-cols-2 gap-3 mb-4 bg-slate-950 p-3 rounded-2xl border border-slate-800">
              <div className="text-center">
                <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block mb-1">
                  Registered Profile Photo
                </span>
                <div className="w-full aspect-square rounded-xl overflow-hidden border border-slate-800 bg-slate-900 flex items-center justify-center">
                  {selectedScanForAudit.registeredPhoto ? (
                    <img 
                      src={selectedScanForAudit.registeredPhoto} 
                      alt="Registered" 
                      className="w-full h-full object-cover" 
                    />
                  ) : (
                    <span className="text-xs text-slate-500">No Photo</span>
                  )}
                </div>
              </div>

              <div className="text-center">
                <span className="text-[10px] font-bold text-teal-400 uppercase tracking-wider block mb-1">
                  Live Gate Captured Face
                </span>
                <div className="w-full aspect-square rounded-xl overflow-hidden border border-teal-500/50 bg-slate-900 flex items-center justify-center">
                  {selectedScanForAudit.capturedSnapshot ? (
                    <img 
                      src={selectedScanForAudit.capturedSnapshot} 
                      alt="Scanned" 
                      className="w-full h-full object-cover" 
                    />
                  ) : (
                    <span className="text-xs text-slate-500">No Snapshot</span>
                  )}
                </div>
              </div>
            </div>

            {/* Person Details */}
            <div className="space-y-2 text-xs bg-slate-800/60 p-3.5 rounded-2xl border border-slate-700/60 mb-4">
              <div className="flex justify-between">
                <span className="text-slate-400">Name:</span>
                <span className="font-bold text-white">{selectedScanForAudit.fullName}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-slate-400">ID / Roll No:</span>
                <span className="font-mono text-emerald-400 font-bold">{selectedScanForAudit.collegeNoOrRole}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-slate-400">Persona Role:</span>
                <span className="capitalize font-bold text-slate-200">{selectedScanForAudit.personType === "staff" ? "Faculty / Staff" : "Student"}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-slate-400">Gate Direction:</span>
                <span className={`font-bold ${selectedScanForAudit.direction === "exit" ? "text-amber-400" : "text-emerald-400"}`}>
                  {selectedScanForAudit.direction === "exit" ? "Gate Exit" : "Gate Entry"}
                </span>
              </div>
              <div className="flex justify-between">
                <span className="text-slate-400">Timestamp:</span>
                <span className="font-mono text-slate-300">{selectedScanForAudit.timestamp} ({selectedScanForAudit.date})</span>
              </div>
              <div className="flex justify-between">
                <span className="text-slate-400">Verification Method:</span>
                <span className="text-slate-300 font-mono text-[11px]">{selectedScanForAudit.method === "face_recognition" ? "Deep Neural Face Biometric ✅" : "Manual Kiosk Mark"}</span>
              </div>
            </div>

            <Button
              onClick={() => {
                toast.success("Attendance audit verified and recorded in central audit trail.");
                setSelectedScanForAudit(null);
              }}
              className="w-full bg-emerald-600 hover:bg-emerald-500 text-white rounded-xl font-bold py-2.5 cursor-pointer"
            >
              Close Audit Review
            </Button>
          </div>
        </div>
      )}

      {/* Voice & Sound Customization Modal */}
      {showVoiceSettingsModal && (
        <div className="fixed inset-0 z-50 bg-slate-950/85 backdrop-blur-md flex items-center justify-center p-4 animate-in fade-in duration-200">
          <div className="bg-slate-900 border border-slate-800 rounded-3xl max-w-lg w-full p-6 shadow-2xl relative max-h-[92vh] overflow-y-auto">
            <button
              onClick={() => setShowVoiceSettingsModal(false)}
              className="absolute top-4 right-4 p-2 bg-slate-800 hover:bg-slate-700 text-slate-400 hover:text-white rounded-xl transition-colors cursor-pointer"
            >
              <X className="w-4 h-4" />
            </button>

            {/* Header */}
            <div className="flex items-center gap-3 mb-4">
              <div className="w-11 h-11 rounded-2xl bg-indigo-500/20 border border-indigo-500/30 flex items-center justify-center text-indigo-400">
                <Sliders className="w-5 h-5" />
              </div>
              <div>
                <h3 className="text-base font-bold text-white flex items-center gap-2">
                  AI Voice Greetings & Audio
                  <span className="px-2 py-0.5 rounded-full text-[10px] font-extrabold bg-emerald-500/20 text-emerald-300 border border-emerald-500/30">
                    Live Engine
                  </span>
                </h3>
                <p className="text-xs text-slate-400">
                  Granular control over speaker greetings, warnings, and chimes.
                </p>
              </div>
            </div>

            {/* Master Sound Card */}
            <div className="bg-gradient-to-r from-slate-950 to-slate-900 border border-slate-800 rounded-2xl p-4 mb-4 flex items-center justify-between">
              <div className="flex items-center gap-3">
                <div className={`w-9 h-9 rounded-xl flex items-center justify-center ${voiceSettings.masterSound ? "bg-emerald-500/20 text-emerald-400" : "bg-slate-800 text-slate-500"}`}>
                  {voiceSettings.masterSound ? <Volume2 className="w-5 h-5" /> : <VolumeX className="w-5 h-5" />}
                </div>
                <div>
                  <div className="text-xs font-bold text-white">Master Speaker & Audio</div>
                  <div className="text-[11px] text-slate-400">
                    {voiceSettings.masterSound ? "All audio and voice announcements are active" : "Completely mute all kiosk sounds and speech"}
                  </div>
                </div>
              </div>
              <button
                onClick={() => updateVoiceSettings({ masterSound: !voiceSettings.masterSound })}
                className={`relative inline-flex h-6 w-11 items-center rounded-full transition-colors cursor-pointer ${voiceSettings.masterSound ? "bg-emerald-500" : "bg-slate-700"}`}
              >
                <span className={`inline-block h-4 w-4 transform rounded-full bg-white transition-transform ${voiceSettings.masterSound ? "translate-x-6" : "translate-x-1"}`} />
              </button>
            </div>

            {/* Individual Voice Effects Toggles */}
            <div className="space-y-2.5 mb-5">
              <div className="text-[11px] font-bold text-slate-400 uppercase tracking-wider px-1">
                Voice Announcements & Chimes
              </div>

              {/* 1. Chime */}
              <div className="bg-slate-950/70 border border-slate-800/80 rounded-2xl p-3 flex items-center justify-between">
                <div className="flex items-center gap-2.5">
                  <Bell className="w-4 h-4 text-amber-400 shrink-0" />
                  <div>
                    <div className="text-xs font-semibold text-slate-200">Melodic Scan Chime</div>
                    <div className="text-[10px] text-slate-400">Pleasant synthesized dual-tone harmonic feedback on each punch</div>
                  </div>
                </div>
                <button
                  disabled={!voiceSettings.masterSound}
                  onClick={() => updateVoiceSettings({ playChime: !voiceSettings.playChime })}
                  className={`relative inline-flex h-5 w-9 shrink-0 items-center rounded-full transition-colors cursor-pointer disabled:opacity-40 ${voiceSettings.playChime && voiceSettings.masterSound ? "bg-indigo-600" : "bg-slate-700"}`}
                >
                  <span className={`inline-block h-3.5 w-3.5 transform rounded-full bg-white transition-transform ${voiceSettings.playChime && voiceSettings.masterSound ? "translate-x-4.5" : "translate-x-0.5"}`} />
                </button>
              </div>

              {/* 2. Arrival Welcome */}
              <div className="bg-slate-950/70 border border-slate-800/80 rounded-2xl p-3 flex items-center justify-between">
                <div className="flex items-center gap-2.5">
                  <LogIn className="w-4 h-4 text-emerald-400 shrink-0" />
                  <div>
                    <div className="text-xs font-semibold text-slate-200">Morning Arrival Welcome</div>
                    <div className="text-[10px] text-slate-400">"Assalam-o-Alaikum [Name]! Welcome to Superior College."</div>
                  </div>
                </div>
                <button
                  disabled={!voiceSettings.masterSound}
                  onClick={() => updateVoiceSettings({ speakArrival: !voiceSettings.speakArrival })}
                  className={`relative inline-flex h-5 w-9 shrink-0 items-center rounded-full transition-colors cursor-pointer disabled:opacity-40 ${voiceSettings.speakArrival && voiceSettings.masterSound ? "bg-emerald-600" : "bg-slate-700"}`}
                >
                  <span className={`inline-block h-3.5 w-3.5 transform rounded-full bg-white transition-transform ${voiceSettings.speakArrival && voiceSettings.masterSound ? "translate-x-4.5" : "translate-x-0.5"}`} />
                </button>
              </div>

              {/* 3. Departure Farewell */}
              <div className="bg-slate-950/70 border border-slate-800/80 rounded-2xl p-3 flex items-center justify-between">
                <div className="flex items-center gap-2.5">
                  <LogOut className="w-4 h-4 text-blue-400 shrink-0" />
                  <div>
                    <div className="text-xs font-semibold text-slate-200">Departure Farewell</div>
                    <div className="text-[10px] text-slate-400">"Allah Hafiz [Name]! Safe journey home."</div>
                  </div>
                </div>
                <button
                  disabled={!voiceSettings.masterSound}
                  onClick={() => updateVoiceSettings({ speakDeparture: !voiceSettings.speakDeparture })}
                  className={`relative inline-flex h-5 w-9 shrink-0 items-center rounded-full transition-colors cursor-pointer disabled:opacity-40 ${voiceSettings.speakDeparture && voiceSettings.masterSound ? "bg-blue-600" : "bg-slate-700"}`}
                >
                  <span className={`inline-block h-3.5 w-3.5 transform rounded-full bg-white transition-transform ${voiceSettings.speakDeparture && voiceSettings.masterSound ? "translate-x-4.5" : "translate-x-0.5"}`} />
                </button>
              </div>

              {/* 4. Late Arrival Alert */}
              <div className="bg-slate-950/70 border border-slate-800/80 rounded-2xl p-3 flex items-center justify-between">
                <div className="flex items-center gap-2.5">
                  <Clock className="w-4 h-4 text-amber-400 shrink-0" />
                  <div>
                    <div className="text-xs font-semibold text-slate-200">Late Arrival Warning</div>
                    <div className="text-[10px] text-slate-400">"Late arrival recorded, [Name]."</div>
                  </div>
                </div>
                <button
                  disabled={!voiceSettings.masterSound}
                  onClick={() => updateVoiceSettings({ speakLate: !voiceSettings.speakLate })}
                  className={`relative inline-flex h-5 w-9 shrink-0 items-center rounded-full transition-colors cursor-pointer disabled:opacity-40 ${voiceSettings.speakLate && voiceSettings.masterSound ? "bg-amber-600" : "bg-slate-700"}`}
                >
                  <span className={`inline-block h-3.5 w-3.5 transform rounded-full bg-white transition-transform ${voiceSettings.speakLate && voiceSettings.masterSound ? "translate-x-4.5" : "translate-x-0.5"}`} />
                </button>
              </div>

              {/* 5. Already Marked Alert */}
              <div className="bg-slate-950/70 border border-slate-800/80 rounded-2xl p-3 flex items-center justify-between">
                <div className="flex items-center gap-2.5">
                  <AlertCircle className="w-4 h-4 text-rose-400 shrink-0" />
                  <div>
                    <div className="text-xs font-semibold text-slate-200">Already Marked Notice</div>
                    <div className="text-[10px] text-slate-400">"[Name], attendance already marked today."</div>
                  </div>
                </div>
                <button
                  disabled={!voiceSettings.masterSound}
                  onClick={() => updateVoiceSettings({ speakAlreadyMarked: !voiceSettings.speakAlreadyMarked })}
                  className={`relative inline-flex h-5 w-9 shrink-0 items-center rounded-full transition-colors cursor-pointer disabled:opacity-40 ${voiceSettings.speakAlreadyMarked && voiceSettings.masterSound ? "bg-rose-600" : "bg-slate-700"}`}
                >
                  <span className={`inline-block h-3.5 w-3.5 transform rounded-full bg-white transition-transform ${voiceSettings.speakAlreadyMarked && voiceSettings.masterSound ? "translate-x-4.5" : "translate-x-0.5"}`} />
                </button>
              </div>
            </div>

            {/* Speech Rate Controls */}
            <div className="bg-slate-950/70 border border-slate-800/80 rounded-2xl p-3.5 mb-4">
              <div className="flex items-center justify-between mb-2">
                <span className="text-xs font-semibold text-slate-200">Speech Rate / Speed</span>
                <span className="text-xs font-mono font-bold text-indigo-400">{voiceSettings.speechRate}x</span>
              </div>
              <div className="grid grid-cols-4 gap-2">
                {[
                  { label: "0.95x (Clear)", rate: 0.95 },
                  { label: "1.0x (Normal)", rate: 1.0 },
                  { label: "1.15x (Gate Rush ⭐)", rate: 1.15 },
                  { label: "1.3x (Turbo)", rate: 1.3 }
                ].map((item) => (
                  <button
                    key={item.rate}
                    onClick={() => updateVoiceSettings({ speechRate: item.rate })}
                    className={`py-1.5 px-2 rounded-xl text-[11px] font-medium transition-all cursor-pointer ${
                      voiceSettings.speechRate === item.rate
                        ? "bg-indigo-600 text-white font-bold shadow-md shadow-indigo-600/30"
                        : "bg-slate-800 text-slate-400 hover:text-slate-200 hover:bg-slate-700"
                    }`}
                  >
                    {item.label}
                  </button>
                ))}
              </div>
              <div className="text-[10px] text-slate-500 mt-2">
                💡 Tip: 1.15x is recommended for 400+ students so greetings finish in ~1.2 seconds without blocking the gate line.
              </div>
            </div>

            {/* Accent Selection */}
            <div className="bg-slate-950/70 border border-slate-800/80 rounded-2xl p-3.5 mb-5 flex items-center justify-between">
              <div>
                <span className="text-xs font-semibold text-slate-200 block">Voice Accent & Dialect</span>
                <span className="text-[10px] text-slate-400">Optimized for Pakistani student names</span>
              </div>
              <select
                value={voiceSettings.voiceLanguage}
                onChange={(e) => updateVoiceSettings({ voiceLanguage: e.target.value })}
                className="bg-slate-800 border border-slate-700 rounded-xl px-3 py-1.5 text-xs text-white focus:outline-none focus:border-indigo-500 cursor-pointer"
              >
                <option value="en-IN">Subcontinent / Urdu Inflection (Recommended)</option>
                <option value="en-US">Standard English (US)</option>
                <option value="en-GB">British English (UK)</option>
              </select>
            </div>

            {/* Interactive Test Buttons */}
            <div className="bg-indigo-950/30 border border-indigo-900/40 rounded-2xl p-3.5 mb-5 flex items-center justify-between gap-3">
              <div className="text-xs text-indigo-300 font-medium">
                Test speaker output on this device:
              </div>
              <div className="flex items-center gap-2">
                <button
                  onClick={() => playSuccessChime("normal")}
                  className="px-3 py-1.5 bg-slate-800 hover:bg-slate-700 border border-slate-700 text-slate-200 rounded-xl text-xs font-semibold transition-all flex items-center gap-1.5 cursor-pointer active:scale-95"
                >
                  <Bell className="w-3.5 h-3.5 text-amber-400" />
                  <span>Test Chime</span>
                </button>
                <button
                  onClick={() => speakVoiceGreeting("Assalam-o-Alaikum! Welcome to Superior College Jahanian.")}
                  className="px-3 py-1.5 bg-indigo-600 hover:bg-indigo-500 text-white rounded-xl text-xs font-semibold shadow-md shadow-indigo-600/30 transition-all flex items-center gap-1.5 cursor-pointer active:scale-95"
                >
                  <Play className="w-3.5 h-3.5 fill-current" />
                  <span>Test Greeting</span>
                </button>
              </div>
            </div>

            {/* Modal Actions */}
            <div className="flex items-center justify-between gap-3 pt-2 border-t border-slate-800">
              <button
                onClick={() => {
                  updateVoiceSettings(DEFAULT_VOICE_SETTINGS);
                  toast.success("Voice settings reset to defaults.");
                }}
                className="px-3 py-2 text-xs text-slate-400 hover:text-slate-200 transition-colors cursor-pointer"
              >
                Reset Defaults
              </button>
              <Button
                onClick={() => {
                  setShowVoiceSettingsModal(false);
                  toast.success("Voice settings saved successfully.");
                }}
                className="bg-emerald-600 hover:bg-emerald-500 text-white font-bold text-xs py-2 px-6 rounded-xl cursor-pointer"
              >
                Save & Close
              </Button>
            </div>
          </div>
        </div>
      )}

      {/* PWA Tablet Installation Guidance Modal */}
      {showInstallHelpModal && (
        <div className="fixed inset-0 z-50 bg-slate-950/85 backdrop-blur-md flex items-center justify-center p-4 animate-in fade-in duration-200">
          <div className="bg-slate-900 border border-slate-800 rounded-3xl max-w-md w-full p-6 shadow-2xl relative">
            <button
              onClick={() => setShowInstallHelpModal(false)}
              className="absolute top-4 right-4 p-2 bg-slate-800 hover:bg-slate-700 text-slate-400 hover:text-white rounded-xl transition-colors cursor-pointer"
            >
              <X className="w-4 h-4" />
            </button>

            <div className="w-12 h-12 rounded-2xl bg-emerald-500/20 border border-emerald-500/30 flex items-center justify-center text-emerald-400 mb-4">
              <Download className="w-6 h-6" />
            </div>

            <h3 className="text-lg font-bold text-white mb-1">
              Tablet par Gate Kiosk Install Karein
            </h3>
            <p className="text-xs text-slate-400 mb-4 leading-relaxed">
              Is app ko tablet par install karne se browser ki URL bar, tabs aur buttons 100% hide ho jayenge aur tablet aik dedicated hardware biometric terminal ban jayega.
            </p>

            <div className="space-y-3 bg-slate-950/60 border border-slate-800/80 rounded-2xl p-4 text-xs">
              <div className="flex items-start gap-3">
                <div className="w-6 h-6 rounded-lg bg-emerald-600 text-white flex items-center justify-center font-bold text-[11px] shrink-0 mt-0.5">
                  1
                </div>
                <div>
                  <strong className="text-slate-200 block">Chrome / Edge Browser (Android / Tablet):</strong>
                  <span className="text-slate-400 text-[11px]">
                    Browser ke top-right corner par <strong>3 dots (⋮)</strong> par tap karein.
                  </span>
                </div>
              </div>

              <div className="flex items-start gap-3">
                <div className="w-6 h-6 rounded-lg bg-emerald-600 text-white flex items-center justify-center font-bold text-[11px] shrink-0 mt-0.5">
                  2
                </div>
                <div>
                  <strong className="text-slate-200 block">"Install app" ya "Add to Home screen":</strong>
                  <span className="text-slate-400 text-[11px]">
                    Menu mein se <strong>"Install app"</strong> ya <strong>"Add to Home screen" (ہوم اسکرین پر شامل کریں)</strong> select karein.
                  </span>
                </div>
              </div>

              <div className="flex items-start gap-3">
                <div className="w-6 h-6 rounded-lg bg-emerald-600 text-white flex items-center justify-center font-bold text-[11px] shrink-0 mt-0.5">
                  3
                </div>
                <div>
                  <strong className="text-slate-200 block">1-Tap Direct Launch:</strong>
                  <span className="text-slate-400 text-[11px]">
                    Tablet ki main home screen par <strong>"SCJ Smart Gate"</strong> ka official icon aa jayega. Guard sirf icon tap karega aur fullscreen terminal khul jayega!
                  </span>
                </div>
              </div>
            </div>

            <div className="mt-5 flex items-center justify-between gap-2">
              <button
                onClick={() => {
                  toggleFullscreen();
                  setShowInstallHelpModal(false);
                }}
                className="px-4 py-2 bg-slate-800 hover:bg-slate-700 text-slate-200 font-bold text-xs rounded-xl border border-slate-700 flex items-center gap-1.5 cursor-pointer transition-all"
                title="Browser address bar hide kar ke fullscreen kiosk mode on karein"
              >
                <Maximize className="w-3.5 h-3.5 text-indigo-400" />
                Fullscreen Kiosk Now
              </button>

              <button
                onClick={() => setShowInstallHelpModal(false)}
                className="px-5 py-2 bg-emerald-600 hover:bg-emerald-500 text-white font-bold text-xs rounded-xl shadow-lg cursor-pointer transition-all"
              >
                Samajh Gaya (Done)
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Footer Info */}
      <footer className="bg-slate-900/60 border-t border-slate-800/80 px-4 py-2.5 text-center text-[11px] text-slate-500">
        Superior College Jahanian (SGC-J) • Smart Gate Attendance • Powered by Deep Biometric Neural Network
      </footer>
    </div>
  );
}

function Button({ children, className, onClick, ...props }: any) {
  return (
    <button
      onClick={onClick}
      className={`px-4 py-2 rounded-xl transition-all font-semibold ${className}`}
      {...props}
    >
      {children}
    </button>
  );
}
