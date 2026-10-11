import React, { useState, useEffect, useRef, useCallback } from "react";
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
  Send
} from "lucide-react";
import { toast } from "sonner";
import { supabase } from "../lib/supabase";

interface StudentProfile {
  id: string;
  fullName: string;
  fatherName?: string;
  collegeNo?: string;
  group?: string;
  section?: string;
  photo?: string;
  phone?: string;
  descriptor?: Float32Array;
}

interface ScanRecord {
  studentId: string;
  fullName: string;
  collegeNo: string;
  group: string;
  photo?: string;
  timestamp: string;
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
  const [enrolledStudents, setEnrolledStudents] = useState<StudentProfile[]>([]);
  const [enrollingProgress, setEnrollingProgress] = useState({ current: 0, total: 0 });
  const [isEnrolling, setIsEnrolling] = useState(false);
  
  // Camera & Detection state
  const [isCameraActive, setIsCameraActive] = useState(false);
  const [cameraFacing, setCameraFacing] = useState<"user" | "environment">("user");
  const [isDetecting, setIsDetecting] = useState(false);
  const [recentScans, setRecentScans] = useState<ScanRecord[]>([]);
  const [matchedStudent, setMatchedStudent] = useState<StudentProfile | null>(null);
  const [alreadyMarkedMessage, setAlreadyMarkedMessage] = useState<string | null>(null);
  const [soundEnabled, setSoundEnabled] = useState(true);
  const [isFullscreen, setIsFullscreen] = useState(false);
  
  // Manual search fallback
  const [searchQuery, setSearchQuery] = useState("");
  const [copiedLink, setCopiedLink] = useState(false);

