#!/usr/bin/env node

import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Function to recursively find all TypeScript files
function findTsFiles(dir, fileList = []) {
  const files = fs.readdirSync(dir);
  
  files.forEach(file => {
    const filePath = path.join(dir, file);
    const stat = fs.statSync(filePath);
    
    if (stat.isDirectory() && !file.startsWith('.') && file !== 'node_modules' && file !== 'dist') {
      findTsFiles(filePath, fileList);
    } else if (file.endsWith('.ts')) {
      fileList.push(filePath);
    }
  });
  
  return fileList;
}

// Function to fix imports in a file
function fixImportsInFile(filePath) {
  try {
    let content = fs.readFileSync(filePath, 'utf8');
    let modified = false;
    
    // Pattern to match local imports without .js extension
    const importPattern = /import\s+.*?\s+from\s+['"]\.\.?\/[^'"]*?['"];?/g;
    
    content = content.replace(importPattern, (match) => {
      // Skip if already has .js extension or is importing from node_modules
      if (match.includes('.js') || match.includes('@') || match.includes('node_modules')) {
        return match;
      }
      
      // Skip if it's importing a directory (has no extension and ends with /)
      if (match.match(/['"]\.\.?\/[^'"]*\/['"]/)) {
        return match;
      }
      
      // Add .js extension to relative imports
      const newMatch = match.replace(/['"]\.\.?\/[^'"]*['"]/, (importPath) => {
        if (!importPath.includes('.js') && !importPath.includes('@') && !importPath.includes('node_modules')) {
          return importPath.replace(/['"]$/, '.js"').replace(/['"]$/, '.js"');
        }
        return importPath;
      });
      
      if (newMatch !== match) {
        modified = true;
        return newMatch;
      }
      
      return match;
    });
    
    if (modified) {
      fs.writeFileSync(filePath, content, 'utf8');
      console.log(`✅ Fixed imports in: ${filePath}`);
      return true;
    }
    
    return false;
  } catch (error) {
    console.error(`❌ Error processing ${filePath}:`, error.message);
    return false;
  }
}

// Main execution
console.log('🔧 Starting comprehensive import fix for Render deployment...\n');

const srcDir = path.join(__dirname, 'src');
const tsFiles = findTsFiles(srcDir);

console.log(`📁 Found ${tsFiles.length} TypeScript files to check\n`);

let fixedCount = 0;
let errorCount = 0;

tsFiles.forEach(filePath => {
  try {
    if (fixImportsInFile(filePath)) {
      fixedCount++;
    }
  } catch (error) {
    console.error(`❌ Error with ${filePath}:`, error.message);
    errorCount++;
  }
});

console.log(`\n🎉 Import fix completed!`);
console.log(`✅ Files fixed: ${fixedCount}`);
console.log(`❌ Errors: ${errorCount}`);
console.log(`📊 Total files processed: ${tsFiles.length}`);

if (fixedCount > 0) {
  console.log('\n🚀 Ready for Render deployment! All ES module imports now have .js extensions.');
  console.log('📝 Next steps:');
  console.log('   1. Run: npm run build');
  console.log('   2. Test: node dist/index.js');
  console.log('   3. Push to GitHub for Render deployment');
}
