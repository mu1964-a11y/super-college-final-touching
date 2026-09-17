import React, { useState, useMemo } from "react";
import { 
  Archive, RotateCcw, Trash2, Search, Filter, AlertTriangle, 
  User, CheckCircle2, XCircle, Info, Calendar, DollarSign,
  Phone, BookOpen, Clock, ShieldAlert, Sparkles, RefreshCw, Eye
} from "lucide-react";
import { toast } from "sonner";
import { ArchivedRecord } from "../types";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter } from "@/components/ui/dialog";

interface DeletedArchiveViewProps {
  data: any;
  onNavigate?: (page: string) => void;
}

export default function DeletedArchiveView({ data }: DeletedArchiveViewProps) {
  const [searchQuery, setSearchQuery] = useState("");
  const [filterType, setFilterType] = useState<"all" | "student" | "admission">("all");
  const [selectedRecord, setSelectedRecord] = useState<ArchivedRecord | null>(null);
  const [confirmDeleteId, setConfirmDeleteId] = useState<string | null>(null);
  const [showClearConfirm, setShowClearConfirm] = useState(false);

  const archiveList: ArchivedRecord[] = data.deletedArchive || [];

  // Filtered Archive
  const filteredList = useMemo(() => {
    return archiveList.filter((item) => {
      const q = searchQuery.toLowerCase().trim();
      const matchesSearch =
        !q ||
        (item.fullName || "").toLowerCase().includes(q) ||
        (item.fatherName || "").toLowerCase().includes(q) ||
        (item.studentId || "").toLowerCase().includes(q) ||
        (item.originalId || "").toLowerCase().includes(q) ||
        (item.contact || "").toLowerCase().includes(q);

      const matchesType =
        filterType === "all" || item.entityType === filterType;

      return matchesSearch && matchesType;
    });
  }, [archiveList, searchQuery, filterType]);

  // Analytics Stats
  const stats = useMemo(() => {
    const total = archiveList.length;
    const studentsCount = archiveList.filter((a) => a.entityType === "student").length;
    const admissionsCount = archiveList.filter((a) => a.entityType === "admission").length;
    const totalFeesRecoverable = archiveList.reduce(
      (acc, curr) => acc + (Number(curr.feeReceived) || 0),
      0
    );

    return { total, studentsCount, admissionsCount, totalFeesRecoverable };
  }, [archiveList]);

  const handleRestore = (item: ArchivedRecord) => {
    if (data.restoreFromArchive) {
      data.restoreFromArchive(item.id);
    } else {
      toast.error("Restore function unavailable");
    }
  };

  const handlePermanentDelete = (id: string) => {
    if (data.permanentlyDeleteFromArchive) {
      data.permanentlyDeleteFromArchive(id);
      setConfirmDeleteId(null);
    } else {
      toast.error("Permanent delete function unavailable");
    }
  };

  const handleClearAll = () => {
    if (data.clearArchive) {
      data.clearArchive();
      setShowClearConfirm(false);
    }
  };

  return (
    <div className="space-y-6 animate-in fade-in duration-300">
      {/* Top Banner */}
      <div className="bg-gradient-to-r from-slate-900 via-teal-950 to-slate-900 rounded-3xl p-6 sm:p-8 text-white shadow-xl relative overflow-hidden border border-teal-800/30">
        <div className="absolute top-0 right-0 -mt-10 -mr-10 w-64 h-64 bg-teal-500/10 rounded-full blur-3xl pointer-events-none" />
        <div className="relative z-10 flex flex-col md:flex-row md:items-center justify-between gap-6">
          <div className="space-y-2">
            <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-teal-500/20 border border-teal-400/30 text-teal-300 text-xs font-semibold tracking-wide uppercase">
              <Archive className="w-3.5 h-3.5" />
              Recycle Bin & Data Vault
            </div>
            <h1 className="text-2xl sm:text-3xl font-black tracking-tight flex items-center gap-3">
              Deleted Archive
            </h1>
            <p className="text-slate-300 text-sm max-w-xl">
              All students and admissions removed from the active system are safely quarantined here.
              You can view full audit snapshots, restore them with one click, or delete them forever.
            </p>
          </div>

          <div className="flex items-center gap-3 self-start md:self-auto">
            {archiveList.length > 0 && (
              <button
                onClick={() => setShowClearConfirm(true)}
                className="px-4 py-2.5 rounded-xl bg-red-500/10 hover:bg-red-500/20 border border-red-500/30 text-red-300 font-semibold text-xs flex items-center gap-2 transition shadow-sm hover:border-red-500/50"
              >
                <Trash2 className="w-4 h-4 text-red-400" />
                Empty Archive
              </button>
            )}
          </div>
        </div>
      </div>

      {/* Metrics Row */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <div className="bg-white rounded-2xl p-5 border border-slate-200/80 shadow-sm flex items-center gap-4">
          <div className="w-12 h-12 rounded-xl bg-teal-50 flex items-center justify-center text-teal-600 border border-teal-100">
            <Archive className="w-6 h-6" />
          </div>
          <div>
            <p className="text-xs font-bold uppercase tracking-wider text-slate-400">Total In Archive</p>
            <h3 className="text-2xl font-black text-slate-800">{stats.total}</h3>
          </div>
        </div>

        <div className="bg-white rounded-2xl p-5 border border-slate-200/80 shadow-sm flex items-center gap-4">
          <div className="w-12 h-12 rounded-xl bg-blue-50 flex items-center justify-center text-blue-600 border border-blue-100">
            <User className="w-6 h-6" />
          </div>
          <div>
            <p className="text-xs font-bold uppercase tracking-wider text-slate-400">Archived Students</p>
            <h3 className="text-2xl font-black text-slate-800">{stats.studentsCount}</h3>
          </div>
        </div>

        <div className="bg-white rounded-2xl p-5 border border-slate-200/80 shadow-sm flex items-center gap-4">
          <div className="w-12 h-12 rounded-xl bg-purple-50 flex items-center justify-center text-purple-600 border border-purple-100">
            <BookOpen className="w-6 h-6" />
          </div>
          <div>
            <p className="text-xs font-bold uppercase tracking-wider text-slate-400">Archived Applicants</p>
            <h3 className="text-2xl font-black text-slate-800">{stats.admissionsCount}</h3>
          </div>
        </div>

        <div className="bg-white rounded-2xl p-5 border border-slate-200/80 shadow-sm flex items-center gap-4">
          <div className="w-12 h-12 rounded-xl bg-emerald-50 flex items-center justify-center text-emerald-600 border border-emerald-100">
            <DollarSign className="w-6 h-6" />
          </div>
          <div>
            <p className="text-xs font-bold uppercase tracking-wider text-slate-400">Quarantined Fees</p>
            <h3 className="text-2xl font-black text-emerald-600">
              Rs. {stats.totalFeesRecoverable.toLocaleString()}
            </h3>
          </div>
        </div>
      </div>

      {/* Filter and Search Bar */}
      <div className="bg-white rounded-2xl p-4 border border-slate-200/80 shadow-sm flex flex-col md:flex-row items-center justify-between gap-4">
        {/* Search */}
        <div className="relative w-full md:w-96">
          <Search className="w-4 h-4 absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400" />
          <input
            type="text"
            placeholder="Search by name, roll no, father, phone..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="w-full pl-10 pr-4 py-2 bg-slate-50 border border-slate-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-teal-500/20 focus:border-teal-500 text-slate-800 placeholder-slate-400 font-medium"
          />
          {searchQuery && (
            <button 
              onClick={() => setSearchQuery("")}
              className="absolute right-3 top-1/2 -translate-y-1/2 text-xs text-slate-400 hover:text-slate-600"
            >
              Clear
            </button>
          )}
        </div>

        {/* Filter Tabs */}
        <div className="flex items-center gap-1 bg-slate-100 p-1 rounded-xl border border-slate-200 self-stretch md:self-auto justify-center">
          <button
            onClick={() => setFilterType("all")}
            className={`px-3.5 py-1.5 rounded-lg text-xs font-bold transition ${
              filterType === "all"
                ? "bg-white text-teal-800 shadow-sm"
                : "text-slate-600 hover:text-slate-900"
            }`}
          >
            All ({archiveList.length})
          </button>
          <button
            onClick={() => setFilterType("student")}
            className={`px-3.5 py-1.5 rounded-lg text-xs font-bold transition ${
              filterType === "student"
                ? "bg-white text-teal-800 shadow-sm"
                : "text-slate-600 hover:text-slate-900"
            }`}
          >
            Students ({stats.studentsCount})
          </button>
          <button
            onClick={() => setFilterType("admission")}
            className={`px-3.5 py-1.5 rounded-lg text-xs font-bold transition ${
              filterType === "admission"
                ? "bg-white text-teal-800 shadow-sm"
                : "text-slate-600 hover:text-slate-900"
            }`}
          >
            Admissions ({stats.admissionsCount})
          </button>
        </div>
      </div>

      {/* Archive List Table */}
      <div className="bg-white rounded-2xl border border-slate-200/80 shadow-sm overflow-hidden">
        {filteredList.length === 0 ? (
          <div className="p-12 text-center space-y-3">
            <div className="w-16 h-16 bg-slate-50 border border-slate-100 rounded-full flex items-center justify-center mx-auto text-slate-300">
              <Archive className="w-8 h-8" />
            </div>
            <h3 className="text-base font-bold text-slate-700">No Records in Deleted Archive</h3>
            <p className="text-xs text-slate-400 max-w-sm mx-auto">
              {searchQuery
                ? "No archived records match your search criteria."
                : "Great! Your recycle bin is clean. Whenever a student or admission is deleted, they will safely appear here."}
            </p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse text-sm">
              <thead>
                <tr className="bg-slate-50/75 border-b border-slate-200/80 text-[11px] font-bold text-slate-500 uppercase tracking-wider">
                  <th className="py-3.5 px-4">Entity</th>
                  <th className="py-3.5 px-4">Student & Father</th>
                  <th className="py-3.5 px-4">Class & Group</th>
                  <th className="py-3.5 px-4">Financial Package</th>
                  <th className="py-3.5 px-4">Deleted When / By</th>
                  <th className="py-3.5 px-4 text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {filteredList.map((item) => (
                  <tr key={item.id} className="hover:bg-slate-50/60 transition group">
                    {/* Entity Badge */}
                    <td className="py-3.5 px-4 whitespace-nowrap">
                      <span
                        className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-bold uppercase tracking-wider ${
                          item.entityType === "student"
                            ? "bg-blue-50 text-blue-700 border border-blue-200"
                            : "bg-purple-50 text-purple-700 border border-purple-200"
                        }`}
                      >
                        {item.entityType === "student" ? "Student" : "Admission"}
                      </span>
                    </td>

                    {/* Student Name */}
                    <td className="py-3.5 px-4">
                      <div className="font-bold text-slate-800">{item.fullName}</div>
                      <div className="text-xs text-slate-400 font-medium">
                        s/o {item.fatherName || "N/A"}
                        {item.studentId && (
                          <span className="ml-2 font-mono text-[11px] bg-slate-100 px-1.5 py-0.5 rounded text-slate-600">
                            {item.studentId}
                          </span>
                        )}
                      </div>
                    </td>

                    {/* Class & Group */}
                    <td className="py-3.5 px-4">
                      <div className="text-xs font-semibold text-slate-700">{item.group || item.category || "N/A"}</div>
                      <div className="text-[11px] text-slate-400 font-medium">
                        Section: {item.section || "A"} � Session: {item.session || "N/A"}
                      </div>
                    </td>

                    {/* Financial Package */}
                    <td className="py-3.5 px-4 whitespace-nowrap">
                      <div className="text-xs font-bold text-slate-800">
                        Total: Rs. {(item.totalPackage || 0).toLocaleString()}
                      </div>
                      <div className="text-[11px] font-semibold text-emerald-600">
                        Paid: Rs. {(item.feeReceived || 0).toLocaleString()}
                      </div>
                    </td>

                    {/* Deletion Info */}
                    <td className="py-3.5 px-4 whitespace-nowrap">
                      <div className="text-xs font-medium text-slate-600 flex items-center gap-1.5">
                        <Clock className="w-3 h-3 text-slate-400" />
                        {item.deletedAt ? new Date(item.deletedAt).toLocaleDateString("en-GB", { day: '2-digit', month: 'short', year: 'numeric', hour: '2-digit', minute: '2-digit' }) : "Recently"}
                      </div>
                      <div className="text-[11px] text-slate-400">
                        By: {item.deletedBy || "System"}
                      </div>
                    </td>

                    {/* Actions */}
                    <td className="py-3.5 px-4 text-right whitespace-nowrap">
                      <div className="inline-flex items-center gap-2">
                        {/* View Snapshot Details */}
                        <button
                          onClick={() => setSelectedRecord(item)}
                          className="p-2 rounded-xl bg-slate-100 hover:bg-slate-200 text-slate-700 text-xs font-semibold transition"
                          title="View Full Details"
                        >
                          <Eye className="w-4 h-4" />
                        </button>

                        {/* Restore Button */}
                        <button
                          onClick={() => handleRestore(item)}
                          className="px-3 py-1.5 rounded-xl bg-emerald-50 hover:bg-emerald-100 text-emerald-700 border border-emerald-200 text-xs font-bold transition flex items-center gap-1.5 shadow-sm"
                          title="Restore Record Back to Active System"
                        >
                          <RotateCcw className="w-3.5 h-3.5" />
                          Restore
                        </button>

                        {/* Permanent Delete Button */}
                        <button
                          onClick={() => setConfirmDeleteId(item.id)}
                          className="p-2 rounded-xl bg-red-50 hover:bg-red-100 text-red-600 border border-red-200 text-xs font-semibold transition"
                          title="Delete Permanently from Archive"
                        >
                          <Trash2 className="w-4 h-4" />
                        </button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* Snapshot Detail Dialog */}
      {selectedRecord && (
        <Dialog open={!!selectedRecord} onOpenChange={() => setSelectedRecord(null)}>
          <DialogContent className="max-w-2xl bg-white rounded-3xl p-6">
            <DialogHeader>
              <DialogTitle className="text-xl font-black text-slate-800 flex items-center gap-2">
                <Archive className="text-teal-600 w-5 h-5" />
                Archived Record Details
              </DialogTitle>
              <DialogDescription>
                Full original snapshot captured when this record was removed from the active system.
              </DialogDescription>
            </DialogHeader>

            <div className="space-y-4 my-4">
              <div className="grid grid-cols-2 gap-4 bg-slate-50 p-4 rounded-2xl border border-slate-100">
                <div>
                  <span className="text-[11px] font-bold text-slate-400 uppercase tracking-wider">Full Name</span>
                  <p className="font-bold text-slate-800 text-base">{selectedRecord.fullName}</p>
                </div>
                <div>
                  <span className="text-[11px] font-bold text-slate-400 uppercase tracking-wider">Father Name</span>
                  <p className="font-bold text-slate-800 text-base">{selectedRecord.fatherName || "N/A"}</p>
                </div>
                <div>
                  <span className="text-[11px] font-bold text-slate-400 uppercase tracking-wider">Roll / Student ID</span>
                  <p className="font-mono text-sm font-bold text-teal-800">{selectedRecord.studentId || selectedRecord.originalId}</p>
                </div>
                <div>
                  <span className="text-[11px] font-bold text-slate-400 uppercase tracking-wider">Contact Phone</span>
                  <p className="font-semibold text-slate-700 text-sm">{selectedRecord.contact || "N/A"}</p>
                </div>
                <div>
                  <span className="text-[11px] font-bold text-slate-400 uppercase tracking-wider">Class / Group</span>
                  <p className="font-semibold text-slate-700 text-sm">{selectedRecord.group || selectedRecord.category || "N/A"}</p>
                </div>
                <div>
                  <span className="text-[11px] font-bold text-slate-400 uppercase tracking-wider">Section & Session</span>
                  <p className="font-semibold text-slate-700 text-sm">{selectedRecord.section || "A"} ({selectedRecord.session || "N/A"})</p>
                </div>
              </div>

              <div className="grid grid-cols-2 gap-4 bg-emerald-50/60 p-4 rounded-2xl border border-emerald-100">
                <div>
                  <span className="text-[11px] font-bold text-emerald-600 uppercase tracking-wider">Total Finalized Package</span>
                  <p className="font-black text-slate-800 text-lg">Rs. {(selectedRecord.totalPackage || 0).toLocaleString()}</p>
                </div>
                <div>
                  <span className="text-[11px] font-bold text-emerald-600 uppercase tracking-wider">Fee Paid (Recoverable)</span>
                  <p className="font-black text-emerald-700 text-lg">Rs. {(selectedRecord.feeReceived || 0).toLocaleString()}</p>
                </div>
              </div>

              <div className="text-xs text-slate-500 bg-slate-50 p-3 rounded-xl border border-slate-100 flex items-center justify-between">
                <span>Deleted On: <b>{new Date(selectedRecord.deletedAt).toLocaleString()}</b></span>
                <span>Deleted By: <b>{selectedRecord.deletedBy || "System"}</b></span>
              </div>
            </div>

            <DialogFooter className="flex items-center justify-between gap-3">
              <button
                onClick={() => {
                  handleRestore(selectedRecord);
                  setSelectedRecord(null);
                }}
                className="px-4 py-2 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white font-bold text-xs flex items-center gap-1.5 shadow-sm"
              >
                <RotateCcw className="w-4 h-4" />
                Restore to Active System
              </button>
              <button
                onClick={() => setSelectedRecord(null)}
                className="px-4 py-2 rounded-xl bg-slate-100 hover:bg-slate-200 text-slate-700 font-semibold text-xs"
              >
                Close
              </button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      )}

      {/* Confirmation Modal for Permanent Delete Single */}
      {confirmDeleteId && (
        <Dialog open={!!confirmDeleteId} onOpenChange={() => setConfirmDeleteId(null)}>
          <DialogContent className="max-w-md bg-white rounded-3xl p-6">
            <DialogHeader>
              <DialogTitle className="text-xl font-black text-red-600 flex items-center gap-2">
                <AlertTriangle className="w-5 h-5" />
                Permanent Deletion
              </DialogTitle>
              <DialogDescription className="text-slate-600 text-sm mt-2">
                Are you sure you want to permanently delete this record from the archive?
                <b className="block text-red-600 mt-2 font-bold">This action cannot be undone. All audit snapshots will be permanently wiped.</b>
              </DialogDescription>
            </DialogHeader>
            <DialogFooter className="gap-2 mt-4">
              <button
                onClick={() => setConfirmDeleteId(null)}
                className="px-4 py-2 rounded-xl bg-slate-100 hover:bg-slate-200 text-slate-700 font-semibold text-xs"
              >
                Cancel
              </button>
              <button
                onClick={() => handlePermanentDelete(confirmDeleteId)}
                className="px-4 py-2 rounded-xl bg-red-600 hover:bg-red-700 text-white font-bold text-xs flex items-center gap-1.5 shadow-sm"
              >
                <Trash2 className="w-4 h-4" />
                Permanently Delete
              </button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      )}

      {/* Confirmation Modal for Clear All Archive */}
      {showClearConfirm && (
        <Dialog open={showClearConfirm} onOpenChange={setShowClearConfirm}>
          <DialogContent className="max-w-md bg-white rounded-3xl p-6">
            <DialogHeader>
              <DialogTitle className="text-xl font-black text-red-600 flex items-center gap-2">
                <AlertTriangle className="w-5 h-5" />
                Empty Entire Deleted Archive?
              </DialogTitle>
              <DialogDescription className="text-slate-600 text-sm mt-2">
                This will permanently delete all {archiveList.length} quarantined records from the recycle bin.
                <b className="block text-red-600 mt-2 font-bold">You will not be able to restore any of these students or admissions after this.</b>
              </DialogDescription>
            </DialogHeader>
            <DialogFooter className="gap-2 mt-4">
              <button
                onClick={() => setShowClearConfirm(false)}
                className="px-4 py-2 rounded-xl bg-slate-100 hover:bg-slate-200 text-slate-700 font-semibold text-xs"
              >
                Cancel
              </button>
              <button
                onClick={handleClearAll}
                className="px-4 py-2 rounded-xl bg-red-600 hover:bg-red-700 text-white font-bold text-xs flex items-center gap-1.5 shadow-sm"
              >
                <Trash2 className="w-4 h-4" />
                Yes, Empty Archive
              </button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      )}
    </div>
  );
}
