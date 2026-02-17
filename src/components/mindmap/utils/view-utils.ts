
import { MindmapNode } from '../types';

interface Point {
  x: number;
  y: number;
}

/**
 * Calculate the geometric center (centroid) of all nodes
 */
export const calculateNodesCentroid = (nodes: MindmapNode[]): Point => {
  if (!nodes || nodes.length === 0) {
    return { x: 0, y: 0 };
  }

  const sum = nodes.reduce(
    (acc, node) => ({
      x: acc.x + (node.x || 0),
      y: acc.y + (node.y || 0)
    }),
    { x: 0, y: 0 }
  );

  return {
    x: sum.x / nodes.length,
    y: sum.y / nodes.length
  };
};

/**
 * Calculate the pan offset to center a target point in the container
 */
export const calculateCenterPan = (
  containerWidth: number,
  containerHeight: number,
  targetX: number,
  targetY: number,
  scale: number = 1,
  offsetY: number = 0
): Point => {
  const centerX = containerWidth / 2;
  const centerY = containerHeight / 2;

  // We want the target point (in canvas coordinates) to be at the center of the viewport
  // The formula is: pan = center - target * scale
  // But we might want an additional vertical offset (e.g. to leave space for header)
  
  return {
    x: centerX - targetX * scale,
    y: centerY - targetY * scale + offsetY // offsetY is usually negative to move content up
  };
};

/**
 * Calculate pan to center all nodes in the container
 */
export const calculatePanToCenterNodes = (
  nodes: MindmapNode[],
  containerWidth: number,
  containerHeight: number,
  scale: number = 1,
  offsetY: number = -100
): Point => {
  const centroid = calculateNodesCentroid(nodes);
  return calculateCenterPan(
    containerWidth,
    containerHeight,
    centroid.x,
    centroid.y,
    scale,
    offsetY
  );
};
