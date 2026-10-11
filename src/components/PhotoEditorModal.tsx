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
  X
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
  { name: "Original", value: "none", hex: "transparent", border: "border-slate-300" },
  { name: "Passport Blue", value: "#0072CE", hex: "#0072CE", border: "border-blue-600" },
  { name: "Studio White", value: "#FFFFFF", hex: "#FFFFFF", border: "border-slate-400" },
  { name: "Soft Sky", value: "#93C5FD", hex: "#93C5FD", border: "border-sky-300" },
  { name: "Neutral Gray", value: "#E2E8F0", hex: "#E2E8F0", border: "border-slate-300" },
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
  const [aspectRatio, setAspectRatio] = useState<"passport" | "square" | "free">("passport"); // 3:4 or 1:1 or free

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
  const [customBgHex] = useState<string>("#0072CE");
  const [bgTolerance, setBgTolerance] = useState<number>(38); // 10 to 80

  // Pan interaction
  const [isDragging, setIsDragging] = useState<boolean>(false);
  const [dragStart, setDragStart] = useState<{ x: number; y: number }>({ x: 0, y: 0 });

  // State
  const [, setIsProcessing] = useState<boolean>(false);
  const [isSaving, setIsSaving] = useState<boolean>(false);
  const [previewDataUrl, setPreviewDataUrl] = useState<string>("");

  const fileInputRef = useRef<HTMLInputElement | null>(null);

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
    setBgTolerance(38);
  };

  // Render canvas with all edits & background replacement
  const renderEditedImage = useCallback(
    async (targetWidth = 480, targetHeight = 640): Promise<string> => {
      if (!sourceImage) return "";

      return new Promise((resolve) => {
        const img = new Image();
        img.crossOrigin = "anonymous";
        img.src = sourceImage;

        img.onload = () => {
          let outputW = targetWidth;
          let outputH = targetHeight;

          if (aspectRatio === "square") {
            outputW = 500;
            outputH = 500;
          } else if (aspectRatio === "passport") {
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
          const activeBgColor = selectedBg === "custom" ? customBgHex : selectedBg;
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

          // 3. Background replacement algorithm (Chroma Key & Edge color distance)
          if (activeBgColor !== "none") {
            const imgData = tempCtx.getImageData(0, 0, outputW, outputH);
            const data = imgData.data;

            // Sample corners of the image to detect ambient background color
            const samplePoints = [
              [4, 4],
              [outputW - 5, 4],
              [4, outputH - 5],
              [outputW - 5, outputH - 5],
              [Math.floor(outputW / 2), 4],
              [4, Math.floor(outputH / 2)],
              [outputW - 5, Math.floor(outputH / 2)],
            ];

            let sampleR = 0,
              sampleG = 0,
              sampleB = 0;
            let validSamples = 0;

            for (const [sx, sy] of samplePoints) {
              const idx = (sy * outputW + sx) * 4;
              sampleR += data[idx];
              sampleG += data[idx + 1];
              sampleB += data[idx + 2];
              validSamples++;
            }

            sampleR /= validSamples;
            sampleG /= validSamples;
            sampleB /= validSamples;

            // Parse destination replacement color
            const dummyEl = document.createElement("div");
            dummyEl.style.color = activeBgColor;
            document.body.appendChild(dummyEl);
            const computed = window.getComputedStyle(dummyEl).color;
            document.body.removeChild(dummyEl);
            const rgbMatch = computed.match(/\d+/g) || ["0", "114", "206"];
            const destR = parseInt(rgbMatch[0], 10);
            const destG = parseInt(rgbMatch[1], 10);
            const destB = parseInt(rgbMatch[2], 10);

            const tolSq = bgTolerance * bgTolerance * 3;
            const featherSq = (bgTolerance + 15) * (bgTolerance + 15) * 3;

            for (let i = 0; i < data.length; i += 4) {
              const r = data[i];
              const g = data[i + 1];
              const b = data[i + 2];

              const dr = r - sampleR;
              const dg = g - sampleG;
              const db = b - sampleB;
              const distSq = dr * dr + dg * dg + db * db;

              if (distSq < tolSq) {
                // Fully background
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
      aspectRatio,
      zoom,
      rotation,
      flipH,
      panX,
      panY,
      brightness,
      contrast,
      saturation,
      selectedBg,
      customBgHex,
      bgTolerance,
    ]
  );

  // Update preview when parameters change
  useEffect(() => {
    let active = true;
    const timer = setTimeout(async () => {
      if (!sourceImage) return;
      setIsProcessing(true);
      const url = await renderEditedImage(360, 480);
      if (active) {
        setPreviewDataUrl(url);
        setIsProcessing(false);
      }
    }, 80);

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

  // Drag to pan
  const handleMouseDown = (e: React.MouseEvent) => {
    setIsDragging(true);
    setDragStart({ x: e.clientX - panX, y: e.clientY - panY });
  };

  const handleMouseMove = (e: React.MouseEvent) => {
    if (!isDragging) return;
    setPanX(e.clientX - dragStart.x);
    setPanY(e.clientY - dragStart.y);
  };

  const handleMouseUp = () => {
    setIsDragging(false);
  };

  // Save changes to database
  const handleSaveToDatabase = async () => {
    setIsSaving(true);
    const toastId = toast.loading("Saving optimized passport photo to database...");

    try {
      const finalDataUrl = await renderEditedImage(450, 600); // High-res 3:4 passport
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
      toast.success("✅ Profile photo & biometric descriptor successfully updated!");
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
    const finalDataUrl = await renderEditedImage(600, 800);
    if (!finalDataUrl) return;

    const link = document.createElement("a");
    link.href = finalDataUrl;
    link.download = `Passport-Photo-${studentName.replace(/\s+/g, "-")}.jpg`;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    toast.success("Passport photo downloaded!");
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-4 bg-slate-950/70 backdrop-blur-sm animate-in fade-in duration-200">
      <div className="bg-white dark:bg-slate-900 rounded-3xl shadow-2xl border border-slate-200/80 dark:border-slate-800 w-full max-w-4xl overflow-hidden flex flex-col relative max-h-[94vh]">
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
                  Passport Ready
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
              className="h-8 px-3 text-xs font-bold rounded-xl border border-slate-700 bg-slate-800 text-slate-200 hover:bg-slate-700 hover:text-white flex items-center gap-1.5 transition-colors"
            >
              <Upload size={13} />
              <span>Replace Photo</span>
            </button>
            <button
              onClick={handleReset}
              className="h-8 px-2.5 text-xs font-bold rounded-xl border border-slate-700 bg-slate-800 text-slate-300 hover:bg-slate-700 hover:text-white transition-colors"
              title="Reset All Adjustments"
            >
              <RefreshCw size={13} />
            </button>
            <button
              onClick={onClose}
              className="h-8 w-8 rounded-xl border border-slate-700 bg-slate-800 text-slate-400 hover:text-white hover:bg-slate-700 flex items-center justify-center transition-colors ml-1"
              title="Close"
            >
              <X size={16} />
            </button>
          </div>
        </div>

        {/* Studio Body */}
        <div className="grid grid-cols-1 md:grid-cols-12 gap-0 divide-y md:divide-y-0 md:divide-x divide-slate-100 dark:divide-slate-800 overflow-y-auto">
          {/* Left Canvas Preview Area (7 cols) */}
          <div className="md:col-span-7 p-6 flex flex-col items-center justify-center bg-slate-50 dark:bg-slate-950/50 min-h-[420px] select-none">
            {/* Aspect Ratio Switcher */}
            <div className="flex items-center gap-2 mb-4 bg-white dark:bg-slate-900 p-1 rounded-2xl border border-slate-200 dark:border-slate-800 shadow-xs">
              <button
                onClick={() => setAspectRatio("passport")}
                className={`px-3 py-1.5 text-xs font-black uppercase rounded-xl transition-all ${
                  aspectRatio === "passport"
                    ? "bg-teal-600 text-white shadow-xs"
                    : "text-slate-500 hover:text-slate-800 dark:hover:text-slate-200"
                }`}
              >
                Passport (3:4)
              </button>
              <button
                onClick={() => setAspectRatio("square")}
                className={`px-3 py-1.5 text-xs font-black uppercase rounded-xl transition-all ${
                  aspectRatio === "square"
                    ? "bg-teal-600 text-white shadow-xs"
                    : "text-slate-500 hover:text-slate-800 dark:hover:text-slate-200"
                }`}
              >
                Square (1:1)
              </button>
              <button
                onClick={() => setAspectRatio("free")}
                className={`px-3 py-1.5 text-xs font-black uppercase rounded-xl transition-all ${
                  aspectRatio === "free"
                    ? "bg-teal-600 text-white shadow-xs"
                    : "text-slate-500 hover:text-slate-800 dark:hover:text-slate-200"
                }`}
              >
                Full / Free
              </button>
            </div>

            {/* Interactive Portrait Box */}
            <div
              onMouseDown={handleMouseDown}
              onMouseMove={handleMouseMove}
              onMouseUp={handleMouseUp}
              onMouseLeave={handleMouseUp}
              className={`relative overflow-hidden rounded-2xl border-4 border-white dark:border-slate-800 shadow-2xl cursor-grab active:cursor-grabbing transition-all ${
                aspectRatio === "passport"
                  ? "w-[240px] h-[320px]"
                  : aspectRatio === "square"
                  ? "w-[260px] h-[260px]"
                  : "w-[260px] h-[340px]"
              }`}
              style={{
                backgroundColor: selectedBg === "none" ? "#f1f5f9" : selectedBg === "custom" ? customBgHex : selectedBg,
              }}
            >
              {previewDataUrl ? (
                <img
                  src={previewDataUrl}
                  alt="Preview"
                  className="w-full h-full object-cover pointer-events-none"
                />
              ) : (
                <div className="w-full h-full flex flex-col items-center justify-center text-slate-400 p-4 text-center">
                  <Camera size={36} className="mb-2 opacity-40 animate-pulse" />
                  <p className="text-xs font-bold uppercase tracking-wider">No Photo Loaded</p>
                  <p className="text-[10px] text-slate-400 mt-1">Upload a photo to begin editing</p>
                </div>
              )}

              {/* Passport Guidelines Overlay */}
              <div className="absolute inset-0 pointer-events-none border border-black/10 rounded-2xl flex flex-col items-center justify-between p-3 opacity-60 hover:opacity-100 transition-opacity">
                <div className="w-16 h-1 border-t-2 border-dashed border-teal-500/50" />
                <div className="w-24 h-28 border border-dashed border-teal-500/40 rounded-full" />
                <div className="text-[9px] font-black uppercase tracking-widest text-slate-400 bg-black/40 text-white px-2 py-0.5 rounded-full backdrop-blur-xs">
                  Drag to Reposition
                </div>
              </div>
            </div>

            {/* Quick Transform Bar */}
            <div className="flex items-center gap-2 mt-4">
              <button
                onClick={() => setRotation((prev) => (prev - 90 + 360) % 360)}
                className="h-8 px-2.5 rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-700 dark:text-slate-200 text-xs font-bold flex items-center gap-1 hover:bg-slate-50 transition-colors"
                title="Rotate 90° Left"
              >
                <RotateCcw size={13} />
                <span>-90°</span>
              </button>
              <button
                onClick={() => setRotation((prev) => (prev + 90) % 360)}
                className="h-8 px-2.5 rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-700 dark:text-slate-200 text-xs font-bold flex items-center gap-1 hover:bg-slate-50 transition-colors"
                title="Rotate 90° Right"
              >
                <RotateCw size={13} />
                <span>+90°</span>
              </button>
              <button
                onClick={() => setFlipH((prev) => !prev)}
                className={`h-8 px-2.5 rounded-xl border border-slate-200 dark:border-slate-700 text-xs font-bold flex items-center gap-1 transition-colors ${
                  flipH ? "bg-teal-600 text-white border-transparent" : "bg-white dark:bg-slate-800 text-slate-700 dark:text-slate-200 hover:bg-slate-50"
                }`}
                title="Flip Horizontally"
              >
                <FlipHorizontal size={13} />
                <span>Mirror</span>
              </button>
            </div>
          </div>

          {/* Right Controls Area (5 cols) */}
          <div className="md:col-span-5 p-6 flex flex-col justify-between space-y-6">
            <div className="space-y-5">
              {/* Background Color Chooser */}
              <div>
                <div className="flex items-center justify-between mb-2">
                  <label className="text-xs font-black uppercase tracking-wider text-slate-700 dark:text-slate-300 flex items-center gap-1.5">
                    <Palette size={14} className="text-teal-600" />
                    Passport Background Color
                  </label>
                  <span className="text-[10px] text-slate-400 font-bold uppercase">
                    {selectedBg === "none" ? "Original" : "Chroma AI"}
                  </span>
                </div>
                <div className="grid grid-cols-5 gap-2">
                  {BG_PRESETS.map((preset) => (
                    <button
                      key={preset.value}
                      onClick={() => setSelectedBg(preset.value)}
                      className={`h-11 rounded-xl flex flex-col items-center justify-center border-2 transition-all relative ${
                        selectedBg === preset.value
                          ? "border-teal-600 ring-2 ring-teal-500/30 scale-105"
                          : "border-slate-200 hover:border-slate-300"
                      }`}
                      style={{ backgroundColor: preset.hex }}
                    >
                      {selectedBg === preset.value && (
                        <Check
                          size={14}
                          className={preset.value === "#FFFFFF" || preset.value === "#E2E8F0" ? "text-slate-800" : "text-white"}
                        />
                      )}
                      <span
                        className={`text-[9px] font-black tracking-tighter mt-0.5 leading-none ${
                          preset.value === "#FFFFFF" || preset.value === "#E2E8F0" ? "text-slate-700" : preset.value === "none" ? "text-slate-600" : "text-white"
                        }`}
                      >
                        {preset.name.split(" ")[0]}
                      </span>
                    </button>
                  ))}
                </div>

                {/* Tolerance slider if background selected */}
                {selectedBg !== "none" && (
                  <div className="mt-3 bg-slate-50 dark:bg-slate-800/50 p-3 rounded-2xl border border-slate-100 dark:border-slate-800 space-y-1.5">
                    <div className="flex items-center justify-between">
                      <span className="text-[10px] font-bold uppercase tracking-wider text-slate-500">
                        Edge Blend Sensitivity
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
                  </div>
                )}
              </div>

              {/* Zoom Slider */}
              <div className="space-y-2">
                <div className="flex items-center justify-between">
                  <label className="text-xs font-black uppercase tracking-wider text-slate-700 dark:text-slate-300 flex items-center gap-1.5">
                    <Crop size={14} className="text-teal-600" />
                    Crop Scale & Zoom
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
              <div className="space-y-3.5 pt-2 border-t border-slate-100 dark:border-slate-800">
                <label className="text-xs font-black uppercase tracking-wider text-slate-700 dark:text-slate-300 flex items-center gap-1.5">
                  <Sliders size={14} className="text-teal-600" />
                  Color & Lighting Adjustments
                </label>

                {/* Brightness */}
                <div className="space-y-1">
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
                <div className="space-y-1">
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
            <div className="pt-4 border-t border-slate-100 dark:border-slate-800 flex items-center gap-2">
              <button
                onClick={handleDownload}
                className="h-11 px-4 rounded-xl text-xs font-bold border border-slate-200 dark:border-slate-700 text-slate-700 dark:text-slate-200 hover:bg-slate-50 dark:hover:bg-slate-800 shrink-0 flex items-center justify-center transition-colors"
                title="Download Passport Photo File"
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
