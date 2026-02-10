const fs = require('fs');
const path = require('path');

const RED = '\x1b[31m';
const GREEN = '\x1b[32m';
const RESET = '\x1b[0m';

let hasError = false;

function walkDir(dir, callback) {
  if (!fs.existsSync(dir)) return;
  fs.readdirSync(dir).forEach(f => {
    let dirPath = path.join(dir, f);
    let isDirectory = fs.statSync(dirPath).isDirectory();
    if (isDirectory) {
      walkDir(dirPath, callback);
    } else {
      callback(path.join(dir, f));
    }
  });
}

console.log('Running Architecture Tests...\n');

// Rule 1: Core must not import from Renderer
const coreDir = path.join(__dirname, '../packages/core');
walkDir(coreDir, (filePath) => {
  if (!filePath.endsWith('.ts') && !filePath.endsWith('.tsx')) return;
  const content = fs.readFileSync(filePath, 'utf8');
  
  if (content.match(/from\s+['"]@insight\/desktop['"]/)) {
    console.error(`${RED}[FAIL] Core imports desktop package in ${filePath}${RESET}`);
    hasError = true;
  }
  if (content.match(/from\s+['"]\.\.\/apps\/desktop['"]/)) {
    console.error(`${RED}[FAIL] Core imports desktop relative path in ${filePath}${RESET}`);
    hasError = true;
  }
});

// Rule 2: Renderer must not access DB or Tokens directly (No @insight/core imports)
// Renderer should only use @insight/shared or IPC
const rendererDir = path.join(__dirname, '../apps/desktop/src/renderer');
walkDir(rendererDir, (filePath) => {
  if (!filePath.endsWith('.ts') && !filePath.endsWith('.tsx')) return;
  const content = fs.readFileSync(filePath, 'utf8');

  // Check for direct core imports (where DB logic resides)
  if (content.match(/from\s+['"]@insight\/core['"]/)) {
    console.error(`${RED}[FAIL] Renderer imports core directly in ${filePath}. Use IPC.${RESET}`);
    hasError = true;
  }
  
  // Check for direct sqlite imports
  if (content.match(/from\s+['"]better-sqlite3['"]/)) {
    console.error(`${RED}[FAIL] Renderer imports sqlite directly in ${filePath}.${RESET}`);
    hasError = true;
  }
});

if (hasError) {
  console.error(`\n${RED}Architecture tests failed.${RESET}`);
  process.exit(1);
} else {
  console.log(`${GREEN}Architecture tests passed.${RESET}`);
  process.exit(0);
}
