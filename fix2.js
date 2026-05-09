const fs = require('fs');
const content = fs.readFileSync('src/components/AdmissionsView.tsx', 'utf8');

const startStr = `<Separator className="my-10" />`;
const startIndex = content.indexOf(startStr);

if (startIndex !== -1) {
    const endStr = `</div>
    </div>
  );
}`;
    const endIndex = content.lastIndexOf(endStr);
    
    if (endIndex !== -1) {
        const replacement = `      {/* Form Preview Dialog */}
      <Dialog open={isPreviewOpen} onOpenChange={setIsPreviewOpen}>
        <DialogContent className="max-w-[95vw] w-[95vw] h-[90vh] p-0 border-none bg-slate-50 rounded-3xl overflow-hidden flex flex-col">
          <AdmissionSlip 
            admission={{...formData, id: 'ST-PREVIEW', session: selectedSession}} 
            settings={data.settings} 
          />
        </DialogContent>
      </Dialog>
    </div>
  );
}`;
        
        const newContent = content.substring(0, startIndex) + replacement;
        fs.writeFileSync('src/components/AdmissionsView.tsx', newContent);
        console.log("Successfully replaced the final details preview section with the Dialog.");
    } else {
        console.log("Could not find endStr.");
    }
} else {
    console.log("Could not find start string.");
}
