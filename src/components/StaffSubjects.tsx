import React, { useState, useMemo } from 'react';
import { Staff } from '../types';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Search, BookOpen, Plus, X } from 'lucide-react';
import { toast } from 'sonner';

interface StaffSubjectsProps {
  staffList: Staff[];
  onUpdateStaff?: (staffId: string, updates: Partial<Staff>) => void;
}

export default function StaffSubjects({ staffList, onUpdateStaff }: StaffSubjectsProps) {
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedStaff, setSelectedStaff] = useState<Staff | null>(null);
  const [newSubject, setNewSubject] = useState('');

  // Local state for immediate update if onUpdateStaff is missing, though we'll sync with localStorage or parent
  const [localStaffList, setLocalStaffList] = useState(staffList);

  React.useEffect(() => {
    setLocalStaffList(staffList);
    if (selectedStaff) {
      setSelectedStaff(staffList.find(s => s.id === selectedStaff.id) || null);
    }
  }, [staffList]);

  const filteredStaff = useMemo(() => {
    return localStaffList.filter(s => {
      const name = s.fullName || '';
      const role = s.role || '';
      return name.toLowerCase().includes(searchQuery.toLowerCase()) ||
             role.toLowerCase().includes(searchQuery.toLowerCase());
    });
  }, [localStaffList, searchQuery]);

  const handleAddSubject = () => {
    if (!selectedStaff || !newSubject.trim()) return;

    const subjects = selectedStaff.subjects || [];
    if (subjects.includes(newSubject.trim())) {
      toast.warning('Subject already assigned');
      return;
    }

    const updatedSubjects = [...subjects, newSubject.trim()];
    
    // Update local state
    const updatedStaff = { ...selectedStaff, subjects: updatedSubjects };
    setSelectedStaff(updatedStaff);
    setLocalStaffList(prev => prev.map(s => s.id === updatedStaff.id ? updatedStaff : s));
    
    if (onUpdateStaff) {
      onUpdateStaff(selectedStaff.id, { subjects: updatedSubjects });
    } else {
      // Assuming a mock scenario where we update local storage manually if there's no handler
      // Usually handled by context
    }

    setNewSubject('');
    toast.success(`Subject "${newSubject.trim()}" assigned to ${selectedStaff.fullName}`);
  };

  const handleRemoveSubject = (subject: string) => {
    if (!selectedStaff) return;

    const updatedSubjects = (selectedStaff.subjects || []).filter(s => s !== subject);
    
    // Update local state
    const updatedStaff = { ...selectedStaff, subjects: updatedSubjects };
    setSelectedStaff(updatedStaff);
    setLocalStaffList(prev => prev.map(s => s.id === updatedStaff.id ? updatedStaff : s));

    if (onUpdateStaff) {
      onUpdateStaff(selectedStaff.id, { subjects: updatedSubjects });
    }
    
    toast.success(`Subject "${subject}" removed from ${selectedStaff.fullName}`);
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
              onClick={() => setSelectedStaff(staff)}
              className={`p-4 rounded-xl cursor-pointer transition-all border ${selectedStaff?.id === staff.id ? 'border-superior-teal bg-superior-teal/5' : 'border-slate-100 hover:border-slate-200 hover:bg-slate-50'}`}
            >
              <p className="font-bold text-slate-800">{staff.fullName}</p>
              <p className="text-xs text-slate-500 font-medium">{staff.role || 'Teacher'}</p>
              <div className="mt-2 flex flex-wrap gap-1">
                {(staff.subjects || []).length > 0 ? (
                  (staff.subjects || []).map(sub => (
                    <span key={sub} className="px-2 py-0.5 rounded-full bg-slate-100 text-[10px] font-semibold text-slate-600">
                      {sub}
                    </span>
                  ))
                ) : (
                  <span className="text-[10px] text-slate-400 italic">No subjects mapped</span>
                )}
              </div>
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
          <Card className="bg-white border-none shadow-xl shadow-slate-200/50 rounded-[2rem] overflow-hidden">
            <CardHeader className="bg-slate-50/50 border-b border-slate-100 p-8">
              <div className="flex items-center gap-4">
                <div className="w-16 h-16 bg-superior-teal/10 rounded-2xl flex items-center justify-center text-superior-teal">
                  <BookOpen size={28} />
                </div>
                <div>
                  <CardTitle className="text-2xl font-black text-slate-800">{selectedStaff.fullName}</CardTitle>
                  <CardDescription className="text-slate-500 font-medium mt-1">Map subjects and courses to this teacher.</CardDescription>
                </div>
              </div>
            </CardHeader>
            <CardContent className="p-8 space-y-8">
              <div className="flex flex-col sm:flex-row gap-3">
                <Input 
                  value={newSubject}
                  onChange={(e) => setNewSubject(e.target.value)}
                  placeholder="e.g. Physics 101, Mathematics..."
                  className="flex-1 h-12 bg-slate-50 border-slate-200 rounded-xl"
                  onKeyDown={(e) => e.key === 'Enter' && handleAddSubject()}
                />
                <Button 
                  onClick={handleAddSubject}
                  className="h-12 px-6 rounded-xl bg-superior-teal hover:bg-superior-teal/90 text-white font-bold md:w-auto w-full"
                >
                  <Plus size={18} className="mr-2" /> Assign 
                </Button>
              </div>

              <div>
                <h4 className="text-sm font-bold text-slate-500 uppercase tracking-wider mb-4">Assigned Subjects</h4>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                  {(selectedStaff.subjects || []).length === 0 ? (
                    <div className="col-span-full p-8 text-center text-slate-500 border-2 border-dashed border-slate-100 rounded-2xl">
                      No subjects are currently mapped to this teacher.
                    </div>
                  ) : (
                    (selectedStaff.subjects || []).map((subject) => (
                      <div key={subject} className="flex items-center justify-between p-4 bg-slate-50 border border-slate-100 rounded-xl">
                        <div className="flex items-center gap-3">
                          <BookOpen size={16} className="text-superior-teal" />
                          <span className="font-bold text-slate-700">{subject}</span>
                        </div>
                        <Button 
                          variant="ghost" 
                          size="icon"
                          onClick={() => handleRemoveSubject(subject)}
                          className="h-8 w-8 text-rose-500 hover:text-rose-600 hover:bg-rose-50 rounded-lg"
                        >
                          <X size={16} />
                        </Button>
                      </div>
                    ))
                  )}
                </div>
              </div>
            </CardContent>
          </Card>
        ) : (
          <div className="h-full min-h-[400px] flex items-center justify-center text-slate-400 border-2 border-dashed border-slate-100 rounded-[2rem]">
            Select a teacher from the list to map subjects.
          </div>
        )}
      </div>
    </div>
  );
}
