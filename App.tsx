import React, { useState, useEffect, useCallback, useRef } from 'react';
import AssetForm from './components/AssetForm';
import AssetList from './components/AssetList';
import WatchList from './components/WatchList';
import { AudioAsset, WatchListItem } from './types';
import { Boxes, LayoutGrid, Lightbulb, X, Undo, Redo, Sun, Moon, Download, Upload } from 'lucide-react';
import { suggestCreativeIdea } from './services/geminiService';

const App: React.FC = () => {
  const [assets, setAssets] = useState<AudioAsset[]>(() => {
    const saved = localStorage.getItem('sonicVault_assets');
    return saved ? JSON.parse(saved) : [];
  });

  // Watch List State
  const [watchList, setWatchList] = useState<WatchListItem[]>(() => {
    const saved = localStorage.getItem('sonicVault_watchList');
    return saved ? JSON.parse(saved) : [];
  });

  // Theme State
  const [isDarkMode, setIsDarkMode] = useState(() => {
    const savedTheme = localStorage.getItem('sonicVault_theme');
    return savedTheme ? savedTheme === 'dark' : true; // Default to dark
  });

  // History State for Undo/Redo
  const [history, setHistory] = useState<AudioAsset[][]>([]);
  const [redoStack, setRedoStack] = useState<AudioAsset[][]>([]);
  
  const [idea, setIdea] = useState<string | null>(null);
  const [generatingIdea, setGeneratingIdea] = useState(false);

  // Layout Resizing State
  const [sidebarWidth, setSidebarWidth] = useState(400); // Default width in pixels
  const [isResizing, setIsResizing] = useState(false);
  const containerRef = useRef<HTMLDivElement>(null);
  
  // File Import Ref
  const fileInputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    localStorage.setItem('sonicVault_assets', JSON.stringify(assets));
  }, [assets]);

  useEffect(() => {
    localStorage.setItem('sonicVault_watchList', JSON.stringify(watchList));
  }, [watchList]);

  // Apply Theme
  useEffect(() => {
    if (isDarkMode) {
        document.body.classList.remove('light-mode');
        localStorage.setItem('sonicVault_theme', 'dark');
    } else {
        document.body.classList.add('light-mode');
        localStorage.setItem('sonicVault_theme', 'light');
    }
  }, [isDarkMode]);

  const toggleTheme = () => {
    setIsDarkMode(prev => !prev);
  };

  // Central function to update assets and push to history
  const commitChange = (newAssets: AudioAsset[]) => {
    setHistory(prev => [...prev, assets]); // Save current state to history
    setRedoStack([]); // Clear redo stack on new change
    setAssets(newAssets);
  };

  const handleUndo = useCallback(() => {
    if (history.length === 0) return;
    
    const previousState = history[history.length - 1];
    const newHistory = history.slice(0, -1);
    
    setRedoStack(prev => [assets, ...prev]); // Push current to redo
    setAssets(previousState);
    setHistory(newHistory);
  }, [assets, history]);

  const handleRedo = useCallback(() => {
    if (redoStack.length === 0) return;

    const nextState = redoStack[0];
    const newRedoStack = redoStack.slice(1);

    setHistory(prev => [...prev, assets]); // Push current to history
    setAssets(nextState);
    setRedoStack(newRedoStack);
  }, [assets, redoStack]);

  // Data Export/Import Logic
  const handleExport = () => {
    const dataStr = JSON.stringify(assets, null, 2);
    const blob = new Blob([dataStr], { type: "application/json" });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = `sonicvault_backup_${new Date().toISOString().slice(0, 10)}.json`;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(url);
  };

  const handleImportClick = () => {
    fileInputRef.current?.click();
  };

  const handleFileChange = (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = (e) => {
      try {
        const content = e.target?.result as string;
        const parsed = JSON.parse(content);
        if (Array.isArray(parsed)) {
           // Basic validation
           const isValid = parsed.every((item: any) => typeof item === 'object' && 'id' in item && 'name' in item);
           
           if (isValid) {
               if (window.confirm(`確定要匯入 ${parsed.length} 個項目嗎？這將會覆蓋目前的列表 (可使用 Undo 復原)。`)) {
                  commitChange(parsed);
               }
           } else {
               alert("匯入失敗：檔案內容格式不正確 (缺少必要欄位)");
           }
        } else {
          alert("匯入失敗：檔案內容必須是陣列格式");
        }
      } catch (error) {
        console.error(error);
        alert("讀取檔案失敗");
      }
      // Reset input
      if (fileInputRef.current) fileInputRef.current.value = '';
    };
    reader.readAsText(file);
  };

  // Resizing Logic
  const startResizing = useCallback(() => {
    setIsResizing(true);
  }, []);

  const stopResizing = useCallback(() => {
    setIsResizing(false);
  }, []);

  const resize = useCallback((mouseMoveEvent: MouseEvent) => {
    if (isResizing && containerRef.current) {
      const containerLeft = containerRef.current.getBoundingClientRect().left;
      // Calculate width relative to the container's left edge
      const newWidth = mouseMoveEvent.clientX - containerLeft;
      
      // Constraints (Min 300px, Max 800px)
      if (newWidth > 300 && newWidth < 800) {
        setSidebarWidth(newWidth);
      }
    }
  }, [isResizing]);

  useEffect(() => {
    if (isResizing) {
      window.addEventListener("mousemove", resize);
      window.addEventListener("mouseup", stopResizing);
      document.body.style.cursor = "col-resize";
      document.body.style.userSelect = "none"; // Prevent text selection while dragging
    } else {
      window.removeEventListener("mousemove", resize);
      window.removeEventListener("mouseup", stopResizing);
      document.body.style.cursor = "";
      document.body.style.userSelect = "";
    }
    return () => {
      window.removeEventListener("mousemove", resize);
      window.removeEventListener("mouseup", stopResizing);
      document.body.style.cursor = "";
      document.body.style.userSelect = "";
    };
  }, [isResizing, resize, stopResizing]);


  // Keyboard Shortcuts
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      // Ignore if user is typing in an input or textarea
      const target = e.target as HTMLElement;
      if (target.tagName === 'INPUT' || target.tagName === 'TEXTAREA') return;

      if ((e.ctrlKey || e.metaKey) && e.key.toLowerCase() === 'z') {
        e.preventDefault();
        if (e.shiftKey) {
          handleRedo();
        } else {
          handleUndo();
        }
      } else if ((e.ctrlKey || e.metaKey) && e.key.toLowerCase() === 'y') {
        e.preventDefault();
        handleRedo();
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [handleUndo, handleRedo]);

  const handleAddAsset = (asset: AudioAsset) => {
    const newAssets = [asset, ...assets];
    commitChange(newAssets);
  };

  const handleAddBatch = (newAssets: AudioAsset[]) => {
    const combinedAssets = [...newAssets, ...assets];
    commitChange(combinedAssets);
  };

  const handleDeleteMultiple = (ids: string[]) => {
    if (ids.length === 0) return;
    const newAssets = assets.filter(a => !ids.includes(a.id));
    commitChange(newAssets);
  };

  const handleUpdateAsset = (id: string, updates: Partial<AudioAsset>) => {
    const newAssets = assets.map(asset => 
      asset.id === id ? { ...asset, ...updates } : asset
    );
    commitChange(newAssets);
  };

  const handleUpdateMultiple = (ids: string[], updates: Partial<AudioAsset>) => {
    const newAssets = assets.map(asset => 
      ids.includes(asset.id) ? { ...asset, ...updates } : asset
    );
    commitChange(newAssets);
  };

  const handleMoveAsset = (fromId: string, toId: string) => {
    const copy = [...assets];
    const fromIndex = copy.findIndex(a => a.id === fromId);
    const toIndex = copy.findIndex(a => a.id === toId);
    
    if (fromIndex === -1 || toIndex === -1 || fromIndex === toIndex) return;
    
    const [removed] = copy.splice(fromIndex, 1);
    copy.splice(toIndex, 0, removed);
    commitChange(copy);
  };

  // Watch List Handlers
  const handleAddWatchItem = (name: string) => {
    const newItem: WatchListItem = {
      id: crypto.randomUUID(),
      name,
      createdAt: new Date().toISOString()
    };
    setWatchList(prev => [newItem, ...prev]);
  };

  const handleUpdateWatchItem = (id: string, newName: string) => {
    setWatchList(prev => prev.map(item => 
      item.id === id ? { ...item, name: newName } : item
    ));
  };

  const handleRemoveWatchItem = (id: string) => {
    setWatchList(prev => prev.filter(item => item.id !== id));
  };

  const generateIdea = async () => {
    if (assets.length < 2) {
      alert("請至少加入兩個素材以生成靈感！");
      return;
    }
    setGeneratingIdea(true);
    // Pick 5 random assets to send to context
    const shuffled = [...assets].sort(() => 0.5 - Math.random());
    const selected = shuffled.slice(0, 5).map(a => a.name);
    
    const result = await suggestCreativeIdea(selected);
    setIdea(result);
    setGeneratingIdea(false);
  };

  return (
    <div className="min-h-screen bg-studio-900 text-studio-fg font-sans pb-20 flex flex-col transition-colors duration-300">
      
      {/* Hidden File Input for Import */}
      <input 
        type="file" 
        ref={fileInputRef}
        onChange={handleFileChange}
        className="hidden"
        accept=".json"
      />

      {/* Header */}
      <header className="bg-studio-900 border-b border-studio-700 sticky top-0 z-50 bg-opacity-90 backdrop-blur-md flex-shrink-0 transition-colors duration-300">
        <div className="w-full px-4 md:px-6 h-16 flex items-center justify-between relative">
          
          {/* Left Side: Undo/Redo + Theme Toggle */}
          <div className="flex items-center gap-3 z-10">
            {/* Undo / Redo Buttons */}
            <div className="flex items-center bg-studio-800 rounded-full border border-studio-700 p-1 transition-colors duration-300">
              <button 
                onClick={handleUndo}
                disabled={history.length === 0}
                className="p-2 rounded-full hover:bg-studio-700 disabled:opacity-30 disabled:hover:bg-transparent transition-colors text-studio-muted hover:text-studio-fg"
                title="復原 (Ctrl+Z)"
              >
                <Undo className="w-4 h-4" />
              </button>
              <div className="w-px h-4 bg-studio-700 mx-1 transition-colors duration-300"></div>
              <button 
                onClick={handleRedo}
                disabled={redoStack.length === 0}
                className="p-2 rounded-full hover:bg-studio-700 disabled:opacity-30 disabled:hover:bg-transparent transition-colors text-studio-muted hover:text-studio-fg"
                title="重做 (Ctrl+Shift+Z / Ctrl+Y)"
              >
                <Redo className="w-4 h-4" />
              </button>
            </div>

            {/* Theme Toggle Button */}
            <button
                onClick={toggleTheme}
                className="p-2 rounded-full text-studio-muted hover:text-studio-accent hover:bg-studio-800 transition-colors border border-transparent hover:border-studio-700"
                title={isDarkMode ? "切換至淺色模式" : "切換至深色模式"}
            >
                {isDarkMode ? <Sun className="w-5 h-5" /> : <Moon className="w-5 h-5" />}
            </button>
          </div>

          {/* Center: Title (Absolute Positioning) */}
          <div className="absolute left-1/2 top-1/2 transform -translate-x-1/2 -translate-y-1/2 z-0">
             <div className="flex items-center gap-3 select-none">
              <div className="bg-studio-accent/20 p-2 rounded-lg">
                <Boxes className="w-6 h-6 text-studio-accent" />
              </div>
              <h1 className="text-xl md:text-2xl font-bold tracking-tight text-studio-fg hidden sm:block">
                卓德<span className="text-studio-accent">管理助手</span>
              </h1>
            </div>
          </div>
          
          {/* Right Side: Import/Export + Idea */}
          <div className="flex items-center gap-2 z-10">
            
            {/* Import/Export Buttons */}
            <div className="flex items-center bg-studio-800 rounded-full border border-studio-700 p-1 mr-1 transition-colors duration-300">
              <button 
                onClick={handleImportClick}
                className="p-2 rounded-full hover:bg-studio-700 transition-colors text-studio-muted hover:text-studio-fg"
                title="匯入資料 (JSON)"
              >
                <Upload className="w-4 h-4" />
              </button>
              <div className="w-px h-4 bg-studio-700 mx-1 transition-colors duration-300"></div>
              <button 
                onClick={handleExport}
                className="p-2 rounded-full hover:bg-studio-700 transition-colors text-studio-muted hover:text-studio-fg"
                title="匯出資料 (JSON)"
              >
                <Download className="w-4 h-4" />
              </button>
            </div>

            <button 
              onClick={generateIdea}
              disabled={generatingIdea}
              className="text-xs md:text-sm bg-studio-700 hover:bg-studio-600 text-cyan-300 hover:text-cyan-200 px-3 py-1.5 rounded-full flex items-center gap-2 border border-studio-600 transition-all shadow-sm"
            >
              {generatingIdea ? (
                 <div className="w-4 h-4 border-2 border-current border-t-transparent rounded-full animate-spin" />
              ) : (
                <Lightbulb className="w-4 h-4" />
              )}
              <span className="hidden md:inline">靈感生成</span>
            </button>
          </div>
        </div>
      </header>

      {/* Idea Banner */}
      {idea && (
        <div className="bg-gradient-to-r from-violet-900/50 to-cyan-900/50 border-b border-studio-600 p-4 flex-shrink-0 animate-in slide-in-from-top-2">
           <div className="w-full px-4 md:px-6 flex gap-4 items-start relative">
             <Lightbulb className="w-5 h-5 text-yellow-400 mt-0.5 flex-shrink-0" />
             <p className="text-gray-100 italic text-sm md:text-base pr-8 text-shadow">"{idea}"</p>
             <button 
              onClick={() => setIdea(null)}
              className="absolute top-0 right-4 p-1 text-gray-400 hover:text-white"
             >
               <X className="w-4 h-4" />
             </button>
           </div>
        </div>
      )}

      {/* Main Content */}
      <main className="flex-1 w-full px-4 md:px-6 py-6" ref={containerRef}>
        
        {/* Replaced Grid with Flexbox for resizing */}
        <div className="flex flex-col lg:flex-row h-full gap-8 lg:gap-0">
          
          {/* Left Column: Form & WatchList */}
          <div 
            className="flex-shrink-0 space-y-8 lg:pr-6 w-full lg:w-[var(--sidebar-width)]"
            style={{ '--sidebar-width': `${sidebarWidth}px` } as React.CSSProperties}
          >
            <AssetForm onAdd={handleAddAsset} onAddBatch={handleAddBatch} />
            
            {/* Watch List Section */}
            <WatchList 
              items={watchList}
              onAdd={handleAddWatchItem}
              onUpdate={handleUpdateWatchItem}
              onRemove={handleRemoveWatchItem}
            />
          </div>

          {/* Resizer Handle (Visible only on Desktop) */}
          <div
            className="hidden lg:flex w-4 cursor-col-resize items-center justify-center hover:bg-studio-800/50 group transition-colors -ml-2 z-10 select-none rounded"
            onMouseDown={startResizing}
          >
             <div className={`w-1 h-12 rounded-full transition-colors ${isResizing ? 'bg-studio-accent' : 'bg-studio-700 group-hover:bg-studio-500'}`} />
          </div>

          {/* Right Column: Library List */}
          <div className="flex-1 min-w-0 lg:pl-2">
            <div className="mb-6 flex items-center gap-2 text-studio-fg">
               <LayoutGrid className="w-5 h-5 text-studio-accent" />
               <h2 className="text-xl font-bold">素材列表</h2>
               <span className="ml-auto text-sm text-studio-muted bg-studio-800 px-2 py-0.5 rounded border border-studio-700 shadow-sm transition-colors duration-300">
                 {assets.length} 項目
               </span>
            </div>

            <AssetList 
              assets={assets} 
              onDeleteMultiple={handleDeleteMultiple} 
              onMove={handleMoveAsset} 
              onUpdate={handleUpdateAsset}
              onUpdateMultiple={handleUpdateMultiple}
            />
          </div>

        </div>
      </main>
    </div>
  );
};

export default App;