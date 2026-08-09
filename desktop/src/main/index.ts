import { app, shell, BrowserWindow, protocol, session, net } from 'electron'
import { join, resolve } from 'path'
import { pathToFileURL } from 'url'
import { existsSync } from 'fs'
import { electronApp, optimizer, is } from '@electron-toolkit/utils'

const DEV_SERVER_URL = process.env['ELECTRON_RENDERER_URL'] || 'http://localhost:5173'

function resolveRendererDir(): string {
  if (app.isPackaged) {
    return join(process.resourcesPath, 'renderer')
  }
  return join(__dirname, '../../../frontend/dist')
}

function registerAppProtocol(rendererDir: string): void {
  protocol.handle('app', (request) => {
    const url = new URL(request.url)
    let pathname = decodeURIComponent(url.pathname)
    if (pathname === '/' || pathname === '') pathname = '/index.html'
    let fullPath = resolve(rendererDir, `.${pathname}`)
    if (!existsSync(fullPath)) fullPath = join(rendererDir, 'index.html')
    return net.fetch(pathToFileURL(fullPath).toString())
  })
}

function createWindow(): void {
  const win = new BrowserWindow({
    width: 1440,
    height: 900,
    show: false,
    autoHideMenuBar: true,
    title: 'Moneyyy',
    webPreferences: {
      preload: join(__dirname, '../preload/index.mjs'),
      contextIsolation: true,
      nodeIntegration: false,
      sandbox: false,
    },
  })

  win.on('ready-to-show', () => win.show())

  win.webContents.setWindowOpenHandler(({ url }) => {
    shell.openExternal(url)
    return { action: 'deny' }
  })

  if (is.dev) {
    win.loadURL(DEV_SERVER_URL)
  } else {
    win.loadURL('app://desktop/index.html')
  }
}

protocol.registerSchemesAsPrivileged([
  { scheme: 'app', privileges: { standard: true, secure: true, supportFetchAPI: true } },
])

app.whenReady().then(() => {
  electronApp.setAppUserModelId('com.moneyyy.app')

  session.defaultSession.webRequest.onHeadersReceived((details, callback) => {
    callback({
      responseHeaders: {
        ...details.responseHeaders,
        'Access-Control-Allow-Origin': ['*'],
        'Access-Control-Allow-Headers': ['*'],
        'Access-Control-Allow-Methods': ['GET, POST, PUT, PATCH, DELETE, OPTIONS'],
      },
    })
  })

  registerAppProtocol(resolveRendererDir())
  createWindow()

  app.on('activate', () => {
    if (BrowserWindow.getAllWindows().length === 0) createWindow()
  })
})

app.on('browser-window-created', (_, window) => {
  optimizer.watchWindowShortcuts(window)
})

app.on('window-all-closed', () => {
  if (process.platform !== 'darwin') app.quit()
})