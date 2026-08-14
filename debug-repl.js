const express = require('express');
console.log('Requiring route...');
const r = require('./route');
console.log('Router loaded:', typeof r, r && r.stack && r.stack.length ? 'stack length '+r.stack.length : 'no stack');
// dump stack entries of the router if present
if (r && r.stack) {
  r.stack.forEach((s,i)=>{
    try {
      if (s.route) console.log(i, 'route', Object.keys(s.route.methods).join(',') , s.route.path);
      else console.log(i, 'layer', s.name || (s.regexp && s.regexp.source) || 'anon');
    } catch(e){ console.log('err printing stack', e.message); }
  });
}
// mount and show app layers if available
const app = express();
app.use('/api', r);
if (app._router && app._router.stack) {
  console.log('app layers:', app._router.stack.map(l => l.name));
} else {
  console.log('app._router missing');
}
