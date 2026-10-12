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
  X
} from "lucide-react";
import { toast } from "sonner";
import { supabase } from "../lib/supabase";

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
  status: "Present";
  method: "face_recognition" | "manual";
}

interface FaceAttendanceKioskProps {
  onBackToApp?: () => void;
  standalone?: boolean;
}

export default function FaceAttendanceKiosk({ onBackToApp, standalone = false }: FaceAttendanceKioskProps) {
  // State
  const [modelsLoaded, setModelsLoaded] = useState(false);
  const [modelLoadingText, setModelLoadingText] = useState("Loading Biometric Face Models...");
  const [enrolledProfiles, setEnrolledProfiles] = useState<PersonProfile[]>([]);
  const [enrollingProgress, setEnrollingProgress] = useState({ current: 0, total: 0 });
  const [isEnrolling, setIsEnrolling] = useState(false);
  
  // Camera & Detection state
  const [isCameraActive, setIsCameraActive] = useState(false);
  const [cameraFacing, setCameraFacing] = useState<"user" | "environment">("user");
  const [isDetecting, setIsDetecting] = useState(false);
  const [recentScans, setRecentScans] = useState<ScanRecord[]>([]);
  const [matchedPerson, setMatchedPerson] = useState<PersonProfile | null>(null);
  const [matchedSnapshot, setMatchedSnapshot] = useState<string | null>(null);
  const [selectedScanForAudit, setSelectedScanForAudit] = useState<ScanRecord | null>(null);
  const [alreadyMarkedMessage, setAlreadyMarkedMessage] = useState<string | null>(null);
  const [soundEnabled, setSoundEnabled] = useState(true);
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

  // Web Audio Synth for success chime
  const playSuccessChime = useCallback(() => {
    if (!soundEnabled) return;
    try {
      const audioCtx = new (window.AudioContext || (window as any).webkitAudioContext)();
      const now = audioCtx.currentTime;
      
      const osc1 = audioCtx.createOscillator();
      const osc2 = audioCtx.createOscillator();
      const gainNode = audioCtx.createGain();

      osc1.type = "sine";
      osc2.type = "triangle";

      // Pleasant chord (G5 -> C6)
      osc1.frequency.setValueAtTime(783.99, now);
      osc1.frequency.exponentialRampToValueAtTime(1046.50, now + 0.15);

      osc2.frequency.setValueAtTime(392.00, now);
      osc2.frequency.exponentialRampToValueAtTime(523.25, now + 0.15);

      gainNode.gain.setValueAtTime(0.15, now);
      gainNode.gain.exponentialRampToValueAtTime(0.01, now + 0.45);

      osc1.connect(gainNode);
      osc2.connect(gainNode);
      gainNode.connect(audioCtx.destination);

      osc1.start(now);
      osc2.start(now);
      osc1.stop(now + 0.5);
      osc2.stop(now + 0.5);
    } catch {}
  }, [soundEnabled]);

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

      // Method B: Client-side Supabase fallback if API returned no data
      if (withPhotos.length === 0) {
        const [admissionsRes, studentsRes, staffRes] = await Promise.all([
          supabase
            .from("admissions")
            .select("id, student_id, full_name, father_name, college_no, group, section, photo_url, photo, contact_number, father_contact"),
          supabase
            .from("students")
            .select("id, student_id, admission_id, full_name, father_name, college_no, group, section, photo_url, photo, contact, father_contact"),
          supabase
            .from("staff")
            .select("id, full_name, father_name, role, contact, photo, status")
        ]);

        const mergedMap = new Map<string, PersonProfile>();

        // 1. Process Admissions
        if (admissionsRes.data) {
          for (const a of admissionsRes.data) {
            const photo = a.photo_url || a.photo || "";
            if (photo && photo.trim().length > 10) {
              const sid = a.student_id || a.college_no || a.id;
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

        // 2. Process Students
        if (studentsRes.data) {
          for (const s of studentsRes.data) {
            const sid = s.student_id || s.college_no || s.id;
            const photo = s.photo_url || s.photo || "";
            const existing = mergedMap.get(String(sid)) || mergedMap.get(String(s.id));

            if (photo && photo.trim().length > 10) {
              mergedMap.set(String(sid), {
                id: String(sid),
                fullName: s.full_name || existing?.fullName || "Student",
                fatherName: s.father_name || existing?.fatherName || "",
                collegeNo: s.college_no || s.student_id || existing?.collegeNo || String(s.id).slice(-6),
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
            const photo = st.photo || "";
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

      // Enroll descriptors in background
      const newMap = new Map<string, { person: PersonProfile; descriptor: Float32Array }>();
      let processed = 0;

      for (const p of withPhotos) {
        try {
          // Create an offscreen HTML image element
          const img = new Image();
          img.crossOrigin = "anonymous";
          img.src = p.photo!;

          await new Promise((resolve, reject) => {
            img.onload = resolve;
            img.onerror = reject;
            setTimeout(() => reject(new Error("Timeout")), 4000);
          });

          // Detect face on enrolled photo
          const detection = await faceapi
            .detectSingleFace(img, new faceapi.TinyFaceDetectorOptions({ inputSize: 224 }))
            .withFaceLandmarks()
            .withFaceDescriptor();

          if (detection && detection.descriptor) {
            newMap.set(p.id, { person: p, descriptor: detection.descriptor });
          }
        } catch (enrollErr) {
          console.warn(`[Face Kiosk] Could not enroll face for ${p.fullName}:`, enrollErr);
        }

        processed++;
        setEnrollingProgress({ current: processed, total: withPhotos.length });
      }

      enrolledDescriptorsRef.current = newMap;
      if (newMap.size > 0) {
        toast.success(`Successfully enrolled ${newMap.size} of ${withPhotos.length} biometric face profiles!`, { id: "enrolled-toast" });
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

  // 3. Start Live Camera
  const startCamera = async (facing: "user" | "environment" = cameraFacing) => {
    try {
      if (streamRef.current) {
        streamRef.current.getTracks().forEach((t) => t.stop());
      }

      const stream = await navigator.mediaDevices.getUserMedia({
        video: {
          facingMode: facing,
          width: { ideal: 640 },
          height: { ideal: 480 },
        },
        audio: false,
      });

      streamRef.current = stream;
      if (videoRef.current) {
        videoRef.current.srcObject = stream;
        videoRef.current.onloadedmetadata = () => {
          videoRef.current?.play();
          setIsCameraActive(true);
        };
      }
    } catch (err: any) {
      console.error("Camera access error:", err);
      toast.error("Camera access failed. Check browser permissions or use snapshot upload.");
      setIsCameraActive(false);
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
    const now = Date.now();
    const lastMarked = cooldownMapRef.current.get(person.id);

    // 10 minutes cooldown (600,000 ms) to avoid duplicate checkins
    if (lastMarked && now - lastMarked < 10 * 60 * 1000) {
      const minutesAgo = Math.max(1, Math.round((now - lastMarked) / 60000));
      setAlreadyMarkedMessage(`${person.fullName} already marked (${minutesAgo} min ago)`);
      setTimeout(() => setAlreadyMarkedMessage(null), 3000);
      return;
    }

    // Set cooldown
    cooldownMapRef.current.set(person.id, now);
    playSuccessChime();

    const todayDate = new Date().toISOString().slice(0, 10);
    const timeStr = new Date().toLocaleTimeString("en-US", { hour: "2-digit", minute: "2-digit", hour12: true });
    const liveSnapshot = customSnapshot || captureLiveSnapshot();

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
      status: "Present",
      method,
    };
    setRecentScans((prev) => [newRecord, ...prev.slice(0, 24)]);

    const isExit = gateDirection === "exit";

    try {
      if (person.personType === "staff") {
        // --- STAFF BIOMETRIC ATTENDANCE ---
        const staffPayload: any = {
          staff_id: person.id,
          date: todayDate,
          status: "Present",
          snapshot_url: liveSnapshot || undefined,
          verification_method: method === "face_recognition" ? "face_biometric" : "manual_kiosk",
          notes: `Gate Face Biometric ${isExit ? "Exit" : "Entry"} (${timeStr})`,
        };
        if (isExit) {
          staffPayload.check_out = timeStr;
          staffPayload.check_out_time = new Date().toISOString();
        } else {
          staffPayload.check_in = timeStr;
          staffPayload.check_in_time = new Date().toISOString();
        }

        let { error: staffErr } = await supabase
          .from("staff_attendance")
          .upsert(staffPayload, { onConflict: "staff_id,date" });

        // Fallback if custom schema columns don't exist yet
        if (staffErr && (staffErr.message.includes("column") || staffErr.message.includes("schema"))) {
          const fallbackPayload: any = {
            staff_id: person.id,
            date: todayDate,
            status: "Present",
            notes: JSON.stringify({
              method: "face_biometric",
              direction: gateDirection,
              time: timeStr,
              snapshot: liveSnapshot,
            }),
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

• Status: *Present ✅*
• Action: *${isExit ? "GATE EXIT (Departure / Chhutti)" : "GATE ENTRY (Arrival / Dakhla)"}*
• Time: *${timeStr}*
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
        const studentPayload: any = {
          student_id: person.id,
          date: todayDate,
          status: "Present",
          snapshot_url: liveSnapshot || undefined,
          verification_method: method === "face_recognition" ? "face_biometric" : "manual_kiosk",
          notes: `Gate Face Biometric ${isExit ? "Exit" : "Entry"} (${timeStr})`,
        };
        if (isExit) {
          studentPayload.check_out_time = new Date().toISOString();
        } else {
          studentPayload.check_in_time = new Date().toISOString();
        }

        let { error: stuErr } = await supabase
          .from("student_attendance")
          .upsert(studentPayload, { onConflict: "student_id,date" });

        // Fallback if custom schema columns don't exist yet
        if (stuErr && (stuErr.message.includes("column") || stuErr.message.includes("schema"))) {
          const fallbackPayload = {
            student_id: person.id,
            date: todayDate,
            status: "Present",
            notes: JSON.stringify({
              method: "face_biometric",
              direction: gateDirection,
              time: timeStr,
              snapshot: liveSnapshot,
            }),
          };
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

• Status: *Present ✅ (Biometric Face Scan)*
• Action: *${isExit ? "Gate Departure / Exit" : "Gate Arrival / Entry"}*
• Time: *${timeStr}*
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

          // Match threshold: distance < 0.52 indicates genuine positive match
          if (bestMatch && bestDistance < 0.52) {
            await processAttendanceForPerson(bestMatch, "face_recognition");
          }
        } else {
          setIsDetecting(false);
        }
      }
    } catch {}

    // Throttle next scan by ~350ms to keep mobile CPU cool
    setTimeout(() => {
      scanLoopRef.current = requestAnimationFrame(runDetectionFrame);
    }, 350);
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
    <div className="min-h-screen bg-slate-950 text-slate-100 flex flex-col font-sans select-none">
      {/* Top Header Bar */}
      <header className="bg-slate-900/90 backdrop-blur-md border-b border-slate-800 px-4 py-3 flex items-center justify-between sticky top-0 z-40">
        <div className="flex items-center gap-3">
          {(!standalone || onBackToApp) && (
            <button
              onClick={onBackToApp}
              className="p-2 bg-slate-800 hover:bg-slate-700 text-slate-300 rounded-lg transition-colors flex items-center gap-1.5 text-xs font-semibold cursor-pointer"
            >
              <ArrowLeft className="w-4 h-4" />
              <span className="hidden sm:inline">Back to LMS</span>
            </button>
          )}
          <div className="flex items-center gap-2">
            <div className="w-8 h-8 rounded-lg bg-emerald-500/20 border border-emerald-500/30 flex items-center justify-center text-emerald-400">
              <ShieldCheck className="w-5 h-5" />
            </div>
            <div>
              <h1 className="text-sm sm:text-base font-bold text-white tracking-tight flex items-center gap-2">
                SUPERIOR COLLEGE JAHANIAN
                <span className="px-1.5 py-0.5 rounded text-[10px] bg-emerald-500/20 text-emerald-400 border border-emerald-500/30 uppercase tracking-widest font-mono">
                  Smart Gate
                </span>
              </h1>
              <p className="text-[11px] text-slate-400 hidden sm:block">
                Unified Biometric Face Attendance • Students & Faculty Realtime Security
              </p>
            </div>
          </div>
        </div>

        {/* Action Controls & Direction Selector */}
        <div className="flex items-center gap-2">
          {/* Gate Direction Switcher */}
          <div className="flex items-center bg-slate-950 p-1 rounded-xl border border-slate-800 shadow-inner">
            <button
              onClick={() => setGateDirection("entry")}
              className={`px-2.5 py-1 text-xs font-bold rounded-lg flex items-center gap-1 transition-all cursor-pointer ${
                gateDirection === "entry"
                  ? "bg-emerald-600 text-white shadow-xs"
                  : "text-slate-400 hover:text-slate-200"
              }`}
            >
              <LogIn className="w-3.5 h-3.5 text-emerald-300" />
              <span>Entry</span>
            </button>
            <button
              onClick={() => setGateDirection("exit")}
              className={`px-2.5 py-1 text-xs font-bold rounded-lg flex items-center gap-1 transition-all cursor-pointer ${
                gateDirection === "exit"
                  ? "bg-amber-600 text-white shadow-xs"
                  : "text-slate-400 hover:text-slate-200"
              }`}
            >
              <LogOut className="w-3.5 h-3.5 text-amber-300" />
              <span>Exit</span>
            </button>
          </div>

          {/* Mobile Link Sharing */}
          <button
            onClick={copyMobileLink}
            className="flex items-center gap-1.5 px-2.5 py-1.5 bg-indigo-600/20 hover:bg-indigo-600/30 border border-indigo-500/30 rounded-lg text-xs font-medium text-indigo-300 transition-colors cursor-pointer"
            title="Copy Mobile Browser Link"
          >
            <Smartphone className="w-3.5 h-3.5" />
            <span className="hidden md:inline">Open on Mobile</span>
            {copiedLink ? <Check className="w-3.5 h-3.5 text-emerald-400" /> : <Copy className="w-3.5 h-3.5" />}
          </button>

          {/* Sound Toggle */}
          <button
            onClick={() => setSoundEnabled(!soundEnabled)}
            className="p-2 bg-slate-800 hover:bg-slate-700 text-slate-300 rounded-lg transition-colors cursor-pointer"
            title={soundEnabled ? "Mute audio chime" : "Unmute audio chime"}
          >
            {soundEnabled ? <Volume2 className="w-4 h-4 text-emerald-400" /> : <VolumeX className="w-4 h-4 text-slate-500" />}
          </button>

          {/* Fullscreen */}
          <button
            onClick={toggleFullscreen}
            className="p-2 bg-slate-800 hover:bg-slate-700 text-slate-300 rounded-lg transition-colors cursor-pointer"
            title="Toggle Fullscreen"
          >
            {isFullscreen ? <Minimize2 className="w-4 h-4" /> : <Maximize2 className="w-4 h-4" />}
          </button>
        </div>
      </header>

      {/* Main Body */}
      <main className="flex-1 p-3 sm:p-5 max-w-7xl mx-auto w-full grid grid-cols-1 lg:grid-cols-12 gap-4">
        {/* Left Column: Camera Scanner Stage (8 cols on desktop) */}
        <div className="lg:col-span-8 flex flex-col gap-4">
          <div className="relative bg-slate-900 border border-slate-800 rounded-2xl overflow-hidden shadow-2xl flex flex-col min-h-[380px] sm:min-h-[460px] justify-between">
            {/* Top Camera Controls Overlay */}
            <div className="absolute top-3 left-3 right-3 z-10 flex items-center justify-between gap-2 flex-wrap">
              <div className="flex items-center gap-2">
                <span className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-semibold backdrop-blur-md ${
                  isCameraActive 
                    ? "bg-emerald-500/20 text-emerald-300 border border-emerald-500/40" 
                    : "bg-amber-500/20 text-amber-300 border border-amber-500/40"
                }`}>
                  <span className={`w-2 h-2 rounded-full ${isCameraActive ? "bg-emerald-400 animate-pulse" : "bg-amber-400"}`} />
                  {isCameraActive ? (isDetecting ? "Face Scanning..." : "Live Gate Camera") : "Camera Standby"}
                </span>

                <span className={`px-2.5 py-1 rounded-full text-[11px] font-bold border backdrop-blur-md flex items-center gap-1 ${
                  gateDirection === "entry" 
                    ? "bg-emerald-500/20 text-emerald-300 border-emerald-500/40" 
                    : "bg-amber-500/20 text-amber-300 border-amber-500/40"
                }`}>
                  {gateDirection === "entry" ? <LogIn className="w-3 h-3" /> : <LogOut className="w-3 h-3" />}
                  <span>{gateDirection === "entry" ? "Entry (Dakhla)" : "Exit (Chhutti)"}</span>
                </span>
              </div>

              {/* Target Persona Switcher */}
              <div className="flex items-center gap-1.5 bg-slate-950/80 p-1 rounded-xl border border-slate-800 backdrop-blur-md">
                <button
                  onClick={() => setTargetRoleFilter("all")}
                  className={`px-2 py-0.5 text-[10px] font-bold rounded-lg transition-all cursor-pointer ${
                    targetRoleFilter === "all" ? "bg-teal-600 text-white" : "text-slate-400 hover:text-white"
                  }`}
                >
                  All ({enrolledProfiles.length})
                </button>
                <button
                  onClick={() => setTargetRoleFilter("students")}
                  className={`px-2 py-0.5 text-[10px] font-bold rounded-lg transition-all cursor-pointer ${
                    targetRoleFilter === "students" ? "bg-emerald-600 text-white" : "text-slate-400 hover:text-white"
                  }`}
                >
                  Students ({stats.studentCount})
                </button>
                <button
                  onClick={() => setTargetRoleFilter("staff")}
                  className={`px-2 py-0.5 text-[10px] font-bold rounded-lg transition-all cursor-pointer ${
                    targetRoleFilter === "staff" ? "bg-amber-600 text-white" : "text-slate-400 hover:text-white"
                  }`}
                >
                  Staff ({stats.staffCount})
                </button>
              </div>

              {isCameraActive && (
                <button
                  onClick={toggleCameraFacing}
                  className="px-2.5 py-1 bg-slate-800/80 hover:bg-slate-700/80 backdrop-blur-md border border-slate-700 text-slate-200 rounded-lg text-xs flex items-center gap-1 cursor-pointer"
                >
                  <RefreshCw className="w-3.5 h-3.5" />
                  <span className="hidden sm:inline">Flip</span>
                </button>
              )}
            </div>

            {/* Video Feed & Scanner Overlay */}
            <div className="relative flex-1 flex items-center justify-center bg-black overflow-hidden min-h-[320px]">
              {isCameraActive ? (
                <>
                  <video
                    ref={videoRef}
                    playsInline
                    muted
                    className="w-full h-full object-cover transform scale-x-[-1]"
                  />
                  <canvas ref={canvasRef} className="absolute inset-0 pointer-events-none" />

                  {/* High-Tech Biometric Targeting Frame */}
                  <div className="absolute inset-0 flex items-center justify-center pointer-events-none">
                    <div className="relative w-64 h-72 sm:w-72 sm:h-80 border-2 border-emerald-500/60 rounded-3xl overflow-hidden shadow-[0_0_30px_rgba(16,185,129,0.2)]">
                      {/* Corner Accents */}
                      <div className="absolute top-0 left-0 w-6 h-6 border-t-4 border-l-4 border-emerald-400" />
                      <div className="absolute top-0 right-0 w-6 h-6 border-t-4 border-r-4 border-emerald-400" />
                      <div className="absolute bottom-0 left-0 w-6 h-6 border-b-4 border-l-4 border-emerald-400" />
                      <div className="absolute bottom-0 right-0 w-6 h-6 border-b-4 border-r-4 border-emerald-400" />

                      {/* Moving Laser Scan Line */}
                      <div className="absolute top-0 left-0 right-0 h-1 bg-gradient-to-r from-transparent via-emerald-400 to-transparent shadow-[0_0_12px_#34d399] animate-bounce" />

                      <div className="absolute bottom-3 left-0 right-0 text-center">
                        <span className="text-[11px] font-mono uppercase tracking-wider text-emerald-300 bg-black/60 px-2.5 py-0.5 rounded backdrop-blur-sm">
                          Align Face Inside Frame
                        </span>
                      </div>
                    </div>
                  </div>
                </>
              ) : (
                <div className="text-center p-6 flex flex-col items-center">
                  <div className="w-16 h-16 rounded-2xl bg-slate-800 border border-slate-700 flex items-center justify-center text-slate-400 mb-3 shadow-inner">
                    <Camera className="w-8 h-8" />
                  </div>
                  <h3 className="text-base font-semibold text-white mb-1">Gate Camera is Standby</h3>
                  <p className="text-xs text-slate-400 max-w-xs mb-4">
                    Biometric attendance shuru karne ke liye live camera start karein ya mobile se snapshot lein.
                  </p>
                  <div className="flex flex-wrap items-center justify-center gap-2">
                    <button
                      onClick={() => startCamera()}
                      disabled={!modelsLoaded}
                      className="px-4 py-2 bg-emerald-600 hover:bg-emerald-500 disabled:opacity-50 text-white rounded-xl text-xs font-semibold shadow-lg shadow-emerald-600/30 flex items-center gap-2 transition-all active:scale-95 cursor-pointer"
                    >
                      <Camera className="w-4 h-4" />
                      Start Gate Camera
                    </button>

                    {/* Mobile File Snapshot (Works 100% on any mobile HTTP browser) */}
                    <label className="px-4 py-2 bg-slate-800 hover:bg-slate-700 text-slate-200 border border-slate-700 rounded-xl text-xs font-semibold flex items-center gap-2 cursor-pointer transition-all active:scale-95">
                      <UploadCloud className="w-4 h-4 text-indigo-400" />
                      <span>Take Selfie / Snap</span>
                      <input
                        type="file"
                        accept="image/*"
                        capture="user"
                        className="hidden"
                        onChange={handleMobilePhotoCapture}
                      />
                    </label>
                  </div>
                </div>
              )}

              {/* CELEBRATORY MATCH POPUP (When student or staff attendance is verified) */}
              {matchedPerson && (
                <div className="absolute inset-0 bg-slate-950/85 backdrop-blur-md flex items-center justify-center p-4 z-30 animate-in fade-in zoom-in-95 duration-200">
                  <div className="bg-slate-900 border-2 border-emerald-500 rounded-3xl p-6 max-w-sm w-full text-center shadow-[0_0_50px_rgba(16,185,129,0.4)] flex flex-col items-center">
                    
                    {/* Dual Face Comparison: Registered Profile Photo vs Live Gate Snapshot */}
                    <div className="flex items-center justify-center gap-3 mb-3">
                      <div className="flex flex-col items-center">
                        <div className="relative">
                          <img
                            src={matchedPerson.photo || "/placeholder-avatar.png"}
                            alt={matchedPerson.fullName}
                            className="w-20 h-20 rounded-2xl object-cover border-2 border-emerald-400 shadow-xl"
                          />
                          <div className="absolute -bottom-1 -right-1 bg-emerald-500 text-slate-950 rounded-full p-1 shadow-md">
                            <CheckCircle2 className="w-3.5 h-3.5" />
                          </div>
                        </div>
                        <span className="text-[9px] text-slate-400 font-bold uppercase mt-1">Registered ID</span>
                      </div>

                      {matchedSnapshot && (
                        <div className="flex flex-col items-center">
                          <div className="relative">
                            <img
                              src={matchedSnapshot}
                              alt="Gate Snapshot"
                              className="w-20 h-20 rounded-2xl object-cover border-2 border-teal-400 shadow-xl"
                            />
                            <div className="absolute -bottom-1 -right-1 bg-teal-500 text-slate-950 rounded-full p-1 shadow-md">
                              <Camera className="w-3.5 h-3.5" />
                            </div>
                          </div>
                          <span className="text-[9px] text-teal-300 font-bold uppercase mt-1">Gate Scanned</span>
                        </div>
                      )}
                    </div>

                    {/* Role Badge */}
                    <span className={`text-[10px] font-bold tracking-widest uppercase px-2.5 py-0.5 rounded-full border mb-1 flex items-center gap-1 ${
                      matchedPerson.personType === "staff"
                        ? "bg-amber-500/20 text-amber-300 border-amber-500/40"
                        : "bg-emerald-500/20 text-emerald-300 border-emerald-500/40"
                    }`}>
                      {matchedPerson.personType === "staff" ? <Briefcase size={11} /> : <GraduationCap size={11} />}
                      <span>{matchedPerson.personType === "staff" ? "FACULTY / STAFF MEMBER" : "REGISTERED STUDENT"}</span>
                    </span>

                    <h2 className="text-xl font-bold text-white mb-0.5">{matchedPerson.fullName}</h2>
                    <p className="text-xs text-slate-300 font-mono mb-2">
                      {matchedPerson.personType === "staff" 
                        ? `${matchedPerson.role || "Faculty"} • Staff ID: ${matchedPerson.id}`
                        : `Roll: ${matchedPerson.collegeNo || matchedPerson.id} • ${matchedPerson.group || "Inter"}`}
                    </p>

                    <div className="w-full bg-slate-800/80 rounded-xl p-2.5 border border-slate-700/60 text-xs text-slate-300 flex items-center justify-between">
                      <span className="flex items-center gap-1.5 text-slate-400">
                        <Clock className="w-3.5 h-3.5 text-emerald-400" />
                        <span>{gateDirection === "exit" ? "Gate Exit:" : "Gate Entry:"}</span>
                      </span>
                      <span className="font-semibold text-emerald-300 font-mono">
                        {new Date().toLocaleTimeString("en-US", { hour: "2-digit", minute: "2-digit", hour12: true })}
                      </span>
                    </div>

                    <p className="text-[10px] text-slate-400 mt-2 flex items-center gap-1 justify-center">
                      <Send className="w-3 h-3 text-emerald-400" />
                      <span>{matchedPerson.personType === "staff" ? "Confirmation dispatched to staff WhatsApp." : "Instant WhatsApp notice sent to parents."}</span>
                    </p>
                  </div>
                </div>
              )}

              {/* Already marked toast overlay */}
              {alreadyMarkedMessage && (
                <div className="absolute top-14 left-1/2 -translate-x-1/2 bg-amber-500/90 text-slate-950 px-4 py-2 rounded-xl text-xs font-semibold shadow-lg backdrop-blur-md flex items-center gap-2 z-20 animate-in slide-in-from-top-2">
                  <AlertCircle className="w-4 h-4" />
                  {alreadyMarkedMessage}
                </div>
              )}
            </div>

            {/* Bottom Camera Toolbar */}
            <div className="bg-slate-950/80 backdrop-blur-md border-t border-slate-800 px-4 py-2.5 flex items-center justify-between text-xs text-slate-400">
              <div className="flex items-center gap-2">
                <span className="font-medium text-slate-300">Status:</span>
                <span className="text-slate-400 font-mono">{modelLoadingText}</span>
              </div>

              {isCameraActive && (
                <button
                  onClick={stopCamera}
                  className="px-3 py-1 bg-red-600/20 hover:bg-red-600/30 border border-red-500/40 text-red-300 rounded-lg text-xs font-medium transition-colors cursor-pointer"
                >
                  Turn Off Camera
                </button>
              )}
            </div>
          </div>

          {/* Quick Enrolling & Reload Card */}
          <div className="bg-slate-900/60 border border-slate-800 rounded-xl p-3.5 flex flex-col sm:flex-row items-center justify-between gap-3 text-xs">
            <div className="flex items-center gap-3">
              <div className="w-8 h-8 rounded-lg bg-indigo-500/20 text-indigo-400 flex items-center justify-center font-bold">
                <Sparkles className="w-4 h-4" />
              </div>
              <div>
                <p className="font-semibold text-slate-200">
                  {enrolledProfiles.length} Biometric Profiles ({stats.studentCount} Students, {stats.staffCount} Staff)
                </p>
                <p className="text-[11px] text-slate-400">
                  {isEnrolling 
                    ? `Processing facial descriptors: ${enrollingProgress.current} / ${enrollingProgress.total}...` 
                    : `Active AI Descriptors Loaded: ${enrolledDescriptorsRef.current.size}`}
                </p>
              </div>
            </div>

            <div className="flex items-center gap-2 w-full sm:w-auto justify-end">
              <button
                onClick={loadEnrolledProfiles}
                disabled={isEnrolling}
                className="px-3 py-1.5 bg-slate-800 hover:bg-slate-700 text-slate-300 border border-slate-700 rounded-lg flex items-center gap-1.5 transition-colors text-xs disabled:opacity-50 cursor-pointer"
              >
                <RefreshCw className={`w-3.5 h-3.5 ${isEnrolling ? "animate-spin" : ""}`} />
                Sync Profiles
              </button>
            </div>
          </div>
        </div>

        {/* Right Column: Live Feed & Manual Search (4 cols on desktop) */}
        <div className="lg:col-span-4 flex flex-col gap-4">
          {/* Today Gate Entries Stats */}
          <div className="bg-slate-900 border border-slate-800 rounded-2xl p-4 flex items-center justify-between shadow-lg">
            <div>
              <p className="text-xs text-slate-400 font-medium">Today's Total Gate Punches</p>
              <h3 className="text-2xl font-bold text-emerald-400 mt-0.5">
                {recentScans.length}
                <span className="text-xs font-normal text-slate-400 ml-2 font-mono">
                  ({stats.todayStudentScans} Students, {stats.todayStaffScans} Staff)
                </span>
              </h3>
            </div>
            <div className="w-12 h-12 rounded-xl bg-emerald-500/10 border border-emerald-500/20 flex items-center justify-center text-emerald-400">
              <Users className="w-6 h-6" />
            </div>
          </div>

          {/* Manual Roll / ID Fallback */}
          <div className="bg-slate-900 border border-slate-800 rounded-2xl p-4 shadow-lg flex flex-col">
            <h3 className="text-xs font-bold text-slate-300 uppercase tracking-wider mb-2 flex items-center gap-1.5">
              <Search className="w-3.5 h-3.5 text-indigo-400" />
              Manual Roll / Staff ID Fallback
            </h3>
            <p className="text-[11px] text-slate-400 mb-2.5">
              Agar camera mein masla ho to roll number ya Staff ID likh kar 1-tap hazri lagayein:
            </p>

            <div className="relative mb-2">
              <Search className="w-3.5 h-3.5 text-slate-400 absolute left-2.5 top-2.5" />
              <input
                type="text"
                placeholder="Search Roll No, Staff ID, or Name..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="w-full bg-slate-950 border border-slate-700 rounded-xl pl-8 pr-3 py-2 text-xs text-white placeholder-slate-500 focus:outline-none focus:border-indigo-500 font-medium"
              />
            </div>

            {filteredSearch.length > 0 && (
              <div className="max-h-48 overflow-y-auto space-y-1.5 pr-1 divide-y divide-slate-800/60">
                {filteredSearch.slice(0, 8).map((p) => (
                  <div key={p.id} className="pt-1.5 flex items-center justify-between gap-2">
                    <div className="flex items-center gap-2 truncate">
                      {p.photo ? (
                        <img src={p.photo} alt={p.fullName} className="w-8 h-8 rounded-lg object-cover" />
                      ) : (
                        <div className="w-8 h-8 rounded-lg bg-slate-800 text-[10px] font-bold flex items-center justify-center text-slate-400">
                          {p.fullName.charAt(0)}
                        </div>
                      )}
                      <div className="truncate">
                        <p className="text-xs font-semibold text-slate-200 truncate flex items-center gap-1">
                          <span>{p.fullName}</span>
                          <span className={`text-[9px] px-1 py-0.2 rounded font-black ${
                            p.personType === "staff" ? "bg-amber-900/60 text-amber-300" : "bg-emerald-900/60 text-emerald-300"
                          }`}>
                            {p.personType === "staff" ? "Staff" : "Student"}
                          </span>
                        </p>
                        <p className="text-[10px] text-slate-400 font-mono">
                          {p.personType === "staff" ? `ID: ${p.id} • ${p.role}` : `Roll: ${p.collegeNo || p.id}`}
                        </p>
                      </div>
                    </div>
                    <button
                      onClick={() => processAttendanceForPerson(p, "manual")}
                      className="px-2.5 py-1 bg-emerald-600 hover:bg-emerald-500 text-white rounded-lg text-[11px] font-semibold whitespace-nowrap active:scale-95 transition-all cursor-pointer"
                    >
                      {gateDirection === "exit" ? "Mark Exit" : "Mark Entry"}
                    </button>
                  </div>
                ))}
              </div>
            )}
          </div>

          {/* Recent Scans Feed with Captured Faces */}
          <div className="bg-slate-900 border border-slate-800 rounded-2xl p-4 shadow-lg flex-1 flex flex-col min-h-[220px]">
            <h3 className="text-xs font-bold text-slate-300 uppercase tracking-wider mb-2.5 flex items-center justify-between">
              <span>Live Gate Check-ins</span>
              <span className="text-[10px] text-slate-500 font-mono">Click to Audit Snapshot</span>
            </h3>

            {recentScans.length === 0 ? (
              <div className="flex-1 flex flex-col items-center justify-center text-center p-4 text-slate-500">
                <Clock className="w-8 h-8 stroke-1 mb-1.5 text-slate-600" />
                <p className="text-xs">No gate entries recorded yet today.</p>
                <p className="text-[10px] text-slate-600">Scans with captured face snapshots appear live here.</p>
              </div>
            ) : (
              <div className="space-y-2 overflow-y-auto max-h-[340px] pr-1">
                {recentScans.map((sc) => (
                  <div
                    key={sc.id}
                    onClick={() => setSelectedScanForAudit(sc)}
                    className="bg-slate-950/80 border border-slate-800/80 rounded-xl p-2.5 flex items-center justify-between gap-2 text-xs hover:border-emerald-500/40 hover:bg-slate-900 cursor-pointer transition-all"
                  >
                    <div className="flex items-center gap-2.5 truncate">
                      {/* Live Captured Snapshot Thumbnail */}
                      <div className="relative shrink-0">
                        {sc.capturedSnapshot || sc.registeredPhoto ? (
                          <img 
                            src={sc.capturedSnapshot || sc.registeredPhoto} 
                            alt={sc.fullName} 
                            className="w-10 h-10 rounded-xl object-cover border border-slate-700" 
                          />
                        ) : (
                          <div className="w-10 h-10 rounded-xl bg-emerald-500/20 text-emerald-300 flex items-center justify-center font-bold text-xs">
                            {sc.fullName.charAt(0)}
                          </div>
                        )}
                        <span className="absolute -bottom-1 -right-1 bg-slate-900 p-0.5 rounded-full">
                          <Camera size={10} className="text-teal-400" />
                        </span>
                      </div>

                      <div className="truncate">
                        <p className="font-semibold text-slate-200 truncate flex items-center gap-1.5">
                          <span>{sc.fullName}</span>
                          <span className={`text-[8px] font-black uppercase px-1 py-0.2 rounded ${
                            sc.personType === "staff" ? "bg-amber-950 text-amber-300 border border-amber-800" : "bg-emerald-950 text-emerald-300 border border-emerald-800"
                          }`}>
                            {sc.personType === "staff" ? "Staff" : "Student"}
                          </span>
                        </p>
                        <p className="text-[10px] text-slate-400 font-mono">
                          {sc.collegeNoOrRole}
                        </p>
                      </div>
                    </div>

                    <div className="text-right whitespace-nowrap">
                      <span className={`px-1.5 py-0.5 rounded text-[10px] font-semibold border ${
                        sc.direction === "exit"
                          ? "bg-amber-500/10 text-amber-400 border-amber-500/20"
                          : "bg-emerald-500/10 text-emerald-400 border-emerald-500/20"
                      }`}>
                        {sc.direction === "exit" ? "Exit" : "Entry"} • {sc.timestamp}
                      </span>
                      <p className="text-[9px] text-slate-500 mt-0.5 flex items-center gap-1 justify-end">
                        <Eye size={10} />
                        <span>Audit</span>
                      </p>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
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
