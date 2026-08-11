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
  if (file.includes('safeFormat.ts')) return;

  let content = fs.readFileSync(file, 'utf8');
  let changed = false;

  // We only want to replace `new Date(variable)` not `new Date()`.
  // Regex looks for `new Date(` followed by something other than `)`
  // Then we replace it with `parseSafeDate(`
  const regex = /new Date\(([^)]+)\)/g;
  
  if (regex.test(content)) {
    content = content.replace(regex, "parseSafeDate($1)");
    changed = true;
  }

  if (changed) {
    // add import if not there
    if (!content.includes('parseSafeDate')) {
        // This shouldn't happen because we just added parseSafeDate, but to be sure we check if we need to add the import
    }
    
    // Actually, we can just replace the import from safeFormat to include parseSafeDate
    if (content.includes("import { format } from '@/src/utils/safeFormat';") && !content.includes("parseSafeDate")) {
      content = content.replace(
        "import { format } from '@/src/utils/safeFormat';",
        "import { format, parseSafeDate } from '@/src/utils/safeFormat';"
      );
    } else if (!content.includes("parseSafeDate") && !content.includes("@/src/utils/safeFormat")) {
      content = "import { parseSafeDate } from '@/src/utils/safeFormat';\n" + content;
    } else if (content.includes("import { format } from '@/src/utils/safeFormat';") && content.includes("parseSafeDate")) {
        // already there or replaced above
    } else if (!content.includes("import { parseSafeDate } from '@/src/utils/safeFormat';")) {
        content = "import { parseSafeDate } from '@/src/utils/safeFormat';\n" + content;
    }

    fs.writeFileSync(file, content, 'utf8');
    console.log(`Updated ${file}`);
  }
});
