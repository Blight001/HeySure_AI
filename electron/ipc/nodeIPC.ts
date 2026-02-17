/**
 * 节点 IPC 处理器
 * 处理节点的保存、读取、删除等操作
 */

import { ipcMain } from 'electron';
import { existsSync, promises as fs } from 'fs';
import { join } from 'path';
import { ensureDataDir, FLOW_DIR } from '../config/paths';

// 内存中的节点存储
const nodeStore = new Map<string, any>();

// 确保目录存在
async function ensureFlowDir(): Promise<void> {
  if (!existsSync(FLOW_DIR)) {
    await fs.mkdir(FLOW_DIR, { recursive: true });
  }
}

export function nodeIPC() {
  // 保存节点
  ipcMain.handle('node:save', async (_, nodeData: any) => {
    try {
      console.log('[NodeIPC] 开始保存节点, id:', nodeData?.id);
      await ensureDataDir();
      await ensureFlowDir();
      console.log('[NodeIPC] 目录已准备就绪, FLOW_DIR:', FLOW_DIR);

      if (!nodeData.id) {
        console.warn('[NodeIPC] 节点ID为空');
        return { success: false, error: '节点ID不能为空' };
      }

      // 保存到内存
      nodeStore.set(nodeData.id, nodeData);

      // 保存到文件
      const filePath = join(FLOW_DIR, `node_${nodeData.id}.json`);
      console.log('[NodeIPC] 保存文件路径:', filePath);
      await fs.writeFile(filePath, JSON.stringify(nodeData, null, 2), 'utf-8');

      console.log('[NodeIPC] 节点已保存:', nodeData.id);
      return { success: true, path: filePath };
    } catch (error) {
      console.error('[NodeIPC] 保存节点失败:', error);
      return { success: false, error: String(error) };
    }
  });

  // 获取节点
  ipcMain.handle('node:get', async (_, { nodeId }: { nodeId: string }) => {
    try {
      // 先从内存获取
      if (nodeStore.has(nodeId)) {
        return { success: true, data: nodeStore.get(nodeId) };
      }

      // 从文件获取
      const filePath = join(FLOW_DIR, `node_${nodeId}.json`);
      if (existsSync(filePath)) {
        const content = await fs.readFile(filePath, 'utf-8');
        const data = JSON.parse(content);
        nodeStore.set(nodeId, data);
        return { success: true, data };
      }

      return { success: false, error: '节点不存在' };
    } catch (error) {
      console.error('[NodeIPC] 获取节点失败:', error);
      return { success: false, error: String(error) };
    }
  });

  // 删除节点
  ipcMain.handle('node:delete', async (_, { nodeId }: { nodeId: string }) => {
    try {
      // 从内存删除
      nodeStore.delete(nodeId);

      // 从文件删除
      const filePath = join(FLOW_DIR, `node_${nodeId}.json`);
      if (existsSync(filePath)) {
        await fs.unlink(filePath);
      }

      console.log('[NodeIPC] 节点已删除:', nodeId);
      return { success: true };
    } catch (error) {
      console.error('[NodeIPC] 删除节点失败:', error);
      return { success: false, error: String(error) };
    }
  });

  // 获取所有节点列表
  ipcMain.handle('node:list', async () => {
    try {
      const nodes: any[] = [];
      
      // 扫描目录中的所有节点文件
      if (existsSync(FLOW_DIR)) {
        const files = await fs.readdir(FLOW_DIR);
        for (const file of files) {
          if (file.startsWith('node_') && file.endsWith('.json')) {
            const filePath = join(FLOW_DIR, file);
            try {
              const content = await fs.readFile(filePath, 'utf-8');
              const data = JSON.parse(content);
              nodes.push({
                id: data.id,
                type: data.type,
                savedAt: data.savedAt,
                filePath,
              });
            } catch (e) {
              console.warn('[NodeIPC] 读取节点文件失败:', filePath);
            }
          }
        }
      }

      return { success: true, data: nodes };
    } catch (error) {
      console.error('[NodeIPC] 获取节点列表失败:', error);
      return { success: false, error: String(error), data: [] };
    }
  });
}

