/**
 * HeySure AI - Electron 窗口管理器
 * 负责 Electron 主窗口的创建、显示、隐藏、关闭等操作
 * 管理无边框窗口、开发者工具设置、图标等
 */
import { BrowserWindow, shell, nativeImage, app } from 'electron';
import { join, dirname } from 'path';
import { is } from '@electron-toolkit/utils';
import { fileURLToPath } from 'url';
import { existsSync, readFileSync } from 'fs';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

// 用户设置存储路径
const SETTINGS_PATH = join(app.getPath('userData'), 'settings.json');

// 读取设置
function getShowConsoleSetting(): boolean {
  try {
    if (existsSync(SETTINGS_PATH)) {
      const content = readFileSync(SETTINGS_PATH, 'utf-8');
      const settings = JSON.parse(content);
      // 如果设置中有 showConsole，则使用该值；默认为 true
      if ('showConsole' in settings) {
        return settings.showConsole;
      }
    }
  } catch (error) {
    console.error('Failed to read showConsole setting:', error);
  }
  return true; // 默认显示控制台
}

export class WindowManager {
  private static mainWindow: BrowserWindow | null = null;
  private static aboutWindow: BrowserWindow | null = null;

  // 获取图标路径
  private static getIconPath() {
    if (is.dev) {
      return join(process.cwd(), 'public', 'image', 'logo.png');
    }
    return join(process.resourcesPath, 'image', 'logo.png');
  }

  // 创建图标
  private static createIcon(size: number = 256) {
    const iconPath = this.getIconPath();
    const image = nativeImage.createFromPath(iconPath);
    return image.resize({ width: size, height: size });
  }

  static createMainWindow(): BrowserWindow {
    if (this.mainWindow) {
      this.mainWindow.show();
      return this.mainWindow;
    }

    this.mainWindow = new BrowserWindow({
      title: 'HeySure AI',
      width: 1400,
      height: 900,
      minWidth: 1000,
      minHeight: 700,
      show: false,
      frame: false,
      transparent: false,
      resizable: true,
      maximizable: true,
      minimizable: true,
      icon: this.createIcon(256),
      webPreferences: {
        nodeIntegration: false,
        contextIsolation: true,
        sandbox: false,
        preload: join(__dirname, '../preload/preload.js'),
        devTools: true,
        backgroundThrottling: false,
      },
      backgroundColor: '#0f172a',
    });

    // 加载应用
    if (is.dev && process.env['ELECTRON_RENDERER_URL']) {
      this.mainWindow.loadURL(process.env['ELECTRON_RENDERER_URL']);
    } else {
      this.mainWindow.loadFile(join(__dirname, '../renderer/index.html'));
    }

    // 显示窗口时触发
    this.mainWindow.once('ready-to-show', () => {
      this.mainWindow?.show();
      // 开发模式根据设置决定是否打开开发者工具
      if (is.dev && getShowConsoleSetting()) {
        console.log('[WindowManager] Opening DevTools (Ignore "Autofill" errors, they are harmless)...');
        this.mainWindow?.webContents.openDevTools({ mode: 'detach' });
      }
    });

    // 窗口关闭时销毁
    this.mainWindow.on('closed', () => {
      this.mainWindow = null;
    });

    // 打开外部链接
    this.mainWindow.webContents.setWindowOpenHandler(({ url }) => {
      shell.openExternal(url);
      return { action: 'deny' };
    });

    return this.mainWindow;
  }

  static showMainWindow(): void {
    if (this.mainWindow) {
      if (this.mainWindow.isMinimized()) {
        this.mainWindow.restore();
      }
      this.mainWindow.show();
      this.mainWindow.focus();
    }
  }

  static hideMainWindow(): void {
    if (this.mainWindow) {
      this.mainWindow.hide();
    }
  }

  static closeMainWindow(): void {
    if (this.mainWindow) {
      this.mainWindow.close();
    }
  }

  static getMainWindow(): BrowserWindow | null {
    return this.mainWindow;
  }

  static isMainWindowVisible(): boolean {
    return this.mainWindow !== null && !this.mainWindow.isDestroyed();
  }
}

