const { app, BrowserWindow, dialog } = require('electron');
const path = require('path');
const { spawn } = require('child_process');
const fs = require('fs');
const http = require('http');

let mainWindow;
let backendProcess;
let staticServer;
const FRONTEND_PORT = 3001;

// Determine if we're in development or production
const isDev = !app.isPackaged;

// Get the path to backend executable
function getBackendPath() {
    if (isDev) {
        return null;
    } else {
        return path.join(process.resourcesPath, 'backend.exe');
    }
}

// Simple static file server
function startStaticServer() {
    return new Promise((resolve, reject) => {
        if (isDev) {
            resolve();
            return;
        }

        const frontendDir = path.join(__dirname, 'frontend', 'out');

        if (!fs.existsSync(frontendDir)) {
            console.log('Frontend directory not found:', frontendDir);
            resolve();
            return;
        }

        const mimeTypes = {
            '.html': 'text/html',
            '.js': 'application/javascript',
            '.css': 'text/css',
            '.json': 'application/json',
            '.png': 'image/png',
            '.jpg': 'image/jpeg',
            '.gif': 'image/gif',
            '.svg': 'image/svg+xml',
            '.ico': 'image/x-icon',
            '.woff': 'font/woff',
            '.woff2': 'font/woff2',
            '.ttf': 'font/ttf'
        };

        staticServer = http.createServer((req, res) => {
            let urlPath = req.url.split('?')[0];

            // Handle root and trailing slashes
            if (urlPath === '/') {
                urlPath = '/index.html';
            } else if (urlPath.endsWith('/')) {
                urlPath += 'index.html';
            }

            // Try to find the file
            let filePath = path.join(frontendDir, urlPath);

            // If file doesn't exist and not a file extension, try adding .html
            if (!fs.existsSync(filePath) && !path.extname(filePath)) {
                filePath = path.join(frontendDir, urlPath + '.html');
            }

            // If still not found and it's a directory path, try index.html
            if (!fs.existsSync(filePath)) {
                filePath = path.join(frontendDir, urlPath, 'index.html');
            }

            fs.readFile(filePath, (err, data) => {
                if (err) {
                    // Try fallback to index.html for SPA routing
                    fs.readFile(path.join(frontendDir, 'index.html'), (err2, data2) => {
                        if (err2) {
                            res.writeHead(404);
                            res.end('File not found');
                        } else {
                            res.writeHead(200, { 'Content-Type': 'text/html' });
                            res.end(data2);
                        }
                    });
                } else {
                    const ext = path.extname(filePath).toLowerCase();
                    const contentType = mimeTypes[ext] || 'application/octet-stream';
                    res.writeHead(200, { 'Content-Type': contentType });
                    res.end(data);
                }
            });
        });

        staticServer.listen(FRONTEND_PORT, '127.0.0.1', () => {
            console.log(`Static server running at http://127.0.0.1:${FRONTEND_PORT}`);
            resolve();
        });

        staticServer.on('error', (err) => {
            console.error('Static server error:', err);
            reject(err);
        });
    });
}

// Start the backend server
function startBackend() {
    return new Promise((resolve, reject) => {
        const backendPath = getBackendPath();

        if (isDev) {
            console.log('Development mode: assuming backend is running on port 8000');
            resolve();
            return;
        }

        if (!fs.existsSync(backendPath)) {
            reject(new Error(`Backend executable not found: ${backendPath}`));
            return;
        }

        console.log('Starting backend from:', backendPath);

        backendProcess = spawn(backendPath, [], {
            stdio: ['pipe', 'pipe', 'pipe'],
            windowsHide: true
        });

        backendProcess.stdout.on('data', (data) => {
            console.log(`Backend: ${data}`);
            if (data.toString().includes('Uvicorn running')) {
                resolve();
            }
        });

        backendProcess.stderr.on('data', (data) => {
            console.error(`Backend Error: ${data}`);
        });

        backendProcess.on('error', (err) => {
            reject(err);
        });

        setTimeout(() => {
            resolve();
        }, 30000);
    });
}

// Stop servers
function stopServers() {
    if (backendProcess) {
        console.log('Stopping backend...');
        backendProcess.kill('SIGTERM');
        backendProcess = null;
    }
    if (staticServer) {
        console.log('Stopping static server...');
        staticServer.close();
        staticServer = null;
    }
}

// Create the main window
function createWindow() {
    mainWindow = new BrowserWindow({
        width: 1400,
        height: 900,
        minWidth: 1024,
        minHeight: 768,
        webPreferences: {
            nodeIntegration: false,
            contextIsolation: true,
            preload: path.join(__dirname, 'preload.js')
        },
        title: 'AI PR Diagnostic',
        autoHideMenuBar: true,
        show: false
    });

    // Load the frontend
    if (isDev) {
        mainWindow.loadURL('http://localhost:3000');
        mainWindow.webContents.openDevTools();
    } else {
        // Load from local static server
        mainWindow.loadURL(`http://127.0.0.1:${FRONTEND_PORT}`);
    }

    mainWindow.once('ready-to-show', () => {
        mainWindow.show();
    });

    mainWindow.on('closed', () => {
        mainWindow = null;
    });
}

// App ready
app.whenReady().then(async () => {
    try {
        await startStaticServer();
        await startBackend();
        createWindow();
    } catch (err) {
        dialog.showErrorBox('Startup Error', `Failed to start: ${err.message}`);
        app.quit();
    }
});

// App window all closed
app.on('window-all-closed', () => {
    stopServers();
    if (process.platform !== 'darwin') {
        app.quit();
    }
});

// App activate (macOS)
app.on('activate', () => {
    if (BrowserWindow.getAllWindows().length === 0) {
        createWindow();
    }
});

// App before quit
app.on('before-quit', () => {
    stopServers();
});

