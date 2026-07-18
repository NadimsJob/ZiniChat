const fs = require('fs');
const path = require('path');

const directoryPath = 'F:\\AI Assistant SAAS\\frontend\\src\\app\\superadmin';

function walkSync(dir, filelist) {
  let files = fs.readdirSync(dir);
  filelist = filelist || [];
  files.forEach(function (file) {
    if (fs.statSync(path.join(dir, file)).isDirectory()) {
      filelist = walkSync(path.join(dir, file), filelist);
    } else {
      if (file === 'page.tsx') {
        filelist.push(path.join(dir, file));
      }
    }
  });
  return filelist;
}

const files = walkSync(directoryPath);

const replacements = [
  { from: /space-y-8/g, to: 'space-y-4' },
  { from: /space-y-6/g, to: 'space-y-3' },
  { from: /space-y-4/g, to: 'space-y-2' },
  { from: /gap-8/g, to: 'gap-4' },
  { from: /gap-6/g, to: 'gap-3' },
  { from: /gap-4/g, to: 'gap-2.5' },
  { from: /p-8/g, to: 'p-4' },
  { from: /p-6/g, to: 'p-3' },
  { from: /p-4/g, to: 'p-2.5' },
  { from: /px-8/g, to: 'px-4' },
  { from: /px-6/g, to: 'px-3' },
  { from: /px-4/g, to: 'px-2.5' },
  { from: /py-8/g, to: 'py-4' },
  { from: /py-6/g, to: 'py-3' },
  { from: /py-4/g, to: 'py-2' },
  { from: /mb-8/g, to: 'mb-4' },
  { from: /mb-6/g, to: 'mb-3' },
  { from: /mb-4/g, to: 'mb-2' },
  { from: /mt-8/g, to: 'mt-4' },
  { from: /mt-6/g, to: 'mt-3' },
  { from: /mt-4/g, to: 'mt-2' },
  { from: /pb-12/g, to: 'pb-6' },
  { from: /pb-8/g, to: 'pb-4' },
  { from: /pb-6/g, to: 'pb-3' },
  { from: /pt-8/g, to: 'pt-4' },
  { from: /pt-6/g, to: 'pt-3' },
  { from: /text-3xl/g, to: 'text-xl' },
  { from: /text-2xl/g, to: 'text-lg' },
  { from: /text-xl/g, to: 'text-[15px]' },
  { from: /text-lg/g, to: 'text-[13px]' },
  { from: /text-sm/g, to: 'text-[12px]' },
  { from: /rounded-2xl/g, to: 'rounded-xl' },
  { from: /w-12 h-12/g, to: 'w-8 h-8' },
  { from: /w-10 h-10/g, to: 'w-7 h-7' },
  { from: /w-8 h-8/g, to: 'w-6 h-6' },
  { from: /w-6 h-6/g, to: 'w-4 h-4' },
  { from: /w-5 h-5/g, to: 'w-4 h-4' }
];

files.forEach(file => {
  let content = fs.readFileSync(file, 'utf8');
  replacements.forEach(r => {
    content = content.replace(r.from, r.to);
  });
  fs.writeFileSync(file, content);
  console.log('Processed', file);
});
