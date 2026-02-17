export interface ThemeConfig {
  id: string;
  name: string;
  backgroundColor: string;       // 背景颜色
  gridColor: string;             // 网格线颜色
  gridEnabled: boolean;          // 是否显示网格
  connectionColor: string;       // 连线颜色
  lineColor: string;             // 线条颜色（用于强调或装饰线）
  connectionWidth: number;       // 连线宽度
  connectionStyle: 'straight' | 'curve' | 'polyline';  // 连线样式
  nodeBackgroundColor: string;   // 默认节点背景色
  nodeBorderColor: string;       // 节点边框颜色
  nodeBorderWidth: number;       // 节点边框宽度
  nodeBorderRadius: number;      // 节点圆角
  rootNodeColor: string;         // 根节点颜色
  textColor: string;             // 默认文字颜色
  rootTextColor: string;         // 根节点文字颜色
  fontFamily: string;            // 字体
  fontSize: number;              // 默认字体大小
  rootFontSize: number;          // 根节点字体大小
  lineHeight: number;            // 行高
  shadowEnabled: boolean;        // 是否启用阴影
  shadowColor: string;           // 阴影颜色
  shadowBlur: number;            // 阴影模糊半径
  shadowOffsetX: number;         // 阴影X偏移
  shadowOffsetY: number;         // 阴影Y偏移
}

// Alias for backward compatibility if needed, or just to make the transition easier
export type MindmapThemeConfig = ThemeConfig;
