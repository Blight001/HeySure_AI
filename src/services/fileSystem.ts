/**
 * 文件系统 API 服务
 * 统一封装所有文件操作
 */

// 获取 appData 路径
export async function getAppDataPath(): Promise<string> {
  return window.electronAPI?.path?.appData || '';
}

// 读取文件内容
export async function readFile(filePath: string): Promise<string> {
  const fs = window.electronAPI?.fs;
  if (!fs?.readFile) {
    throw new Error('文件系统 API 不可用');
  }
  return fs.readFile(filePath, 'utf-8');
}

// 写入文件
export async function writeFile(filePath: string, content: string): Promise<void> {
  const fs = window.electronAPI?.fs;
  if (!fs?.writeFile) {
    throw new Error('文件系统 API 不可用');
  }
  return fs.writeFile(filePath, content, 'utf-8');
}

// 读取目录
export async function readDir(dirPath: string): Promise<string[]> {
  const fs = window.electronAPI?.fs;
  if (!fs?.readdir) {
    throw new Error('文件系统 API 不可用');
  }
  return fs.readdir(dirPath);
}

// 确保目录存在
export async function ensureDir(dirPath: string): Promise<void> {
  const fs = window.electronAPI?.fs;
  if (!fs?.mkdirSync) {
    throw new Error('文件系统 API 不可用');
  }
  return fs.mkdirSync(dirPath, { recursive: true });
}

// 复制文件
export async function copyFile(sourcePath: string, targetPath: string): Promise<void> {
  const content = await readFile(sourcePath);
  await writeFile(targetPath, content);
}

// 删除文件
export async function deleteFile(filePath: string): Promise<void> {
  const fs = window.electronAPI?.fs;
  if (!fs?.unlink) {
    throw new Error('文件系统 API 不可用');
  }
  return fs.unlink(filePath);
}

// 检查文件是否存在
export async function fileExists(filePath: string): Promise<boolean> {
  const fs = window.electronAPI?.fs;
  if (!fs?.existsSync) {
    throw new Error('文件系统 API 不可用');
  }
  return fs.existsSync(filePath);
}

// 路径拼接
export async function pathJoin(...paths: string[]): Promise<string> {
  const path = window.electronAPI?.path;
  if (!path?.join) {
    // 开发环境回退
    return paths.join('/').replace(/\\/g, '/');
  }
  return path.join(...paths);
}

// 获取文件名
export async function pathBasename(path: string, ext?: string): Promise<string> {
  const p = window.electronAPI?.path;
  if (!p?.basename) {
    return path.split(/[/\\]/).pop() || '';
  }
  return p.basename(path, ext);
}

// 获取目录名
export async function pathDirname(path: string): Promise<string> {
  const p = window.electronAPI?.path;
  if (!p?.dirname) {
    const parts = path.split(/[/\\]/);
    parts.pop();
    return parts.join('/');
  }
  return p.dirname(path);
}





























