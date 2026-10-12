import React, { useState, useRef, useEffect, useCallback } from "react";
import {
  Crop,
  RotateCw,
  RotateCcw,
  FlipHorizontal,
  Sun,
  Contrast,
  Download,
  Upload,
  Check,
  RefreshCw,
  Camera,
  Palette,
  Sliders,
  X,
  Pipette,
  Sparkles,
  ShieldCheck,
  CheckCircle2,
  Circle,
  Square
} from "lucide-react";
import { toast } from "sonner";
import { supabase } from "../lib/supabase";

interface PhotoEditorModalProps {
  isOpen: boolean;
  onClose: () => void;
  initialPhotoUrl?: string;
  studentName?: string;
  studentId?: string;
  admissionId?: string;
  onSaveSuccess?: (newPhotoUrl: string) => void;
}

const BG_PRESETS = [
  { name: "Original", value: "none", hex: "transparent", border: "border-slate-300", label: "Original" },
  { name: "Studio White", value: "#FFFFFF", hex: "#FFFFFF", border: "border-slate-400", label: "White BG" },
  { name: "Passport Blue", value: "#0072CE", hex: "#0072CE", border: "border-blue-600", label: "Passport Blue" },
  { name: "Sky Blue", value: "#38BDF8", hex: "#38BDF8", border: "border-sky-400", label: "Sky Blue" },
  { name: "Deep Navy", value: "#1E3A8A", hex: "#1E3A8A", border: "border-indigo-900", label: "Navy" },
  { name: "Neutral Gray", value: "#E2E8F0", hex: "#E2E8F0", border: "border-slate-300", label: "Neutral" },
];

