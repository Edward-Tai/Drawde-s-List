import React, { useState, useEffect, useRef } from 'react';
import { createPortal } from 'react-dom';
import { AudioAsset, AssetType, TextStyle } from '../types';
import { Search, Trash2, Calendar, Music, Headphones, ArrowUp, ArrowDown, ArrowUpDown, CheckSquare, Square, X, ListChecks, Edit2, ChevronDown, Bold, Italic, Palette, Type, Underline, Eraser, ChevronsUpDown, Image as ImageIcon, GripHorizontal, LayoutDashboard } from 'lucide-react';
import ImageUploadPopover from './ImageUploadPopover';

interface AssetListProps {
  assets: AudioAsset[];
  onDeleteMultiple: (ids: string[]) => void;
  onMove: (fromId: string, toId: string) => void;
  onUpdate: (id: string, updates: Partial<AudioAsset>) => void;
  onUpdateMultiple: (ids: string[], updates: Partial<AudioAsset>) => void;
}

type SortKey = keyof Pick<AudioAsset, 'name' | 'purchaseDate'>;
type SortDirection = 'asc' | 'desc';
type SectionId = 'source' | 'sfx';

interface SortConfig {
  key: SortKey;
  direction: SortDirection;
}

interface SectionTitles {
  source: string;
  sfx: string;
}

// State for Free-Floating Window
interface PanelState {
  x: number;
  y: number;
  w: number;
  h: number;
  zIndex: number;
}

// Column Width State per section
interface ColumnWidths {
    type: number;
    date: number;
}

// Interaction Tracking
interface InteractionState {
  type: 'drag' | 'resize-w' | 'resize-w-left' | 'resize-h' | 'resize-nwse';
  target: SectionId;
  startX: number;
  startY: number;
  initialStates: Record<SectionId, PanelState>;
}

// Column Resize Tracking
interface ColResizeState {
    col: keyof ColumnWidths;
    targetSection: SectionId;
    startX: number;
    initialWidths: Record<SectionId, number>;
    direction: 'left' | 'right';
}

// Helper to strip HTML tags for sorting/searching
const stripHtml = (html: string) => {
   if (!html) return '';
   const tmp = document.createElement("DIV");
   tmp.innerHTML = html;
   return tmp.textContent || tmp.innerText || "";
};

// --- Rich Text Toolbar Component ---
const RichTextToolbar: React.FC = () => {
  const handleMouseDown = (e: React.MouseEvent) => {
    e.preventDefault();
  };

  const execCmd = (command: string, value: string | undefined = undefined) => {
    document.execCommand('styleWithCSS', false, 'true');
    document.execCommand(command, false, value);
  };

  return (
    <div className="bg-studio-800 border border-studio-accent/50 rounded-xl p-2 flex flex-wrap items-center gap-2 mb-4 animate-in slide-in-from-top-2 shadow-lg shadow-studio-accent/10">
       <div className="flex items-center gap-2 px-2 text-xs font-bold text-studio-accent border-r border-studio-700 mr-1">
          <Edit2 className="w-4 h-4" />
          編輯文字
       </div>

       <div className="relative flex items-center" title="字體大小">
         <select 
            onChange={(e) => execCmd('fontSize', e.target.value)}
            className="appearance-none bg-studio-900 border border-studio-600 rounded pl-2 pr-6 py-1.5 text-xs text-studio-fg focus:outline-none focus:border-studio-accent cursor-pointer text-center w-[60px]"
            defaultValue="3"
         >
            <option value="1">10</option>
            <option value="2">13</option>
            <option value="3">16</option>
            <option value="4">18</option>
            <option value="5">24</option>
            <option value="6">32</option>
            <option value="7">48</option>
         </select>
         <ChevronDown className="w-3 h-3 text-studio-muted absolute right-1.5 pointer-events-none top-1/2 transform -translate-y-1/2" />
       </div>

       <div className="w-px h-5 bg-studio-700 mx-1"></div>

       <div className="flex gap-1">
          <button onMouseDown={handleMouseDown} onClick={() => execCmd('bold')} className="p-1.5 rounded hover:bg-studio-700 text-studio-muted hover:text-white transition-colors" title="粗體"><Bold className="w-4 h-4" /></button>
          <button onMouseDown={handleMouseDown} onClick={() => execCmd('italic')} className="p-1.5 rounded hover:bg-studio-700 text-studio-muted hover:text-white transition-colors" title="斜體"><Italic className="w-4 h-4" /></button>
          <button onMouseDown={handleMouseDown} onClick={() => execCmd('underline')} className="p-1.5 rounded hover:bg-studio-700 text-studio-muted hover:text-white transition-colors" title="底線"><Underline className="w-4 h-4" /></button>
       </div>

       <div className="w-px h-5 bg-studio-700 mx-1"></div>

       <div className="relative group flex items-center" onMouseDown={handleMouseDown}>
          <label className="cursor-pointer flex items-center gap-1.5 px-2 py-1.5 rounded border border-studio-600 hover:bg-studio-700 transition-colors" title="文字顏色">
             <Palette className="w-3.5 h-3.5 text-studio-fg" />
             <div className="w-3 h-3 rounded-full bg-gradient-to-br from-red-500 via-green-500 to-blue-500 border border-white/20"></div>
          </label>
          <input 
             type="color" 
             onMouseDown={handleMouseDown}
             onChange={(e) => execCmd('foreColor', e.target.value)}
             className="absolute inset-0 opacity-0 cursor-pointer w-full h-full"
          />
       </div>

       <div className="flex-1"></div>

       <button 
          onMouseDown={handleMouseDown}
          onClick={() => execCmd('removeFormat')}
          className="flex items-center gap-1 px-3 py-1.5 text-xs text-red-400 hover:text-red-300 hover:bg-red-900/20 rounded border border-transparent hover:border-red-900/50 transition-colors"
          title="清除選取文字的格式"
       >
          <Eraser className="w-3.5 h-3.5" />
          清除格式
       </button>
       
       <span className="text-xs text-studio-muted ml-2 hidden sm:inline">
          *選取文字後點擊樣式
       </span>
    </div>
  );
};

// --- Editable Cell Component ---
interface EditableCellProps {
  html: string;
  isEditing: boolean;
  onSave: (newHtml: string) => void;
  onBlur?: () => void;
  className?: string;
  placeholder?: string;
  singleLine?: boolean;
  autoFocus?: boolean;
  onPlaceholderClick?: () => void;
}

