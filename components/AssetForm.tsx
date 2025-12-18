import React, { useState, useEffect } from 'react';
import { AssetType, AudioAsset, AnalysisResult } from '../types';
import { analyzeAsset } from '../services/geminiService';
import ImageUploadPopover from './ImageUploadPopover';
import { Sparkles, Save, Loader2, Music, Plus, Trash2, Copy, ListPlus, X, Check, Image as ImageIcon } from 'lucide-react';

interface AssetFormProps {
  onAdd: (asset: AudioAsset) => void;
  onAddBatch: (assets: AudioAsset[]) => void;
}

// Internal interface for the form state
interface FormRowData {
  tempId: string;
  name: string;
  type: AssetType;
  purchaseDate: string;
  description: string;
  image: string; // Base64 string
  triggerAnalysis?: boolean; // New flag to trigger auto-analysis
}

const getCurrentDateTime = () => {
  const now = new Date();
  const year = now.getFullYear();
  const month = (now.getMonth() + 1).toString().padStart(2, '0');
  const day = now.getDate().toString().padStart(2, '0');
  const hours = now.getHours().toString().padStart(2, '0');
  const minutes = now.getMinutes().toString().padStart(2, '0');
  return `${year}-${month}-${day}T${hours}:${minutes}`;
};

const createEmptyRow = (): FormRowData => ({
  tempId: crypto.randomUUID(),
  name: '',
  type: AssetType.SFX,
  purchaseDate: getCurrentDateTime(),
  description: '',
  image: ''
});

interface AssetRowProps {
  data: FormRowData;
  index: number;
  isOnly: boolean;
  onUpdate: (id: string, field: keyof FormRowData, val: any) => void;
  onRemove: (id: string) => void;
  onDuplicate: (data: FormRowData) => void;
}

