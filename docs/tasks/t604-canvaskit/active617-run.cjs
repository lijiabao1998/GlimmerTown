'use strict';
const path = require('node:path'), { createRequire } = require('node:module');
const { build } = require('./active617-build.cjs');
const built = build();
if (process.argv.includes('--check-overlay')) console.log('T617_OVERLAY_OK ' + JSON.stringify(built.metadata));
else {
  if (!process.argv.includes('--supervised-child') || !['main-t602', 'native-t603'].includes(process.env.T617_ARM) || !['1', '0.7'].includes(process.env.T617_ZOOM)) throw Error('Run active617-net.cjs; timing requires its bounded fresh-child supervisor');
  const file = path.join(built.scenes, 'scene603.js');
  new Function('require', '__filename', '__dirname', 'metadata617', built.source)(createRequire(file), file, built.scenes, built.metadata);
}
