
import * as React from 'react';
import { useState } from 'react';
import { 
  Upload, 
  Save, 
  Globe, 
  Mail, 
  Phone, 
  MapPin, 
  User, 
  Palette, 
  Coins,
  Building2,
  Image as ImageIcon,
  Layout,
  Type,
  Box,
  Zap,
  AppWindow,
  Smartphone,
  MousePointer2,
  Monitor,
  Activity,
  Layers,
  Link2,
  X,
  FileText,
  Plus,
} from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Checkbox } from '@/components/ui/checkbox';
import { Textarea } from '@/components/ui/textarea';
import { 
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { toast } from 'sonner';
import { cn } from '@/lib/utils';
import { AppSettings } from '../types';
import { INITIAL_SETTINGS } from '../constants';
import { compressImage } from '../lib/imageUtils';

export default function SettingsView({ data }: { data: any }) {
  const { settings, updateSettings } = data;
  const [formData, setFormData] = useState<AppSettings>(settings || INITIAL_SETTINGS);
  const [isSaving, setIsSaving] = useState(false);
  const [newSection, setNewSection] = useState({ program: 'Inter', class: '2025-2027', name: '', gender: 'Male' });

  // Sync with Firebase settings when they load or change
  React.useEffect(() => {
    if (settings) {
      const fixedSettings = { ...settings };
      // Proactively fix bad default emerald colors from previous bug
      if (fixedSettings.themeColor === '#10b981') fixedSettings.themeColor = '#085a4e';
      if (fixedSettings.sidebarColor === '#0c2d2d') fixedSettings.sidebarColor = '#085a4e';
      setFormData(prev => ({ ...prev, ...fixedSettings }));
    }
  }, [settings]);

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const { name, value } = e.target;
    setFormData(prev => ({ ...prev, [name]: value }));
  };

  const handleSelectChange = (name: string, value: string) => {
    setFormData(prev => ({ ...prev, [name]: value }));
  };

  const handleCheckboxChange = (name: string, checked: boolean) => {
    setFormData(prev => ({ ...prev, [name]: checked }));
  };

  const toggleModule = (moduleId: string) => {
    setFormData(prev => {
      const enabled = prev.enabledModules || [];
      const newEnabled = enabled.includes(moduleId)
        ? enabled.filter(m => m !== moduleId)
        : [...enabled, moduleId];
      return { ...prev, enabledModules: newEnabled };
    });
  };

  const handleLogoUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      const toastId = toast.loading("Processing logo...");
      try {
        const compressedBase64 = await compressImage(file);
        setFormData(prev => ({ ...prev, logo: compressedBase64 }));
        toast.success("Logo uploaded successfully!", { id: toastId });
      } catch (err) {
        console.error("Logo processing failed:", err);
        toast.error("Failed to process logo.", { id: toastId });
      }
    }
  };

  const handleAddSection = () => {
    if (!newSection.name) {
      toast.error("Please enter a section name");
      return;
    }
    setFormData(prev => ({
      ...prev,
      predefinedSections: [
        ...(prev.predefinedSections || []),
        { id: crypto.randomUUID(), ...newSection }
      ]
    }));
    setNewSection(prev => ({ ...prev, name: '' }));
  };

  const handleUpdateNewSection = (field: string, value: string) => {
    setNewSection(prev => ({ ...prev, [field]: value }));
  };

  const handleUpdateSection = (id: string, field: string, value: string) => {
    setFormData(prev => ({
      ...prev,
      predefinedSections: (prev.predefinedSections || []).map(sec => 
        sec.id === id ? { ...sec, [field]: value } : sec
      )
    }));
  };

  const handleRemoveSection = (id: string) => {
    setFormData(prev => ({
      ...prev,
      predefinedSections: (prev.predefinedSections || []).filter(sec => sec.id !== id)
    }));
  };

  const handleSave = async () => {
    setIsSaving(true);
    try {
      await updateSettings(formData);
      toast.success("Application settings updated successfully!");
    } catch (error) {
      toast.error("Failed to save settings.");
    } finally {
      setIsSaving(false);
    }
  };

  const handleResetDefaults = async () => {
    if(confirm("Are you sure you want to reset all visual settings back to original defaults?")) {
      const resetData = { ...formData, ...INITIAL_SETTINGS, contactNumber: formData.contactNumber, email: formData.email, address: formData.address };
      setFormData(resetData);
      setIsSaving(true);
      try {
        await updateSettings(resetData);
        toast.success("Settings reset to defaults!");
      } catch (error) {
        toast.error("Failed to reset settings.");
      } finally {
        setIsSaving(false);
      }
    }
  };

  const fonts = [
    { name: 'Inter', value: 'Inter' },
    { name: 'Outfit', value: 'Outfit' },
    { name: 'Space Grotesk', value: 'Space Grotesk' },
    { name: 'Playfair Display', value: 'Playfair Display' },
    { name: 'JetBrains Mono', value: 'JetBrains Mono' },
  ];

  const radiai = [
    { name: 'None', value: 'none' },
    { name: 'Small', value: 'sm' },
    { name: 'Medium', value: 'md' },
    { name: 'Large', value: 'lg' },
    { name: 'Extra Large', value: '2xl' },
    { name: 'Super Round', value: '3xl' },
  ];

  const allModules = [
    { id: 'dashboard', label: 'Main Dashboard', icon: Layout },
    { id: 'leads', label: 'Leads Pipeline', icon: Activity },
    { id: 'admissions', label: 'Admissions Hub', icon: User },
    { id: 'students', label: 'Student Records', icon: User },
    { id: 'staff', label: 'Staff & Payroll', icon: Smartphone },
    { id: 'accounts', label: 'Expenses & Income', icon: Coins },
    { id: 'fee', label: 'Fees & Billing', icon: Coins },
    { id: 'reports', label: 'Intelligence Reports', icon: Zap },
    { id: 'academic', label: 'Grades & Results', icon: Type },
    { id: 'classes', label: 'Classes & Subjects', icon: Type },
    { id: 'attendance', label: 'Attendance', icon: User },
    { id: 'timetable', label: 'Timetable', icon: Layout },
    { id: 'library', label: 'Library', icon: Type },
  ];

  return (
    <div className="space-y-8 pb-24">
      {/* Header Section */}
      <div className="flex flex-col md:flex-row justify-between items-center gap-4">
        <div>
          <h3 className="text-3xl font-display font-black text-superior-teal flex items-center gap-3">
            System Control Panel <span className="text-slate-300">/</span> <span className="urdu-text text-2xl">سسٹم کنٹرول</span>
          </h3>
          <p className="text-slate-400 text-sm font-medium mt-1">Configure your workspace, logic, and interface identity.</p>
        </div>
        <div className="flex items-center gap-3">
          <Button 
            variant="outline"
            onClick={handleResetDefaults}
            className="h-12 px-6 rounded-2xl font-bold border-slate-200"
          >
            Reset Colors
          </Button>
          <Button 
            onClick={handleSave} 
            disabled={isSaving}
            className="h-12 px-8 rounded-2xl bg-superior-teal text-white font-black uppercase tracking-widest text-[11px] hover:shadow-xl hover:shadow-superior-teal/20 transition-all active:scale-95 disabled:opacity-50"
          >
            {isSaving ? "Syncing..." : <><Save size={18} className="mr-2" /> Commit Changes</>}
          </Button>
        </div>
      </div>

      <Tabs defaultValue="appearance" className="w-full">
        <TabsList className="flex flex-wrap h-auto w-full gap-2 mb-10 bg-transparent p-0">
          {[
            { id: 'general', label: 'Identity', icon: Building2 },
            { id: 'appearance', label: 'Appearance', icon: Palette },
            { id: 'themes', label: 'Custom Themes', icon: MousePointer2 },
            { id: 'modules', label: 'Core Modules', icon: AppWindow },
            { id: 'interlinks', label: 'System Logic', icon: Link2 },
            { id: 'sections', label: 'Classes & Sections', icon: Layers },
            { id: 'documents', label: 'Forms & Documents', icon: FileText },
            { id: 'contact', label: 'Legal & Contact', icon: Globe },
          ].map(tab => (
            <TabsTrigger 
              key={tab.id}
              value={tab.id} 
              className="flex-1 min-w-[120px] h-14 rounded-2xl font-black uppercase tracking-widest text-[10px] border border-slate-100 bg-slate-50/50 data-[state=active]:bg-superior-teal data-[state=active]:text-white data-[state=active]:shadow-lg data-[state=active]:shadow-superior-teal/20 transition-all hover:bg-slate-100"
            >
              <tab.icon size={16} className="mr-2" /> {tab.label}
            </TabsTrigger>
          ))}
        </TabsList>

        <TabsContent value="general" className="space-y-8">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
            <Card className="bg-white border-none shadow-xl shadow-slate-200/50 rounded-[2rem] overflow-hidden">
              <CardHeader className="bg-slate-50/50 px-8 py-6">
                <CardTitle className="text-lg font-black uppercase tracking-widest text-superior-teal">Institution Profile</CardTitle>
                <CardDescription className="text-xs font-bold text-slate-400">Main identity details for the application.</CardDescription>
              </CardHeader>
              <CardContent className="p-8 space-y-6">
                <div className="space-y-2">
                  <Label htmlFor="collegeName" className="text-[10px] font-black uppercase tracking-widest text-slate-400">Official College Name</Label>
                  <Input 
                    id="collegeName" 
                    name="collegeName"
                    value={formData.collegeName} 
                    onChange={handleInputChange}
                    className="h-14 rounded-2xl bg-slate-50 border-transparent focus:bg-white focus:border-superior-teal/30 focus:ring-0 transition-all font-bold"
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="campusName" className="text-[10px] font-black uppercase tracking-widest text-slate-400">Specific Campus</Label>
                  <Input 
                    id="campusName" 
                    name="campusName"
                    value={formData.campusName} 
                    onChange={handleInputChange}
                    className="h-14 rounded-2xl bg-slate-50 border-transparent focus:bg-white focus:border-superior-teal/30 focus:ring-0 transition-all font-bold"
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="principalName" className="text-[10px] font-black uppercase tracking-widest text-slate-400">Head of Institution</Label>
                  <Input 
                    id="principalName" 
                    name="principalName"
                    value={formData.principalName} 
                    onChange={handleInputChange}
                    className="h-14 rounded-2xl bg-slate-50 border-transparent focus:bg-white focus:border-superior-teal/30 focus:ring-0 transition-all font-bold"
                  />
                </div>
              </CardContent>
            </Card>

            <Card className="bg-white border-none shadow-xl shadow-slate-200/50 rounded-[2rem] overflow-hidden">
              <CardHeader className="bg-slate-50/50 px-8 py-6 text-center">
                <CardTitle className="text-lg font-black uppercase tracking-widest text-superior-teal">College Insignia</CardTitle>
              </CardHeader>
              <CardContent className="p-8 flex flex-col items-center justify-center min-h-[350px]">
                {formData.logo ? (
                  <div className="flex flex-col items-center">
                    <div className="relative group">
                      <img src={formData.logo} alt="College Logo" className="w-48 h-48 object-cover rounded-full shadow-2xl ring-4 ring-slate-50 transition-transform group-hover:scale-105" />
                      <Button 
                        size="icon"
                        variant="destructive"
                        onClick={() => setFormData(prev => ({ ...prev, logo: '' }))}
                        className="absolute -top-2 -right-2 h-10 w-10 border-4 border-white rounded-full shadow-xl opacity-0 group-hover:opacity-100 transition-opacity"
                      >
                        <X size={18} />
                      </Button>
                    </div>
                  </div>
                ) : (
                  <div className="relative group p-12 border-2 border-dashed border-slate-200 rounded-[3rem] w-full flex flex-col items-center hover:bg-slate-50/50 hover:border-superior-teal/30 transition-all cursor-pointer">
                    <Label className="w-full flex flex-col items-center cursor-pointer">
                      <div className="w-20 h-20 bg-slate-100 rounded-3xl flex items-center justify-center text-slate-300 mx-auto mb-4 group-hover:scale-110 transition-transform group-hover:text-superior-teal">
                        <ImageIcon size={40} />
                      </div>
                      <p className="text-[10px] font-black uppercase tracking-widest text-slate-400 group-hover:text-superior-teal">Insignia Required</p>
                      <span className="mt-8 h-12 px-8 rounded-2xl bg-white border border-slate-200 text-slate-800 font-black uppercase tracking-widest text-[10px] flex items-center gap-2 group-hover:border-superior-teal group-hover:text-superior-teal transition-all shadow-sm">
                        <Upload size={14} /> Upload Vector/Image
                      </span>
                      <Input type="file" className="hidden" accept="image/*" onChange={handleLogoUpload} />
                    </Label>
                  </div>
                )}
              </CardContent>
            </Card>
          </div>
        </TabsContent>

        <TabsContent value="appearance" className="space-y-8">
          <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
            <Card className="bg-white border-none shadow-xl shadow-slate-200/50 rounded-[2rem] overflow-hidden">
              <CardHeader className="bg-slate-50/50 px-8 py-6">
                <CardTitle className="text-[11px] font-black uppercase tracking-widest text-superior-teal flex items-center gap-2">
                  <Type size={16} /> Typography
                </CardTitle>
              </CardHeader>
              <CardContent className="p-8">
                <div className="space-y-4">
                  <Label className="text-[10px] font-black uppercase tracking-widest text-slate-400">Interface Font Family</Label>
                  <Select value={formData.fontFamily || 'Inter'} onValueChange={(v) => handleSelectChange('fontFamily', v)}>
                    <SelectTrigger className="h-14 rounded-2xl bg-slate-50 border-transparent font-bold">
                      <SelectValue placeholder="Select Font" />
                    </SelectTrigger>
                    <SelectContent className="rounded-2xl border-slate-100">
                      {fonts.map(font => (
                        <SelectItem key={font.value} value={font.value} className="rounded-xl font-bold py-3">
                          <span style={{ fontFamily: font.value }}>{font.name}</span>
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                  <div className="p-4 bg-slate-50 rounded-2xl border border-slate-100 mt-4">
                    <p className="text-xs text-slate-500 italic">Quick Preview: The quick brown fox jumps over the lazy dog.</p>
                  </div>
                </div>
              </CardContent>
            </Card>

            <Card className="bg-white border-none shadow-xl shadow-slate-200/50 rounded-[2rem] overflow-hidden">
              <CardHeader className="bg-slate-50/50 px-8 py-6">
                <CardTitle className="text-[11px] font-black uppercase tracking-widest text-superior-teal flex items-center gap-2">
                  <Box size={16} /> Layout Geometry
                </CardTitle>
              </CardHeader>
              <CardContent className="p-8">
                <div className="space-y-4">
                  <Label className="text-[10px] font-black uppercase tracking-widest text-slate-400">Card Border Radius</Label>
                  <Select value={formData.cardRadius || '3xl'} onValueChange={(v) => handleSelectChange('cardRadius', v)}>
                    <SelectTrigger className="h-14 rounded-2xl bg-slate-50 border-transparent font-bold">
                      <SelectValue placeholder="Select Radius" />
                    </SelectTrigger>
                    <SelectContent className="rounded-2xl border-slate-100">
                      {radiai.map(r => (
                        <SelectItem key={r.value} value={r.value} className="rounded-xl font-bold py-3">
                          {r.name}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                  
                  <div className="flex items-center justify-between p-4 bg-slate-50 rounded-2xl border border-slate-100 mt-4">
                    <Label className="text-[10px] font-black uppercase tracking-widest text-slate-400">Glassmorphism Effect</Label>
                    <Checkbox checked={!!formData.glassEffect} onCheckedChange={(v) => handleCheckboxChange('glassEffect', !!v)} />
                  </div>
                </div>
              </CardContent>
            </Card>

            <Card className="bg-white border-none shadow-xl shadow-slate-200/50 rounded-[2rem] overflow-hidden">
              <CardHeader className="bg-slate-50/50 px-8 py-6 text-center">
                <CardTitle className="text-[11px] font-black uppercase tracking-widest text-superior-teal">Display Preview</CardTitle>
              </CardHeader>
              <CardContent className="p-8 flex flex-col items-center justify-center">
                <div 
                  className={cn(
                    "w-full h-32 bg-slate-50 border border-slate-100 flex items-center justify-center p-6 text-center shadow-lg transition-all",
                    formData.glassEffect && "bg-white/40 backdrop-blur-md"
                  )}
                  style={{ 
                    borderRadius: formData.cardRadius === 'none' ? '0' : formData.cardRadius === 'sm' ? '4px' : formData.cardRadius === 'md' ? '8px' : formData.cardRadius === 'lg' ? '12px' : formData.cardRadius === '2xl' ? '16px' : formData.cardRadius === '3xl' ? '24px' : '24px',
                    fontFamily: formData.fontFamily 
                  }}
                >
                  <p className="text-sm font-bold text-slate-800">Sample Card Interface with selected geometry and font.</p>
                </div>
              </CardContent>
            </Card>
          </div>
        </TabsContent>

        <TabsContent value="themes" className="space-y-8">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
            <Card className="bg-white border-none shadow-xl shadow-slate-200/50 rounded-[2rem] overflow-hidden">
              <CardHeader className="bg-slate-50/50 px-8 py-6">
                <CardTitle className="text-[11px] font-black uppercase tracking-widest text-superior-teal flex items-center gap-2">
                  <Palette size={16} /> Color Spectrum
                </CardTitle>
              </CardHeader>
              <CardContent className="p-8 space-y-8">
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-6">
                  <div className="space-y-3">
                    <Label className="text-[10px] font-black uppercase tracking-widest text-slate-400">Primary Branding</Label>
                    <div className="flex gap-2">
                      <Input type="color" name="themeColor" value={formData.themeColor} onChange={handleInputChange} className="w-12 h-12 p-1 rounded-xl cursor-pointer border-slate-100" />
                      <Input value={formData.themeColor} onChange={handleInputChange} name="themeColor" className="flex-1 h-12 rounded-xl bg-slate-50 font-mono text-xs font-bold" />
                    </div>
                  </div>
                  <div className="space-y-3">
                    <Label className="text-[10px] font-black uppercase tracking-widest text-slate-400">Sidebar Matrix</Label>
                    <div className="flex gap-2">
                      <Input type="color" name="sidebarColor" value={formData.sidebarColor} onChange={handleInputChange} className="w-12 h-12 p-1 rounded-xl cursor-pointer border-slate-100" />
                      <Input value={formData.sidebarColor} onChange={handleInputChange} name="sidebarColor" className="flex-1 h-12 rounded-xl bg-slate-50 font-mono text-xs font-bold" />
                    </div>
                  </div>
                  <div className="space-y-3">
                    <Label className="text-[10px] font-black uppercase tracking-widest text-slate-400">Header Glass</Label>
                    <div className="flex gap-2">
                      <Input type="color" name="headerColor" value={formData.headerColor} onChange={handleInputChange} className="w-12 h-12 p-1 rounded-xl cursor-pointer border-slate-100" />
                      <Input value={formData.headerColor} onChange={handleInputChange} name="headerColor" className="flex-1 h-12 rounded-xl bg-slate-50 font-mono text-xs font-bold" />
                    </div>
                  </div>
                  <div className="space-y-3">
                    <Label className="text-[10px] font-black uppercase tracking-widest text-slate-400">Primary Font Color</Label>
                    <div className="flex gap-2">
                      <Input type="color" name="headerTextColor" value={formData.headerTextColor} onChange={handleInputChange} className="w-12 h-12 p-1 rounded-xl cursor-pointer border-slate-100" />
                      <Input value={formData.headerTextColor} onChange={handleInputChange} name="headerTextColor" className="flex-1 h-12 rounded-xl bg-slate-50 font-mono text-xs font-bold" />
                    </div>
                  </div>
                </div>
              </CardContent>
            </Card>

            <Card className="bg-white border-none shadow-xl shadow-slate-200/50 rounded-[2rem] overflow-hidden">
              <CardHeader className="bg-slate-50/50 px-8 py-6">
                <CardTitle className="text-[11px] font-black uppercase tracking-widest text-superior-teal">Interactive Preview</CardTitle>
              </CardHeader>
              <CardContent className="p-8">
                <div className="w-full h-48 bg-slate-50 rounded-[2rem] border border-slate-100 flex overflow-hidden shadow-inner">
                  <div className="w-20 h-full flex flex-col p-3 gap-2" style={{ backgroundColor: formData.sidebarColor }}>
                    <div className="w-full h-8 rounded-lg bg-white/10" />
                    <div className="w-full h-8 rounded-lg bg-white/20" />
                    <div className="w-full h-8 rounded-lg bg-white/5 mt-auto" />
                  </div>
                  <div className="flex-1 flex flex-col">
                    <div className="h-10 w-full px-4 flex items-center justify-between" style={{ backgroundColor: formData.headerColor, color: formData.headerTextColor }}>
                      <div className="w-12 h-3 rounded-full bg-current opacity-20" />
                      <div className="w-4 h-4 rounded-full bg-current opacity-20" />
                    </div>
                    <div className="flex-1 p-6">
                      <div className="flex items-center gap-3 mb-4">
                        <div className="w-10 h-10 rounded-xl" style={{ backgroundColor: formData.themeColor }} />
                        <div className="space-y-1.5 flex-1">
                          <div className="h-4 w-3/4 rounded-md bg-slate-200" />
                          <div className="h-3 w-1/2 rounded-md bg-slate-100" />
                        </div>
                      </div>
                      <div className="grid grid-cols-2 gap-3">
                        <div className="h-12 rounded-xl bg-white border border-slate-100 shadow-sm" />
                        <div className="h-12 rounded-xl bg-white border border-slate-100 shadow-sm" />
                      </div>
                    </div>
                  </div>
                </div>
              </CardContent>
            </Card>
          </div>
        </TabsContent>

        <TabsContent value="modules" className="space-y-8">
          <Card className="bg-white border-none shadow-xl shadow-slate-200/50 rounded-[2rem] overflow-hidden">
            <CardHeader className="bg-slate-50/50 px-8 py-6">
              <CardTitle className="text-[11px] font-black uppercase tracking-widest text-superior-teal flex items-center gap-2">
                <AppWindow size={16} /> Module Sovereignty
              </CardTitle>
              <CardDescription className="text-xs font-bold text-slate-400">Enable or disable core system modules globally.</CardDescription>
            </CardHeader>
            <CardContent className="p-8">
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
                {allModules.map(module => (
                  <div 
                    key={module.id}
                    onClick={() => toggleModule(module.id)}
                    className={cn(
                      "p-6 rounded-[2rem] border-2 cursor-pointer transition-all group",
                      formData.enabledModules?.includes(module.id)
                        ? "bg-superior-teal/5 border-superior-teal/30" 
                        : "bg-slate-50 border-transparent grayscale opacity-60 hover:grayscale-0 hover:opacity-100 hover:border-slate-200"
                    )}
                  >
                    <div className={cn(
                      "w-12 h-12 rounded-2xl flex items-center justify-center mb-4 transition-transform group-hover:scale-110 shadow-lg",
                      formData.enabledModules?.includes(module.id) ? "bg-superior-teal text-white" : "bg-white text-slate-400"
                    )}>
                      <module.icon size={20} />
                    </div>
                    <h5 className={cn(
                      "font-black uppercase tracking-widest text-[10px]",
                      formData.enabledModules?.includes(module.id) ? "text-superior-teal" : "text-slate-500"
                    )}>
                      {module.label}
                    </h5>
                    <div className="mt-4 flex items-center gap-2">
                      <div className={cn(
                        "w-3 h-3 rounded-full",
                        formData.enabledModules?.includes(module.id) ? "bg-emerald-500 shadow-[0_0_8px_rgba(16,185,129,0.5)]" : "bg-slate-300"
                      )} />
                      <span className="text-[9px] font-bold uppercase tracking-widest text-slate-400">
                        {formData.enabledModules?.includes(module.id) ? 'Active' : 'Offline'}
                      </span>
                    </div>
                  </div>
                ))}
              </div>
              <div className="mt-10 p-6 bg-amber-50 rounded-[2rem] border border-amber-100 flex items-start gap-4">
                <div className="w-10 h-10 rounded-xl bg-amber-200 flex items-center justify-center text-amber-600 flex-shrink-0">
                  <Monitor size={20} />
                </div>
                <div className="space-y-1">
                  <h6 className="text-[11px] font-black uppercase tracking-widest text-amber-900 leading-none">Security Protocol Note</h6>
                  <p className="text-xs text-amber-800/70 font-medium leading-relaxed">Disabling a module here removes it from all navigation bars and access points regardless of user permissions. Data remains secure but inaccessible.</p>
                </div>
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="interlinks" className="space-y-8">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
            <Card className="bg-white border-none shadow-xl shadow-slate-200/50 rounded-[2rem] overflow-hidden">
              <CardHeader className="bg-slate-50/50 px-8 py-6">
                <CardTitle className="text-[11px] font-black uppercase tracking-widest text-superior-teal flex items-center gap-2">
                  <Layers size={16} /> Module Automation
                </CardTitle>
                <CardDescription className="text-xs font-bold text-slate-400">Control how modules interact with each other.</CardDescription>
              </CardHeader>
              <CardContent className="p-8 space-y-6">
                <div className="flex items-center justify-between p-4 bg-slate-50 rounded-2xl border border-slate-100">
                  <div className="space-y-1">
                    <p className="text-[11px] font-black uppercase tracking-widest text-slate-800">Auto-convert Leads</p>
                    <p className="text-[9px] font-bold text-slate-400">Open Admission form instantly on conversion.</p>
                  </div>
                  <Checkbox checked={!!formData.autoLeadConversion} onCheckedChange={(v) => handleCheckboxChange('autoLeadConversion', !!v)} />
                </div>
                <div className="flex items-center justify-between p-4 bg-slate-50 rounded-2xl border border-slate-100">
                  <div className="space-y-1">
                    <p className="text-[11px] font-black uppercase tracking-widest text-slate-800">Global Quick Navigation</p>
                    <p className="text-[9px] font-bold text-slate-400">Force display of Top Shortcut Bar across all views.</p>
                  </div>
                  <Checkbox checked={!!formData.allowQuickNav} onCheckedChange={(v) => handleCheckboxChange('allowQuickNav', !!v)} />
                </div>
                <div className="flex items-center justify-between p-4 bg-slate-50 rounded-2xl border border-slate-100">
                  <div className="space-y-1">
                    <p className="text-[11px] font-black uppercase tracking-widest text-slate-800">Search Term Highlighting</p>
                    <p className="text-[9px] font-bold text-slate-400">Visually highlight searched words in results.</p>
                  </div>
                  <Checkbox checked={!!formData.enableHighlighting} onCheckedChange={(v) => handleCheckboxChange('enableHighlighting', !!v)} />
                </div>
                <div className="space-y-2 pt-2">
                  <Label className="text-[10px] font-black uppercase tracking-widest text-slate-400">Fee Alert Threshold (Months)</Label>
                  <Input 
                    type="number" 
                    name="defaulterAlertThreshold" 
                    value={formData.defaulterAlertThreshold} 
                    onChange={handleInputChange}
                    className="h-14 rounded-2xl bg-slate-50 border-transparent font-bold"
                  />
                  <p className="text-[9px] font-bold text-slate-400 italic">Alert strip will trigger if unpaid history exceeds this many months.</p>
                </div>
              </CardContent>
            </Card>

            <Card className="bg-white border-none shadow-xl shadow-slate-200/50 rounded-[2rem] overflow-hidden">
              <CardHeader className="bg-slate-50/50 px-8 py-6">
                <CardTitle className="text-[11px] font-black uppercase tracking-widest text-superior-teal flex items-center gap-2">
                  <Monitor size={16} /> Operation Session
                </CardTitle>
              </CardHeader>
              <CardContent className="p-8 space-y-6">
                <div className="space-y-2">
                  <Label htmlFor="academicSession" className="text-[10px] font-black uppercase tracking-widest text-slate-400">Active Academic Session</Label>
                  <Input 
                    id="academicSession" 
                    name="academicSession"
                    value={formData.academicSession} 
                    onChange={handleInputChange}
                    placeholder="e.g. 2026-28"
                    className="h-14 rounded-2xl bg-slate-50 border-transparent focus:bg-white focus:border-superior-teal/30 focus:ring-0 transition-all font-bold text-lg"
                  />
                </div>
                <div className="p-6 bg-slate-50 rounded-[2rem] border border-slate-100">
                  <p className="text-xs text-slate-500 leading-relaxed">
                    The active session tags every new entry (Leads, Admissions, Expenses) with the specified academic year. Use this to maintain multi-year historical data separation.
                  </p>
                </div>
              </CardContent>
            </Card>
          </div>
        </TabsContent>

        <TabsContent value="documents" className="space-y-8">
          <Card className="bg-white border-none shadow-xl shadow-slate-200/50 rounded-[2rem] overflow-hidden">
            <CardHeader className="bg-slate-50/50 px-8 py-6">
              <CardTitle className="text-[11px] font-black uppercase tracking-widest text-superior-teal flex items-center gap-2">
                <FileText size={16} /> Print Document Configurations
              </CardTitle>
              <CardDescription className="text-xs font-bold text-slate-400">Custom text/notes attached to generated PDF documents.</CardDescription>
            </CardHeader>
            <CardContent className="p-8 space-y-6">
              <div className="space-y-2">
                <Label htmlFor="admissionSlipCustomText" className="text-[10px] font-black uppercase tracking-widest text-slate-400">Admission Slip Custom Text / Rules</Label>
                <Textarea 
                  id="admissionSlipCustomText" 
                  name="admissionSlipCustomText"
                  value={formData.admissionSlipCustomText || ''} 
                  onChange={(e) => handleInputChange(e as any)}
                  className="min-h-[120px] rounded-2xl bg-slate-50 border-transparent focus:bg-white focus:border-superior-teal/30 focus:ring-0 transition-all font-medium py-4 px-4"
                  placeholder="Enter any additional rules, guidelines, or notice you want to appear on the generated Admission Slip..."
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="feeReceiptCustomText" className="text-[10px] font-black uppercase tracking-widest text-slate-400">Fee Receipt Custom Text / Remarks</Label>
                <Textarea 
                  id="feeReceiptCustomText" 
                  name="feeReceiptCustomText"
                  value={formData.feeReceiptCustomText || ''} 
                  onChange={(e) => handleInputChange(e as any)}
                  className="min-h-[120px] rounded-2xl bg-slate-50 border-transparent focus:bg-white focus:border-superior-teal/30 focus:ring-0 transition-all font-medium py-4 px-4"
                  placeholder="Enter payment policies, conditions, or footers you want to appear on printed fee receipts..."
                />
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="sections" className="space-y-8">
          <Card className="bg-white border-none shadow-xl shadow-slate-200/50 rounded-[2rem] overflow-hidden">
            <CardHeader className="bg-slate-50/50 px-8 py-6 flex flex-row items-center justify-between">
              <div>
                <CardTitle className="text-[11px] font-black uppercase tracking-widest text-superior-teal flex items-center gap-2">
                  <Layers size={16} /> Predefined Classes & Sections
                </CardTitle>
                <CardDescription className="text-xs font-bold text-slate-400 mt-1">Configure predefined sections to select from during admissions.</CardDescription>
              </div>
              <Button onClick={handleAddSection} className="h-10 px-4 rounded-xl font-bold bg-superior-teal text-white">
                <Plus size={16} className="mr-2" /> Add Section
              </Button>
            </CardHeader>
            <CardContent className="p-8">
              
              {/* Add New Section Form */}
              <div className="bg-slate-50 p-6 rounded-2xl mb-8 border border-slate-100">
                <h4 className="text-sm font-bold text-slate-800 mb-4 flex items-center gap-2">
                  <Plus size={16} className="text-superior-teal"/> Create New Section
                </h4>
                <div className="flex flex-col md:flex-row items-end gap-4">
                  <div className="flex-1 space-y-1 w-full">
                    <Label className="text-[10px] font-black uppercase text-slate-400">Program</Label>
                    <Select value={newSection.program} onValueChange={(val) => handleUpdateNewSection('program', val)}>
                      <SelectTrigger className="h-10 bg-white border-none rounded-xl">
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="Inter">Inter</SelectItem>
                        <SelectItem value="BS">BS Program</SelectItem>
                        <SelectItem value="UKL3">UK Level 3</SelectItem>
                        <SelectItem value="DIT">DIT</SelectItem>
                        <SelectItem value="Other">Other</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                  <div className="flex-1 space-y-1 w-full">
                    <Label className="text-[10px] font-black uppercase text-slate-400">Session</Label>
                    <Select value={newSection.class} onValueChange={(val) => handleUpdateNewSection('class', val)}>
                      <SelectTrigger className="h-10 bg-white border-none rounded-xl">
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="2023-2025">2023-2025</SelectItem>
                        <SelectItem value="2024-2026">2024-2026</SelectItem>
                        <SelectItem value="2025-2027">2025-2027</SelectItem>
                        <SelectItem value="2026-28">2026-28</SelectItem>
                        <SelectItem value="2027-2029">2027-2029</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                  <div className="flex-1 space-y-1 w-full min-w-[120px]">
                    <Label className="text-[10px] font-black uppercase text-slate-400">Campus</Label>
                    <Select value={newSection.gender || 'Male'} onValueChange={(val) => handleUpdateNewSection('gender', val)}>
                      <SelectTrigger className="h-10 bg-white border-none rounded-xl">
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="Male">Boys Campus</SelectItem>
                        <SelectItem value="Female">Girls Campus</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                  <div className="flex-1 space-y-1 w-full">
                    <Label className="text-[10px] font-black uppercase text-slate-400">Section Name</Label>
                    <Input 
                      placeholder="e.g. Pre-Med A" 
                      value={newSection.name} 
                      onChange={(e) => handleUpdateNewSection('name', e.target.value)}
                      className="h-10 bg-white border-none rounded-xl"
                      onKeyDown={(e) => e.key === 'Enter' && handleAddSection()}
                    />
                  </div>
                  <div className="flex-none">
                    <Button onClick={handleAddSection} className="h-10 px-6 rounded-xl font-bold bg-superior-teal text-white w-full">
                      Add
                    </Button>
                  </div>
                </div>
              </div>

              {/* Preview Added Sections */}
              <div className="space-y-6">
                <div>
                  <h4 className="text-sm font-bold text-slate-800 mb-3 flex items-center gap-2">
                    <span className="w-2 h-2 rounded-full bg-blue-500"></span> Boys Campus Sections
                  </h4>
                  <div className="flex flex-wrap gap-2">
                    {formData.predefinedSections?.filter(s => s.gender === 'Male').length === 0 && (
                      <p className="text-xs text-slate-400 py-2">No boys sections added.</p>
                    )}
                    {formData.predefinedSections?.filter(s => s.gender === 'Male').map((sec) => (
                      <Badge key={sec.id} variant="secondary" className="px-3 py-1.5 bg-blue-50 text-blue-700 hover:bg-blue-100 border-none rounded-lg text-sm flex items-center gap-2">
                        <span className="font-semibold">{sec.program}</span>
                        <span className="opacity-50">•</span>
                        <span>{sec.class}</span>
                        <span className="opacity-50">•</span>
                        <span className="font-bold">{sec.name}</span>
                        <Button variant="ghost" size="icon" onClick={() => handleRemoveSection(sec.id)} className="h-5 w-5 ml-1 text-blue-400 hover:text-rose-500 hover:bg-rose-50 rounded-full">
                          <X size={12} />
                        </Button>
                      </Badge>
                    ))}
                  </div>
                </div>

                <div>
                  <h4 className="text-sm font-bold text-slate-800 mb-3 flex items-center gap-2">
                    <span className="w-2 h-2 rounded-full bg-pink-500"></span> Girls Campus Sections
                  </h4>
                  <div className="flex flex-wrap gap-2">
                    {formData.predefinedSections?.filter(s => s.gender === 'Female').length === 0 && (
                      <p className="text-xs text-slate-400 py-2">No girls sections added.</p>
                    )}
                    {formData.predefinedSections?.filter(s => s.gender === 'Female').map((sec) => (
                      <Badge key={sec.id} variant="secondary" className="px-3 py-1.5 bg-pink-50 text-pink-700 hover:bg-pink-100 border-none rounded-lg text-sm flex items-center gap-2">
                        <span className="font-semibold">{sec.program}</span>
                        <span className="opacity-50">•</span>
                        <span>{sec.class}</span>
                        <span className="opacity-50">•</span>
                        <span className="font-bold">{sec.name}</span>
                        <Button variant="ghost" size="icon" onClick={() => handleRemoveSection(sec.id)} className="h-5 w-5 ml-1 text-pink-400 hover:text-rose-500 hover:bg-rose-50 rounded-full">
                          <X size={12} />
                        </Button>
                      </Badge>
                    ))}
                  </div>
                </div>
                
                {/* Fallback for Co-ed / other */}
                {(formData.predefinedSections?.filter(s => s.gender !== 'Male' && s.gender !== 'Female').length || 0) > 0 && (
                  <div>
                    <h4 className="text-sm font-bold text-slate-800 mb-3 flex items-center gap-2">
                      <span className="w-2 h-2 rounded-full bg-slate-500"></span> Other / Co-ed Sections
                    </h4>
                    <div className="flex flex-wrap gap-2">
                      {formData.predefinedSections?.filter(s => s.gender !== 'Male' && s.gender !== 'Female').map((sec) => (
                        <Badge key={sec.id} variant="secondary" className="px-3 py-1.5 bg-slate-100 text-slate-700 hover:bg-slate-200 border-none rounded-lg text-sm flex items-center gap-2">
                          <span className="font-semibold">{sec.program}</span>
                          <span className="opacity-50">•</span>
                          <span>{sec.class}</span>
                          <span className="opacity-50">•</span>
                          <span className="font-bold">{sec.name}</span>
                          <Button variant="ghost" size="icon" onClick={() => handleRemoveSection(sec.id)} className="h-5 w-5 ml-1 text-slate-400 hover:text-rose-500 hover:bg-rose-50 rounded-full">
                            <X size={12} />
                          </Button>
                        </Badge>
                      ))}
                    </div>
                  </div>
                )}
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="contact" className="space-y-8">
          <Card className="bg-white border-none shadow-xl shadow-slate-200/50 rounded-[2rem] overflow-hidden">
            <CardHeader className="bg-slate-50/50 px-8 py-6">
              <CardTitle className="text-lg font-black uppercase tracking-widest text-superior-teal">Contact & Documentation Information</CardTitle>
            </CardHeader>
            <CardContent className="p-8">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
                <div className="space-y-2">
                  <Label htmlFor="contactNumber" className="text-[10px] font-black uppercase tracking-widest text-slate-400">Institutional Phone</Label>
                  <div className="relative">
                    <Phone className="absolute left-5 top-1/2 -translate-y-1/2 text-slate-400" size={18} />
                    <Input id="contactNumber" name="contactNumber" value={formData.contactNumber} onChange={handleInputChange} className="pl-14 h-14 rounded-2xl bg-slate-50 border-transparent font-bold" />
                  </div>
                </div>
                <div className="space-y-2">
                  <Label htmlFor="email" className="text-[10px] font-black uppercase tracking-widest text-slate-400">Electronic Mail</Label>
                  <div className="relative">
                    <Mail className="absolute left-5 top-1/2 -translate-y-1/2 text-slate-400" size={18} />
                    <Input id="email" name="email" value={formData.email} onChange={handleInputChange} className="pl-14 h-14 rounded-2xl bg-slate-50 border-transparent font-bold" />
                  </div>
                </div>
                <div className="space-y-2">
                  <Label htmlFor="website" className="text-[10px] font-black uppercase tracking-widest text-slate-400">Web Domain</Label>
                  <div className="relative">
                    <Globe className="absolute left-5 top-1/2 -translate-y-1/2 text-slate-400" size={18} />
                    <Input id="website" name="website" value={formData.website} onChange={handleInputChange} className="pl-14 h-14 rounded-2xl bg-slate-50 border-transparent font-bold" />
                  </div>
                </div>
                <div className="space-y-2">
                  <Label htmlFor="address" className="text-[10px] font-black uppercase tracking-widest text-slate-400">Mailing Address</Label>
                  <div className="relative">
                    <MapPin className="absolute left-5 top-1/2 -translate-y-1/2 text-slate-400" size={18} />
                    <Input id="address" name="address" value={formData.address} onChange={handleInputChange} className="pl-14 h-14 rounded-2xl bg-slate-50 border-transparent font-bold" />
                  </div>
                </div>
              </div>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
}
