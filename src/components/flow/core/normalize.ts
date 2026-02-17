import type { FlowNode } from '@/types/flow'

const DEFAULT_NODE_PORTS: Record<string, { inputs: any[]; outputs: any[] }> = {
  trigger: {
    inputs: [],
    outputs: [{ id: 'output', type: 'output', label: '触发信号' }]
  },
  simpleTrigger: {
    inputs: [],
    outputs: [{ id: 'output', type: 'output', label: '信号' }]
  },
  switch: {
    inputs: [{ id: 'input', type: 'input', label: '输入' }],
    outputs: [{ id: 'output', type: 'output', label: '输出' }]
  }
}

export function normalizeNode(node: FlowNode): FlowNode {
  const defaultPorts = DEFAULT_NODE_PORTS[node.type as string]
  if (!defaultPorts) return node
  const needsInputs = node.inputs.length === 0
  const needsOutputs = node.outputs.length === 0
  if (!needsInputs && !needsOutputs) return node
  return {
    ...node,
    inputs: needsInputs ? defaultPorts.inputs : node.inputs,
    outputs: needsOutputs ? defaultPorts.outputs : node.outputs
  }
}

export function normalizeNodes(nodes: FlowNode[]): FlowNode[] {
  return nodes.map(normalizeNode)
}
