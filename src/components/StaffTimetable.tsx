import React, { useState, useEffect } from 'react';
import { Staff } from '../types';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Search, Calendar, Plus, X, Clock } from 'lucide-react';
import { toast } from 'sonner';
import { safeLocalStorage } from '../utils/safeStorage';

import { jsPDF } from "jspdf";
import autoTable from "jspdf-autotable";

interface StaffTimetableProps {
  staffList: Staff[];
  timetableRecords?: TimetableEntry[];
  onAddEntry?: (entry: TimetableEntry) => void;
  onRemoveEntry?: (id: string) => void;
  predefinedSections?: any[];
}

export interface TimetableEntry {
  id: string;
  staffId: string;
  day: string;
  startTime: string;
  endTime: string;
  subject: string;
  classRoom: string;
  section: string;
}

const DAYS_OF_WEEK = ["Monday", "Tuesday", "Wednesday", "Thursday", "Friday", "Saturday", "Sunday"];

export default function StaffTimetable({ staffList, timetableRecords = [], onAddEntry, onRemoveEntry, predefinedSections = [] }: StaffTimetableProps) {
  const [entries, setEntries] = useState<TimetableEntry[]>([]);
  const [selectedStaff, setSelectedStaff] = useState<Staff | null>(null);
  const [searchQuery, setSearchQuery] = useState('');

  // Form State
  const [day, setDay] = useState<string>("Monday");
  const [startTime, setStartTime] = useState<string>("08:00");
  const [endTime, setEndTime] = useState<string>("09:00");
  const [subject, setSubject] = useState<string>("");
  const [classRoom, setClassRoom] = useState<string>("Regular"); // repurposed as Lecture Type (Regular | Extra)
  const [section, setSection] = useState<string>("");

  useEffect(() => {
    if (timetableRecords.length > 0) {
      setEntries(timetableRecords);
    } else {
      const stored = safeLocalStorage.getItem('staffTimetable');
      if (stored) {
        try {
          setEntries(JSON.parse(stored));
        } catch (e) {
          console.error("Failed to parse timetable entries", e);
        }
      }
    }
  }, [timetableRecords]);

  const saveEntries = (newEntries: TimetableEntry[]) => {
    setEntries(newEntries);
    safeLocalStorage.setItem('staffTimetable', JSON.stringify(newEntries));
  };

  const filteredStaff = staffList.filter(s => {
    const name = s.fullName || '';
    const role = s.role || '';
    return name.toLowerCase().includes(searchQuery.toLowerCase()) ||
           role.toLowerCase().includes(searchQuery.toLowerCase());
  });

  const staffEntries = entries.filter(e => e.staffId === selectedStaff?.id);

  const handleAddEntry = () => {
    if (!selectedStaff || !subject || !startTime || !endTime || !section) {
      toast.error('Please fill in required fields (Subject, Section, Start/End Time)');
      return;
    }

    const newEntry: TimetableEntry = {
      id: `TT-${Date.now()}`,
      staffId: selectedStaff.id,
      day,
      startTime,
      endTime,
      subject,
      classRoom,
      section
    };

    if (onAddEntry) {
      onAddEntry(newEntry);
    } else {
      saveEntries([...entries, newEntry]);
      toast.success('Timetable entry added locally');
    }
    
    // reset form partly
    setSubject("");
    setClassRoom("Regular");
    setSection("");
  };

  const handleRemoveEntry = (id: string) => {
    if (onRemoveEntry) {
      onRemoveEntry(id);
    } else {
      saveEntries(entries.filter(e => e.id !== id));
      toast.success('Timetable entry removed locally');
    }
  };

  const downloadTimetablePDF = () => {
    if (!selectedStaff) return;
    const doc = new jsPDF();

    doc.setFont("helvetica", "bold");
    doc.setFontSize(16);
    doc.text(`Timetable - ${selectedStaff.fullName}`, 14, 20);
    
    doc.setFont("helvetica", "normal");
    doc.setFontSize(11);
    doc.text(`Role: ${selectedStaff.role || 'Teacher'}`, 14, 28);
    
    // Stats calc
    const total = staffEntries.length;
    const extra = staffEntries.filter(e => e.classRoom === 'Extra').length;
    const regular = total - extra;
    doc.text(`Total Lectures: ${total} (Regular: ${regular}, Extra: ${extra})`, 14, 34);

    const tableData: any[] = [];
    
    DAYS_OF_WEEK.forEach(day => {
      const dailyEntries = staffEntries.filter(e => e.day === day).sort((a,b) => a.startTime.localeCompare(b.startTime));
      if (dailyEntries.length > 0) {
        tableData.push([{ content: day, colSpan: 4, styles: { fillColor: [240, 240, 240], fontStyle: 'bold' } }]);
        dailyEntries.forEach(entry => {
          tableData.push([
            `${entry.startTime} - ${entry.endTime}`,
            entry.subject,
            entry.section,
            entry.classRoom === 'Extra' ? 'Extra' : 'Regular'
          ]);
        });
      }
    });

    if (tableData.length === 0) {
      toast.error("No entries to download");
      return;
    }

    autoTable(doc, {
      startY: 40,
      head: [['Time', 'Subject', 'Section', 'Type']],
      body: tableData,
      theme: 'grid',
      headStyles: { fillColor: [15, 118, 110], textColor: [255, 255, 255] }
    });

    doc.save(`${selectedStaff.fullName.replace(/\\s+/g, '_')}_Timetable.pdf`);
  };

  return (
    <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
      <div className="lg:col-span-1 border-r border-slate-100 pr-0 lg:pr-6">
        <h3 className="text-xl font-bold mb-4 text-slate-800">Select Teacher</h3>
        <div className="relative mb-4">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" size={16} />
          <Input 
            placeholder="Search teachers..." 
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="pl-9 h-12 bg-slate-50 border-slate-200 rounded-xl"
          />
        </div>
        <div className="space-y-2 max-h-[600px] overflow-y-auto pr-2">
          {filteredStaff.map(staff => (
            <div 
              key={staff.id} 
              onClick={() => {
                setSelectedStaff(staffList.find(s => s.id === staff.id) || null);
                setSubject("");
              }}
              className={`p-4 rounded-xl cursor-pointer transition-all border ${selectedStaff?.id === staff.id ? 'border-superior-teal bg-superior-teal/5' : 'border-slate-100 hover:border-slate-200 hover:bg-slate-50'}`}
            >
              <p className="font-bold text-slate-800">{staff.fullName}</p>
              <p className="text-xs text-slate-500 font-medium">{staff.role || 'Teacher'}</p>
            </div>
          ))}
          {filteredStaff.length === 0 && (
            <div className="text-center text-sm text-slate-500 py-8">
              No staff found matching search.
            </div>
          )}
        </div>
      </div>

      <div className="lg:col-span-2">
        {selectedStaff ? (
          <div className="space-y-6">
            <Card className="bg-white border-none shadow-xl shadow-slate-200/50 rounded-[2rem] overflow-hidden">
              <CardHeader className="bg-slate-50/50 border-b border-slate-100 p-6">
                <div className="flex items-center gap-4">
                  <div className="w-12 h-12 bg-superior-teal/10 rounded-xl flex items-center justify-center text-superior-teal">
                    <Calendar size={24} />
                  </div>
                  <div>
                    <CardTitle className="text-xl font-black text-slate-800">Add Schedule Entry</CardTitle>
                    <CardDescription className="text-slate-500 font-medium mt-1">Add a class to {selectedStaff.fullName}'s timetable</CardDescription>
                  </div>
                </div>
              </CardHeader>
              <CardContent className="p-6">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-4">
                  <div className="space-y-2">
                    <label className="text-xs font-bold text-slate-500 uppercase">Day of Week</label>
                    <Select value={day} onValueChange={setDay}>
                      <SelectTrigger className="h-12 bg-slate-50 border-slate-200 rounded-xl font-medium">
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent className="rounded-xl shadow-xl">
                        {DAYS_OF_WEEK.map(d => (
                          <SelectItem key={d} value={d} className="font-medium rounded-lg">{d}</SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                  <div className="grid grid-cols-2 gap-4">
                    <div className="space-y-2">
                      <label className="text-xs font-bold text-slate-500 uppercase">Start Time</label>
                      <Input type="time" value={startTime} onChange={e => setStartTime(e.target.value)} className="h-12 bg-slate-50 border-slate-200 rounded-xl font-medium" />
                    </div>
                    <div className="space-y-2">
                      <label className="text-xs font-bold text-slate-500 uppercase">End Time</label>
                      <Input type="time" value={endTime} onChange={e => setEndTime(e.target.value)} className="h-12 bg-slate-50 border-slate-200 rounded-xl font-medium" />
                    </div>
                  </div>
                </div>
                
                <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-6">
                  <div className="space-y-2">
                    <label className="text-xs font-bold text-slate-500 uppercase">Subject</label>
                    <Select value={subject} onValueChange={setSubject}>
                      <SelectTrigger className="h-12 bg-slate-50 border-slate-200 rounded-xl font-medium">
                        <SelectValue placeholder="Select..." />
                      </SelectTrigger>
                      <SelectContent className="rounded-xl shadow-xl">
                        {(selectedStaff.subjects || []).length > 0 ? (
                          (selectedStaff.subjects || []).map(s => <SelectItem key={s} value={s} className="font-medium rounded-lg">{s}</SelectItem>)
                        ) : (
                          <SelectItem value="none" disabled className="font-medium rounded-lg">No subjects mapped</SelectItem>
                        )}
                        <SelectItem value="Other" className="font-medium rounded-lg">Other (Custom)</SelectItem>
                      </SelectContent>
                    </Select>
                    {subject === 'Other' && (
                       <Input placeholder="Enter Subject" className="mt-2 h-12 bg-slate-50 border-slate-200 rounded-xl font-medium" onChange={e => setSubject(e.target.value)} />
                    )}
                  </div>
                  <div className="space-y-2">
                    <label className="text-xs font-bold text-slate-500 uppercase">Lecture Type</label>
                    <Select value={classRoom} onValueChange={setClassRoom}>
                      <SelectTrigger className="h-12 bg-slate-50 border-slate-200 rounded-xl font-medium">
                        <SelectValue placeholder="Select type" />
                      </SelectTrigger>
                      <SelectContent className="rounded-xl shadow-xl">
                        <SelectItem value="Regular" className="font-medium rounded-lg">Regular</SelectItem>
                        <SelectItem value="Extra" className="font-medium rounded-lg text-amber-600">Extra Lecture</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                  <div className="space-y-2">
                    <label className="text-xs font-bold text-slate-500 uppercase">Section</label>
                    <Select value={section} onValueChange={setSection}>
                      <SelectTrigger className="h-12 bg-slate-50 border-slate-200 rounded-xl font-medium">
                         <SelectValue placeholder="Select Section" />
                      </SelectTrigger>
                      <SelectContent className="rounded-xl shadow-xl max-h-[300px]">
                         {predefinedSections.map((sec, idx) => (
                           <SelectItem key={idx} value={`${sec.name} ${sec.gender === 'Male' ? '(Boys)' : sec.gender === 'Female' ? '(Girls)' : ''}`.trim()} className="font-medium rounded-lg">
                             <div className="flex flex-col text-left">
                               <span>{sec.name}</span>
                               <span className="text-[10px] text-slate-400">{sec.program} - {sec.class} {sec.gender && `(${sec.gender})`}</span>
                             </div>
                           </SelectItem>
                         ))}
                         {predefinedSections.length === 0 && (
                           <SelectItem disabled value="none">No sections defined in settings</SelectItem>
                         )}
                      </SelectContent>
                    </Select>
                  </div>
                </div>

                <Button onClick={handleAddEntry} className="w-full h-12 rounded-xl bg-superior-teal hover:bg-superior-teal/90 text-white font-bold">
                  <Plus size={18} className="mr-2" /> Add to Timetable
                </Button>
              </CardContent>
            </Card>

            <Card className="bg-white border-none shadow-xl shadow-slate-200/50 rounded-[2rem] overflow-hidden">
              <CardHeader className="bg-slate-50/50 border-b border-slate-100 p-6 flex flex-row items-center justify-between">
                <div>
                  <CardTitle className="text-xl font-black text-slate-800">Weekly Schedule</CardTitle>
                  <div className="flex items-center gap-2 mt-2">
                     <span className="text-xs font-bold text-slate-500 bg-white px-2 py-1 rounded-md border border-slate-200">
                        {staffEntries.length} {staffEntries.length === 1 ? 'Class' : 'Classes'}
                     </span>
                     <span className="text-xs font-bold text-slate-500 bg-white px-2 py-1 rounded-md border border-slate-200">
                        {staffEntries.filter(e => e.classRoom !== 'Extra').length} Regular
                     </span>
                     <span className="text-xs font-bold text-amber-600 bg-amber-50 px-2 py-1 rounded-md border border-amber-200">
                        {staffEntries.filter(e => e.classRoom === 'Extra').length} Extra
                     </span>
                  </div>
                </div>
                <Button variant="outline" size="sm" onClick={downloadTimetablePDF} className="h-10 rounded-xl font-bold bg-white text-superior-teal border-superior-teal/20 hover:bg-superior-teal/5">
                  <Calendar size={16} className="mr-2" /> Download PDF
                </Button>
              </CardHeader>
              <CardContent className="p-6">
                <div className="space-y-8">
                  {DAYS_OF_WEEK.map(d => {
                    const dayEntries = staffEntries.filter(e => e.day === d).sort((a, b) => a.startTime.localeCompare(b.startTime));
                    if (dayEntries.length === 0) return null;
                    return (
                      <div key={d}>
                        <h4 className="text-sm font-bold text-slate-700 bg-slate-100 px-4 py-2 rounded-lg mb-3 inline-block uppercase tracking-wider">{d}</h4>
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                          {dayEntries.map(entry => (
                            <div key={entry.id} className="relative p-4 bg-slate-50 border border-slate-100 rounded-xl hover:border-superior-teal transition-colors group">
                               <Button 
                                variant="destructive" 
                                size="icon"
                                onClick={() => handleRemoveEntry(entry.id)}
                                className="absolute -top-2 -right-2 h-6 w-6 rounded-full opacity-0 group-hover:opacity-100 transition-opacity"
                              >
                                <X size={12} />
                              </Button>
                              <div className="flex items-center text-superior-teal font-black mb-2 text-sm">
                                <Clock size={14} className="mr-1"/> {entry.startTime} - {entry.endTime}
                              </div>
                              <p className="font-bold text-slate-800 text-lg mb-1">{entry.subject}</p>
                              <div className="flex items-center gap-2 text-xs font-semibold text-slate-500">
                                {entry.classRoom === 'Extra' ? (
                                  <span className="bg-amber-100/50 text-amber-700 px-2 py-1 rounded-md border border-amber-200">Extra Lecture</span>
                                ) : (
                                  <span className="bg-slate-100 text-slate-700 px-2 py-1 rounded-md border border-slate-200">Regular</span>
                                )}
                                <span className="bg-white px-2 py-1 rounded-md border border-slate-200 line-clamp-1 flex-1 text-center" title={entry.section}>Sec: {entry.section || 'N/A'}</span>
                              </div>
                            </div>
                          ))}
                        </div>
                      </div>
                    );
                  })}

                  {staffEntries.length === 0 && (
                    <div className="text-center p-12 text-slate-400 italic border-2 border-dashed border-slate-100 rounded-2xl">
                      No schedule entries found for {selectedStaff.fullName}.
                    </div>
                  )}
                </div>
              </CardContent>
            </Card>
          </div>
        ) : (
          <div className="h-full min-h-[400px] flex items-center justify-center text-slate-400 border-2 border-dashed border-slate-100 rounded-[2rem]">
            Select a teacher from the list to view/edit their timetable.
          </div>
        )}
      </div>
    </div>
  );
}
