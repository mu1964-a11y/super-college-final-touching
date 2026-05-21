const fs = require("fs");
const file = "/app/applet/src/components/AcademicView.tsx";
let content = fs.readFileSync(file, "utf8");
// Keep lines 1-269 
const topPart = content.split("\n").slice(0, 269).join("\n");
fs.writeFileSync("/app/applet/topPart.txt", topPart);