  // Refs
  const videoRef = useRef<HTMLVideoElement | null>(null);
  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const streamRef = useRef<MediaStream | null>(null);
  const scanLoopRef = useRef<number | null>(null);
  const cooldownMapRef = useRef<Map<string, number>>(new Map()); // studentId -> timestamp
  const enrolledDescriptorsRef = useRef<Map<string, { student: StudentProfile; descriptor: Float32Array }>>(new Map());

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
        console.error("Error loading face models:", err);
        if (isMounted) {
          setModelLoadingText("Could not load local models. Check /models folder.");
          toast.error("Model loading error: " + (err?.message || "Unknown"));
        }
      }
    }

    loadModels();
    return () => {
      isMounted = false;
    };
  }, []);

  // 2. Fetch Enrolled Students from Supabase
  const loadEnrolledStudents = useCallback(async () => {
    if (!modelsLoaded) return;
    setIsEnrolling(true);

    try {
      const { data: dbStudents, error } = await supabase
        .from("students")
        .select("id, full_name, father_name, college_no, group, section, photo, photo_url, contact_number, father_contact")
        .order("full_name", { ascending: true });

      if (error) {
        toast.error("Failed to load students: " + error.message);
        setIsEnrolling(false);
        return;
      }

      // Filter students who have photos
      const withPhotos: StudentProfile[] = (dbStudents || [])
        .map((s: any) => ({
          id: String(s.id),
          fullName: s.full_name || "Student",
          fatherName: s.father_name || "",
          collegeNo: s.college_no || s.id,
          group: s.group || "Intermediate",
          section: s.section || "A",
          photo: s.photo_url || s.photo || "",
          phone: s.contact_number || s.father_contact || "",
        }))
        .filter((s: StudentProfile) => Boolean(s.photo && s.photo.trim().length > 5));

      setEnrolledStudents(withPhotos);
      setEnrollingProgress({ current: 0, total: withPhotos.length });

      // Enroll descriptors in background
      const newMap = new Map<string, { student: StudentProfile; descriptor: Float32Array }>();
      let processed = 0;

      for (const st of withPhotos) {
        try {
          // Create an offscreen HTML image element
          const img = new Image();
          img.crossOrigin = "anonymous";
          img.src = st.photo!;

          await new Promise((resolve, reject) => {
            img.onload = resolve;
            img.onerror = reject;
            // timeout after 4s
            setTimeout(() => reject(new Error("Timeout")), 4000);
          });

          // Detect face on enrolled photo
          const detection = await faceapi
            .detectSingleFace(img, new faceapi.TinyFaceDetectorOptions({ inputSize: 224 }))
            .withFaceLandmarks()
            .withFaceDescriptor();

          if (detection && detection.descriptor) {
            newMap.set(st.id, { student: st, descriptor: detection.descriptor });
          }
        } catch {}

        processed++;
        setEnrollingProgress({ current: processed, total: withPhotos.length });
      }

      enrolledDescriptorsRef.current = newMap;
      toast.success(`Successfully enrolled ${newMap.size} of ${withPhotos.length} student faces!`, { id: "enrolled-toast" });
    } catch (err: any) {
      console.error("Enrollment error:", err);
    } finally {
      setIsEnrolling(false);
    }
  }, [modelsLoaded]);

  useEffect(() => {
    if (modelsLoaded) {
      loadEnrolledStudents();
    }
  }, [modelsLoaded, loadEnrolledStudents]);

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
        await videoRef.current.play();
      }
      setIsCameraActive(true);
      toast.success("Gate Camera Activated ✅", { id: "cam-status" });
    } catch (err: any) {
      console.warn("Camera start failed:", err);
      setIsCameraActive(false);
      toast.error("Camera access denied or unavailable: " + (err?.message || "Please grant camera permission in browser"));
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

  // 4. Mark Attendance in Database & Trigger WhatsApp Notice
  const processAttendanceForStudent = async (student: StudentProfile, method: "face_recognition" | "manual" = "face_recognition") => {
    const now = Date.now();
    const lastMarked = cooldownMapRef.current.get(student.id);

    // 10 minutes cooldown (600,000 ms) to avoid duplicate checkins
    if (lastMarked && now - lastMarked < 10 * 60 * 1000) {
      const minutesAgo = Math.max(1, Math.round((now - lastMarked) / 60000));
      setAlreadyMarkedMessage(`${student.fullName} already marked (${minutesAgo} min ago)`);
      setTimeout(() => setAlreadyMarkedMessage(null), 3000);
      return;
    }

    // Set cooldown
    cooldownMapRef.current.set(student.id, now);
    playSuccessChime();

    const todayDate = new Date().toISOString().slice(0, 10);
    const timeStr = new Date().toLocaleTimeString("en-US", { hour: "2-digit", minute: "2-digit", hour12: true });

    // Show celebratory popup
    setMatchedStudent(student);
    setTimeout(() => {
      setMatchedStudent(null);
    }, 3800);

    // Record in local recent scans
    const newRecord: ScanRecord = {
      studentId: student.id,
      fullName: student.fullName,
      collegeNo: student.collegeNo || student.id,
      group: student.group || "Intermediate",
      photo: student.photo,
      timestamp: timeStr,
      status: "Present",
      method,
    };
    setRecentScans((prev) => [newRecord, ...prev.slice(0, 19)]);

    try {
      // 1. Save in Supabase student_attendance table
      const { error: attError } = await supabase.from("student_attendance").upsert(
        {
          student_id: student.id,
          date: todayDate,
          status: "Present",
          notes: `Gate Face Biometric Entry (${timeStr})`,
        },
        { onConflict: "student_id,date" }
      );

      if (attError) {
        console.warn("Supabase student_attendance upsert:", attError.message);
      }

      // 2. Trigger Instant WhatsApp Alert to Parent
      if (student.phone && student.phone.trim().length >= 10) {
        const waMsg = 
`🏛️ *SUPERIOR COLLEGE JAHANIAN*
✅ *GATE FACE ATTENDANCE NOTIFICATION*
━━━━━━━━━━━━━━━━━━━━━━━━━
Assalam-o-Alaikum!
Aapka bacha *${student.fullName}* (Roll: *${student.collegeNo || student.id}*, Class: ${student.group || "Inter"}) aaj subah *${timeStr}* par College Gate se kamyabi se enter ho chuka hai.

• Status: *Present ✅ (Biometric Face Scan)*
• Campus: Canal Road, Jahanian
━━━━━━━━━━━━━━━━━━━━━━━━━
_Automated Realtime College Security & LMS_`;

        fetch("/api/whatsapp/send", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            phone: student.phone,
            message: waMsg,
          }),
        }).catch((e) => console.warn("WhatsApp alert error:", e));
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

          // Find closest match among enrolled students
          let bestMatch: StudentProfile | null = null;
          let bestDistance = 1.0;

          enrolledDescriptorsRef.current.forEach(({ student, descriptor }) => {
            const dist = getDescriptorDistance(detection.descriptor, descriptor);
            if (dist < bestDistance) {
              bestDistance = dist;
              bestMatch = student;
            }
          });

          // Match threshold: distance < 0.52 indicates genuine positive match
          if (bestMatch && bestDistance < 0.52) {
            await processAttendanceForStudent(bestMatch, "face_recognition");
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
  }, [isCameraActive]);

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

      let bestMatch: StudentProfile | null = null;
      let bestDistance = 1.0;

      enrolledDescriptorsRef.current.forEach(({ student, descriptor }) => {
        const dist = getDescriptorDistance(detection.descriptor, descriptor);
        if (dist < bestDistance) {
          bestDistance = dist;
          bestMatch = student;
        }
      });

      if (bestMatch && bestDistance < 0.54) {
        toast.success(`Match found: ${bestMatch.fullName}!`, { id: "snap-ai" });
        await processAttendanceForStudent(bestMatch, "face_recognition");
      } else {
        toast.warning("Koi enrolled student match nahi hua. Roll number se search karein.", { id: "snap-ai" });
      }
    } catch (err: any) {
      toast.error("Scan error: " + err.message, { id: "snap-ai" });
    }
  };

  // Fullscreen Toggle
  const toggleFullscreen = () => {
    if (!document.fullscreenElement) {
      document.documentElement.requestFullscreen().then(() => setIsFullscreen(true)).catch(() => {});
    } else {
      document.exitFullscreen().then(() => setIsFullscreen(false)).catch(() => {});
    }
  };

  // Copy Mobile Testing Link
  const copyMobileLink = () => {
    const mobileUrl = `${window.location.origin}/?gate=true`;
    navigator.clipboard.writeText(mobileUrl);
    setCopiedLink(true);
    toast.success("Mobile Link copied! Open on your phone on the same Wi-Fi.");
    setTimeout(() => setCopiedLink(false), 2500);
  };

  // Filtered manual search
  const filteredSearch = enrolledStudents.filter((s) => {
    const q = searchQuery.toLowerCase().trim();
    if (!q) return false;
    return (
      s.fullName.toLowerCase().includes(q) ||
      (s.collegeNo && s.collegeNo.toLowerCase().includes(q)) ||
      s.id.toLowerCase().includes(q)
    );
  });

  return (
    <div className="min-h-screen bg-slate-950 text-slate-100 flex flex-col font-sans select-none overflow-x-hidden">
      {/* Top Header */}
      <header className="bg-slate-900/90 backdrop-blur-md border-b border-slate-800 px-4 py-3 flex items-center justify-between z-20">
        <div className="flex items-center gap-3">
          {onBackToApp && (
            <button
              onClick={onBackToApp}
              className="p-2 bg-slate-800 hover:bg-slate-700 text-slate-300 rounded-lg transition-colors flex items-center gap-1.5 text-xs font-semibold"
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
                  Gate Kiosk
                </span>
              </h1>
              <p className="text-[11px] text-slate-400 hidden sm:block">
                AI Smart Face Attendance Terminal • Realtime Biometric Sync
              </p>
            </div>
          </div>
        </div>

        {/* Action Controls */}
        <div className="flex items-center gap-2">
          {/* Mobile Link Sharing */}
          <button
            onClick={copyMobileLink}
            className="flex items-center gap-1.5 px-2.5 py-1.5 bg-indigo-600/20 hover:bg-indigo-600/30 border border-indigo-500/30 rounded-lg text-xs font-medium text-indigo-300 transition-colors"
            title="Copy Mobile Browser Link"
          >
            <Smartphone className="w-3.5 h-3.5" />
            <span className="hidden md:inline">Open on Mobile</span>
            {copiedLink ? <Check className="w-3.5 h-3.5 text-emerald-400" /> : <Copy className="w-3.5 h-3.5" />}
          </button>

          {/* Sound Toggle */}
          <button
            onClick={() => setSoundEnabled(!soundEnabled)}
            className="p-2 bg-slate-800 hover:bg-slate-700 text-slate-300 rounded-lg transition-colors"
            title={soundEnabled ? "Mute audio chime" : "Unmute audio chime"}
          >
            {soundEnabled ? <Volume2 className="w-4 h-4 text-emerald-400" /> : <VolumeX className="w-4 h-4 text-slate-500" />}
          </button>

          {/* Fullscreen */}
          <button
            onClick={toggleFullscreen}
            className="p-2 bg-slate-800 hover:bg-slate-700 text-slate-300 rounded-lg transition-colors"
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
            <div className="absolute top-3 left-3 right-3 z-10 flex items-center justify-between">
              <div className="flex items-center gap-2">
                <span className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-semibold backdrop-blur-md ${
                  isCameraActive 
                    ? "bg-emerald-500/20 text-emerald-300 border border-emerald-500/40" 
                    : "bg-amber-500/20 text-amber-300 border border-amber-500/40"
                }`}>
                  <span className={`w-2 h-2 rounded-full ${isCameraActive ? "bg-emerald-400 animate-pulse" : "bg-amber-400"}`} />
                  {isCameraActive ? (isDetecting ? "Face Scanning..." : "Live Camera") : "Camera Off"}
                </span>

                <span className="px-2 py-1 bg-slate-800/80 backdrop-blur-md border border-slate-700/60 rounded-full text-[11px] text-slate-300">
                  {enrolledDescriptorsRef.current.size} Faces Enrolled
                </span>
              </div>

              {isCameraActive && (
                <button
                  onClick={toggleCameraFacing}
                  className="px-2.5 py-1 bg-slate-800/80 hover:bg-slate-700/80 backdrop-blur-md border border-slate-700 text-slate-200 rounded-lg text-xs flex items-center gap-1"
                >
                  <RefreshCw className="w-3.5 h-3.5" />
                  <span className="hidden sm:inline">Flip Camera</span>
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
                        <span className="text-[11px] font-mono uppercase tracking-wider text-emerald-300 bg-black/60 px-2 py-0.5 rounded backdrop-blur-sm">
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
                    Face recognition shuru karne ke liye live camera start karein ya mobile se selfie capture karein.
                  </p>
                  <div className="flex flex-wrap items-center justify-center gap-2">
                    <button
                      onClick={() => startCamera()}
                      disabled={!modelsLoaded}
                      className="px-4 py-2 bg-emerald-600 hover:bg-emerald-500 disabled:opacity-50 text-white rounded-xl text-xs font-semibold shadow-lg shadow-emerald-600/30 flex items-center gap-2 transition-all active:scale-95"
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

              {/* CELEBRATORY MATCH POPUP (When attendance is verified) */}
              {matchedStudent && (
                <div className="absolute inset-0 bg-slate-950/85 backdrop-blur-md flex items-center justify-center p-4 z-30 animate-in fade-in zoom-in-95 duration-200">
                  <div className="bg-slate-900 border-2 border-emerald-500 rounded-3xl p-6 max-w-sm w-full text-center shadow-[0_0_50px_rgba(16,185,129,0.4)] flex flex-col items-center">
                    <div className="relative mb-3">
                      <img
                        src={matchedStudent.photo || "/placeholder-avatar.png"}
                        alt={matchedStudent.fullName}
                        className="w-24 h-24 rounded-2xl object-cover border-2 border-emerald-400 shadow-xl"
                      />
                      <div className="absolute -bottom-2 -right-2 bg-emerald-500 text-slate-950 rounded-full p-1.5 shadow-md">
                        <CheckCircle2 className="w-5 h-5" />
                      </div>
                    </div>

                    <span className="text-[11px] font-semibold tracking-widest uppercase text-emerald-400 bg-emerald-500/10 px-2 py-0.5 rounded-full border border-emerald-500/20 mb-1">
                      Attendance Marked ✅
                    </span>

                    <h2 className="text-xl font-bold text-white mb-0.5">{matchedStudent.fullName}</h2>
                    <p className="text-xs text-slate-300 font-mono mb-2">
                      Roll No: <span className="font-bold text-emerald-300">{matchedStudent.collegeNo || matchedStudent.id}</span> • {matchedStudent.group || "Inter"}
                    </p>

                    <div className="w-full bg-slate-800/80 rounded-xl p-2.5 border border-slate-700/60 text-xs text-slate-300 flex items-center justify-between">
                      <span className="flex items-center gap-1.5 text-slate-400">
                        <Clock className="w-3.5 h-3.5 text-emerald-400" /> Check-in:
                      </span>
                      <span className="font-semibold text-emerald-300">
                        {new Date().toLocaleTimeString("en-US", { hour: "2-digit", minute: "2-digit", hour12: true })}
                      </span>
                    </div>

                    <p className="text-[10px] text-slate-400 mt-2 flex items-center gap-1 justify-center">
                      <Send className="w-3 h-3 text-emerald-400" />
                      Instant WhatsApp notice sent to parents.
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
                  className="px-3 py-1 bg-red-600/20 hover:bg-red-600/30 border border-red-500/40 text-red-300 rounded-lg text-xs font-medium transition-colors"
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
                  {enrolledStudents.length} Students With Photos Available in Database
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
                onClick={loadEnrolledStudents}
                disabled={isEnrolling}
                className="px-3 py-1.5 bg-slate-800 hover:bg-slate-700 text-slate-300 border border-slate-700 rounded-lg flex items-center gap-1.5 transition-colors text-xs disabled:opacity-50"
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
              <p className="text-xs text-slate-400 font-medium">Today's Gate Entries</p>
              <h3 className="text-2xl font-bold text-emerald-400 mt-0.5">{recentScans.length}</h3>
            </div>
            <div className="w-12 h-12 rounded-xl bg-emerald-500/10 border border-emerald-500/20 flex items-center justify-center text-emerald-400">
              <Users className="w-6 h-6" />
            </div>
          </div>

          {/* Manual Student Search Fallback */}
          <div className="bg-slate-900 border border-slate-800 rounded-2xl p-4 shadow-lg flex flex-col">
            <h3 className="text-xs font-bold text-slate-300 uppercase tracking-wider mb-2 flex items-center gap-1.5">
              <Search className="w-3.5 h-3.5 text-indigo-400" />
              Manual Roll / Name Fallback
            </h3>
            <p className="text-[11px] text-slate-400 mb-2.5">
              Agar lighting ya camera mein masla ho to roll number likh kar 1-tap hazri lagayein:
            </p>

            <div className="relative mb-2">
              <Search className="w-3.5 h-3.5 text-slate-400 absolute left-2.5 top-2.5" />
              <input
                type="text"
                placeholder="Search Roll No or Student Name..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="w-full bg-slate-950 border border-slate-700 rounded-xl pl-8 pr-3 py-2 text-xs text-white placeholder-slate-500 focus:outline-none focus:border-indigo-500"
              />
            </div>

            {filteredSearch.length > 0 && (
              <div className="max-h-48 overflow-y-auto space-y-1.5 pr-1 divide-y divide-slate-800/60">
                {filteredSearch.slice(0, 6).map((st) => (
                  <div key={st.id} className="pt-1.5 flex items-center justify-between gap-2">
                    <div className="flex items-center gap-2 truncate">
                      {st.photo ? (
                        <img src={st.photo} alt={st.fullName} className="w-7 h-7 rounded-lg object-cover" />
                      ) : (
                        <div className="w-7 h-7 rounded-lg bg-slate-800 text-[10px] font-bold flex items-center justify-center text-slate-400">
                          {st.fullName.charAt(0)}
                        </div>
                      )}
                      <div className="truncate">
                        <p className="text-xs font-semibold text-slate-200 truncate">{st.fullName}</p>
                        <p className="text-[10px] text-slate-400 font-mono">Roll: {st.collegeNo || st.id}</p>
                      </div>
                    </div>
                    <button
                      onClick={() => processAttendanceForStudent(st, "manual")}
                      className="px-2.5 py-1 bg-emerald-600 hover:bg-emerald-500 text-white rounded-lg text-[11px] font-semibold whitespace-nowrap active:scale-95 transition-all"
                    >
                      Mark Present
                    </button>
                  </div>
                ))}
              </div>
            )}
          </div>

          {/* Recent Scans Feed */}
          <div className="bg-slate-900 border border-slate-800 rounded-2xl p-4 shadow-lg flex-1 flex flex-col min-h-[220px]">
            <h3 className="text-xs font-bold text-slate-300 uppercase tracking-wider mb-2.5 flex items-center justify-between">
              <span>Live Gate Check-ins</span>
              <span className="text-[10px] text-slate-500 font-mono">Last 20</span>
            </h3>

            {recentScans.length === 0 ? (
              <div className="flex-1 flex flex-col items-center justify-center text-center p-4 text-slate-500">
                <Clock className="w-8 h-8 stroke-1 mb-1.5 text-slate-600" />
                <p className="text-xs">No gate entries recorded yet today.</p>
                <p className="text-[10px] text-slate-600">Scans will appear live here.</p>
              </div>
            ) : (
              <div className="space-y-2 overflow-y-auto max-h-[320px] pr-1">
                {recentScans.map((sc, i) => (
                  <div
                    key={`${sc.studentId}-${i}`}
                    className="bg-slate-950/80 border border-slate-800/80 rounded-xl p-2.5 flex items-center justify-between gap-2 text-xs hover:border-emerald-500/30 transition-colors"
                  >
                    <div className="flex items-center gap-2.5 truncate">
                      {sc.photo ? (
                        <img src={sc.photo} alt={sc.fullName} className="w-8 h-8 rounded-lg object-cover" />
                      ) : (
                        <div className="w-8 h-8 rounded-lg bg-emerald-500/20 text-emerald-300 flex items-center justify-center font-bold text-xs">
                          {sc.fullName.charAt(0)}
                        </div>
                      )}
                      <div className="truncate">
                        <p className="font-semibold text-slate-200 truncate">{sc.fullName}</p>
                        <p className="text-[10px] text-slate-400 font-mono">
                          {sc.collegeNo} • {sc.group}
                        </p>
                      </div>
                    </div>

                    <div className="text-right whitespace-nowrap">
                      <span className="px-1.5 py-0.5 rounded text-[10px] font-semibold bg-emerald-500/10 text-emerald-400 border border-emerald-500/20">
                        {sc.timestamp}
                      </span>
                      <p className="text-[9px] text-slate-500 mt-0.5">
                        {sc.method === "face_recognition" ? "Face Scan" : "Manual"}
                      </p>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      </main>

      {/* Footer Info */}
      <footer className="bg-slate-900/60 border-t border-slate-800/80 px-4 py-2.5 text-center text-[11px] text-slate-500">
        Superior College Jahanian (SGC-J) • Smart Gate Attendance • Powered by Deep Biometric Neural Network
      </footer>
    </div>
  );
}