const AssetRow: React.FC<AssetRowProps> = ({ 
  data, 
  index,
  isOnly,
  onUpdate, 
  onRemove,
  onDuplicate
}) => {
  const [isAnalyzing, setIsAnalyzing] = useState(false);
  const [showUpload, setShowUpload] = useState(false);

  // Auto-trigger analysis if the flag is set
  useEffect(() => {
    if (data.triggerAnalysis && data.name && !isAnalyzing) {
      handleAI();
      // Reset the trigger so it doesn't loop
      onUpdate(data.tempId, 'triggerAnalysis', false);
    }
  }, [data.triggerAnalysis, data.name]);

  const handleAI = async () => {
    if (!data.name) return;
    setIsAnalyzing(true);
    try {
      // Pass current description as context if exists, otherwise empty string
      const result: AnalysisResult = await analyzeAsset(data.name, data.description || '');
      
      onUpdate(data.tempId, 'description', result.suggestedDescription);
      onUpdate(data.tempId, 'type', result.suggestedType);
    } catch (err) {
      console.error(err);
      // Optional: don't alert on bulk actions to avoid spamming alerts, rely on UI state
      if (!data.triggerAnalysis) {
        alert("AI 分析失敗");
      }
    } finally {
      setIsAnalyzing(false);
    }
  };

  const removeImage = () => {
    onUpdate(data.tempId, 'image', '');
  };

  return (
    <div className="bg-studio-800 p-4 rounded-xl border border-studio-700 shadow-xl relative animate-in slide-in-from-left-4 duration-300 transition-colors z-0">
      
      {/* Row Header / Actions */}
      <div className="flex items-center justify-between mb-3 relative z-10">
          <div className="flex items-center gap-2 text-studio-accent">
              <div className="bg-studio-900/50 w-6 h-6 rounded-full flex items-center justify-center text-xs font-bold border border-studio-700">
                  {index + 1}
              </div>
              <h3 className="text-sm font-bold text-studio-fg">
                  {data.name || "新項目..."}
              </h3>
          </div>
          <div className="flex gap-1 items-center">
              
              {/* Image Button Container */}
              <div className="relative">
                <button 
                  type="button"
                  onClick={() => setShowUpload(!showUpload)}
                  className={`p-1.5 transition-colors rounded hover:bg-studio-700 ${data.image ? 'text-studio-accent bg-studio-700/50' : 'text-studio-muted hover:text-studio-fg'} ${showUpload ? 'bg-studio-700 text-studio-fg' : ''}`}
                  title={data.image ? "預覽/更換圖片" : "上傳封面/截圖"}
                >
                    <ImageIcon className="w-4 h-4" />
                </button>

                {/* Upload Popover */}
                {showUpload && (
                    <ImageUploadPopover 
                        onUpload={(base64) => onUpdate(data.tempId, 'image', base64)}
                        onClose={() => setShowUpload(false)}
                        currentImage={data.image}
                    />
                )}
                
                {/* Existing Image Preview (Hover) - Only show if Popover is NOT open to avoid clutter */}
                {data.image && !showUpload && (
                   <div className="absolute top-full right-0 mt-2 w-16 h-16 rounded border border-studio-600 overflow-hidden shadow-lg z-20 hidden group-hover:block pointer-events-none bg-studio-900">
                      <img src={data.image} alt="Preview" className="w-full h-full object-cover" />
                   </div>
                )}
              </div>

              {/* Remove Image Button (Visible only if image exists) */}
              {data.image && (
                 <button 
                   type="button"
                   onClick={removeImage}
                   className="p-1.5 text-studio-muted hover:text-red-400 transition-colors rounded hover:bg-studio-700"
                   title="移除圖片"
                 >
                   <X className="w-3 h-3" />
                 </button>
              )}

              <div className="w-px h-4 bg-studio-700 mx-1"></div>

              <button 
                 type="button"
                 onClick={() => onDuplicate(data)}
                 className="p-1.5 text-studio-muted hover:text-studio-fg transition-colors rounded hover:bg-studio-700"
                 title="複製此項目"
              >
                  <Copy className="w-4 h-4" />
              </button>
              <button 
                 type="button"
                 onClick={() => onRemove(data.tempId)}
                 className={`p-1.5 transition-colors rounded hover:bg-studio-700 ${isOnly ? 'text-studio-600 cursor-not-allowed' : 'text-studio-muted hover:text-red-400'}`}
                 disabled={isOnly}
                 title="移除此項目"
              >
                  <Trash2 className="w-4 h-4" />
              </button>
          </div>
      </div>

      <div className="space-y-3 relative z-0">
        {/* Name Input */}
        <div>
          <label className="block text-xs font-medium text-studio-muted mb-1">名稱</label>
          <div className="flex gap-2 items-center">
            <input
              type="text"
              value={data.name}
              onChange={(e) => onUpdate(data.tempId, 'name', e.target.value)}
              placeholder="例如：Cinematic Booms Vol. 1"
              className="flex-1 bg-studio-900 border border-studio-600 rounded-lg px-3 text-sm text-studio-fg focus:ring-2 focus:ring-studio-accent focus:outline-none transition-all h-9 placeholder-gray-500"
            />
            <button
              type="button"
              onClick={handleAI}
              disabled={isAnalyzing || !data.name}
              className={`
                px-3 text-sm rounded-lg flex items-center gap-2 transition-colors font-medium h-9 whitespace-nowrap
                ${isAnalyzing 
                  ? 'bg-studio-700 text-studio-muted cursor-wait' 
                  : 'bg-studio-secondary hover:bg-violet-600 text-white shadow-lg shadow-violet-900/20'
                }
                disabled:opacity-50 disabled:cursor-not-allowed
              `}
              title="AI 分析"
            >
              {isAnalyzing ? <Loader2 className="w-4 h-4 animate-spin" /> : <Sparkles className="w-4 h-4" />}
              <span className="hidden sm:inline">{isAnalyzing ? '分析中...' : '分析'}</span>
            </button>
          </div>
        </div>

        {/* Type & Date - Updated to be fluid/responsive */}
        <div className="flex flex-col md:flex-row gap-3">
          <div className="md:flex-1 min-w-0">
            <label className="block text-xs font-medium text-studio-muted mb-1">類型</label>
            <select
              value={data.type}
              onChange={(e) => onUpdate(data.tempId, 'type', e.target.value as AssetType)}
              className="w-full bg-studio-900 border border-studio-600 rounded-lg pl-3 pr-8 text-sm text-studio-fg focus:ring-2 focus:ring-studio-accent focus:outline-none h-9 transition-colors cursor-pointer"
            >
              {Object.values(AssetType).map((t) => (
                <option key={t} value={t} className="bg-studio-900 text-studio-fg">{t}</option>
              ))}
            </select>
          </div>
          <div className="md:flex-1 min-w-0">
            <label className="block text-xs font-medium text-studio-muted mb-1">入庫時間</label>
            <div className="flex items-center bg-studio-900 border border-studio-600 rounded-lg px-3 h-9 w-full focus-within:ring-2 focus-within:ring-studio-accent transition-colors">
                 <input 
                    type="date"
                    value={data.purchaseDate.split('T')[0]}
                    onChange={(e) => {
                        const date = e.target.value;
                        const time = data.purchaseDate.split('T')[1] || '00:00';
                        onUpdate(data.tempId, 'purchaseDate', `${date}T${time}`);
                    }}
                    className="bg-transparent border-none text-sm text-studio-fg focus:outline-none p-0 flex-1 min-w-0 [color-scheme:dark]"
                 />
                 <input 
                    type="text"
                    value={data.purchaseDate.split('T')[1]}
                    onChange={(e) => {
                        const time = e.target.value;
                        const date = data.purchaseDate.split('T')[0];
                        onUpdate(data.tempId, 'purchaseDate', `${date}T${time}`);
                    }}
                    placeholder="HH:mm"
                    maxLength={5}
                    className="bg-transparent border-none text-sm text-studio-fg focus:outline-none p-0 w-[45px] text-center [color-scheme:dark]"
                 />
            </div>
          </div>
        </div>

        {/* Description */}
        <div>
          <label className="block text-xs font-medium text-studio-muted mb-1">音色 / 描述</label>
          <textarea
            value={data.description}
            onChange={(e) => onUpdate(data.tempId, 'description', e.target.value)}
            placeholder={isAnalyzing ? "AI 正在思考中..." : "描述聲音特色..."}
            rows={2}
            className={`
              w-full bg-studio-900 border border-studio-600 rounded-lg px-3 py-1.5 text-sm text-studio-fg focus:ring-2 focus:ring-studio-accent focus:outline-none resize-none transition-all placeholder-gray-500
              ${isAnalyzing ? 'animate-pulse bg-studio-800' : ''}
            `}
          />
        </div>
      </div>
    </div>
  );
};

