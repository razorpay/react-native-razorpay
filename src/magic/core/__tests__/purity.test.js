const fs = require('fs');
const path = require('path');

const CORE = path.resolve(__dirname, '..');

function coreSourceFiles(dir) {
  return fs.readdirSync(dir, { withFileTypes: true }).flatMap((entry) => {
    if (entry.name === '__tests__') return [];
    const full = path.join(dir, entry.name);
    if (entry.isDirectory()) return coreSourceFiles(full);
    return entry.name.endsWith('.js') ? [full] : [];
  });
}

describe('core purity', () => {
  it('should keep the core platform-neutral then import no react-native', () => {
    const offenders = coreSourceFiles(CORE).filter((file) =>
      /from\s+['"]react-native['"]|require\(['"]react-native['"]\)/.test(
        fs.readFileSync(file, 'utf8')
      )
    );
    expect(offenders).toEqual([]);
  });
});
