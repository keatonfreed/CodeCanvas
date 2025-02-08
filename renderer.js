const { ipcRenderer, shell } = require('electron')
const path = require('path')
const utils = require('./utils')

let currentProject = utils.getRecentProject() || utils.newProject();

let htmlEditor, cssEditor, jsEditor;

let selectProject = document.getElementById('project-select')
selectProject.addEventListener('change', (event) => {
    let selectedId = event.target.value
    if (selectedId === currentProject.id) return
    if (currentProject.id) {
        utils.saveProject(currentProject)
    }
    let selectedProject = utils.getProject(selectedId)
    if (selectProject) {
        currentProject = selectedProject;
        utils.saveProject(currentProject)
        updateElements(currentProject)
    } else {
        console.log("Selected project that is broken:", selectedId, selectProject)
    }

});

function updateElements(projectState, updateEditors = true) {
    if (!projectState) {
        console.log('no project passed to update');
        return;
    }
    document.getElementById('project-name').value = projectState.name

    let allProjects = utils.getProjects();

    selectProject.innerHTML = '';

    allProjects.sort((a, b) => b.timestamp - a.timestamp);
    allProjects.forEach(project => {
        let option = document.createElement('option');
        option.value = project.id;
        option.text = project.name;
        selectProject.add(option);
    });

    if (selectProject.value !== projectState.id) {
        let thisProject = Array.from(selectProject.options).find(option => option.value === projectState.id.toString())
        if (thisProject) {
            thisProject.selected = true
        }
    }

    if (updateEditors) {
        htmlEditor.setValue(projectState.html);
        cssEditor.setValue(projectState.css);
        jsEditor.setValue(projectState.js);
    }
    document.getElementById('width').value = projectState.width;
    document.getElementById('height').value = projectState.height;

    updatePreview(projectState)
}


function updatePreview(projectState) {
    const iframe = document.getElementById('code-preview');
    const iframeWrapper = document.getElementById('iframe-wrapper');
    const iframeDoc = iframe.contentWindow.document;

    let editedCode = utils.cleanCode(projectState.html, projectState.css, projectState.js);

    iframeDoc.open();
    iframeDoc.write(editedCode);
    iframeDoc.close();

    let ratio = projectState.width / projectState.height;
    let parentRatio = iframeWrapper.clientWidth / iframeWrapper.clientHeight;

    iframe.style.width = projectState.width + 'px';
    iframe.style.height = projectState.height + 'px';

    let scale = iframeWrapper.clientHeight / (parentRatio > ratio ? projectState.height : projectState.width);

    iframe.style.transform = `scale(${scale})`;
}


function setupComponents() {
    htmlEditor = ace.edit("html-editor");
    htmlEditor.setTheme("ace/theme/monokai");
    htmlEditor.session.setMode("ace/mode/html");
    htmlEditor.session.on('change', function () {
        currentProject.html = htmlEditor.getValue();
        updateElements(currentProject, false)
    });

    cssEditor = ace.edit("css-editor");
    cssEditor.setTheme("ace/theme/monokai");
    cssEditor.session.setMode("ace/mode/css");
    cssEditor.session.on('change', function () {
        currentProject.css = cssEditor.getValue();
        updateElements(currentProject, false)
    });

    jsEditor = ace.edit("js-editor");
    jsEditor.setTheme("ace/theme/monokai");
    jsEditor.session.setMode("ace/mode/javascript");
    jsEditor.session.on('change', function () {
        currentProject.js = jsEditor.getValue();
        updateElements(currentProject, false)
    });

    window.addEventListener('resize', () => {
        htmlEditor.resize();
        cssEditor.resize();
        jsEditor.resize();
        updateElements(currentProject, false)
    });
}
setupComponents()

window.addEventListener('load', () => {
    console.log("PAGE LOAD")
    updateElements(currentProject)
});

window.addEventListener('beforeunload', () => {
    utils.saveProject(currentProject)
});

document.getElementById('new-project').addEventListener('click', (e) => {
    if (currentProject) {
        utils.saveProject(currentProject)
    }
    currentProject = utils.newProject()
    updateElements(currentProject)
});

document.getElementById('delete-project').addEventListener('click', (e) => {
    utils.deleteProject(currentProject)
    currentProject = utils.getRecentProject()
    if (!currentProject) {
        currentProject = utils.newProject()
    }
    updateElements(currentProject)
});


document.getElementById('project-name').addEventListener('input', (e) => {
    currentProject.name = e.target.value
    utils.saveProject(currentProject)
    updateElements(currentProject)
});

document.getElementById('width').addEventListener('input', (e) => {
    currentProject.width = e.target.valueAsNumber
    utils.saveProject(currentProject)
    updateElements(currentProject)
});

document.getElementById('height').addEventListener('input', (e) => {
    currentProject.height = e.target.valueAsNumber
    utils.saveProject(currentProject)
    updateElements(currentProject)
});



async function generatePNG() {
    const randomNumbers = utils.randomId(5);
    const downloadsPath = await ipcRenderer.invoke('downloadsPath')
    const outputPath = path.join(downloadsPath, `CodeCanvas-${randomNumbers}.png`);

    await ipcRenderer.invoke('capture', currentProject.html, currentProject.css, currentProject.js, currentProject.width, currentProject.height, outputPath);

    document.getElementById('preview').src = outputPath;
    document.getElementById('modal').style.display = 'flex';
}

document.getElementById('open').addEventListener('click', () => {
    const outputPath = document.getElementById('preview').src;
    shell.showItemInFolder(outputPath);
});

// Handle the "Cancel" button click
document.getElementById('modal').addEventListener('click', (e) => {
    if (e.target.id === "cancel" || e.target.id === "modal")
        document.getElementById('modal').style.display = 'none';
});