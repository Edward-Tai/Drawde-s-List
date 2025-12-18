export enum AssetType {
  INSTRUMENT = '樂器 / 音源',
  SFX = '音效 (SFX)',
  LOOP = 'Loop / 採樣包',
  PRESET = '合成器預設',
  EFFECT = '效果器',
}

export interface TextStyle {
  color?: string;
  fontSize?: string;     // e.g., '14px', '18px'
  fontWeight?: string;   // e.g., 'normal', 'bold'
  fontStyle?: string;    // e.g., 'normal', 'italic'
  fontFamily?: string;   // e.g., 'sans', 'serif', 'mono'
  textDecoration?: string; // e.g. 'underline', 'line-through'
}

export interface AudioAsset {
  id: string;
  name: string;
  type: AssetType;
  purchaseDate: string;
  description: string;
  price?: number;
  rating?: number; // 1-5
  nameStyle?: TextStyle;
  descriptionStyle?: TextStyle;
  image?: string; // Base64 image string
}

export interface WatchListItem {
  id: string;
  name: string;
  createdAt: string;
}

export interface AnalysisResult {
  suggestedDescription: string;
  suggestedType: AssetType;
}