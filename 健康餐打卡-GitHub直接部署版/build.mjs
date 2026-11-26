import {readFile,writeFile} from 'node:fs/promises';
const read=name=>readFile(new URL('./src/'+name,import.meta.url),'utf8');
const [html,css,storage,app]=await Promise.all(['template.html','style.css','storage.js','app.js'].map(read));
const script=s=>s.replace(/<\/script/gi,'<\\/script');
const out=html.replace('<link rel="stylesheet" href="style.css">',()=>'<style>'+css+'</style>').replace('<script src="app.js"></script>',()=>'<script>'+script(storage)+'\n'+script(app)+'</script>');
await writeFile(new URL('./index.html',import.meta.url),out);
console.log('已生成单文件 index.html，可以直接上传 GitHub Pages。');
