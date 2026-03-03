
import { v4 as uuidv4 } from 'uuid';
import type { FlowDefinition, FlowNode, FlowEdge, NodeData } from '@/types/flow';
import { mindmapStorage } from '@/components/mindmap/services/mindmap-storage';
import { mindmapToMarkdown } from '@/components/mindmap/utils/mindmap-to-markdown';

interface ExecutionOptions {
  onNodeUpdate?: (nodeId: string, data: Partial<NodeData>) => void;
  onFlowComplete?: (output: any) => void;
  onFlowError?: (error: any) => void;
  variables?: Record<string, any>;
  outputMode?: 'default' | 'all_text';
}

export class HeadlessFlowExecutor {
  private definition: FlowDefinition;
  private nodes: FlowNode[];
  private edges: FlowEdge[];
  private status: 'idle' | 'running' | 'paused' | 'completed' | 'error' = 'idle';
  private options: ExecutionOptions;
  private runningNodes: Set<string> = new Set();
  private abortController: AbortController | null = null;
  private pendingTasks: Array<() => Promise<void>> = [];
  private textOutputs: string[] = [];

  constructor(definition: FlowDefinition, options: ExecutionOptions = {}) {
    this.definition = definition;
    this.nodes = JSON.parse(JSON.stringify(definition.nodes)); // Deep copy
    this.edges = definition.edges;
    this.options = options;
  }

  public start(input?: any) {
    if (this.status === 'running') return;
    this.status = 'running';
    this.abortController = new AbortController();
    this.textOutputs = [];

    // Reset status of all nodes - but keep input values? 
    // Usually we want a fresh start, so clearing status is good.
    this.nodes.forEach(n => {
        // Only clear status, keep values for inspection if needed, or clear values too?
        // Let's clear status and error, keep configured data.
        this.updateNode(n.id, { status: 'idle', error: undefined });
    });

    const startNodes = this.nodes.filter(n => n.type === 'start');
    if (startNodes.length === 0) {
        this.options.onFlowError?.(new Error("No start node found in workflow"));
        return;
    }

    startNodes.forEach(node => {
      this.triggerDataTransfer(node.id, input ?? { button: true }, 'output');
    });
  }

  public stop() {
    this.status = 'idle'; // Or 'completed' / 'stopped'? 'idle' matches useFlowExecution
    this.abortController?.abort();
    this.runningNodes.clear();
    // Force update for all running nodes to stop animation
    this.nodes.forEach(n => {
        if (n.data?.status === 'running') {
            this.updateNode(n.id, { status: 'idle' }); // Reset running status
        }
    });
    // Notify update
    if (this.options.onNodeUpdate) {
        // Just trigger a dummy update to force re-render if needed, or rely on above calls
    }
  }

  public pause() {
    if (this.status === 'running') {
        this.status = 'paused';
    }
  }

  public resume() {
    if (this.status === 'paused') {
      this.status = 'running';
      // Resume execution of pending nodes
      const tasks = [...this.pendingTasks];
      this.pendingTasks = [];
      tasks.forEach(task => task());
    }
  }

  public getStatus() {
      return this.status;
  }

  public getRunningNodeLabels(): string[] {
      return Array.from(this.runningNodes).map(id => {
          const node = this.nodes.find(n => n.id === id);
          return node?.data?.label || node?.type || id;
      });
  }

  public getProgress() {
      const total = this.nodes.length;
      const completed = this.nodes.filter(n => n.data?.status === 'completed').length;
      const running = this.nodes.filter(n => n.data?.status === 'running').length;
      return { total, completed, running };
  }

  private updateNode(nodeId: string, data: Partial<NodeData>) {
    const nodeIndex = this.nodes.findIndex(n => n.id === nodeId);
    if (nodeIndex === -1) return;

    this.nodes[nodeIndex].data = { ...this.nodes[nodeIndex].data, ...data };
    this.options.onNodeUpdate?.(nodeId, this.nodes[nodeIndex].data);
  }

