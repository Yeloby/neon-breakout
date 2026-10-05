const { build } = require('../../../package.json');

module.exports = {
  ...build,
  linux: { ...build.linux, target: ['AppImage'] },
  directories: { ...build.directories, output: 'dist/appimage-sandboxed-candidate' },
  extraFiles: [
    ...(build.extraFiles || []),
    { from: 'build/linux/appimage/AppRun', to: 'AppRun' }
  ]
};
