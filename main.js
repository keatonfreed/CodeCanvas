const { app, BrowserWindow, ipcMain, screen } = require('electron')
const path = require('path')
const utils = require('./utils')

function createWindow() {
    const { width, height } = screen.getPrimaryDisplay().workAreaSize;

    let win = new BrowserWindow({
        width: Math.round(width * 0.8),  // 80% of screen width
        height: Math.round(height * 0.8),  // 80% of screen height
        webPreferences: {
            nodeIntegration: true,
            contextIsolation: false,
            enableRemoteModule: true,
            // preload: path.join(__dirname, 'preload.js') // add preload script here
            additionalArguments: [`--projects-path=${path.join(app.getPath('userData'), 'CodeCanvasProjects')}`]
        },
    })

    win.loadFile('index.html')
    win.setMenu(null);
    // win.webContents.openDevTools()
}

app.whenReady().then(createWindow)

app.on('window-all-closed', () => {
    if (process.platform !== 'darwin') app.quit()
})

app.on('activate', () => {
    if (BrowserWindow.getAllWindows().length === 0) createWindow()
})

ipcMain.handle('capture', async (event, html, css, js, width, height, outputPath) => {

    let cleanHtml = utils.cleanCode(html, css, js)

    await utils.capture(cleanHtml, width, height, outputPath)

    return outputPath
})

ipcMain.handle('downloadsPath', async (event) => {
    return app.getPath('downloads')
})