  private async triggerDataTransfer(sourceNodeId: string, payload: any, sourceType: 'input' | 'output', sourceHandleId?: string) {
      if (this.status === 'paused') {
          this.pendingTasks.push(async () => this.triggerDataTransfer(sourceNodeId, payload, sourceType, sourceHandleId));
          return;
      }
      if (this.status !== 'running') return;

      const sourceNode = this.nodes.find(n => n.id === sourceNodeId);
      if (!sourceNode) return;

      const outgoingEdges = this.edges.filter(edge => {
          if (edge.source !== sourceNodeId) return false;
          if (sourceHandleId && edge.sourceHandle !== sourceHandleId) return false;
          
          if (sourceType === 'output') {
             return sourceNode.outputs.some(o => o.id === edge.sourceHandle);
          } else {
             return sourceNode.inputs.some(i => i.id === edge.sourceHandle);
          }
      });

      for (const edge of outgoingEdges) {
          const targetNode = this.nodes.find(n => n.id === edge.target);
          if (!targetNode) continue;

          // Check for relay (target output)
          const isTargetOutput = targetNode.outputs.some(o => o.id === edge.targetHandle);
          if (isTargetOutput) {
             // Relay
             this.triggerDataTransfer(targetNode.id, payload, 'output', edge.targetHandle);
             continue;
          }

          // Update target node data
          // UserInput nodes shouldn't be overwritten by upstream data generally, but here we are headless
          if (targetNode.type !== 'userInput') {
              this.updateNode(targetNode.id, { 
                  value: payload,
                  status: 'idle'
              });
          }

          // Execute target node
          // We don't await here to allow parallel branches, but we should track promises if we want to wait for full flow completion
          this.executeNode(targetNode.id, payload).catch(err => {
              console.error(`Error executing node ${targetNode.id}:`, err);
          });
      }
  }

  private async executeNode(nodeId: string, input: any) {
      const node = this.nodes.find(n => n.id === nodeId);
      if (!node) return;

      // If already running, might need to queue or debounce? For now, just run.
      this.updateNode(nodeId, { status: 'running' });
      this.runningNodes.add(nodeId);

      try {
          let output = input;

          if (this.status === 'paused') {
              // Queue task to resume later
              this.pendingTasks.push(async () => this.executeNode(nodeId, input));
              return; 
          }

          switch (node.type) {
              case 'aiChat':
                  output = await this.handleAI(node, input);
                  break;
              case 'python':
                  output = await this.handlePython(node, input);
                  break;
              case 'mindmapInfo':
                  output = await this.handleMindmapInfo(node, input);
                  break;
              case 'classifier':
                  await this.handleClassifier(node, input); // Classifier handles its own data transfer routing
                  this.updateNode(nodeId, { status: 'completed' });
                  this.runningNodes.delete(nodeId);
                  return; 
              case 'end':
                  this.status = 'completed';
                  this.updateNode(nodeId, { status: 'completed' });
                  const finalOutput = this.options.outputMode === 'all_text' ? this.textOutputs : input;
                  this.options.onFlowComplete?.(finalOutput);
                  this.runningNodes.delete(nodeId);
                  return; 
              case 'userInput':
                  // Headless mode cannot handle user input.
                  // We treat it as pass-through if it has value, or fail/warn.
                  if (node.data?.value) {
                      output = node.data.value;
                  } else {
                      console.warn("Headless flow hit UserInput node without value. Using input as value.");
                  }
                  break;
              case 'textDisplay':
                  // Just update state
                  this.updateNode(nodeId, { 
                      receivedData: input,
                      displayText: typeof input === 'object' ? JSON.stringify(input) : String(input)
                  });
                  break;
              default:
                  // Pass through
                  break;
          }

          this.updateNode(nodeId, { status: 'completed', value: output });
          this.runningNodes.delete(nodeId);
          
          if (this.options.outputMode === 'all_text') {
              if (node.type === 'textDisplay' || node.type === 'aiChat') {
                 if (typeof output === 'string') {
                    this.textOutputs.push(output);
                 } else if (typeof output === 'object') {
                    this.textOutputs.push(JSON.stringify(output));
                 }
              }
          }

          this.triggerDataTransfer(nodeId, output, 'output');

      } catch (error: any) {
          console.error(`Node ${nodeId} execution failed:`, error);
          this.updateNode(nodeId, { status: 'error', error: error.message || String(error) });
          this.options.onFlowError?.(error);
          this.status = 'error';
      }
  }

