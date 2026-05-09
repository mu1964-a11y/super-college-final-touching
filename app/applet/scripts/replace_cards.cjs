const fs = require('fs');
const lines = fs.readFileSync('src/components/DashboardView.tsx', 'utf8').split('\n');

const startIdx = lines.findIndex(l => l.includes('{/* FSc Control Center (New Cluster) */}'));

let actualEndIdx = -1;
for (let i = lines.findIndex((l, i) => i > startIdx && l.includes('{/* BS Control Center */}')); i < lines.length; i++) {
   if (lines[i].includes('</Card>') && lines[i-1].includes('</CardContent>')) {
      actualEndIdx = i;
      break;
   }
}

if (startIdx > -1 && actualEndIdx > -1) {
   const newContent = `
        {/* Minimal Program Summaries */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 lg:col-span-2">
           {[
             {
               name: "FSc Stream",
               count: academicPerformance.fscCount,
               boys: academicPerformance.fscBoysCount,
               girls: academicPerformance.fscGirlsCount,
               avg: academicPerformance.fscAvg,
               color: "text-cyan-600",
               bg: "bg-cyan-50",
               border: "border-cyan-100"
             },
             {
               name: "DIT Tech",
               count: academicPerformance.ditCount,
               boys: academicPerformance.ditBoysCount,
               girls: academicPerformance.ditGirlsCount,
               avg: academicPerformance.ditAvg,
               color: "text-superior-teal",
               bg: "bg-superior-bg-teal",
               border: "border-superior-teal/30"
             },
             {
               name: "UK Level 3",
               count: academicPerformance.ukL3Count,
               boys: academicPerformance.ukL3BoysCount,
               girls: academicPerformance.ukL3GirlsCount,
               avg: academicPerformance.ukL3Avg,
               color: "text-indigo-600",
               bg: "bg-indigo-50",
               border: "border-indigo-100"
             },
             {
               name: "BS Honors",
               count: academicPerformance.bsCount,
               boys: academicPerformance.bsBoysCount,
               girls: academicPerformance.bsGirlsCount,
               avg: academicPerformance.bsAvg,
               color: "text-fuchsia-600",
               bg: "bg-fuchsia-50",
               border: "border-fuchsia-100"
             }
           ].map((program, idx) => (
             <motion.div 
               key={program.name} 
               initial={{ opacity: 0, y: 10 }}
               animate={{ opacity: 1, y: 0 }}
               transition={{ delay: 0.1 + idx * 0.1 }}
               className={\`rounded-[2rem] border \${program.border} bg-white/90 backdrop-blur-md p-6 shadow-sm flex flex-col hover:shadow-xl transition-all duration-300 group\`}
             >
                <div className="flex items-center justify-between mb-6">
                   <h3 className={\`font-black uppercase tracking-widest text-[10px] sm:text-xs \${program.color}\`}>{program.name}</h3>
                   <div className={\`p-3 rounded-[1rem] \${program.bg} \${program.color} group-hover:scale-110 group-hover:rotate-3 transition-transform duration-300\`}>
                     <GraduationCap size={16} strokeWidth={2.5} />
                   </div>
                </div>
                
                <div className="flex-1 flex flex-col py-2">
                   <div className="flex items-baseline gap-2">
                      <span className="text-4xl sm:text-5xl font-black text-slate-800 tracking-tighter">{program.count}</span>
                   </div>
                   <span className="text-[9px] font-bold text-slate-400 uppercase tracking-widest mt-1">Active Scholars</span>
                   
                   <div className="mt-6 flex gap-3 text-xs font-semibold">
                      <div className="flex items-center gap-2 bg-slate-50 rounded-xl p-2.5 px-3 border border-slate-100/80 flex-1">
                         <span className="text-blue-500 font-bold text-sm leading-none">♂</span> 
                         <span className="text-slate-600">{program.boys}</span>
                      </div>
                      <div className="flex items-center gap-2 bg-slate-50 rounded-xl p-2.5 px-3 border border-slate-100/80 flex-1">
                         <span className="text-rose-500 font-bold text-sm leading-none">♀</span> 
                         <span className="text-slate-600">{program.girls}</span>
                      </div>
                   </div>
                </div>

                <div className="mt-4 pt-5 border-t border-slate-100 flex items-center justify-between">
                   <span className="text-[9px] font-black text-slate-400 uppercase tracking-widest">Avg Yield</span>
                   <span className="text-sm font-black text-slate-700">Rs. {Math.round(program.avg || 0).toLocaleString()}</span>
                </div>
             </motion.div>
           ))}
        </div>
`;
   lines.splice(startIdx, (actualEndIdx - startIdx) + 1, newContent);
   fs.writeFileSync('src/components/DashboardView.tsx', lines.join('\n'));
   console.log('Replaced successfully');
} else {
   console.log('Not found');
}
