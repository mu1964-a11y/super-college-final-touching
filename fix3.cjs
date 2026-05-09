const fs = require('fs');
const content = fs.readFileSync('src/components/AdmissionsView.tsx', 'utf8');

const startStr = `<Separator className="my-10" />`;
const startIndex = content.indexOf(startStr);

if (startIndex !== -1) {
    const endStr = `          <Dialog open={isPreviewOpen} onOpenChange={setIsPreviewOpen}>`; // Wait, does the old string exist? No, it's just what it was.
    // Let's accurately match the end of the file.
    const endStrMatch = `          {/* Watermark */}`;
    const endIndex = content.lastIndexOf(endStrMatch);
    
    if (endIndex !== -1) {
        const remainingEnd = `    </div>
  );
}`;
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
}
`;
        const newContent = content.substring(0, startIndex) + replacement;
        fs.writeFileSync('src/components/AdmissionsView.tsx', newContent);
        console.log("Successfully replaced the final details preview section with the Dialog.");
    } else {
        console.log("Could not find endStr.");
    }
} else {
    console.log("Could not find start string.");
}
