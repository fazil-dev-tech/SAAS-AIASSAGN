const fs = require('fs');
let c = fs.readFileSync('src/app/page.js', 'utf8');

// 1. Add AnimatePresence
c = c.replace(/<div className="container" style={{ paddingTop: '1.5rem' }}>/g, 
  '<div className="container" style={{ paddingTop: \'1.5rem\' }}>\n        <AnimatePresence mode="wait">');
  
// 2. Add AnimatePresence closing tag before toasts
c = c.replace(/({\/\* ── TOASTS ── \*\/})/g, '</AnimatePresence>\n\n      $1');

// 3. Replace <div className="page active"... with <motion.div className="page active"...
c = c.replace(/<div className="page active"/g, '<motion.div className="page active"');

// 4. Close the motion.div properly
// This is tricky because we just changed <div to <motion.div. We need to change the matching </div>.
// Since each view is wrapped like {view === '...' && (<motion.div ...> ... </div>)}, 
// we can regex replace the closing div that comes right before the next {view === or the end of AnimatePresence.
c = c.replace(/<\/div>\n\s*(\/\*|{\/\* ══════════════════════════════════════════)/g, '</motion.div>\n        $1');
// Also the last one before </AnimatePresence>
c = c.replace(/<\/div>\n\s*<\/AnimatePresence>/g, '</motion.div>\n        </AnimatePresence>');

// 5. Add motion props to the opening tags
c = c.replace(/className="page active"/g, 
  'className="page active" key={view} initial={{ opacity: 0, y: 20, filter: "blur(10px)" }} animate={{ opacity: 1, y: 0, filter: "blur(0px)" }} exit={{ opacity: 0, y: -20, filter: "blur(10px)" }} transition={{ duration: 0.5, ease: "easeOut" }}');

fs.writeFileSync('src/app/page.js', c);
console.log('done');
