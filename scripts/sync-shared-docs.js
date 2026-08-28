const fs = require('node:fs');
const path = require('node:path');

const root = path.resolve(__dirname, '..');
const sharedFiles = [
  ['PROJECT_INSTRUCTIONS.md', 'PROJECT_INSTRUCTIONS.md'],
  ['MASTER_ROADMAP.md', 'MASTER_ROADMAP.md'],
  ['PROJECT_STATE.md', 'PROJECT_STATE.md'],
  ['docs/architecture/SYSTEM_ARCHITECTURE.md', 'SYSTEM_ARCHITECTURE.md'],
  ['docs/architecture/MODULE_BOUNDARIES.md', 'MODULE_BOUNDARIES.md'],
  ['docs/architecture/ARCHITECTURE_PRINCIPLES.md', 'ARCHITECTURE_PRINCIPLES.md'],
  ['docs/architecture/DOMAIN_MODEL.md', 'DOMAIN_MODEL.md'],
  ['docs/architecture/DOMAIN_GLOSSARY.md', 'DOMAIN_GLOSSARY.md'],
  ['docs/security/AUTHORIZATION_ARCHITECTURE.md', 'AUTHORIZATION_ARCHITECTURE.md'],
  ['docs/security/SECURITY_ARCHITECTURE.md', 'SECURITY_ARCHITECTURE.md'],
  ['docs/architecture/INFRASTRUCTURE_BOUNDARIES.md', 'INFRASTRUCTURE_BOUNDARIES.md'],
  ['docs/architecture/NON_FUNCTIONAL_REQUIREMENTS.md', 'NON_FUNCTIONAL_REQUIREMENTS.md'],
];

const targets = [
  path.join(root, 'hiringloop-frontend', 'docs-shared'),
  path.join(root, 'hiringloop-backend', 'docs-shared'),
];

for (const [sourceRelative, destinationName] of sharedFiles) {
  const source = path.join(root, sourceRelative);
  if (!fs.existsSync(source) || !fs.statSync(source).isFile()) {
    throw new Error(`Required root documentation source is missing: ${sourceRelative}`);
  }
}

for (const target of targets) {
  fs.mkdirSync(target, { recursive: true });
  for (const [sourceRelative, destinationName] of sharedFiles) {
    const source = path.join(root, sourceRelative);
    const destination = path.join(target, destinationName);
    fs.copyFileSync(source, destination);
    console.log(`${path.relative(root, destination)} <= ${sourceRelative}`);
  }
}

