import React, { useState } from 'react';
import { X, Upload, CheckCircle2 } from 'lucide-react';
import { toast } from 'sonner';

interface PhotoEditorModalProps {
  isOpen: boolean;
  onClose: () => void;
  initialPhotoUrl?: string;
  studentName?: string;
  studentId?: string;
  admissionId?: string;
  onSaveSuccess: (newUrl: string) => void;
}

export default function PhotoEditorModal({
  isOpen,
  onClose,
  initialPhotoUrl,
  studentName,
  onSaveSuccess,
}: PhotoEditorModalProps) {
  const [preview, setPreview] = useState<string>(initialPhotoUrl || '');

  if (!isOpen) return null;

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = () => {
      if (typeof reader.result === 'string') {
        setPreview(reader.result);
      }
    };
    reader.readAsDataURL(file);
  };

  const handleSave = () => {
    if (!preview) {
      toast.error('Please select a photo first');
      return;
    }
    onSaveSuccess(preview);
    toast.success(`Updated photo for ${studentName || 'Student'}`);
    onClose();
  };

  return (
    <div className="fixed inset-0 z-50 bg-black/60 backdrop-blur-sm flex items-center justify-center p-4">
      <div className="bg-white rounded-3xl shadow-2xl border border-slate-200 max-w-md w-full overflow-hidden">
        <div className="p-5 bg-gradient-to-r from-[#064e43] to-[#085a4e] text-white flex items-center justify-between">
          <h3 className="text-sm font-black uppercase tracking-wider">Student Passport Photo Studio</h3>
          <button onClick={onClose} className="p-1.5 rounded-xl bg-white/10 hover:bg-white/20 text-white cursor-pointer">
            <X size={16} />
          </button>
        </div>

        <div className="p-6 text-center space-y-4">
          <p className="text-xs font-bold text-slate-700">{studentName || 'Student Profile Photo'}</p>

          <div className="w-36 h-36 rounded-2xl bg-slate-100 border border-slate-200 mx-auto overflow-hidden flex items-center justify-center">
            {preview ? (
              <img src={preview} alt="Preview" className="w-full h-full object-cover" />
            ) : (
              <span className="text-xs text-slate-400">No Photo</span>
            )}
          </div>

          <label className="inline-flex items-center gap-2 px-4 py-2.5 rounded-xl bg-slate-100 hover:bg-slate-200 text-xs font-bold text-slate-700 cursor-pointer">
            <Upload size={14} />
            <span>Choose Image File</span>
            <input type="file" accept="image/*" onChange={handleFileChange} className="hidden" />
          </label>

          <button
            onClick={handleSave}
            className="w-full py-3 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-black uppercase tracking-wider flex items-center justify-center gap-1.5 cursor-pointer"
          >
            <CheckCircle2 size={15} />
            <span>Save Profile Photo</span>
          </button>
        </div>
      </div>
    </div>
  );
}
