const fs = require('fs');
const { execSync } = require('child_process');
const path = require('path');

const repos = [
  'rakshanet-shield',
  'mh-dental-world',
  'policy-ai',
  'apna-school-management'
];

const contactSection = "\\n\\n---\\n\\n## \uD83D\uDCDE Tech Solutions & Support\\n\\nLooking for custom tech solutions, enterprise implementations, or need support with this project? Let's connect!\\n\\n- **Contact Number / WhatsApp:** `+91 7019145837`\\n- **GitHub Profile:** [@fazil-dev-tech](https://github.com/fazil-dev-tech)\\n\\n<div align=\\"center\\">\\n  <br/>\\n  <i>Built with \u2764\uFE0F by Fazil. Delivering Premium Tech Solutions.</i>\\n</div>\\n";

const tempDir = path.join(__dirname, 'repo_updates');
if (!fs.existsSync(tempDir)) {
  fs.mkdirSync(tempDir);
}

for (const repo of repos) {
  console.log("Processing " + repo + "...");
  const repoUrl = "https://github.com/fazil-dev-tech/" + repo + ".git";
  const repoPath = path.join(tempDir, repo);

  try {
    if (!fs.existsSync(repoPath)) {
      execSync("git clone " + repoUrl + " " + repo, { cwd: tempDir, stdio: 'inherit' });
    }

    const readmePath = path.join(repoPath, 'README.md');
    
    if (fs.existsSync(readmePath)) {
      const currentContent = fs.readFileSync(readmePath, 'utf8');
      if (currentContent.includes('7019145837')) {
        console.log("Contact info already exists in " + repo + ", skipping.");
        continue;
      }
      fs.appendFileSync(readmePath, contactSection);
    } else {
      fs.writeFileSync(readmePath, "# " + repo + "\\n" + contactSection);
    }

    execSync('git add README.md', { cwd: repoPath });
    execSync('git commit -m "docs: add premium tech solutions and contact info"', { cwd: repoPath });
    try {
      execSync('git push origin main', { cwd: repoPath });
      console.log("Successfully updated " + repo + " (main branch)");
    } catch (e) {
      execSync('git push origin master', { cwd: repoPath });
      console.log("Successfully updated " + repo + " (master branch)");
    }
  } catch (error) {
     console.log("Error processing " + repo + ": " + error.message);
  }
}
console.log('All done!');
