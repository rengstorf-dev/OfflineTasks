const fs = require('fs');
const path = require('path');

const root = path.resolve(__dirname, '..');
const templatePath = path.join(root, 'src', 'index.template.html');
const distPath = path.join(root, 'dist', 'task-manager.html');

const css = fs.readFileSync(path.join(root, 'src', 'styles.css'), 'utf8');
const scriptOrder = [
    path.join(root, 'src', 'api', 'client.js'),
    path.join(root, 'src', 'api', 'store-sync.js'),
    path.join(root, 'src', 'settings.js'),
    path.join(root, 'src', 'store.js'),
    path.join(root, 'src', 'views', 'outline.js'),
    path.join(root, 'src', 'views', 'kanban.js'),
    path.join(root, 'src', 'views', 'gantt.js'),
    path.join(root, 'src', 'views', 'mindmap.js'),
    path.join(root, 'src', 'ui', 'toolbar.js'),
    path.join(root, 'src', 'ui', 'modals.js'),
    path.join(root, 'src', 'app.js'),
    path.join(root, 'src', 'main.js'),
];

const scripts = scriptOrder
    .map((file) => fs.readFileSync(file, 'utf8'))
    .join('\n\n');

const template = fs.readFileSync(templatePath, 'utf8');
const html = template
    .replace('<!-- INJECT_STYLES -->', `<style>
${css}
</style>`)
    .replace('<!-- INJECT_SCRIPTS -->', `<script>
${scripts}
</script>`);

fs.mkdirSync(path.dirname(distPath), { recursive: true });
fs.writeFileSync(distPath, html, 'utf8');
console.log('Built dist/task-manager.html');
