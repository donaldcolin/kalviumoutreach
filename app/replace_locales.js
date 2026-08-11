const fs = require('fs');
const path = require('path');
const { execSync } = require('child_process');

function processFile(filePath) {
    let content = fs.readFileSync(filePath, 'utf8');
    let original = content;
    let changed = false;

    // Check if file uses any of the toLocale functions
    if (!content.includes('toLocaleDateString') && !content.includes('toLocaleTimeString') && !content.includes('toLocaleString')) {
        return;
    }

    // Add import if needed
    if (!content.includes("import { format }") && !content.includes("import { format, ")) {
        const importMatch = content.match(/import .* from '.*';\n/g);
        if (importMatch) {
            const lastImportIndex = content.lastIndexOf(importMatch[importMatch.length - 1]);
            const insertIndex = lastImportIndex + importMatch[importMatch.length - 1].length;
            content = content.slice(0, insertIndex) + "import { format } from 'date-fns';\n" + content.slice(insertIndex);
        } else {
            content = "import { format } from 'date-fns';\n" + content;
        }
    }

    // 1. WalkInSessionScreen.tsx
    content = content.replace(
        /new Date\(\)\.toLocaleString\('en-IN', \{ timeZone: 'Asia\/Kolkata', dateStyle: 'short', timeStyle: 'short' \}\)/g,
        "format(new Date(), 'dd/MM/yyyy, hh:mm a')"
    );

    // 2. BugReportScreen.tsx
    content = content.replace(
        /new Date\(\)\.toLocaleString\(\)/g,
        "format(new Date(), 'PPpp')"
    );

    // 3. LeadDetailScreen.tsx
    content = content.replace(
        /d\.toLocaleTimeString\(\[\], \{ hour: '2-digit', minute: '2-digit' \}\)/g,
        "format(d, 'hh:mm a')"
    );
    content = content.replace(
        /d\.toLocaleDateString\('en-US', \{ month: 'short', day: 'numeric', year: 'numeric' \}\)/g,
        "format(d, 'MMM d, yyyy')"
    );
    content = content.replace(
        /d\.toLocaleDateString\('en-US', \{ month: 'short', day: 'numeric' \}\)/g,
        "format(d, 'MMM d')"
    );

    // 4. TaskCard.tsx & UpcomingTasksList.tsx & DailyStatsCard.tsx
    content = content.replace(
        /taskDate\.toLocaleDateString\('en-US', \{ day: 'numeric', month: 'short' \}\)/g,
        "format(taskDate, 'MMM d')"
    );
    content = content.replace(
        /new Date\(dateStr\)\.toLocaleString\('en-US', \{[\s\S]*?\}\)/g,
        "format(new Date(dateStr), 'MMM d')" // TaskCard time
    );
    // Wait, TaskCard has:
    // return new Date(dateStr).toLocaleString('en-US', {
    //  hour: 'numeric',
    //  minute: '2-digit',
    //  hour12: true
    // });
    content = content.replace(
        /new Date\(dateStr\)\.toLocaleString\('en-US',\s*\{\s*hour:\s*'numeric',\s*minute:\s*'2-digit',\s*hour12:\s*true\s*\}\)/g,
        "format(new Date(dateStr), 'h:mm a')"
    );

    content = content.replace(
        /new Date\(dateStr\)\.toLocaleDateString\('en-US',\s*\{\s*month:\s*'short',\s*day:\s*'numeric',\s*year:\s*'numeric'\s*\}\)/g,
        "format(new Date(dateStr), 'MMM d, yyyy')"
    );
    content = content.replace(
        /new Date\(dateStr\)\.toLocaleDateString\('en-US',\s*\{\s*weekday:\s*'short',\s*month:\s*'short',\s*day:\s*'numeric'\s*\}\)/g,
        "format(new Date(dateStr), 'EEE, MMM d')"
    );

    content = content.replace(
        /selectedDate\.toLocaleDateString\('en-US', \{ month: 'short', day: 'numeric' \}\)/g,
        "format(selectedDate, 'MMM d')"
    );
    
    content = content.replace(
        /d\.toLocaleDateString\('en-US', \{ day: 'numeric', month: 'short' \}\)/g,
        "format(d, 'MMM d')"
    );
    
    content = content.replace(
        /d\.toLocaleDateString\('en-US', \{ weekday: 'short' \}\)/g,
        "format(d, 'EEE')"
    );

    // 5. WalkInForm.tsx
    content = content.replace(
        /date\.toLocaleDateString\(\)/g,
        "format(date, 'MM/dd/yyyy')"
    );
    content = content.replace(
        /date\.toLocaleTimeString\(\[\], \{hour: '2-digit', minute:'2-digit'\}\)/g,
        "format(date, 'hh:mm a')"
    );

    // 6. RecordingItem.tsx
    content = content.replace(
        /item\.timestamp\.toDate\(\)\.toLocaleTimeString\(\[\], \{ hour: '2-digit', minute: '2-digit' \}\)/g,
        "format(item.timestamp.toDate(), 'hh:mm a')"
    );
    
    // 7. PushToLsModal.tsx
    content = content.replace(
        /new Date\(item\.lsqCreatedOn\)\.toLocaleDateString\(\)/g,
        "format(new Date(item.lsqCreatedOn), 'MM/dd/yyyy')"
    );

    // 8. useMeetingRecordings.ts
    content = content.replace(
        /d\.toLocaleDateString\(\)/g,
        "format(d, 'MM/dd/yyyy')"
    );

    if (content !== original) {
        fs.writeFileSync(filePath, content, 'utf8');
        console.log(`Updated ${filePath}`);
    }
}

function walkDir(dir) {
    const files = fs.readdirSync(dir);
    for (const file of files) {
        const fullPath = path.join(dir, file);
        if (fs.statSync(fullPath).isDirectory()) {
            walkDir(fullPath);
        } else if (fullPath.endsWith('.ts') || fullPath.endsWith('.tsx')) {
            processFile(fullPath);
        }
    }
}

walkDir(path.join(__dirname, 'src'));