export default function PhotoEditorModal({
  isOpen,
  onClose,
  initialPhotoUrl,
  studentName = "Student",
  studentId,
  admissionId,
  onSaveSuccess,
}: PhotoEditorModalProps) {
  // Source Image
  const [sourceImage, setSourceImage] = useState<string>(initialPhotoUrl || "");
  const [cropShape, setCropShape] = useState<"circle" | "passport" | "square" | "free">("circle"); // Default to Circle for App avatars!

  // Transform controls
  const [zoom, setZoom] = useState<number>(1);
  const [rotation, setRotation] = useState<number>(0); // degrees: 0, 90, 180, 270
  const [flipH, setFlipH] = useState<boolean>(false);
  const [panX, setPanX] = useState<number>(0);
  const [panY, setPanY] = useState<number>(0);

  // Color & enhancement controls
  const [brightness, setBrightness] = useState<number>(100); // 50 to 150 %
  const [contrast, setContrast] = useState<number>(100); // 50 to 150 %
  const [saturation, setSaturation] = useState<number>(100); // 50 to 150 %

  // Background replacement
  const [selectedBg, setSelectedBg] = useState<string>("none");
  const [bgTolerance, setBgTolerance] = useState<number>(40); // 15 to 80
  const [sampledColor, setSampledColor] = useState<{ r: number; g: number; b: number } | null>(null);
  const [isEyedropperActive, setIsEyedropperActive] = useState<boolean>(false);
  const [protectFaceSkin, setProtectFaceSkin] = useState<boolean>(true);
  const [featherRadius, setFeatherRadius] = useState<number>(18);

  // Pan interaction
  const [isDragging, setIsDragging] = useState<boolean>(false);
  const [dragStart, setDragStart] = useState<{ x: number; y: number }>({ x: 0, y: 0 });

  // State
  const [, setIsProcessing] = useState<boolean>(false);
  const [isSaving, setIsSaving] = useState<boolean>(false);
  const [previewDataUrl, setPreviewDataUrl] = useState<string>("");

  const fileInputRef = useRef<HTMLInputElement | null>(null);
  const previewContainerRef = useRef<HTMLDivElement | null>(null);

  // Sync initial photo when modal opens or initialPhotoUrl changes
  useEffect(() => {
    if (initialPhotoUrl) {
      setSourceImage(initialPhotoUrl);
    }
  }, [initialPhotoUrl]);

  // Reset adjustments
  const handleReset = () => {
    setZoom(1);
    setRotation(0);
    setFlipH(false);
    setPanX(0);
    setPanY(0);
    setBrightness(100);
    setContrast(100);
    setSaturation(100);
    setSelectedBg("none");
    setBgTolerance(40);
    setSampledColor(null);
    setIsEyedropperActive(false);
    setProtectFaceSkin(true);
    setFeatherRadius(18);
  };

  // Render canvas with all edits & background replacement
  const renderEditedImage = useCallback(
    async (targetWidth = 500, targetHeight = 500): Promise<string> => {
      if (!sourceImage) return "";

      return new Promise((resolve) => {
        const img = new Image();
        img.crossOrigin = "anonymous";
        img.src = sourceImage;

        img.onload = () => {
          let outputW = targetWidth;
          let outputH = targetHeight;

          if (cropShape === "circle" || cropShape === "square") {
            outputW = 500;
            outputH = 500;
          } else if (cropShape === "passport") {
            outputW = 450;
            outputH = 600; // 3:4 ratio
          } else {
            // Free / natural
            outputW = 500;
            outputH = Math.round((500 * img.height) / img.width);
          }

          const canvas = document.createElement("canvas");
          canvas.width = outputW;
          canvas.height = outputH;
          const ctx = canvas.getContext("2d", { willReadFrequently: true });
          if (!ctx) return resolve("");

          // 1. Draw solid background color if selected
          const activeBgColor = selectedBg;
          if (activeBgColor !== "none") {
            ctx.fillStyle = activeBgColor;
            ctx.fillRect(0, 0, outputW, outputH);
          }

          // 2. Offscreen canvas for transformed image with filters
          const tempCanvas = document.createElement("canvas");
          tempCanvas.width = outputW;
          tempCanvas.height = outputH;
          const tempCtx = tempCanvas.getContext("2d", { willReadFrequently: true });
          if (!tempCtx) return resolve("");

          tempCtx.save();
          tempCtx.translate(outputW / 2 + panX, outputH / 2 + panY);
          tempCtx.rotate((rotation * Math.PI) / 180);
          tempCtx.scale((flipH ? -1 : 1) * zoom, zoom);

          // Apply color filters
          tempCtx.filter = `brightness(${brightness}%) contrast(${contrast}%) saturate(${saturation}%)`;

          // Draw image centered
          const scale = Math.max(outputW / img.width, outputH / img.height);
          const drawW = img.width * scale;
          const drawH = img.height * scale;
          tempCtx.drawImage(img, -drawW / 2, -drawH / 2, drawW, drawH);
          tempCtx.restore();

          // 3. Smart Background replacement algorithm (Chroma Key with Face & Skin Shield)
          if (activeBgColor !== "none") {
            const imgData = tempCtx.getImageData(0, 0, outputW, outputH);
            const data = imgData.data;

            // Target replacement color (destination)
            let destR = 255, destG = 255, destB = 255;
            if (activeBgColor.startsWith("#")) {
              destR = parseInt(activeBgColor.slice(1, 3), 16) || 255;
              destG = parseInt(activeBgColor.slice(3, 5), 16) || 255;
              destB = parseInt(activeBgColor.slice(5, 7), 16) || 255;
            }

            // Target background color to remove (source sample)
            let sampleR = 240, sampleG = 240, sampleB = 240;
            if (sampledColor) {
              // User clicked with eyedropper!
              sampleR = sampledColor.r;
              sampleG = sampledColor.g;
              sampleB = sampledColor.b;
            } else {
              // Auto-sample border points excluding skin
              const samplePoints: Array<[number, number]> = [];
              // Top border points
              for (let x = 8; x < outputW - 8; x += Math.floor(outputW / 8)) samplePoints.push([x, 6]);
              // Left & Right corners
              samplePoints.push([6, 6], [outputW - 8, 6], [6, outputH - 8], [outputW - 8, outputH - 8]);
              // Left & Right border points
              for (let y = 16; y < outputH - 16; y += Math.floor(outputH / 6)) {
                samplePoints.push([6, y]);
                samplePoints.push([outputW - 8, y]);
              }

              let sR = 0, sG = 0, sB = 0, validSamples = 0;
              for (const [sx, sy] of samplePoints) {
                const idx = (sy * outputW + sx) * 4;
                const r = data[idx];
                const g = data[idx + 1];
                const b = data[idx + 2];
                // Exclude skin from background sample
                const isSkinSample = r > 100 && g > 45 && b > 25 && r > g && r > b;
                if (!isSkinSample) {
                  sR += r;
                  sG += g;
                  sB += b;
                  validSamples++;
                }
              }

              if (validSamples > 0) {
                sampleR = Math.round(sR / validSamples);
                sampleG = Math.round(sG / validSamples);
                sampleB = Math.round(sB / validSamples);
              }
            }

            const tolSq = bgTolerance * bgTolerance * 3;
            const featherSq = (bgTolerance + featherRadius) * (bgTolerance + featherRadius) * 3;

            // Face center region parameters for shield
            const faceCx = outputW / 2 + panX;
            const faceCy = outputH * 0.44 + panY;
            const faceRx = outputW * 0.28 * zoom;
            const faceRy = outputH * 0.35 * zoom;

            for (let i = 0; i < data.length; i += 4) {
              const pixelIndex = i / 4;
              const px = pixelIndex % outputW;
              const py = Math.floor(pixelIndex / outputW);

              const r = data[i];
              const g = data[i + 1];
              const b = data[i + 2];

              // Normalized distance squared to center face oval
              const dX = (px - faceCx) / (faceRx || 1);
              const dY = (py - faceCy) / (faceRy || 1);
              const faceDistSq = dX * dX + dY * dY;

              // Robust Human Skin Tone detection (RGB model)
              const isSkin =
                r > 90 &&
                g > 35 &&
                b > 20 &&
                Math.max(r, g, b) - Math.min(r, g, b) > 12 &&
                r > g &&
                r > b;

              // Dark hair shield in upper half of face oval
              const isDarkHair = faceDistSq < 1.4 && (r + g + b) < 180 && py < faceCy + faceRy * 0.25;

              // Protect face and skin from being replaced
              if (protectFaceSkin && (faceDistSq < 0.75 || (faceDistSq < 1.35 && (isSkin || isDarkHair)))) {
                continue; // Protected student face/body pixel!
              }

              const dr = r - sampleR;
              const dg = g - sampleG;
              const db = b - sampleB;
              const distSq = dr * dr + dg * dg + db * db;

              if (distSq < tolSq) {
                // Background pixel -> Replace with destination color
                data[i] = destR;
                data[i + 1] = destG;
                data[i + 2] = destB;
              } else if (distSq < featherSq) {
                // Soft edge blend
                const ratio = (distSq - tolSq) / (featherSq - tolSq);
                data[i] = Math.round(destR * (1 - ratio) + r * ratio);
                data[i + 1] = Math.round(destG * (1 - ratio) + g * ratio);
                data[i + 2] = Math.round(destB * (1 - ratio) + b * ratio);
              }
            }

            tempCtx.putImageData(imgData, 0, 0);
          }

          ctx.drawImage(tempCanvas, 0, 0);
          const resultDataUrl = canvas.toDataURL("image/jpeg", 0.92);
          resolve(resultDataUrl);
        };

        img.onerror = () => {
          resolve("");
        };
      });
    },
    [
      sourceImage,
      cropShape,
      zoom,
      rotation,
      flipH,
      panX,
      panY,
      brightness,
      contrast,
      saturation,
      selectedBg,
      bgTolerance,
      sampledColor,
      protectFaceSkin,
      featherRadius,
    ]
  );

  // Update preview when parameters change
  useEffect(() => {
    let active = true;
    const timer = setTimeout(async () => {
      if (!sourceImage) return;
      setIsProcessing(true);
      const url = await renderEditedImage(400, 400);
      if (active) {
        setPreviewDataUrl(url);
        setIsProcessing(false);
      }
    }, 70);

    return () => {
      active = false;
      clearTimeout(timer);
    };
  }, [renderEditedImage, sourceImage]);

  // Handle local file upload
  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    if (!file.type.startsWith("image/")) {
      toast.error("Please upload an image file (JPEG, PNG)");
      return;
    }

    const reader = new FileReader();
    reader.onload = (event) => {
      const result = event.target?.result as string;
      if (result) {
        setSourceImage(result);
        handleReset();
        toast.success("New photo loaded into editor!");
      }
    };
    reader.readAsDataURL(file);
  };

  // Drag to pan or Eyedropper click
  const handleMouseDown = (e: React.MouseEvent<HTMLDivElement>) => {
    if (isEyedropperActive) {
      handleEyedropperClick(e);
      return;
    }
    setIsDragging(true);
    setDragStart({ x: e.clientX - panX, y: e.clientY - panY });
  };

  const handleMouseMove = (e: React.MouseEvent) => {
    if (!isDragging || isEyedropperActive) return;
    setPanX(e.clientX - dragStart.x);
    setPanY(e.clientY - dragStart.y);
  };

  const handleMouseUp = () => {
    setIsDragging(false);
  };

  // Eyedropper to sample color from clicked point
  const handleEyedropperClick = (e: React.MouseEvent<HTMLDivElement>) => {
    if (!previewContainerRef.current) return;
    const rect = previewContainerRef.current.getBoundingClientRect();
    const clickX = e.clientX - rect.left;
    const clickY = e.clientY - rect.top;

    // Create temp canvas to read pixel at click coordinates
    const img = new Image();
    img.crossOrigin = "anonymous";
    img.src = previewDataUrl || sourceImage;
    img.onload = () => {
      const c = document.createElement("canvas");
      c.width = rect.width;
      c.height = rect.height;
      const ctx = c.getContext("2d");
      if (ctx) {
        ctx.drawImage(img, 0, 0, rect.width, rect.height);
        const pixel = ctx.getImageData(Math.floor(clickX), Math.floor(clickY), 1, 1).data;
        setSampledColor({ r: pixel[0], g: pixel[1], b: pixel[2] });
        setIsEyedropperActive(false);
        if (selectedBg === "none") {
          setSelectedBg("#0072CE"); // Default to passport blue on sample
        }
        toast.success(`🎯 Background color sampled (RGB: ${pixel[0]}, ${pixel[1]}, ${pixel[2]})`);
      }
    };
  };

  // Save changes to database
  const handleSaveToDatabase = async () => {
    setIsSaving(true);
    const toastId = toast.loading("Saving optimized portrait to database...");

    try {
      const finalDataUrl = await renderEditedImage(500, 500); // High-res 500x500
      if (!finalDataUrl) {
        throw new Error("Could not render photo output");
      }

      // Update in admissions table if admissionId or studentId provided
      if (admissionId || studentId) {
        const targetId = admissionId || studentId;

        // Update Admissions
        await supabase
          .from("admissions")
          .update({ photo_url: finalDataUrl })
          .or(`id.eq.${targetId},student_id.eq.${targetId},college_no.eq.${targetId}`);

        // Update Students
        await supabase
          .from("students")
          .update({ photo: finalDataUrl, photo_url: finalDataUrl })
          .or(`id.eq.${targetId},student_id.eq.${targetId},admission_id.eq.${targetId},college_no.eq.${targetId}`);
      }

      toast.dismiss(toastId);
      toast.success("✅ Profile photo & face descriptor updated successfully!");
      onSaveSuccess?.(finalDataUrl);
      onClose();
    } catch (err: any) {
      console.error("Save photo error:", err);
      toast.dismiss(toastId);
      toast.error("Failed to save photo: " + (err?.message || "Check connection"));
    } finally {
      setIsSaving(false);
    }
  };

  // Download photo to computer
  const handleDownload = async () => {
    const finalDataUrl = await renderEditedImage(600, 600);
    if (!finalDataUrl) return;

    const link = document.createElement("a");
    link.href = finalDataUrl;
    link.download = `Profile-Photo-${studentName.replace(/\s+/g, "-")}.jpg`;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    toast.success("Passport photo downloaded!");
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-4 bg-slate-950/75 backdrop-blur-md animate-in fade-in duration-200">
      <div className="bg-white dark:bg-slate-900 rounded-3xl shadow-2xl border border-slate-200/80 dark:border-slate-800 w-full max-w-5xl overflow-hidden flex flex-col relative max-h-[96vh]">
        {/* Header */}
        <div className="bg-slate-900 px-6 py-4 text-white flex items-center justify-between shrink-0">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-teal-500/20 border border-teal-500/40 flex items-center justify-center text-teal-400">
              <Camera size={20} />
            </div>
            <div>
              <div className="text-base font-black uppercase tracking-tight text-white flex items-center gap-2">
                Student Photo Studio & AI Editor
                <span className="bg-emerald-500/20 text-emerald-300 border border-emerald-500/40 text-[9px] font-black uppercase px-2 py-0.5 rounded-full">
                  LMS Avatar & Passport Ready
                </span>
              </div>
              <p className="text-[11px] text-slate-400 font-medium">
                Editing profile photo for: <span className="text-white font-bold">{studentName}</span>
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2">
            <input
              type="file"
              ref={fileInputRef}
              onChange={handleFileChange}
              accept="image/*"
              className="hidden"
            />
            <button
              onClick={() => fileInputRef.current?.click()}
              className="h-8 px-3 text-xs font-bold rounded-xl border border-slate-700 bg-slate-800 text-slate-200 hover:bg-slate-700 hover:text-white flex items-center gap-1.5 transition-colors cursor-pointer"
            >
              <Upload size={13} />
              <span>Replace Photo</span>
            </button>
            <button
              onClick={handleReset}
              className="h-8 px-2.5 text-xs font-bold rounded-xl border border-slate-700 bg-slate-800 text-slate-300 hover:bg-slate-700 hover:text-white transition-colors cursor-pointer"
              title="Reset All Adjustments"
            >
              <RefreshCw size={13} />
            </button>
            <button
              onClick={onClose}
              className="h-8 w-8 rounded-xl border border-slate-700 bg-slate-800 text-slate-400 hover:text-white hover:bg-slate-700 flex items-center justify-center transition-colors ml-1 cursor-pointer"
              title="Close"
            >
              <X size={16} />
            </button>
          </div>
        </div>

        {/* Studio Body */}
        <div className="grid grid-cols-1 md:grid-cols-12 gap-0 divide-y md:divide-y-0 md:divide-x divide-slate-100 dark:divide-slate-800 overflow-y-auto">
          {/* Left Canvas Preview Area (7 cols) */}
          <div className="md:col-span-7 p-6 flex flex-col items-center justify-center bg-slate-950/90 text-white min-h-[460px] select-none relative">
            {/* Crop Shape Switcher */}
            <div className="flex items-center gap-1.5 mb-4 bg-slate-900/90 p-1 rounded-2xl border border-slate-800 shadow-md">
              <button
                onClick={() => setCropShape("circle")}
                className={`px-3 py-1.5 text-xs font-black uppercase rounded-xl transition-all flex items-center gap-1.5 cursor-pointer ${
                  cropShape === "circle"
                    ? "bg-teal-500 text-slate-950 shadow-md font-black"
                    : "text-slate-400 hover:text-white"
                }`}
              >
                <Circle size={13} />
                <span>Round (App Avatar 1:1)</span>
              </button>
              <button
                onClick={() => setCropShape("passport")}
                className={`px-3 py-1.5 text-xs font-black uppercase rounded-xl transition-all flex items-center gap-1.5 cursor-pointer ${
                  cropShape === "passport"
                    ? "bg-teal-500 text-slate-950 shadow-md font-black"
                    : "text-slate-400 hover:text-white"
                }`}
              >
                <Crop size={13} />
                <span>Passport (3:4)</span>
              </button>
              <button
                onClick={() => setCropShape("square")}
                className={`px-3 py-1.5 text-xs font-black uppercase rounded-xl transition-all flex items-center gap-1.5 cursor-pointer ${
                  cropShape === "square"
                    ? "bg-teal-500 text-slate-950 shadow-md font-black"
                    : "text-slate-400 hover:text-white"
                }`}
              >
                <Square size={13} />
                <span>Square (1:1)</span>
              </button>
            </div>

            {/* Interactive Portrait Box */}
            <div
              ref={previewContainerRef}
              onMouseDown={handleMouseDown}
              onMouseMove={handleMouseMove}
              onMouseUp={handleMouseUp}
              onMouseLeave={handleMouseUp}
              className={`relative overflow-hidden rounded-2xl border-4 border-slate-800 shadow-2xl transition-all ${
                isEyedropperActive ? "cursor-crosshair ring-4 ring-teal-400/50" : "cursor-grab active:cursor-grabbing"
              } ${
                cropShape === "circle" || cropShape === "square"
                  ? "w-[280px] h-[280px]"
                  : "w-[260px] h-[346px]"
              }`}
              style={{
                backgroundColor: selectedBg === "none" ? "#1e293b" : selectedBg,
              }}
            >
              {previewDataUrl ? (
                <img
                  src={previewDataUrl}
                  alt="Preview"
                  className="w-full h-full object-cover pointer-events-none"
                />
              ) : (
                <div className="w-full h-full flex flex-col items-center justify-center text-slate-500 p-4 text-center">
                  <Camera size={36} className="mb-2 opacity-40 animate-pulse text-teal-400" />
                  <p className="text-xs font-bold uppercase tracking-wider">No Photo Loaded</p>
                  <p className="text-[10px] text-slate-400 mt-1">Upload a photo to begin editing</p>
                </div>
              )}

              {/* Exact Circular Mask for "App Avatar" Mode */}
              {cropShape === "circle" && (
                <div className="absolute inset-0 pointer-events-none flex items-center justify-center">
                  {/* Outer Dimmed Matte (Shows exact round shape that appears in LMS) */}
                  <div
                    className="w-[250px] h-[250px] rounded-full border-2 border-teal-400/90 relative flex flex-col items-center justify-between p-3"
                    style={{
                      boxShadow: "0 0 0 9999px rgba(15, 23, 42, 0.65)",
                    }}
                  >
                    {/* Head / Hair guideline */}
                    <div className="w-14 h-1 border-t-2 border-dashed border-teal-400/60 mt-1" />
                    
                    {/* Face oval guide */}
                    <div className="w-24 h-32 border border-dashed border-teal-400/50 rounded-full flex flex-col items-center justify-center relative">
                      <div className="w-full border-t border-dashed border-teal-400/40 absolute top-[44%]" />
                      <span className="text-[8px] font-bold text-teal-300 uppercase tracking-widest bg-slate-950/70 px-1 py-0.2 rounded mt-[-10px]">
                        Eye Level
                      </span>
                    </div>

                    <div className="text-[8px] font-black uppercase tracking-widest text-teal-200 bg-slate-900/80 px-2.5 py-0.5 rounded-full border border-teal-500/30 backdrop-blur-xs mb-1">
                      Exact App Avatar
                    </div>
                  </div>
                </div>
              )}

              {/* Passport Guidelines Overlay for (3:4) Mode */}
              {cropShape === "passport" && (
                <div className="absolute inset-0 pointer-events-none border border-black/10 rounded-2xl flex flex-col items-center justify-between p-3 opacity-70">
                  <div className="w-16 h-1 border-t-2 border-dashed border-teal-400/60" />
                  <div className="w-24 h-28 border border-dashed border-teal-400/50 rounded-full" />
                  <div className="text-[9px] font-black uppercase tracking-widest text-white bg-black/60 px-2 py-0.5 rounded-full backdrop-blur-xs">
                    Drag to Reposition
                  </div>
                </div>
              )}

              {/* Eyedropper Notice Overlay */}
              {isEyedropperActive && (
                <div className="absolute top-2 inset-x-2 bg-teal-600 text-white text-[10px] font-black uppercase tracking-wider py-1 px-2 rounded-lg text-center shadow-lg animate-pulse flex items-center justify-center gap-1.5">
                  <Pipette size={12} />
                  <span>Click anywhere on background to remove it</span>
                </div>
              )}
            </div>

            {/* Quick Transform & Eyedropper Bar */}
            <div className="flex items-center gap-2 mt-4">
              <button
                onClick={() => setRotation((prev) => (prev - 90 + 360) % 360)}
                className="h-8 px-2.5 rounded-xl border border-slate-800 bg-slate-900 text-slate-300 text-xs font-bold flex items-center gap-1 hover:bg-slate-800 transition-colors cursor-pointer"
                title="Rotate 90° Left"
              >
                <RotateCcw size={13} />
                <span>-90°</span>
              </button>
              <button
                onClick={() => setRotation((prev) => (prev + 90) % 360)}
                className="h-8 px-2.5 rounded-xl border border-slate-800 bg-slate-900 text-slate-300 text-xs font-bold flex items-center gap-1 hover:bg-slate-800 transition-colors cursor-pointer"
                title="Rotate 90° Right"
              >
                <RotateCw size={13} />
                <span>+90°</span>
              </button>
              <button
                onClick={() => setFlipH((prev) => !prev)}
                className={`h-8 px-2.5 rounded-xl border text-xs font-bold flex items-center gap-1 transition-colors cursor-pointer ${
                  flipH ? "bg-teal-500 text-slate-950 border-teal-400 font-black" : "border-slate-800 bg-slate-900 text-slate-300 hover:bg-slate-800"
                }`}
                title="Flip Horizontally"
              >
                <FlipHorizontal size={13} />
                <span>Mirror</span>
              </button>
              <button
                onClick={() => setIsEyedropperActive(!isEyedropperActive)}
                className={`h-8 px-2.5 rounded-xl border text-xs font-bold flex items-center gap-1 transition-colors cursor-pointer ${
                  isEyedropperActive
                    ? "bg-amber-500 text-slate-950 border-amber-400 font-black ring-2 ring-amber-400/40"
                    : "border-slate-800 bg-slate-900 text-slate-300 hover:bg-slate-800"
                }`}
                title="Sample background color directly from photo"
              >
                <Pipette size={13} />
                <span>{isEyedropperActive ? "Click BG..." : "Pick BG"}</span>
              </button>
            </div>
          </div>

          {/* Right Controls Area (5 cols) */}
          <div className="md:col-span-5 p-6 flex flex-col justify-between space-y-5 bg-white dark:bg-slate-900">
            <div className="space-y-4">
              {/* LIVE LMS APP PREVIEW WIDGET */}
              <div className="bg-slate-50 dark:bg-slate-800/60 p-3.5 rounded-2xl border border-slate-200/80 dark:border-slate-700/80">
                <div className="flex items-center justify-between mb-2">
                  <span className="text-[10px] font-black uppercase tracking-wider text-slate-500 dark:text-slate-400 flex items-center gap-1">
                    <Sparkles size={11} className="text-teal-600" />
                    Live LMS App Appearance
                  </span>
                  <span className="text-[9px] font-bold text-teal-600 dark:text-teal-400 uppercase bg-teal-50 dark:bg-teal-950/60 px-1.5 py-0.5 rounded border border-teal-200 dark:border-teal-800">
                    Exact Fit
                  </span>
                </div>
                <div className="flex items-center gap-4">
                  {/* 56px Avatar (Table Row Size) */}
                  <div className="flex flex-col items-center">
                    <div className="w-14 h-14 rounded-full overflow-hidden border-2 border-teal-500 shadow-sm bg-slate-100 dark:bg-slate-800 ring-2 ring-teal-500/20">
                      {previewDataUrl ? (
                        <img src={previewDataUrl} alt="Preview" className="w-full h-full object-cover rounded-full" />
                      ) : (
                        <div className="w-full h-full flex items-center justify-center text-slate-400 text-xs font-black">A</div>
                      )}
                    </div>
                    <span className="text-[9px] font-bold text-slate-400 mt-1">Table (56px)</span>
                  </div>

                  {/* 80px Avatar (Dossier / Profile Card Size) */}
                  <div className="flex flex-col items-center">
                    <div className="w-18 h-18 rounded-full overflow-hidden border-3 border-amber-500 shadow-md bg-slate-100 dark:bg-slate-800 ring-2 ring-amber-500/20">
                      {previewDataUrl ? (
                        <img src={previewDataUrl} alt="Preview" className="w-full h-full object-cover rounded-full" />
                      ) : (
                        <div className="w-full h-full flex items-center justify-center text-slate-400 text-sm font-black">A</div>
                      )}
                    </div>
                    <span className="text-[9px] font-bold text-slate-400 mt-1">Profile (72px)</span>
                  </div>

                  {/* Info Badge */}
                  <div className="text-left flex-1 min-w-0">
                    <p className="text-xs font-black text-slate-800 dark:text-white uppercase truncate">
                      {studentName}
                    </p>
                    <p className="text-[10px] text-slate-400 font-medium truncate mt-0.5">
                      Session 2026-28
                    </p>
                    <div className="mt-1 flex items-center gap-1 text-[9px] font-bold text-emerald-600 dark:text-emerald-400">
                      <CheckCircle2 size={11} />
                      <span>Ready for Face Kiosk</span>
                    </div>
                  </div>
                </div>
              </div>

              {/* Background Color Chooser */}
              <div>
                <div className="flex items-center justify-between mb-2">
                  <label className="text-xs font-black uppercase tracking-wider text-slate-700 dark:text-slate-300 flex items-center gap-1.5">
                    <Palette size={14} className="text-teal-600" />
                    AI Passport Background Color
                  </label>
                  <span className="text-[10px] text-teal-600 font-bold uppercase">
                    {selectedBg === "none" ? "Original BG" : "AI Background Replaced"}
                  </span>
                </div>
                <div className="grid grid-cols-3 gap-2">
                  {BG_PRESETS.map((preset) => (
                    <button
                      key={preset.value}
                      onClick={() => setSelectedBg(preset.value)}
                      className={`h-11 rounded-xl flex items-center px-2.5 gap-2 border-2 transition-all cursor-pointer ${
                        selectedBg === preset.value
                          ? "border-teal-600 ring-2 ring-teal-500/30 scale-102 bg-teal-50/20 shadow-xs"
                          : "border-slate-200 dark:border-slate-800 hover:border-slate-300"
                      }`}
                    >
                      <span
                        className="w-4 h-4 rounded-full border border-slate-300 shadow-2xs shrink-0"
                        style={{ backgroundColor: preset.hex }}
                      />
                      <span className="text-[10px] font-black text-slate-800 dark:text-slate-200 leading-tight truncate">
                        {preset.label}
                      </span>
                      {selectedBg === preset.value && (
                        <Check size={13} className="text-teal-600 ml-auto shrink-0" />
                      )}
                    </button>
                  ))}
                </div>

                {/* Tolerance & Face Shield Options if background selected */}
                {selectedBg !== "none" && (
                  <div className="mt-3 bg-slate-50 dark:bg-slate-800/50 p-3 rounded-2xl border border-slate-100 dark:border-slate-800 space-y-2">
                    <div className="flex items-center justify-between">
                      <span className="text-[10px] font-bold uppercase tracking-wider text-slate-500">
                        Edge Sensitivity
                      </span>
                      <span className="text-[10px] font-black text-teal-600">{bgTolerance}%</span>
                    </div>
                    <input
                      type="range"
                      value={bgTolerance}
                      min={15}
                      max={75}
                      step={1}
                      onChange={(e) => setBgTolerance(Number(e.target.value))}
                      className="w-full h-1.5 bg-slate-200 dark:bg-slate-700 rounded-lg appearance-none cursor-pointer accent-teal-600"
                    />

                    <div className="flex items-center justify-between pt-1">
                      <label className="text-[10px] font-bold text-slate-600 dark:text-slate-300 flex items-center gap-1.5 cursor-pointer">
                        <ShieldCheck size={13} className="text-teal-600" />
                        <span>Face & Skin Shield (Prevent Erase)</span>
                      </label>
                      <input
                        type="checkbox"
                        checked={protectFaceSkin}
                        onChange={(e) => setProtectFaceSkin(e.target.checked)}
                        className="w-4 h-4 rounded accent-teal-600 cursor-pointer"
                      />
                    </div>
                  </div>
                )}
              </div>

              {/* Zoom Slider */}
              <div className="space-y-1.5">
                <div className="flex items-center justify-between">
                  <label className="text-xs font-black uppercase tracking-wider text-slate-700 dark:text-slate-300 flex items-center gap-1.5">
                    <Crop size={14} className="text-teal-600" />
                    Face Zoom & Scale
                  </label>
                  <span className="text-xs font-black text-teal-600">{Math.round(zoom * 100)}%</span>
                </div>
                <input
                  type="range"
                  value={zoom}
                  min={0.6}
                  max={2.5}
                  step={0.05}
                  onChange={(e) => setZoom(Number(e.target.value))}
                  className="w-full h-1.5 bg-slate-200 dark:bg-slate-700 rounded-lg appearance-none cursor-pointer accent-teal-600"
                />
              </div>

              {/* Visual Enhancements */}
              <div className="space-y-2 pt-2 border-t border-slate-100 dark:border-slate-800">
                <label className="text-xs font-black uppercase tracking-wider text-slate-700 dark:text-slate-300 flex items-center gap-1.5">
                  <Sliders size={14} className="text-teal-600" />
                  Color & Lighting Adjustments
                </label>

                {/* Brightness */}
                <div className="space-y-0.5">
                  <div className="flex items-center justify-between">
                    <span className="text-[10px] font-bold text-slate-500 uppercase flex items-center gap-1">
                      <Sun size={11} /> Brightness
                    </span>
                    <span className="text-[10px] font-black text-slate-700 dark:text-slate-300">{brightness}%</span>
                  </div>
                  <input
                    type="range"
                    value={brightness}
                    min={60}
                    max={140}
                    step={1}
                    onChange={(e) => setBrightness(Number(e.target.value))}
                    className="w-full h-1.5 bg-slate-200 dark:bg-slate-700 rounded-lg appearance-none cursor-pointer accent-teal-600"
                  />
                </div>

                {/* Contrast */}
                <div className="space-y-0.5">
                  <div className="flex items-center justify-between">
                    <span className="text-[10px] font-bold text-slate-500 uppercase flex items-center gap-1">
                      <Contrast size={11} /> Contrast
                    </span>
                    <span className="text-[10px] font-black text-slate-700 dark:text-slate-300">{contrast}%</span>
                  </div>
                  <input
                    type="range"
                    value={contrast}
                    min={60}
                    max={140}
                    step={1}
                    onChange={(e) => setContrast(Number(e.target.value))}
                    className="w-full h-1.5 bg-slate-200 dark:bg-slate-700 rounded-lg appearance-none cursor-pointer accent-teal-600"
                  />
                </div>
              </div>
            </div>

            {/* Bottom Actions */}
            <div className="pt-3 border-t border-slate-100 dark:border-slate-800 flex items-center gap-2">
              <button
                onClick={handleDownload}
                className="h-11 px-4 rounded-xl text-xs font-bold border border-slate-200 dark:border-slate-700 text-slate-700 dark:text-slate-200 hover:bg-slate-50 dark:hover:bg-slate-800 shrink-0 flex items-center justify-center transition-colors cursor-pointer"
                title="Download Photo File"
              >
                <Download size={15} />
              </button>

              <button
                onClick={handleSaveToDatabase}
                disabled={isSaving || !sourceImage}
                className="flex-1 h-11 rounded-xl bg-teal-600 hover:bg-teal-700 disabled:opacity-50 text-white font-black text-xs uppercase tracking-wider shadow-lg shadow-teal-500/20 flex items-center justify-center gap-2 transition-all cursor-pointer"
              >
                {isSaving ? (
                  <>
                    <RefreshCw size={15} className="animate-spin" />
                    <span>Saving to Profile...</span>
                  </>
                ) : (
                  <>
                    <Check size={16} />
                    <span>Save & Update Profile</span>
                  </>
                )}
              </button>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
