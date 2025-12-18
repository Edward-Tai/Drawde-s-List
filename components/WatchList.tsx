
import React, { useState, useRef, useEffect } from 'react';
import { WatchListItem } from '../types';
import { Eye, Plus, X } from 'lucide-react';

interface WatchListProps {
  items: WatchListItem[];
  onAdd: (name: string) => void;
  onUpdate: (id: string, name: string) => void;
  onRemove: (id: string) => void;
}

const WatchList: React.FC<WatchListProps> = ({ items, onAdd, onUpdate, onRemove }) => {
  const [inputValue, setInputValue] = useState('');
  
  // Title State - Updated default value to '有興趣清單'
  const [title, setTitle] = useState(() => {
    return localStorage.getItem('sonicVault_watchListTitle') || '有興趣清單';
  });
  const [isEditingTitle, setIsEditingTitle] = useState(false);
  const [titleEditValue, setTitleEditValue] = useState('');

  // Editing State (Items)
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editValue, setEditValue] = useState('');

  // Dimensions State
  const [listHeight, setListHeight] = useState(300);
  const [containerWidth, setContainerWidth] = useState<number | undefined>(undefined); // undefined means 100%

  // Refs for resizing calculations
  const rootRef = useRef<HTMLDivElement>(null);
  
  // Unified Resizing State (Only Height and Width now)
  const resizingState = useRef<{
    type: 'height' | 'width' | null;
    startX: number;
    startWidth: number;
    startY: number;
    startHeight: number;
  }>({ type: null, startX: 0, startWidth: 0, startY: 0, startHeight: 0 });

  // Persist title
  useEffect(() => {
    localStorage.setItem('sonicVault_watchListTitle', title);
  }, [title]);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (inputValue.trim()) {
      onAdd(inputValue.trim());
      setInputValue('');
    }
  };

  // Title Editing Handlers
  const startEditingTitle = () => {
    setIsEditingTitle(true);
    setTitleEditValue(title);
  };

  const saveTitle = () => {
    if (titleEditValue.trim()) {
      setTitle(titleEditValue.trim());
    }
    setIsEditingTitle(false);
  };

  const handleTitleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter') {
      saveTitle();
    } else if (e.key === 'Escape') {
      setIsEditingTitle(false);
    }
  };

  // Item Editing Handlers
  const startEditing = (item: WatchListItem) => {
    setEditingId(item.id);
    setEditValue(item.name);
  };

  const saveEditing = (id: string) => {
    if (editValue.trim()) {
      onUpdate(id, editValue.trim());
    }
    setEditingId(null);
  };

  const cancelEditing = () => {
    setEditingId(null);
    setEditValue('');
  };

  const handleEditKeyDown = (e: React.KeyboardEvent, id: string) => {
    if (e.key === 'Enter') {
      saveEditing(id);
    } else if (e.key === 'Escape') {
      cancelEditing();
    }
  };

  // --- Unified Resize Logic ---
  useEffect(() => {
    const handleMouseMove = (e: MouseEvent) => {
      const state = resizingState.current;
      if (!state.type) return;

      if (state.type === 'width') {
        const diff = e.clientX - state.startX;
        let newWidth = Math.max(300, state.startWidth + diff);
        
        // Constraint: Check parent width (Sidebar width)
        // This ensures the WatchList width handle cannot extend beyond the sidebar handle
        if (rootRef.current && rootRef.current.parentElement) {
            const parentWidth = rootRef.current.parentElement.clientWidth;
            // Clamp the width to the parent's width
            if (newWidth > parentWidth) {
                newWidth = parentWidth;
            }
        }
        
        setContainerWidth(newWidth);
      } else if (state.type === 'height') {
        const diff = e.clientY - state.startY;
        // Min height 150px
        setListHeight(Math.max(150, state.startHeight + diff));
      }
    };

    const handleMouseUp = () => {
      // Fix: Removed duplicate startWidth property in the reset object
      resizingState.current = { type: null, startX: 0, startWidth: 0, startY: 0, startHeight: 0 };
      document.body.style.cursor = '';
      document.body.style.userSelect = '';
    };

    window.addEventListener('mousemove', handleMouseMove);
    window.addEventListener('mouseup', handleMouseUp);
    return () => {
      window.removeEventListener('mousemove', handleMouseMove);
      window.removeEventListener('mouseup', handleMouseUp);
    };
  }, []);

  const startResize = (type: 'height' | 'width', e: React.MouseEvent) => {
    e.preventDefault();
    e.stopPropagation();

    let startWidth = 0;
    let startHeight = 0;

    if (type === 'width') {
      startWidth = rootRef.current?.getBoundingClientRect().width || 0;
    } else if (type === 'height') {
      startHeight = listHeight;
    }

    resizingState.current = {
      type,
      startX: e.clientX,
      startY: e.clientY,
      startWidth,
      startHeight
    };

    document.body.style.userSelect = 'none';
    if (type === 'width') document.body.style.cursor = 'ew-resize';
    if (type === 'height') document.body.style.cursor = 'ns-resize';
  };

  return (
    <div 
      ref={rootRef}
      className="bg-studio-800 rounded-xl border border-studio-700 shadow-xl overflow-hidden flex flex-col transition-colors relative"
      style={{ 
          width: containerWidth ? `${containerWidth}px` : '100%',
          // Important: maxWidth 100% ensures that if the parent (Sidebar) shrinks,
          // this component shrinks with it, maintaining the Sidebar's control.
          maxWidth: '100%' 
      }}
    >
       {/* Header - Reorganized Layout */}
       <div className="px-4 py-3 border-b border-studio-700 bg-studio-900/30 flex flex-col gap-3">
          
          {/* Top Row: Title (Left) */}
          <div className="flex items-center gap-2 text-studio-fg select-none">
             <Eye className="w-5 h-5 text-studio-accent" />
             
             {isEditingTitle ? (
                <input
                    autoFocus
                    type="text"
                    value={titleEditValue}
                    onChange={(e) => setTitleEditValue(e.target.value)}
                    onBlur={saveTitle}
                    onKeyDown={handleTitleKeyDown}
                    className="bg-studio-800 border border-studio-accent text-studio-fg px-2 py-0.5 rounded focus:outline-none text-lg font-bold tracking-wide w-[150px]"
                />
             ) : (
                <h2 
                    className="text-lg font-bold tracking-wide cursor-pointer hover:text-studio-accent transition-colors"
                    onDoubleClick={startEditingTitle}
                    title="雙擊重新命名"
                >
                    {title}
                </h2>
             )}

             <span className="ml-1 text-xs text-studio-muted bg-studio-900 px-2 py-0.5 rounded-full border border-studio-700 min-w-[20px] text-center">
               {items.length}
             </span>
          </div>

          {/* Bottom Row: Form (Right) */}
          <form onSubmit={handleSubmit} className="flex gap-2 w-full justify-end">
             <input
               type="text"
               value={inputValue}
               onChange={(e) => setInputValue(e.target.value)}
               placeholder="輸入想關注的素材名稱..."
               className="w-full sm:w-64 bg-studio-900 border border-studio-600 rounded-xl px-3 py-1.5 text-sm text-studio-fg focus:ring-2 focus:ring-studio-accent focus:outline-none placeholder-gray-500 transition-all shadow-inner"
             />
             <button
               type="submit"
               disabled={!inputValue.trim()}
               className="bg-studio-accent hover:bg-cyan-400 text-studio-900 font-bold px-4 py-1.5 rounded-xl transition-colors disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-2 shadow-lg shadow-cyan-900/20 whitespace-nowrap text-sm"
             >
                <Plus className="w-4 h-4" />
                新增
             </button>
          </form>
       </div>

       {/* Table Area (Resizes with listHeight) */}
       <div 
         style={{ height: listHeight }} 
         className="overflow-hidden flex flex-col border-b border-studio-700 bg-studio-900/20"
       >
          <div className="overflow-x-auto flex-1 custom-scrollbar">
            <table 
                className="text-left border-collapse"
                style={{ 
                    tableLayout: 'fixed', 
                    width: '100%' 
                }}
            >
                <thead>
                    <tr className="bg-studio-800/50 text-studio-muted text-xs border-b border-studio-700 select-none">
                        <th 
                            className="relative p-3 font-medium border-r border-studio-700 hover:bg-studio-700/20"
                        >
                            <div className="flex items-center gap-1">名稱 (雙擊編輯)</div>
                        </th>
                         <th className="w-[60px] p-3 text-center border-r border-transparent">操作</th>
                    </tr>
                </thead>
                <tbody className="divide-y divide-studio-700/50">
                    {items.length === 0 ? (
                        <tr>
                            <td colSpan={2} className="p-8 text-center text-studio-muted text-sm italic">
                                尚未加入任何觀察項目
                            </td>
                        </tr>
                    ) : (
                        items.map(item => (
                            <tr key={item.id} className="group hover:bg-studio-700/30 transition-colors">
                                <td className="p-3 align-middle font-medium text-studio-fg border-r border-transparent">
                                    {editingId === item.id ? (
                                        <input
                                          autoFocus
                                          type="text"
                                          value={editValue}
                                          onChange={(e) => setEditValue(e.target.value)}
                                          onBlur={() => saveEditing(item.id)}
                                          onKeyDown={(e) => handleEditKeyDown(e, item.id)}
                                          className="w-full bg-studio-900 border border-studio-accent rounded px-2 py-1 text-sm focus:outline-none"
                                        />
                                    ) : (
                                        <div 
                                          className="truncate cursor-text" 
                                          title={`${item.name} (雙擊編輯)`}
                                          onDoubleClick={() => startEditing(item)}
                                        >
                                            {item.name}
                                        </div>
                                    )}
                                </td>
                                <td className="p-3 text-center align-middle border-r border-transparent">
                                    <button
                                        onClick={() => onRemove(item.id)}
                                        className="p-1.5 text-studio-muted hover:text-red-400 hover:bg-studio-800 rounded-lg transition-colors opacity-0 group-hover:opacity-100 focus:opacity-100"
                                        title="移除"
                                    >
                                        <X className="w-4 h-4" />
                                    </button>
                                </td>
                            </tr>
                        ))
                    )}
                </tbody>
            </table>
          </div>
       </div>

       {/* Resizers */}
       
       {/* Bottom Height Resizer */}
       <div 
          className="absolute bottom-0 left-0 right-0 h-3 cursor-ns-resize z-30 hover:bg-studio-accent/20 transition-colors group flex items-end justify-center"
          onMouseDown={(e) => startResize('height', e)}
          title="上下拖曳調整表格高度"
       >
          <div className="h-1 w-16 rounded-full mb-1 transition-colors duration-300 bg-studio-700 group-hover:bg-studio-600" />
       </div>

       {/* Right Width Resizer */}
       <div 
          className="absolute right-0 top-0 bottom-0 w-3 cursor-ew-resize z-40 hover:bg-studio-accent/20 transition-colors group flex items-center justify-end"
          onMouseDown={(e) => startResize('width', e)}
          title="左右拖曳調整觀察名單寬度"
       >
          <div className="w-1 h-12 rounded-full mr-0.5 transition-colors duration-300 bg-studio-700 group-hover:bg-studio-600" />
       </div>
    </div>
  );
};

export default WatchList;
