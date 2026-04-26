process.chdir(__dirname + '/apps/web');
process.argv = [process.argv[0], process.argv[1], 'dev', '--port', '3000'];
require('next/dist/bin/next');
