export const NODE_WIDTH = 160
export const NODE_HEIGHT = 64
export const NODE_PADDING = 12
export const PORT_SIZE = 20
export const PORT_GAP = 8

export function calculatePortY(
  nodeY: number,
  portIndex: number,
  totalPorts: number,
  nodeHeight: number
) {
  if (totalPorts === 1) {
    return nodeY + nodeHeight / 2
  }
  const nodePadding = NODE_PADDING
  const availableHeight = nodeHeight - nodePadding * 2
  const portsHeight = totalPorts * PORT_SIZE + (totalPorts - 1) * PORT_GAP
  const startY = nodeY + nodePadding + (availableHeight - portsHeight) / 2
  return startY + portIndex * (PORT_SIZE + PORT_GAP) + PORT_SIZE / 2
}
