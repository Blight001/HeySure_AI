import * as fs from 'fs';
import { v4 as uuidv4 } from 'uuid';

export interface PythonComponentData {
  id: string;
  name: string;
  version: string;
  author: string;
  description: string;
  category: string;
  filePath: string;
  functionName: string;
  enabled: boolean;
  config: any;
  inputs: any[];
  outputs: any[];
  aiControl: any[];
  createdAt: number;
  updatedAt: number;
}

export class PythonComponentService {
  private static instance: PythonComponentService;
  private components = new Map<string, PythonComponentData>();

  private constructor() {}

  public static getInstance(): PythonComponentService {
    if (!PythonComponentService.instance) {
      PythonComponentService.instance = new PythonComponentService();
    }
    return PythonComponentService.instance;
  }

  listComponents(): PythonComponentData[] {
    return Array.from(this.components.values());
  }

  getComponent(id: string): PythonComponentData | null {
    return this.components.get(id) || null;
  }

  saveComponent(component: PythonComponentData): PythonComponentData {
    if (!component.id) {
      component.id = uuidv4();
      component.createdAt = Date.now();
    }
    component.updatedAt = Date.now();
    this.components.set(component.id, component);
    return component;
  }

  deleteComponent(id: string): boolean {
    return this.components.delete(id);
  }

  toggleComponent(id: string, enabled: boolean): { success: boolean; component?: PythonComponentData; error?: string } {
    const component = this.components.get(id);
    if (component) {
      component.enabled = enabled;
      component.updatedAt = Date.now();
      return { success: true, component };
    }
    return { success: false, error: 'Component not found' };
  }

  async validateFile(filePath: string, functionName: string): Promise<any> {
    const errors: string[] = [];
    const warnings: string[] = [];
    
    if (!fs.existsSync(filePath)) {
      return {
        valid: false,
        errors: [`文件不存在: ${filePath}`],
        warnings: [],
      };
    }
    
    if (!filePath.endsWith('.py')) {
      errors.push('文件必须是.py扩展名');
    }
    
    try {
      const content = await fs.promises.readFile(filePath, 'utf-8');
      const functionPattern = new RegExp(`def\\s+${functionName}\\s*\\(`, 'm');
      if (!functionPattern.test(content)) {
        errors.push(`未找到函数: ${functionName}`);
      }
    } catch (error) {
      errors.push(`无法读取文件: ${error}`);
    }
    
    return {
      valid: errors.length === 0,
      errors,
      warnings,
      componentInfo: errors.length === 0 ? {
        name: functionName,
        description: '从Python文件导入的组件',
        inputs: [], 
        outputs: [],
      } : undefined,
    };
  }
}
