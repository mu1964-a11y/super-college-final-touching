const fs = require("fs");
const file = "/app/applet/src/components/AcademicView.tsx";
let content = fs.readFileSync(file, "utf8");
console.log("Read successfully, size:", content.length);