const AssetForm: React.FC<AssetFormProps> = ({ onAddBatch }) => {
  const [rows, setRows] = useState<FormRowData[]>([createEmptyRow()]);
  const [showBatchInput, setShowBatchInput] = useState(false);
  const [batchText, setBatchText] = useState('');

  // Handle changes for a specific row
  const updateRow = (tempId: string, field: keyof FormRowData, value: any) => {
    setRows(prev => prev.map(row => 
      row.tempId === tempId ? { ...row, [field]: value } : row
    ));
  };

  const addRow = () => {
    // Determine default values based on the last row
    const lastRow = rows[rows.length - 1];
    const newRow = createEmptyRow();
    if (lastRow) {
      newRow.type = lastRow.type;
      newRow.purchaseDate = lastRow.purchaseDate;
    }
    setRows(prev => [...prev, newRow]);
  };

  const removeRow = (tempId: string) => {
    if (rows.length === 1) {
        setRows([createEmptyRow()]);
        return;
    }
    setRows(prev => prev.filter(row => row.tempId !== tempId));
  };

  const duplicateRow = (rowToDuplicate: FormRowData) => {
    const newRow = {
        ...rowToDuplicate,
        tempId: crypto.randomUUID(),
        name: `${rowToDuplicate.name} (Copy)`,
        triggerAnalysis: false
    };
    setRows(prev => {
        const idx = prev.findIndex(r => r.tempId === rowToDuplicate.tempId);
        const newRows = [...prev];
        newRows.splice(idx + 1, 0, newRow);
        return newRows;
    });
  }

  // Handle Bulk Processing
  const handleBatchProcess = (withAnalysis: boolean) => {
    if (!batchText.trim()) return;

    const lines = batchText.split('\n').filter(line => line.trim().length > 0);
    const lastRow = rows[rows.length - 1];
    const baseDate = lastRow ? lastRow.purchaseDate : getCurrentDateTime();
    const baseType = lastRow ? lastRow.type : AssetType.SFX;

    const newRows: FormRowData[] = lines.map(name => ({
      tempId: crypto.randomUUID(),
      name: name.trim(),
      type: baseType,
      purchaseDate: baseDate,
      description: '',
      image: '',
      triggerAnalysis: withAnalysis // Trigger analysis based on user choice
    }));

    // If the current list only has one empty row, replace it. Otherwise append.
    if (rows.length === 1 && !rows[0].name) {
      setRows(newRows);
    } else {
      setRows(prev => [...prev, ...newRows]);
    }

    setBatchText('');
    setShowBatchInput(false);
  };

  // Handle final submission
  const handleSubmitAll = () => {
    const validRows = rows.filter(r => r.name.trim().length > 0);
    
    if (validRows.length === 0) return;

    const newAssets: AudioAsset[] = validRows.map(r => ({
      id: crypto.randomUUID(),
      name: r.name,
      type: r.type,
      purchaseDate: r.purchaseDate,
      description: r.description,
      image: r.image
    }));

    onAddBatch(newAssets);
    
    // Reset to single empty row
    setRows([createEmptyRow()]);
  };

  const validCount = rows.filter(r => r.name.trim()).length;

  return (
    <div className="space-y-4">
      {/* 1. Header Title & Actions */}
      <div className="flex items-center justify-between mb-2 px-2">
        <div className="flex items-center gap-2 text-studio-accent">
            <Music className="w-5 h-5" />
            <h2 className="text-xl font-bold text-studio-fg">新增素材</h2>
        </div>
        
        <div className="flex items-center gap-2">
            <button
                onClick={handleSubmitAll}
                disabled={validCount === 0}
                className={`
                    text-xs flex items-center gap-1 px-3 py-1.5 rounded-lg border transition-all font-bold
                    ${validCount > 0 
                        ? 'bg-studio-accent hover:bg-cyan-400 text-black border-studio-accent shadow-cyan-500/20 shadow-sm' 
                        : 'bg-studio-800 text-studio-muted border-studio-700 cursor-not-allowed opacity-50'
                    }
                `}
                title="加入資料庫"
            >
                <Save className="w-3 h-3" />
                加入 ({validCount})
            </button>

            <button
                onClick={() => setShowBatchInput(!showBatchInput)}
                className={`
                    text-xs flex items-center gap-1 px-3 py-1.5 rounded-lg border transition-all
                    ${showBatchInput 
                    ? 'bg-studio-700 text-white border-studio-500' 
                    : 'bg-studio-800 text-studio-muted border-studio-700 hover:text-studio-fg'
                    }
                `}
            >
                {showBatchInput ? <X className="w-4 h-4" /> : <ListPlus className="w-4 h-4" />}
                批量輸入
            </button>
        </div>
      </div>

      {/* Batch Input Area */}
      {showBatchInput && (
        <div className="bg-studio-800 p-4 rounded-xl border border-studio-600 animate-in slide-in-from-top-2 transition-colors">
          <label className="block text-sm text-studio-muted mb-2">
            每行輸入一個素材名稱，系統將自動建立並分析：
          </label>
          <textarea
            value={batchText}
            onChange={(e) => setBatchText(e.target.value)}
            className="w-full bg-studio-900 border border-studio-600 rounded-lg p-3 text-sm text-studio-fg focus:ring-2 focus:ring-studio-accent focus:outline-none resize-none h-32 mb-3 placeholder-gray-500"
            placeholder={"Cinematic Hits Vol.1\nSerum Bass Presets\nAmbient Textures 2024..."}
          />
          <div className="flex gap-3">
             <button
              onClick={() => handleBatchProcess(false)}
              disabled={!batchText.trim()}
              className="flex-1 py-2 bg-studio-800 hover:bg-studio-700 border border-studio-600 text-studio-muted hover:text-studio-fg disabled:opacity-50 disabled:cursor-not-allowed rounded-lg font-bold flex items-center justify-center gap-2 transition-colors"
            >
              <Check className="w-4 h-4" />
              確認
            </button>
            <button
              onClick={() => handleBatchProcess(true)}
              disabled={!batchText.trim()}
              className="flex-[2] py-2 bg-studio-secondary hover:bg-violet-600 disabled:opacity-50 disabled:cursor-not-allowed text-white rounded-lg font-bold flex items-center justify-center gap-2 transition-colors shadow-lg shadow-violet-900/20"
            >
              <Sparkles className="w-4 h-4" />
              確認並開始 AI 分析
            </button>
          </div>
        </div>
      )}

      {/* 2. List of Forms */}
      <div className="flex flex-col gap-4">
        {rows.map((row, index) => (
          <AssetRow 
            key={row.tempId}
            data={row}
            index={index}
            isOnly={rows.length === 1}
            onUpdate={updateRow}
            onRemove={removeRow}
            onDuplicate={duplicateRow}
          />
        ))}
      </div>

      {/* 3. Add Another Row Button */}
      <button
        onClick={addRow}
        className="w-full py-3 border-2 border-dashed border-studio-600 rounded-xl text-studio-muted hover:text-studio-fg hover:border-studio-500 hover:bg-studio-800/50 transition-all flex items-center justify-center gap-2 font-medium"
      >
        <Plus className="w-5 h-5" />
        增加一欄
      </button>

      {/* 4. Global Submit Button */}
      <button
        onClick={handleSubmitAll}
        disabled={validCount === 0}
        className={`
            w-full py-4 rounded-xl flex items-center justify-center gap-2 font-bold text-lg transition-all shadow-xl
            ${validCount > 0 
                ? 'bg-studio-accent hover:bg-cyan-600 text-black shadow-cyan-500/20 translate-y-0 opacity-100' 
                : 'bg-studio-700 text-studio-muted cursor-not-allowed opacity-50'
            }
        `}
      >
        <Save className="w-5 h-5" />
        加入資料庫 ({validCount})
      </button>

    </div>
  );
};

export default AssetForm;