const EditableCell: React.FC<EditableCellProps> = ({ 
  html, isEditing, onSave, onBlur, className, placeholder, singleLine, autoFocus, onPlaceholderClick 
}) => {
  const contentEditableRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (isEditing && contentEditableRef.current) {
      if (contentEditableRef.current.innerHTML !== html) {
          contentEditableRef.current.innerHTML = html;
      }
      if (autoFocus) {
          contentEditableRef.current.focus();
      }
    }
  }, [isEditing, html, autoFocus]);

  const handleBlur = () => {
    if (contentEditableRef.current) {
       const newHtml = contentEditableRef.current.innerHTML;
       if (newHtml !== html) {
         onSave(newHtml);
       }
    }
    if (onBlur) onBlur();
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
      if (singleLine && e.key === 'Enter') {
          e.preventDefault();
          contentEditableRef.current?.blur();
      }
      if (e.key === 'Escape') {
          e.preventDefault();
          contentEditableRef.current?.blur();
      }
  };

  if (isEditing) {
    return (
      <div
        ref={contentEditableRef}
        contentEditable
        suppressContentEditableWarning
        onBlur={handleBlur}
        onKeyDown={handleKeyDown}
        className={`outline-none border-b border-dashed border-studio-accent/50 focus:border-studio-accent bg-studio-900/50 min-w-[50px] ${className}`}
        style={{ cursor: 'text' }}
      />
    );
  }

  if (!html && placeholder) {
      return (
        <span 
            className="opacity-50 italic text-sm cursor-pointer hover:text-studio-accent hover:opacity-100 transition-opacity"
            onClick={(e) => {
                e.stopPropagation();
                if (onPlaceholderClick) onPlaceholderClick();
            }}
        >
            {placeholder}
        </span>
      );
  }

  return (
    <div 
      className={className}
      dangerouslySetInnerHTML={{ __html: html || '' }} 
    />
  );
};

interface PreviewData {
  id: string;
  url: string;
  top: number;
  left: number;
}

