const fs = require('fs');
const path = require('path');

function walk(dir) {
  let results = [];
  const list = fs.readdirSync(dir);
  list.forEach(function(file) {
    file = path.join(dir, file);
    const stat = fs.statSync(file);
    if (stat && stat.isDirectory()) { 
      results = results.concat(walk(file));
    } else { 
      if (file.endsWith('.ts') || file.endsWith('.tsx')) {
        results.push(file);
      }
    }
  });
  return results;
}

const files = walk('./src');
files.forEach(file => {
  let content = fs.readFileSync(file, 'utf8');
  if (content.includes('parseSafeDate') && !content.includes("import { parseSafeDate") && !content.includes("import { format, parseSafeDate")) {
      if (content.includes("import { format } from '@/src/utils/safeFormat';")) {
          content = content.replace("import { format } from '@/src/utils/safeFormat';", "import { format, parseSafeDate } from '@/src/utils/safeFormat';");
      } else {
          content = "import { parseSafeDate } from '@/src/utils/safeFormat';\n" + content;
      }
      fs.writeFileSync(file, content, 'utf8');
      console.log(`Fixed import in ${file}`);
  }
});
