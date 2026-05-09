import React, { useState, useEffect } from 'react';
import { Staff } from '../types';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Search, Calendar, Plus, X, Clock } from 'lucide-react';
import { toast } from 'sonner';

interface StaffTimetableProps {
  staffList: Staff[];
  timetableRecords?: TimetableEntry[];
  onAddEntry?: (entry: TimetableEntry) => void;
  onRemoveEntry?: (id: string) => void;
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

export default function StaffTimetable({ staffList, timetableRecords = [], onAddEntry, onRemoveEntry }: StaffTimetableProps) {
  const [entries, setEntries] = useState<TimetableEntry[]>([]);
  const [selectedStaff, setSelectedStaff] = useState<Staff | null>(null);
  const [searchQuery, setSearchQuery] = useState('');

  // Form State
  const [day, setDay] = useState<string>("Monday");
  const [startTime, setStartTime] = useState<string>("08:00");
  const [endTime, setEndTime] = useState<string>("09:00");
  const [subject, setSubject] = useState<string>("");
  const [classRoom, setClassRoom] = useState<string>("");
  const [section, setSection] = useState<string>("");

  useEffect(() => {
    if (timetableRecords.length > 0) {
      setEntries(timetableRecords);
    } else {
      const stored = localStorage.getItem('staffTimetable');
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
    localStorage.setItem('staffTimetable', JSON.stringify(newEntries));
  };

  const filteredStaff = staffList.filter(s => {
    const name = s.fullName || '';
    const role = s.role || '';
    return name.toLowerCase().includes(searchQuery.toLowerCase()) ||
           role.toLowerCase().includes(searchQuery.toLowerCase());
  });

  const staffEntries = entries.filter(e => e.staffId === selectedStaff?.id);

  const handleAddEntry = () => {
    if (!selectedStaff || !subject || !startTime || !endTime) {
      toast.error('Please fill in required fields (Subject, Start/End Time)');
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
    setClassRoom("");
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
                    <label className="text-xs font-bold text-slate-500 uppercase">Class/Room</label>
                    <Input placeholder="e.g. Room 101" value={classRoom} onChange={e => setClassRoom(e.target.value)} className="h-12 bg-slate-50 border-slate-200 rounded-xl font-medium" />
                  </div>
                  <div className="space-y-2">
                    <label className="text-xs font-bold text-slate-500 uppercase">Section</label>
                    <Input placeholder="e.g. A" value={section} onChange={e => setSection(e.target.value)} className="h-12 bg-slate-50 border-slate-200 rounded-xl font-medium" />
                  </div>
                </div>

                <Button onClick={handleAddEntry} className="w-full h-12 rounded-xl bg-superior-teal hover:bg-superior-teal/90 text-white font-bold">
                  <Plus size={18} className="mr-2" /> Add to Timetable
                </Button>
              </CardContent>
            </Card>

            <Card className="bg-white border-none shadow-xl shadow-slate-200/50 rounded-[2rem] overflow-hidden">
              <CardHeader className="bg-slate-50/50 border-b border-slate-100 p-6 flex flex-row items-center justify-between">
                <CardTitle className="text-xl font-black text-slate-800">Weekly Schedule</CardTitle>
                <div className="text-sm font-bold text-slate-500">
                   {staffEntries.length} {staffEntries.length === 1 ? 'Class' : 'Classes'}
                </div>
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
                                <span className="bg-white px-2 py-1 rounded-md border border-slate-200">Room: {entry.classRoom || 'N/A'}</span>
                                <span className="bg-white px-2 py-1 rounded-md border border-slate-200">Sec: {entry.section || 'N/A'}</span>
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