const AssetList: React.FC<AssetListProps> = ({ assets, onDeleteMultiple, onMove, onUpdate, onUpdateMultiple }) => {
  const [searchTerm, setSearchTerm] = useState('');
  const [sortConfig, setSortConfig] = useState<SortConfig | null>(null);
  const [draggedId, setDraggedId] = useState<string | null>(null);
  const [hoveredId, setHoveredId] = useState<string | null>(null);
  const [isSelectionMode, setIsSelectionMode] = useState(false);
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());
  const [showBulkImage, setShowBulkImage] = useState(false);
  const [bulkPreviewImage, setBulkPreviewImage] = useState<string | undefined>(undefined);
  const [isDescriptionCollapsed, setIsDescriptionCollapsed] = useState(false);
  const [isStyleMode, setIsStyleMode] = useState(false);
  const [editingCell, setEditingCell] = useState<{id: string, field: 'name' | 'description'} | null>(null);
  const [previewData, setPreviewData] = useState<PreviewData | null>(null);

  // --- Module Selection State ---
  const [selectedModules, setSelectedModules] = useState<Set<SectionId>>(new Set());

  // --- Window/Panel System State ---
  const [panels, setPanels] = useState<Record<SectionId, PanelState>>({
    source: { x: 0, y: 0, w: 600, h: 600, zIndex: 1 },
    sfx: { x: 620, y: 0, w: 600, h: 600, zIndex: 1 }
  });
  
  // Independent Column Widths
  const [colWidths, setColWidths] = useState<Record<SectionId, ColumnWidths>>({
      source: { type: 140, date: 135 },
      sfx: { type: 140, date: 135 }
  });

  const interactionRef = useRef<InteractionState | null>(null);
  const colResizingRef = useRef<ColResizeState | null>(null);
  const containerRef = useRef<HTMLDivElement>(null);

  const [titles, setTitles] = useState<SectionTitles>(() => {
    const saved = localStorage.getItem('sonicVault_titles');
    return saved ? JSON.parse(saved) : { source: '音源 & 效果器', sfx: '音效素材包' };
  });
  const [editingSection, setEditingSection] = useState<'source' | 'sfx' | null>(null);
  const [sectionEditValue, setSectionEditValue] = useState('');

  useEffect(() => {
    localStorage.setItem('sonicVault_titles', JSON.stringify(titles));
  }, [titles]);

  useEffect(() => {
    const handleResize = () => {
        if (!containerRef.current) return;
        const { width: cw, height: ch } = containerRef.current.getBoundingClientRect();
        setPanels(prev => {
            let changed = false;
            const next = { ...prev };
            (['source', 'sfx'] as SectionId[]).forEach(key => {
                const p = next[key];
                let { x, y, w, h } = p;
                if (w > cw) { w = Math.max(300, cw); changed = true; }
                if (h > ch) { h = Math.max(200, ch); changed = true; }
                if (x + w > cw) { x = Math.max(0, cw - w); changed = true; }
                if (y + h > ch) { y = Math.max(0, ch - h); changed = true; }
                if (changed) next[key] = { ...p, x, y, w, h };
            });
            return changed ? next : prev;
        });
    };
    window.addEventListener('resize', handleResize);
    handleResize();
    return () => window.removeEventListener('resize', handleResize);
  }, []);

  // --- Snap-to-Align Logic Constants ---
  const SNAP_THRESHOLD = 8;

  // --- Global Window Interaction Logic (Drag & Resize with Sync) ---
  useEffect(() => {
    const handleGlobalMouseMove = (e: MouseEvent) => {
        if (!interactionRef.current || !containerRef.current) return;
        
        const containerRect = containerRef.current.getBoundingClientRect();
        const cw = containerRect.width;
        const ch = containerRect.height;

        const { type, target, startX, startY, initialStates } = interactionRef.current;
        const deltaX = e.clientX - startX;
        const deltaY = e.clientY - startY;

        setPanels(prev => {
            const nextPanels = { ...prev };
            
            // Determine which modules are being affected
            // If the target is selected, move ALL selected modules.
            // If the target is NOT selected, move ONLY the target.
            const isTargetSelected = selectedModules.has(target);
            const activeModules = isTargetSelected ? Array.from(selectedModules) : [target];

            // We calculate the potential new state for the "Master" (the one being dragged) first
            // to determine snapping and constraints, then apply the delta to others.
            const masterInitial = initialStates[target];
            const otherId = target === 'source' ? 'sfx' : 'source';
            const otherPanel = prev[otherId]; // Note: using 'prev' state for snapping reference

            // Calculate proposed Master changes
            let masterNextX = masterInitial.x;
            let masterNextY = masterInitial.y;
            let masterNextW = masterInitial.w;
            let masterNextH = masterInitial.h;

            if (type === 'drag') {
                masterNextX += deltaX;
                masterNextY += deltaY;

                // Snapping for Drag
                if (!selectedModules.has(otherId)) {
                    // X-axis Snapping
                    if (Math.abs(masterNextX - otherPanel.x) < SNAP_THRESHOLD) masterNextX = otherPanel.x; // Left to Left
                    if (Math.abs(masterNextX - (otherPanel.x + otherPanel.w)) < SNAP_THRESHOLD) masterNextX = otherPanel.x + otherPanel.w; // Left to Right
                    if (Math.abs((masterNextX + masterInitial.w) - otherPanel.x) < SNAP_THRESHOLD) masterNextX = otherPanel.x - masterInitial.w; // Right to Left
                    if (Math.abs((masterNextX + masterInitial.w) - (otherPanel.x + otherPanel.w)) < SNAP_THRESHOLD) masterNextX = otherPanel.x + otherPanel.w - masterInitial.w; // Right to Right

                    // Y-axis Snapping
                    if (Math.abs(masterNextY - otherPanel.y) < SNAP_THRESHOLD) masterNextY = otherPanel.y; // Top to Top
                    if (Math.abs(masterNextY - (otherPanel.y + otherPanel.h)) < SNAP_THRESHOLD) masterNextY = otherPanel.y + otherPanel.h; // Top to Bottom
                    if (Math.abs((masterNextY + masterInitial.h) - otherPanel.y) < SNAP_THRESHOLD) masterNextY = otherPanel.y - masterInitial.h; // Bottom to Top
                    if (Math.abs((masterNextY + masterInitial.h) - (otherPanel.y + otherPanel.h)) < SNAP_THRESHOLD) masterNextY = otherPanel.y + otherPanel.h - masterInitial.h; // Bottom to Bottom
                }

                // Boundaries
                masterNextX = Math.max(0, Math.min(masterNextX, cw - masterInitial.w));
                masterNextY = Math.max(0, Math.min(masterNextY, ch - masterInitial.h));

            } else if (type === 'resize-w') {
                masterNextW = Math.max(300, masterInitial.w + deltaX);
                const proposedRight = masterInitial.x + masterNextW;

                // Snap Right Edge
                if (!selectedModules.has(otherId)) {
                   // Right to Left
                   if (Math.abs(proposedRight - otherPanel.x) < SNAP_THRESHOLD) {
                       masterNextW = otherPanel.x - masterInitial.x;
                   } 
                   // Right to Right (Align Widths)
                   else if (Math.abs(proposedRight - (otherPanel.x + otherPanel.w)) < SNAP_THRESHOLD) {
                       masterNextW = (otherPanel.x + otherPanel.w) - masterInitial.x;
                   }
                }
                masterNextW = Math.min(masterNextW, cw - masterInitial.x);

            } else if (type === 'resize-w-left') {
                masterNextX = masterInitial.x + deltaX;
                masterNextW = masterInitial.w - deltaX;
                
                if (!selectedModules.has(otherId)) {
                    // Left to Right
                    if (Math.abs(masterNextX - (otherPanel.x + otherPanel.w)) < SNAP_THRESHOLD) {
                        const diff = masterNextX - (otherPanel.x + otherPanel.w);
                        masterNextX = (otherPanel.x + otherPanel.w);
                        masterNextW += diff; // width reduces as X moves right, but here we snap, so we adjust
                    }
                    // Left to Left (Align Lefts)
                    if (Math.abs(masterNextX - otherPanel.x) < SNAP_THRESHOLD) {
                        const diff = masterNextX - otherPanel.x;
                        masterNextX = otherPanel.x;
                        masterNextW += diff;
                    }
                }
                if (masterNextW < 300) {
                     masterNextX = masterInitial.x + (masterInitial.w - 300);
                     masterNextW = 300;
                }
                masterNextX = Math.max(0, masterNextX);

            } else if (type === 'resize-h') {
                masterNextH = Math.max(200, masterInitial.h + deltaY);
                const proposedBottom = masterInitial.y + masterNextH;

                 if (!selectedModules.has(otherId)) {
                    // Bottom to Top
                    if (Math.abs(proposedBottom - otherPanel.y) < SNAP_THRESHOLD) {
                        masterNextH = otherPanel.y - masterInitial.y;
                    }
                    // Bottom to Bottom (Align Heights)
                    else if (Math.abs(proposedBottom - (otherPanel.y + otherPanel.h)) < SNAP_THRESHOLD) {
                        masterNextH = (otherPanel.y + otherPanel.h) - masterInitial.y;
                    }
                 }
                 masterNextH = Math.min(masterNextH, ch - masterInitial.y);

            } else if (type === 'resize-nwse') {
                // Combine Width and Height logic (simplified)
                masterNextW = Math.max(300, masterInitial.w + deltaX);
                masterNextH = Math.max(200, masterInitial.h + deltaY);
                
                const proposedRight = masterInitial.x + masterNextW;
                const proposedBottom = masterInitial.y + masterNextH;

                if (!selectedModules.has(otherId)) {
                   // Width Snaps
                   if (Math.abs(proposedRight - otherPanel.x) < SNAP_THRESHOLD) masterNextW = otherPanel.x - masterInitial.x;
                   else if (Math.abs(proposedRight - (otherPanel.x + otherPanel.w)) < SNAP_THRESHOLD) masterNextW = (otherPanel.x + otherPanel.w) - masterInitial.x;

                   // Height Snaps
                   if (Math.abs(proposedBottom - otherPanel.y) < SNAP_THRESHOLD) masterNextH = otherPanel.y - masterInitial.y;
                   else if (Math.abs(proposedBottom - (otherPanel.y + otherPanel.h)) < SNAP_THRESHOLD) masterNextH = (otherPanel.y + otherPanel.h) - masterInitial.y;
                }

                masterNextW = Math.min(masterNextW, cw - masterInitial.x);
                masterNextH = Math.min(masterNextH, ch - masterInitial.y);
            }

            // Calculate actual effective deltas based on Master constraints
            const effectiveDX = masterNextX - masterInitial.x;
            const effectiveDY = masterNextY - masterInitial.y;
            const effectiveDW = masterNextW - masterInitial.w;
            const effectiveDH = masterNextH - masterInitial.h;

            // Apply to all active modules
            activeModules.forEach(modId => {
                const init = initialStates[modId];
                
                let newX = init.x;
                let newY = init.y;
                let newW = init.w;
                let newH = init.h;

                if (type === 'drag') {
                    newX = Math.max(0, Math.min(init.x + effectiveDX, cw - init.w));
                    newY = Math.max(0, Math.min(init.y + effectiveDY, ch - init.h));
                } else if (type === 'resize-w') {
                    newW = Math.max(300, Math.min(init.w + effectiveDW, cw - init.x));
                } else if (type === 'resize-w-left') {
                     // For left resize sync, we move X and change W
                     newX = Math.max(0, init.x + effectiveDX);
                     newW = Math.max(300, init.w + effectiveDW); // effectiveDW is negative here usually
                } else if (type === 'resize-h') {
                     newH = Math.max(200, Math.min(init.h + effectiveDH, ch - init.y));
                } else if (type === 'resize-nwse') {
                     newW = Math.max(300, Math.min(init.w + effectiveDW, cw - init.x));
                     newH = Math.max(200, Math.min(init.h + effectiveDH, ch - init.y));
                }

                nextPanels[modId] = {
                    ...nextPanels[modId],
                    x: newX,
                    y: newY,
                    w: newW,
                    h: newH
                };
            });

            return nextPanels;
        });
    };

    const handleGlobalMouseUp = () => {
        if (interactionRef.current) {
            interactionRef.current = null;
            document.body.style.cursor = '';
            document.body.style.userSelect = '';
        }
    };

    window.addEventListener('mousemove', handleGlobalMouseMove);
    window.addEventListener('mouseup', handleGlobalMouseUp);

    return () => {
        window.removeEventListener('mousemove', handleGlobalMouseMove);
        window.removeEventListener('mouseup', handleGlobalMouseUp);
    };
  }, [selectedModules]);

  const bringToFront = (sectionId: SectionId) => {
      setPanels(prev => {
          const maxZ = Math.max(prev.source.zIndex, prev.sfx.zIndex);
          if (prev[sectionId].zIndex === maxZ) return prev;
          return {
              ...prev,
              [sectionId]: { ...prev[sectionId], zIndex: maxZ + 1 }
          };
      });
  };

  const startInteraction = (
      e: React.MouseEvent, 
      section: SectionId, 
      type: InteractionState['type']
  ) => {
      // Prevent interacting with inputs from triggering Drag
      if ((e.target as HTMLElement).tagName === 'INPUT' || (e.target as HTMLElement).tagName === 'SELECT') {
          return;
      }
      e.preventDefault();
      e.stopPropagation();
      bringToFront(section);

      // --- Selection Logic ---
      // If Dragging (clicking header), handle selection state
      if (type === 'drag') {
          const isCtrl = e.ctrlKey || e.metaKey;
          setSelectedModules(prev => {
              const next = new Set(prev);
              if (isCtrl) {
                  // Toggle
                  if (next.has(section)) next.delete(section);
                  else next.add(section);
              } else {
                  // If not holding Ctrl
                  // If clicking something NOT selected, select ONLY that (Standard behavior)
                  // If clicking something ALREADY selected, Keep it selected (assume drag start of group),
                  // BUT usually if you just Click (MouseUp) it deselects others. 
                  // For simplicity in this Web App context: Click Header without Ctrl = Select Only This.
                  if (!next.has(section)) {
                      next.clear();
                      next.add(section);
                  } else if (next.size > 1) {
                      // If multiple selected, and we click one, we reset to just this one
                      // UNLESS we want to support moving a group.
                      // Let's allow moving group: Don't clear immediately. 
                      // (Implementing "Click to Select vs Drag Group" properly requires MouseUp logic, skipping for simplicity to prioritize dragging)
                      // Current Compromise: If you click without Ctrl, you select ONLY this one immediately.
                      next.clear();
                      next.add(section);
                  }
              }
              return next;
          });
      }

      interactionRef.current = {
          type,
          target: section,
          startX: e.clientX,
          startY: e.clientY,
          initialStates: JSON.parse(JSON.stringify(panels))
      };

      document.body.style.userSelect = 'none';
      if (type === 'drag') document.body.style.cursor = 'grabbing';
      if (type === 'resize-w' || type === 'resize-w-left') document.body.style.cursor = 'col-resize';
      if (type === 'resize-h') document.body.style.cursor = 'row-resize';
      if (type === 'resize-nwse') document.body.style.cursor = 'nwse-resize';
  };

  const resetLayout = () => {
      setPanels({
        source: { x: 0, y: 0, w: 600, h: 600, zIndex: 1 },
        sfx: { x: 620, y: 0, w: 600, h: 600, zIndex: 1 }
      });
      setSelectedModules(new Set());
  };

  // --- Column Resize Logic (Synchronized) ---
  const handleColumnResizeStart = (e: React.MouseEvent, col: keyof ColumnWidths, direction: 'left' | 'right', section: SectionId) => {
    e.preventDefault();
    e.stopPropagation();
    
    // Create initial widths map for calculation
    const initialWidths: Record<SectionId, number> = {
        source: colWidths.source[col],
        sfx: colWidths.sfx[col]
    };

    colResizingRef.current = {
        col,
        targetSection: section,
        startX: e.clientX,
        initialWidths,
        direction
    };
    document.body.style.cursor = 'col-resize';
    document.body.style.userSelect = 'none';
    window.addEventListener('mousemove', handleColumnResizeMove);
    window.addEventListener('mouseup', handleColumnResizeEnd);
  };

  const handleColumnResizeMove = (e: MouseEvent) => {
      if (!colResizingRef.current) return;
      const { col, targetSection, startX, initialWidths, direction } = colResizingRef.current;
      
      const diff = direction === 'right' ? e.clientX - startX : startX - e.clientX;
      
      setColWidths(prev => {
          const next = { ...prev };
          
          // Determine targets: If target is selected, resize all selected. Else resize only target.
          const isTargetSelected = selectedModules.has(targetSection);
          const targets = isTargetSelected ? Array.from(selectedModules) : [targetSection];

          targets.forEach(secId => {
              next[secId] = {
                  ...next[secId],
                  [col]: Math.max(80, initialWidths[secId] + diff)
              };
          });
          return next;
      });
  };

  const handleColumnResizeEnd = () => {
      colResizingRef.current = null;
      document.body.style.cursor = '';
      document.body.style.userSelect = '';
      window.removeEventListener('mousemove', handleColumnResizeMove);
      window.removeEventListener('mouseup', handleColumnResizeEnd);
  };

  const handleSort = (key: SortKey) => {
    setSortConfig(current => {
      if (!current || current.key !== key) return { key, direction: 'desc' };
      if (current.direction === 'desc') return { key, direction: 'asc' };
      return null;
    });
  };

  const getSortIcon = (columnKey: SortKey) => {
    if (sortConfig?.key !== columnKey) return <ArrowUpDown className="w-3 h-3 opacity-30 group-hover:opacity-100" />;
    return sortConfig.direction === 'asc' 
      ? <ArrowUp className="w-3 h-3 text-studio-accent" /> 
      : <ArrowDown className="w-3 h-3 text-studio-accent" />;
  };

  const formatDisplayDate = (dateString: string) => {
    if (!dateString) return '';
    const date = new Date(dateString);
    if (isNaN(date.getTime())) return dateString;
    const yyyy = date.getFullYear();
    const mm = (date.getMonth() + 1).toString().padStart(2, '0');
    const dd = date.getDate().toString().padStart(2, '0');
    const hh = date.getHours().toString().padStart(2, '0');
    const min = date.getMinutes().toString().padStart(2, '0');
    return `${yyyy}/${mm}/${dd} ${hh}:${min}`;
  };

  const toggleSelectionMode = () => {
    if (isSelectionMode) setSelectedIds(new Set());
    setIsSelectionMode(!isSelectionMode);
    setEditingCell(null);
    setShowBulkImage(false);
  };

  const toggleSelect = (id: string) => {
    if (!isSelectionMode) return;
    setSelectedIds(prev => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  };

  const toggleSelectGroup = (groupAssets: AudioAsset[]) => {
    const groupIds = groupAssets.map(a => a.id);
    const allSelected = groupIds.every(id => selectedIds.has(id));
    setSelectedIds(prev => {
      const next = new Set(prev);
      if (allSelected) groupIds.forEach(id => next.delete(id));
      else groupIds.forEach(id => next.add(id));
      return next;
    });
  };

  const handleBulkDelete = () => {
    onDeleteMultiple(Array.from(selectedIds));
    setSelectedIds(new Set());
    setIsSelectionMode(false);
  };

  const handleBulkImageUpdate = (base64: string) => {
    if (selectedIds.size === 0) return;
    onUpdateMultiple(Array.from(selectedIds), { image: base64 });
    setBulkPreviewImage(base64);
  };

  const startEditingSection = (key: 'source' | 'sfx') => {
    if (isSelectionMode) return;
    setEditingSection(key);
    setSectionEditValue(titles[key]);
  };

  const saveSectionTitle = () => {
    if (editingSection && sectionEditValue.trim()) {
      setTitles(prev => ({ ...prev, [editingSection]: sectionEditValue.trim() }));
    }
    setEditingSection(null);
  };

  const handleSectionKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter') saveSectionTitle();
    else if (e.key === 'Escape') setEditingSection(null);
  };

  const filteredAssets = assets.filter(a => 
    stripHtml(a.name).toLowerCase().includes(searchTerm.toLowerCase())
  );

  const sortedAssets = [...filteredAssets];
  if (sortConfig) {
    sortedAssets.sort((a, b) => {
      let aValue = a[sortConfig.key];
      let bValue = b[sortConfig.key];
      if (sortConfig.key === 'purchaseDate') {
         const tA = new Date(aValue).getTime();
         const tB = new Date(bValue).getTime();
         return sortConfig.direction === 'asc' ? tA - tB : tB - tA;
      }
      if (typeof aValue === 'string') aValue = stripHtml(aValue).toLowerCase();
      if (typeof bValue === 'string') bValue = stripHtml(bValue).toLowerCase();
      if (aValue < bValue) return sortConfig.direction === 'asc' ? -1 : 1;
      if (aValue > bValue) return sortConfig.direction === 'asc' ? 1 : -1;
      return 0;
    });
  }

  const sourceGroup = sortedAssets.filter(a => 
    a.type === AssetType.INSTRUMENT || a.type === AssetType.PRESET || a.type === AssetType.EFFECT
  );
  const sfxGroup = sortedAssets.filter(a => 
    a.type === AssetType.SFX || a.type === AssetType.LOOP
  );

  const handleDragStart = (e: React.DragEvent, id: string) => {
    if (sortConfig !== null || searchTerm || isSelectionMode || isStyleMode || editingCell) {
      e.preventDefault();
      return;
    }
    setDraggedId(id);
    e.dataTransfer.effectAllowed = "move";
    e.stopPropagation();
  };

  const handleDragOver = (e: React.DragEvent) => {
    if (sortConfig !== null || searchTerm || isSelectionMode || isStyleMode || editingCell) return;
    e.preventDefault();
    e.dataTransfer.dropEffect = "move";
  };

  const handleDrop = (e: React.DragEvent, targetId: string) => {
    e.preventDefault();
    e.stopPropagation();
    if (draggedId && draggedId !== targetId) onMove(draggedId, targetId);
    setDraggedId(null);
  };

  const renderLeftResizer = (col: keyof ColumnWidths, section: SectionId) => (
      <div 
        className="absolute -left-2 top-0 bottom-0 w-4 cursor-col-resize flex justify-center items-center group z-20 hover:bg-studio-700/30"
        onMouseDown={(e) => handleColumnResizeStart(e, col, 'left', section)}
        onClick={(e) => e.stopPropagation()}
      >
        <div className="w-px h-full bg-transparent group-hover:bg-studio-accent transition-colors shadow-sm" />
      </div>
  );

  const renderTable = (sectionKey: 'source' | 'sfx', icon: React.ReactNode, groupAssets: AudioAsset[], headerColor: string) => {
    const isGroupAllSelected = groupAssets.length > 0 && groupAssets.every(a => selectedIds.has(a.id));
    const isGroupPartiallySelected = groupAssets.some(a => selectedIds.has(a.id)) && !isGroupAllSelected;
    const isEditingTitle = editingSection === sectionKey;
    const { x, y, w, h, zIndex } = panels[sectionKey];
    const isModuleSelected = selectedModules.has(sectionKey);
    const widthState = colWidths[sectionKey];

    return (
      <div 
        className={`flex flex-col bg-studio-800 rounded-xl border shadow-2xl overflow-hidden select-none absolute transition-[box-shadow,border-color] duration-200 ${isModuleSelected ? 'border-studio-accent ring-2 ring-studio-accent/20' : 'border-studio-700'}`}
        style={{ 
            left: x, 
            top: y, 
            width: w, 
            height: h, 
            zIndex: zIndex,
            boxShadow: interactionRef.current?.target === sectionKey ? '0 25px 50px -12px rgba(0, 0, 0, 0.5)' : undefined
        }}
        onMouseDown={() => bringToFront(sectionKey)}
      >
        <div 
            className={`px-3 py-2 border-b flex justify-between items-center transition-colors group/header flex-shrink-0 cursor-grab active:cursor-grabbing ${isModuleSelected ? 'bg-studio-accent/10 border-studio-accent/30' : 'bg-studio-900 border-studio-700'}`}
            onMouseDown={(e) => startInteraction(e, sectionKey, 'drag')}
            title="點擊選取 (Ctrl+點擊多選) / 按住拖曳"
        >
          <div className="flex items-center gap-2 flex-1 overflow-hidden pointer-events-none">
             <div className="p-1 text-studio-muted/30 group-hover/header:text-studio-muted transition-colors"><GripHorizontal className="w-4 h-4" /></div>
             <div className={`flex items-center gap-2 font-bold ${isModuleSelected ? 'text-studio-accent' : headerColor} pointer-events-auto`}>
                {icon}
                {isEditingTitle ? (
                <input
                    autoFocus
                    type="text"
                    value={sectionEditValue}
                    onChange={(e) => setSectionEditValue(e.target.value)}
                    onBlur={saveSectionTitle}
                    onKeyDown={handleSectionKeyDown}
                    onMouseDown={(e) => e.stopPropagation()}
                    className="bg-studio-800 border border-studio-accent text-studio-fg px-2 py-0.5 rounded focus:outline-none text-base font-bold w-full max-w-[250px]"
                    placeholder="輸入標題..."
                />
                ) : (
                <h3 
                    className="flex items-center gap-2 cursor-pointer select-none hover:text-studio-fg transition-colors truncate"
                    onDoubleClick={() => startEditingSection(sectionKey)}
                    onMouseDown={(e) => e.stopPropagation()} // Let drag handler handle selection logic, double click handles edit
                    title="雙擊修改標題"
                >
                    {titles[sectionKey]}
                </h3>
                )}
            </div>
          </div>
          <div className="flex items-center gap-3 flex-shrink-0 pointer-events-auto">
             {isModuleSelected && <div className="w-2 h-2 rounded-full bg-studio-accent animate-pulse" />}
            <span className="text-xs font-mono bg-studio-800 text-studio-muted px-2 py-0.5 rounded border border-studio-700 transition-colors">{groupAssets.length}</span>
          </div>
        </div>
        
        <div className="overflow-x-auto flex-1 custom-scrollbar relative">
          <table className="text-left border-collapse" style={{ tableLayout: 'fixed', width: '100%' }}>
            <thead>
              <tr className="bg-studio-800/50 text-studio-muted text-xs border-b border-studio-700 select-none transition-colors">
                {isSelectionMode && (
                  <th className="w-12 p-3 text-center border-r border-studio-700">
                    <button onClick={() => toggleSelectGroup(groupAssets)} disabled={groupAssets.length === 0} className="focus:outline-none hover:text-studio-fg transition-colors disabled:opacity-30 disabled:cursor-not-allowed">
                      {isGroupAllSelected ? <CheckSquare className="w-4 h-4 text-studio-accent" /> : isGroupPartiallySelected ? <div className="w-4 h-4 bg-gray-700 rounded border border-gray-500 flex items-center justify-center"><div className="w-2 h-2 bg-studio-accent rounded-sm" /></div> : <Square className="w-4 h-4" />}
                    </button>
                  </th>
                )}
                <th className="relative p-3 font-medium whitespace-nowrap cursor-pointer hover:text-studio-fg transition-colors group border-r border-studio-700 hover:bg-studio-700/20" onClick={() => handleSort('name')}>
                  <div className="flex items-center gap-1">名稱 {getSortIcon('name')}</div>
                </th>
                <th className="relative p-3 font-medium whitespace-nowrap border-r border-studio-700" style={{ width: widthState.type }}>
                  {renderLeftResizer('type', sectionKey)}
                  <div className="flex items-center gap-1">類型</div>
                </th>
                <th className="relative p-3 font-medium whitespace-nowrap text-right cursor-pointer hover:text-studio-fg transition-colors group border-r border-transparent" style={{ width: widthState.date }} onClick={() => handleSort('purchaseDate')}>
                  {renderLeftResizer('date', sectionKey)}
                  <div className="flex items-center justify-end gap-1">入庫時間 {getSortIcon('purchaseDate')}</div>
                </th>
              </tr>
            </thead>
            <tbody className="divide-y divide-studio-700/50">
              {groupAssets.length === 0 ? (
                <tr><td colSpan={isSelectionMode ? 4 : 3} className="p-8 text-center text-studio-muted text-sm italic">暫無資料</td></tr>
              ) : (
                groupAssets.map((asset) => {
                  const isHovered = hoveredId === asset.id;
                  const isSelected = selectedIds.has(asset.id);
                  const isEditingAny = editingCell?.id === asset.id;
                  const isDraggable = sortConfig === null && !searchTerm && !isSelectionMode && !isStyleMode && !isEditingAny;
                  return (
                    <tr 
                      key={asset.id} 
                      className={`group transition-all duration-300 ease-out border-l-2 ${(isHovered && !isSelectionMode && !isStyleMode && !isEditingAny) ? 'bg-studio-800 border-studio-accent shadow-lg z-10' : 'bg-transparent border-transparent hover:bg-studio-700/30'} ${isSelected ? 'bg-studio-700/50 border-l-studio-secondary' : ''} ${draggedId === asset.id ? 'opacity-40 bg-studio-700' : ''} ${(isStyleMode || isEditingAny) ? 'bg-studio-800/30' : ''} ${isDraggable ? 'cursor-grab active:cursor-grabbing' : ''}`}
                      draggable={isDraggable}
                      onDragStart={(e) => handleDragStart(e, asset.id)}
                      onDragOver={handleDragOver}
                      onDrop={(e) => handleDrop(e, asset.id)}
                      onMouseEnter={() => setHoveredId(asset.id)}
                      onMouseLeave={() => setHoveredId(null)}
                      onClick={() => toggleSelect(asset.id)}
                    >
                      {isSelectionMode && <td className={`${isDescriptionCollapsed ? 'py-1.5 px-3' : 'p-3'} align-top text-center border-r border-transparent`} onClick={(e) => e.stopPropagation()}><div className="mt-1 flex justify-center"><input type="checkbox" checked={isSelected} onChange={() => toggleSelect(asset.id)} className="w-4 h-4 rounded border-studio-600 bg-studio-900 text-studio-accent cursor-pointer accent-studio-accent" /></div></td>}
                      <td className={`${isDescriptionCollapsed ? 'py-1.5 px-3' : 'p-3'} align-top overflow-visible border-r border-transparent`} onClick={e => (isStyleMode || isEditingAny) && e.stopPropagation()}>
                        <div className={`${isDescriptionCollapsed ? 'mb-0' : 'mb-1'} relative`} onClick={(e) => { if (isSelectionMode || isStyleMode || !asset.image || editingCell?.id === asset.id) return; e.stopPropagation(); const rect = (e.currentTarget as HTMLElement).getBoundingClientRect(); setPreviewData({ id: asset.id, url: asset.image!, top: rect.bottom + 5, left: rect.left + 10 }); }} onMouseLeave={() => setPreviewData(null)} onDoubleClick={(e) => { if (isSelectionMode || isStyleMode) return; e.stopPropagation(); setEditingCell({ id: asset.id, field: 'name' }); setPreviewData(null); }} title={isStyleMode ? "" : (asset.image ? "點擊顯示圖片預覽 / 雙擊編輯名稱" : "雙擊編輯名稱")}>
                          <div className="flex items-center gap-1.5">
                             {asset.image && !isStyleMode && editingCell?.id !== asset.id && <ImageIcon className="w-3.5 h-3.5 text-studio-accent flex-shrink-0" />}
                             <EditableCell html={asset.name} isEditing={isStyleMode || (editingCell?.id === asset.id && editingCell?.field === 'name')} onSave={(val) => onUpdate(asset.id, { name: val })} onBlur={() => setEditingCell(null)} singleLine={true} autoFocus={!isStyleMode} className={`text-base font-medium transition-all duration-300 origin-left block w-fit ${!isStyleMode && isHovered && !isSelectionMode && !isEditingAny ? 'scale-125 text-studio-fg' : 'scale-100 text-studio-fg/90'}`} />
                          </div>
                        </div>
                        {!isSelectionMode && <div className={`text-sm transition-all duration-300 ease-in-out origin-top ${isDescriptionCollapsed ? 'max-h-0 opacity-0 overflow-hidden mt-0 group-hover:max-h-[300px] group-hover:opacity-100 group-hover:mt-1' : 'mt-1'}`}><div onDoubleClick={(e) => { if (isSelectionMode || isStyleMode) return; e.stopPropagation(); setEditingCell({ id: asset.id, field: 'description' }); }} title={isStyleMode ? "" : "雙擊編輯描述"}><EditableCell html={asset.description} isEditing={isStyleMode || (editingCell?.id === asset.id && editingCell?.field === 'description')} onSave={(val) => onUpdate(asset.id, { description: val })} onBlur={() => setEditingCell(null)} placeholder={isStyleMode ? "輸入描述..." : (asset.description ? "" : "+ 新增描述")} onPlaceholderClick={() => setEditingCell({ id: asset.id, field: 'description' })} autoFocus={!isStyleMode} className="text-studio-muted hover:text-studio-fg transition-colors" /></div></div>}
                      </td>
                      <td className={`${isDescriptionCollapsed ? 'py-1.5 px-3' : 'p-3'} align-top whitespace-nowrap border-r border-transparent`}><div className="relative group/type inline-block" onClick={e => e.stopPropagation()}><select value={asset.type} onChange={(e) => { const newType = e.target.value as AssetType; if (selectedIds.has(asset.id)) onUpdateMultiple(Array.from(selectedIds), { type: newType }); else onUpdate(asset.id, { type: newType }); }} className="appearance-none w-full text-[10px] md:text-xs uppercase font-bold tracking-wider bg-transparent text-gray-400 pl-2 pr-6 py-1 rounded border border-transparent hover:bg-studio-900 hover:border-studio-700 hover:text-studio-accent cursor-pointer focus:outline-none focus:ring-1 focus:ring-studio-accent transition-all duration-200">{Object.values(AssetType).map((t) => <option key={t} value={t} className="bg-studio-900 text-studio-fg">{t}</option>)}</select><div className="absolute right-1 top-1/2 transform -translate-y-1/2 pointer-events-none opacity-0 group-hover/type:opacity-100 transition-opacity"><ChevronDown className="w-3 h-3 text-studio-accent" /></div></div></td>
                      <td className={`${isDescriptionCollapsed ? 'py-1.5 px-3' : 'p-3'} align-top text-right cursor-pointer border-r border-transparent`}><div className="text-xs text-studio-muted font-mono flex items-center justify-end gap-1 mt-1 hover:text-studio-accent transition-colors"><Calendar className="w-3 h-3 opacity-50" />{formatDisplayDate(asset.purchaseDate)}</div></td>
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>

        {/* --- Window Resizers --- */}
        <div className="absolute left-0 top-0 bottom-0 w-3 cursor-col-resize z-50 hover:bg-studio-accent/20 transition-colors group flex items-center justify-start" onMouseDown={(e) => startInteraction(e, sectionKey, 'resize-w-left')} title="調整左側寬度"><div className="w-1 h-12 rounded-full ml-0.5 transition-colors duration-300 bg-studio-700 group-hover:bg-studio-600" /></div>
        <div className="absolute right-0 top-0 bottom-0 w-3 cursor-col-resize z-50 hover:bg-studio-accent/20 transition-colors group flex items-center justify-end" onMouseDown={(e) => startInteraction(e, sectionKey, 'resize-w')} title="調整右側寬度"><div className="w-1 h-12 rounded-full mr-0.5 transition-colors duration-300 bg-studio-700 group-hover:bg-studio-600" /></div>
        <div className="absolute bottom-0 left-0 right-0 h-3 cursor-row-resize z-50 hover:bg-studio-accent/20 transition-colors group flex items-end justify-center" onMouseDown={(e) => startInteraction(e, sectionKey, 'resize-h')} title="調整高度"><div className="h-1 w-16 rounded-full mb-1 transition-colors duration-300 bg-studio-700 group-hover:bg-studio-600" /></div>
        <div className="absolute bottom-0 right-0 w-4 h-4 cursor-nwse-resize z-[51] group flex items-end justify-end p-0.5 hover:bg-studio-accent/20 rounded-tl" onMouseDown={(e) => startInteraction(e, sectionKey, 'resize-nwse')}><div className="w-1.5 h-1.5 bg-studio-500 group-hover:bg-studio-accent rounded-sm" /></div>
      </div>
    );
  };

  return (
    <div className="space-y-6 flex flex-col h-full" onClick={(e) => {
        // Click background to deselect all modules
        if (e.target === e.currentTarget) setSelectedModules(new Set());
    }}>
      <div className="flex gap-4 justify-between items-center flex-shrink-0" onClick={(e) => e.stopPropagation()}>
        <div className="flex items-center gap-4 mr-auto">
            <button onClick={toggleSelectionMode} className={`px-4 py-2 rounded-xl border transition-colors flex items-center gap-2 text-xs font-bold whitespace-nowrap shadow-lg ${isSelectionMode ? 'bg-studio-700 border-studio-500 text-white shadow-inner' : 'bg-studio-800 border-studio-700 text-studio-muted hover:text-studio-fg hover:border-studio-500'}`} title={isSelectionMode ? "取消選取" : "管理與選取項目"}>{isSelectionMode ? <><X className="w-4 h-4" /> 取消</> : <><ListChecks className="w-4 h-4" /> 選取</>}</button>
            <button onClick={() => setIsDescriptionCollapsed(!isDescriptionCollapsed)} className={`px-4 py-2 rounded-xl border transition-colors flex items-center gap-2 text-xs font-bold whitespace-nowrap shadow-lg ${isDescriptionCollapsed ? 'bg-studio-700 border-studio-500 text-white shadow-inner' : 'bg-studio-800 border-studio-700 text-studio-muted hover:text-studio-fg hover:border-studio-500'}`} title={isDescriptionCollapsed ? "關閉描述收納 (顯示所有)" : "開啟描述收納 (滑鼠懸停時顯示)"}><ChevronsUpDown className="w-4 h-4" /><span className="hidden sm:inline">收納描述</span></button>
            <button onClick={resetLayout} className="px-4 py-2 rounded-xl border bg-studio-800 border-studio-700 text-studio-muted hover:text-studio-fg hover:border-studio-500 transition-colors flex items-center gap-2 text-xs font-bold whitespace-nowrap shadow-lg" title="重置視窗位置"><LayoutDashboard className="w-4 h-4" /><span className="hidden sm:inline">重置佈局</span></button>
            {isSelectionMode && selectedIds.size > 0 ? (
            <div className="flex gap-2">
                <button onClick={handleBulkDelete} className="px-6 py-2 rounded-xl bg-studio-danger hover:bg-red-600 text-white font-bold transition-all shadow-lg shadow-red-900/50 flex items-center gap-2 animate-in fade-in zoom-in duration-200"><Trash2 className="w-4 h-4" />移除 ({selectedIds.size})</button>
                <div className="relative animate-in fade-in zoom-in duration-200">
                    <button onClick={() => { if (!showBulkImage) { const selected = assets.filter(a => selectedIds.has(a.id)); const first = selected[0]?.image; const allSame = selected.every(a => a.image === first); setBulkPreviewImage(allSame ? first : undefined); } setShowBulkImage(!showBulkImage); }} className={`px-4 py-2 rounded-xl border transition-colors flex items-center gap-2 text-xs font-bold whitespace-nowrap shadow-lg ${showBulkImage ? 'bg-studio-accent border-studio-accent text-studio-900 shadow-inner' : 'bg-studio-800 border-studio-700 text-studio-muted hover:text-studio-fg hover:border-studio-500'}`} title="為選取的項目新增或替換圖片"><ImageIcon className="w-4 h-4" />新增/修改圖片</button>
                    {showBulkImage && <ImageUploadPopover onUpload={handleBulkImageUpdate} onClose={() => setShowBulkImage(false)} currentImage={bulkPreviewImage} />}
                </div>
            </div>
            ) : !isSelectionMode && sortConfig && (
            <button onClick={() => setSortConfig(null)} className="px-4 py-2 rounded-xl bg-studio-800 border border-studio-700 text-studio-muted text-xs hover:text-studio-fg hover:border-studio-500 transition-colors whitespace-nowrap hidden sm:block" title="清除排序條件，恢復自訂排序">排序: {sortConfig.key === 'purchaseDate' ? '時間' : '名稱'}<span className="ml-2 text-studio-accent">✕ 清除</span></button>
            )}
        </div>
        <div className="flex items-center gap-2 w-full md:w-auto flex-1 justify-end min-w-0">
          <button onClick={() => { setIsStyleMode(!isStyleMode); if (!isStyleMode) { setIsSelectionMode(false); setEditingCell(null); } }} className={`px-3 py-2 rounded-xl border transition-colors flex items-center gap-2 text-xs font-bold whitespace-nowrap shadow-sm ${isStyleMode ? 'bg-studio-accent border-studio-accent text-studio-900 shadow-inner ring-2 ring-studio-accent/50' : 'bg-studio-800 border-studio-700 text-studio-muted hover:text-studio-fg hover:border-studio-500'}`} title="開啟富文本編輯模式"><Type className="w-4 h-4" /> <span className="hidden sm:inline">編輯文字</span></button>
          <div className="relative flex-1 md:w-64 max-w-[300px]"><Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-studio-muted w-4 h-4" /><input type="text" placeholder="搜尋名稱..." value={searchTerm} onChange={(e) => setSearchTerm(e.target.value)} className="w-full bg-studio-800 border border-studio-700 rounded-xl pl-10 pr-4 py-2 text-studio-fg focus:ring-2 focus:ring-studio-accent focus:outline-none shadow-lg placeholder-gray-500 transition-colors" /></div>
        </div>
      </div>
      {isStyleMode && <RichTextToolbar />}
      <div 
        ref={containerRef} 
        className="flex-1 w-full relative min-h-[600px] overflow-hidden bg-studio-900/10 rounded-xl border border-dashed border-studio-700/50"
        onClick={(e) => {
           if (e.target === e.currentTarget) setSelectedModules(new Set());
        }}
      >
          {renderTable('source', <Music className="w-5 h-5" />, sourceGroup, "text-cyan-400")}
          {renderTable('sfx', <Headphones className="w-5 h-5" />, sfxGroup, "text-orange-400")}
      </div>
      {previewData && createPortal(<div className="fixed z-[9999] p-1.5 bg-studio-800 border border-studio-600 rounded-lg shadow-2xl animate-in fade-in zoom-in duration-200 pointer-events-none flex items-center justify-center" style={{ top: previewData.top, left: previewData.left, maxWidth: 'min(800px, 90vw)', maxHeight: 'min(800px, 90vh)', width: 'max-content', height: 'max-content' }}><img src={previewData.url} alt="Preview" className="block w-auto h-auto max-w-full max-h-full rounded object-contain" /></div>, document.body)}
    </div>
  );
};

export default AssetList;