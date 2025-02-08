let fs = require('fs')

let PROJECTS_PATH = (process.argv.find(arg => arg.startsWith('--projects-path=')) || '').split('=')[1];
if (PROJECTS_PATH) {
    fs.mkdirSync(PROJECTS_PATH, { recursive: true });
}

function cleanCode(html, css, js) {
    if (!/<html>/i.test(html)) {
        html = `<html>${html}</html>`;
    }

    // If <body> tag is missing from the HTML, add it
    if (!/<body>/i.test(html)) {
        html = html.replace(/<html>/i, '<html><body>');
        html = html.replace(/<\/html>/i, '</body></html>');
    }

    // If <head> tag is missing from the HTML, add it inside <html>
    if (!/<head>/i.test(html)) {
        html = html.replace(/<html>/i, '<html><head></head>');
    }

    // Inject CSS and JS into the HTML
    html = html.replace('</head>', `<style>${css}</style></head>`);
    html = html.replace('</body>', `<script>${js}</script></body>`);

    return html;
}

function importProject() {
    remote.dialog.showOpenDialog({ properties: ['openFile'], filters: [{ name: 'CodeCanvas Projects', extensions: ['json'] }] })
        .then(({ canceled, filePaths }) => {
            if (!canceled && filePaths.length > 0) {
                openProject(filePaths[0]);
            }
        });
}

function randomId(length = 5) {
    multiplier = 10 ** (length - 1)
    return Math.floor(Math.random() * (9 * multiplier)) + 1 * multiplier;
}

function newProject() {
    projectId = randomId(8)
    projectName = `Project-${randomId(3)}`
    const projectPath = path.join(PROJECTS_PATH, `${projectId}.json`);
    const projectData = {
        id: projectId,
        timestamp: Date.now(),
        name: projectName,
        html: `<h1>${projectName}</h1>`,
        css: "* {\n    margin:0;\n}\n\nbody {\n    background:black;\n    color:white;\n}\n\nh1 {\n    position:absolute;\n    left:50%;\n    top:50%;\n    translate:-50% -50%;\n    font-family:sans-serif;\n    font-size:2rem;\n}",
        js: "//You can run Javascript here (no async code)",
        width: 500,
        height: 500
    };
    fs.writeFileSync(projectPath, JSON.stringify(projectData, null, 2));
    return projectData;
}

function saveProject(project) {
    const projectId = project.id;
    const projectPath = path.join(PROJECTS_PATH, `${projectId}.json`);
    project.timestamp = Date.now()
    const jsonData = JSON.stringify(project);

    fs.writeFileSync(projectPath, jsonData, 'utf8');
}

function getRecentProject() {
    const projects = getProjects();

    if (projects.length === 0) return null;

    let closestTimestamp = -Infinity;
    let closestProject = null;

    projects.forEach(project => {
        if (project.timestamp > closestTimestamp) {
            closestTimestamp = project.timestamp;
            closestProject = project;
        }
    });

    return closestProject;
}

function getProject(projectId) {
    const projectPath = path.join(PROJECTS_PATH, `${projectId}.json`);
    let jsonData = fs.readFileSync(projectPath, 'utf8');
    if (!jsonData) return null
    return JSON.parse(jsonData);
}

function getProjects() {
    const allFiles = fs.readdirSync(PROJECTS_PATH);
    const jsonFiles = allFiles.filter(file => path.extname(file) === '.json');

    const projects = jsonFiles.map(file => {
        const projectId = path.basename(file, '.json');
        return getProject(projectId);
    });

    return projects.filter(project => project !== null);
}

function deleteProject(project) {
    let projectId = project.id || project
    const projectPath = path.join(PROJECTS_PATH, `${projectId}.json`);
    fs.unlinkSync(projectPath);
}

const puppeteer = require('puppeteer')
const path = require('path')

async function capture(html, width, height, outputPath) {
    const browser = await puppeteer.launch();
    const page = await browser.newPage();

    await page.setViewport({ width: parseInt(width), height: parseInt(height) });

    // Function to convert local image paths to Base64
    function embedLocalImages(htmlContent) {
        return htmlContent.replace(/src="([^"]+)"/g, (match, src) => {
            if (!src.startsWith('http') && !src.startsWith('file://')) {
                const imagePath = path.resolve(__dirname, src);
                if (fs.existsSync(imagePath)) {
                    const fileExtension = path.extname(imagePath).substring(1);
                    const imageData = fs.readFileSync(imagePath).toString('base64');
                    return `src="data:image/${fileExtension};base64,${imageData}"`;
                }
            }
            return match;
        });
    }

    // Embed local images as Base64 data URLs
    const updatedHtml = embedLocalImages(html);

    await page.setContent(updatedHtml, { waitUntil: 'networkidle0' });

    // // Log any console errors
    // page.on('console', msg => {
    //     if (msg.type() === 'error') {
    //         console.error('PAGE ERROR:', msg.text());
    //     }
    // });

    await page.screenshot({ path: outputPath, omitBackground: true });

    await browser.close();
}


module.exports = { capture, randomId, cleanCode, getRecentProject, getProject, getProjects, saveProject, newProject, deleteProject };