  // --- Handlers ---

  private async handleAI(node: FlowNode, input: any): Promise<any> {
      const modelId = node.data?.modelId;
      const modelConfig = node.data?.model;
      const systemPrompt = node.data?.systemPrompt;

      if (!modelId && !modelConfig) throw new Error("AI Model not configured");

      const messages = [{ role: 'user', content: String(input) }];
      if (systemPrompt) messages.unshift({ role: 'system', content: systemPrompt });

      const electronAPI = (window as any).electronAPI;
      if (!electronAPI?.ai?.chat) throw new Error("AI API not available");

      const response = await electronAPI.ai.chat({
          modelId,
          modelConfig,
          messages
      });

      if (!response.success) throw new Error(response.error || "AI call failed");
      return response.data;
  }

  private async handlePython(node: FlowNode, input: any): Promise<any> {
      const { filePath, functionName, unifiedInput, componentInputs } = node.data;
      const electronAPI = (window as any).electronAPI;
      
      if (!electronAPI?.pythonExecute) throw new Error("Python API not available");

      let inputsObj: Record<string, any> = {};
      
      // Simplified input processing compared to useFlowExecution
      if (unifiedInput) {
          try {
             const jsonData = typeof input === 'string' ? JSON.parse(input) : input;
             componentInputs?.forEach((inp: any, idx: number) => {
                 inputsObj[inp.name] = jsonData[inp.name] ?? inp.defaultValue;
             });
          } catch (e) {
             console.warn("Failed to parse unified input for Python node", e);
             inputsObj['input'] = input;
          }
      } else {
          inputsObj['input'] = input;
      }

      const response = await electronAPI.pythonExecute({
        filePath,
        functionName,
        inputs: inputsObj,
        config: node.data?.componentConfig || { timeout: 30 }
      });

      if (!response.success) throw new Error(response.error || "Python execution failed");
      return response.output;
  }

  private async handleMindmapInfo(node: FlowNode, payload: any): Promise<any> {
       // Re-implement or reuse logic? 
       // Since mindmapStorage is imported, we can use it directly.
       // For brevity, I'll implement a simple version.
       if (!mindmapStorage.getCurrentMap()) {
        await mindmapStorage.init();
      }
      const mapData = mindmapStorage.getCurrentMap();
      if (!mapData) return "No mindmap found";
      
      return mindmapToMarkdown(mapData.nodes);
  }

  private async handleClassifier(node: FlowNode, payload: any) {
    const keywords = node.data?.keywords || [];
    const payloadStr = typeof payload === 'object' ? JSON.stringify(payload) : String(payload);
    
    let outputIndex = keywords.findIndex((k: string) => k && payloadStr.includes(k));
    
    if (outputIndex === -1) {
        // Fallback to number
        const val = parseInt(String(payload), 10);
        if (!isNaN(val)) outputIndex = val - 1;
    }

    if (outputIndex < 0 || outputIndex >= node.outputs.length) {
        outputIndex = node.outputs.length - 1; // Default to last
    }

    // Update node
    this.updateNode(node.id, { activeIndex: outputIndex, lastValue: payload });

    const targetOutput = node.outputs[outputIndex];
    if (targetOutput) {
        this.triggerDataTransfer(node.id, payload, 'output', targetOutput.id);
    }
  }
}
