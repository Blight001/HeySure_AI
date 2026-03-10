import * as fs from 'fs';
import * as path from 'path';
import { v4 as uuidv4 } from 'uuid';
import { 
  FLOW_DIR, 
  getFlowFile, 
  FLOW_CATEGORIES_FILE,
  ensureDataDir,
  FLOW_FILE_PREFIX
} from '../config/paths';

export interface FlowDefinition {
  id: string;
  name: string;
  description: string;
  version: string;
  nodes: any[];
  edges: any[];
  createdAt: number;
  updatedAt: number;
  [key: string]: any;
}

export class FlowService {
  private static instance: FlowService;

  private constructor() {
    this.init();
  }

  public static getInstance(): FlowService {
    if (!FlowService.instance) {
      FlowService.instance = new FlowService();
    }
    return FlowService.instance;
  }

  private async init() {
    try {
      await ensureDataDir();
      if (!fs.existsSync(FLOW_DIR)) {
        await fs.promises.mkdir(FLOW_DIR, { recursive: true });
      }
    } catch (error) {
      console.error('Failed to initialize flow directories:', error);
    }
  }

  async saveFlow(flow: FlowDefinition): Promise<FlowDefinition> {
    try {
      if (!flow.id) {
        flow.id = uuidv4();
        flow.createdAt = Date.now();
      }
      flow.updatedAt = Date.now();
      
      const filePath = getFlowFile(flow.id);
      
      // Ensure directory exists
      if (!fs.existsSync(FLOW_DIR)) {
        await fs.promises.mkdir(FLOW_DIR, { recursive: true });
      }

      await fs.promises.writeFile(filePath, JSON.stringify(flow, null, 2), 'utf-8');
      return flow;
    } catch (error) {
      console.error('Failed to save flow:', error);
      throw error;
    }
  }

  async getFlow(id: string): Promise<FlowDefinition | null> {
    try {
      const filePath = getFlowFile(id);
      if (fs.existsSync(filePath)) {
        const content = await fs.promises.readFile(filePath, 'utf-8');
        return JSON.parse(content);
      }
      throw new Error(`File not found: ${filePath}`);
    } catch (error) {
      console.error(`Failed to get flow ${id}:`, error);
      throw error;
    }
  }

  async listFlows(): Promise<FlowDefinition[]> {
    try {
      if (!fs.existsSync(FLOW_DIR)) {
        return [];
      }

      const files = await fs.promises.readdir(FLOW_DIR);
      const flows: FlowDefinition[] = [];

      for (const file of files) {
        if (file.endsWith('.json') && file.startsWith(FLOW_FILE_PREFIX)) {
          try {
            const content = await fs.promises.readFile(path.join(FLOW_DIR, file), 'utf-8');
            const flow = JSON.parse(content);
            
            // 确保 ID 与文件名一致，否则 getFlow 无法找到文件
            const filenameId = file.slice(FLOW_FILE_PREFIX.length, -5); // remove prefix and .json
            if (flow.id !== filenameId) {
              console.warn(`Flow ID mismatch in ${file}: content=${flow.id}, filename=${filenameId}. Using filename ID.`);
              flow.id = filenameId;
            }
            
            flows.push(flow);
          } catch (e) {
            console.warn(`Failed to parse flow file ${file}:`, e);
          }
        }
      }

      return flows.sort((a, b) => (b.updatedAt || 0) - (a.updatedAt || 0));
    } catch (error) {
      console.error('Failed to list flows:', error);
      return [];
    }
  }

  async deleteFlow(id: string): Promise<boolean> {
    try {
      const filePath = getFlowFile(id);
      if (fs.existsSync(filePath)) {
        await fs.promises.unlink(filePath);
      }
      return true;
    } catch (error) {
      console.error(`Failed to delete flow ${id}:`, error);
      throw error;
    }
  }

  async getCategories(): Promise<any> {
    try {
      if (fs.existsSync(FLOW_CATEGORIES_FILE)) {
        const content = await fs.promises.readFile(FLOW_CATEGORIES_FILE, 'utf-8');
        return JSON.parse(content);
      }
      return null;
    } catch (error) {
      console.error('Failed to get flow categories:', error);
      return null;
    }
  }

  async saveCategories(data: any): Promise<boolean> {
    try {
      await ensureDataDir();
      await fs.promises.writeFile(FLOW_CATEGORIES_FILE, JSON.stringify(data, null, 2), 'utf-8');
      return true;
    } catch (error) {
      console.error('Failed to save flow categories:', error);
      throw error;
    }
  }

  async executeFlow(flowId: string, input: any, mode: 'sync' | 'async'): Promise<any> {
    try {
      // 在真实实现中，这里应该加载流程并执行
      // 这里仍然保持模拟
      await new Promise((resolve) => setTimeout(resolve, 1000));
      return {
        success: true,
        executionId: uuidv4(),
        output: `Executed flow: ${flowId}`,
      };
    } catch (error) {
      return { success: false, error: String(error) };
    }
  }

  getExecutionStatus(id: string): any {
    return {
      id,
      status: 'completed',
      progress: 100,
    };
  }

  stopExecution(id: string): boolean {
    return true;
  }
}
