import React, { useState, useEffect, useRef, useCallback } from 'react';
import { Upload, X, FileImage, Clipboard, RefreshCw } from 'lucide-react';

interface ImageUploadPopoverProps {
  onUpload: (base64: string) => void;
  onClose: () => void;
  currentImage?: string;
}

const ImageUploadPopover: React.FC<ImageUploadPopoverProps> = ({ onUpload, onClose, currentImage }) => {
  const [isDragging, setIsDragging] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const containerRef = useRef<HTMLDivElement>(null);

  const processFile = (file: File) => {
    if (!file || !file.type.startsWith('image/')) return;
    const reader = new FileReader();
    reader.onload = (e) => {
      if (e.target?.result) {
        onUpload(e.target.result as string);
        // Do NOT close here, keep it open for preview
      }
    };
    reader.readAsDataURL(file);
  };

  // Handle File Input Change
  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) processFile(file);
    // Reset input value to allow re-selecting the same file if needed
    e.target.value = '';
  };

  // Handle Paste
  const handlePaste = useCallback((e: ClipboardEvent) => {
    const items = e.clipboardData?.items;
    if (!items) return;

    for (const item of items) {
      if (item.type.indexOf('image') !== -1) {
        const file = item.getAsFile();
        if (file) processFile(file);
        break;
      }
    }
  }, [onUpload]); 

  useEffect(() => {
    window.addEventListener('paste', handlePaste);
    return () => {
      window.removeEventListener('paste', handlePaste);
    };
  }, [handlePaste]);

  // Handle Drag & Drop
  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(true);
  };

  const handleDragLeave = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(false);
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(false);
    const file = e.dataTransfer.files?.[0];
    if (file) processFile(file);
  };

  // Handle Click Outside to Close
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (containerRef.current && !containerRef.current.contains(event.target as Node)) {
        onClose();
      }
    };
    // Add a small delay/timeout to prevent immediate closing if triggered by the opening click bubbling up
    const timer = setTimeout(() => {
        document.addEventListener('mousedown', handleClickOutside);
    }, 100);
    return () => {
        clearTimeout(timer);
        document.removeEventListener('mousedown', handleClickOutside);
    };
  }, [onClose]);

  return (
    <div 
        ref={containerRef}
        className="absolute top-full right-0 mt-2 z-50 w-64 bg-studio-800 border border-studio-600 rounded-xl shadow-2xl p-4 animate-in fade-in zoom-in-95 duration-200"
    >
      <div className="flex justify-between items-center mb-2">
         <span className="text-xs font-bold text-studio-fg flex items-center gap-1">
            <Upload className="w-3 h-3" /> 
            {currentImage ? '預覽圖片' : '上傳圖片'}
         </span>
         <button onClick={onClose} className="text-studio-muted hover:text-white" title="關閉">
            <X className="w-3 h-3" />
         </button>
      </div>

      <div 
        onDragOver={handleDragOver}
        onDragLeave={handleDragLeave}
        onDrop={handleDrop}
        className={`
            relative border-2 border-dashed rounded-lg flex flex-col items-center justify-center transition-all overflow-hidden
            ${isDragging ? 'border-studio-accent bg-studio-700/80' : 'border-studio-600 bg-studio-900/50'}
            ${currentImage ? 'h-48 border-solid border-studio-700' : 'p-4 gap-3'}
        `}
      >
        {currentImage ? (
           // Preview Mode
           <>
              <img 
                 src={currentImage} 
                 alt="Preview" 
                 className="w-full h-full object-contain" 
              />
              
              {/* Overlay for Change Image */}
              <div className={`absolute inset-0 bg-black/60 flex flex-col items-center justify-center gap-2 transition-opacity duration-200 ${isDragging ? 'opacity-100' : 'opacity-0 hover:opacity-100'}`}>
                 <p className="text-white font-bold text-sm">
                    {isDragging ? '放開以更換' : '更換圖片'}
                 </p>
                 {!isDragging && (
                   <button 
                      onClick={() => fileInputRef.current?.click()}
                      className="bg-studio-accent text-studio-900 px-3 py-1 rounded text-xs font-bold hover:bg-cyan-400 flex items-center gap-1"
                   >
                      <RefreshCw className="w-3 h-3" /> 選擇檔案
                   </button>
                 )}
                 {!isDragging && <span className="text-[10px] text-gray-300">或拖曳 / 貼上新圖</span>}
              </div>
           </>
        ) : (
           // Empty State Mode
           <>
              <div className="w-10 h-10 rounded-full bg-studio-800 flex items-center justify-center border border-studio-700 text-studio-muted">
                  {isDragging ? <FileImage className="w-5 h-5 text-studio-accent" /> : <Clipboard className="w-5 h-5" />}
              </div>
              
              <div className="space-y-1 text-center">
                  <p className="text-xs text-studio-fg font-medium">拖曳圖片至此</p>
                  <p className="text-[10px] text-studio-muted">或 Ctrl+V 直接貼上</p>
              </div>

              <button 
                 onClick={() => fileInputRef.current?.click()}
                 className="text-xs bg-studio-700 hover:bg-studio-600 text-white px-3 py-1.5 rounded transition-colors w-full border border-studio-600"
              >
                 選擇檔案
              </button>
           </>
        )}

        <input 
            type="file" 
            ref={fileInputRef} 
            onChange={handleFileChange} 
            className="hidden" 
            accept="image/*"
        />
      </div>
    </div>
  );
};

export default ImageUploadPopover;
