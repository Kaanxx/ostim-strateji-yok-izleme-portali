import React, { useState, useRef, useEffect } from 'react';
import { X, ChevronDown, Search, Check, Trash2, Tag } from 'lucide-react';
import { parseMultiSelectValue } from '../utils/formulaEngine';

/**
 * MultiSelectTagPicker
 *
 * Web equivalent of the YÖK Excel VBA Worksheet_Change multi-select macro
 * used in MYOUygulamaliEgitim.xlsm (cols W & AI - 27 sectors) and
 * Projeler.xlsm (cols F & G - 8 themes & 4 partners).
 *
 * Features:
 * - Stores comma-delimited values without duplicates (VBA InStr > 0 check)
 * - Preserves options that contain internal commas (e.g. "Ağaç İşleri, Kağıt ve Kağıt Ürünleri")
 * - Single-click tag removal and "Tümünü Temizle (Delete)" button
 * - Searchable option list with checkboxes
 */
export default function MultiSelectTagPicker({
  value = '',
  options = [],
  onChange,
  disabled = false,
  placeholder = 'Seçenek ekle (Çoklu seçim)...',
  compact = false
}) {
  const [isOpen, setIsOpen] = useState(false);
  const [searchTerm, setSearchTerm] = useState('');
  const containerRef = useRef(null);

  const selectedTags = parseMultiSelectValue(value, options);

  useEffect(() => {
    const handleClickOutside = (e) => {
      if (containerRef.current && !containerRef.current.contains(e.target)) {
        setIsOpen(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  const emitChange = (newTagsArray) => {
    const unique = Array.from(new Set(newTagsArray.filter(Boolean)));
    const commaSeparated = unique.join(',');
    if (onChange) {
      onChange(commaSeparated);
    }
  };

  const toggleOption = (opt) => {
    if (disabled) return;
    if (selectedTags.includes(opt)) {
      emitChange(selectedTags.filter((t) => t !== opt));
    } else {
      emitChange([...selectedTags, opt]);
    }
  };

  const removeTag = (opt, e) => {
    e.stopPropagation();
    if (disabled) return;
    emitChange(selectedTags.filter((t) => t !== opt));
  };

  const clearAll = (e) => {
    e.stopPropagation();
    if (disabled) return;
    emitChange([]);
  };

  const filteredOptions = options.filter((opt) =>
    opt.toLowerCase().includes(searchTerm.toLowerCase().trim())
  );

  return (
    <div ref={containerRef} className="relative w-full text-left">
      <div
        onClick={() => !disabled && setIsOpen((prev) => !prev)}
        className={`min-h-[38px] w-full rounded-xl border transition-all flex flex-wrap items-center gap-1.5 px-2.5 py-1.5 ${
          disabled
            ? 'bg-slate-100 border-slate-200 cursor-not-allowed opacity-80'
            : isOpen
            ? 'bg-white border-blue-600 ring-2 ring-blue-600/15 cursor-pointer'
            : 'bg-white border-slate-200 hover:border-blue-400 cursor-pointer'
        }`}
      >
        {selectedTags.length === 0 ? (
          <span className="text-xs text-slate-400 italic select-none flex items-center gap-1.5">
            <Tag size={12} className="text-slate-400 shrink-0" />
            {placeholder}
          </span>
        ) : (
          selectedTags.map((tag) => (
            <span
              key={tag}
              className={`inline-flex items-center gap-1 rounded-lg bg-blue-50 border border-blue-200 text-blue-800 font-semibold ${
                compact ? 'px-2 py-0.5 text-[10px]' : 'px-2.5 py-1 text-xs'
              }`}
            >
              <span className="truncate max-w-[200px]" title={tag}>
                {tag}
              </span>
              {!disabled && (
                <button
                  type="button"
                  onClick={(e) => removeTag(tag, e)}
                  className="text-blue-500 hover:text-red-600 transition-colors ml-0.5"
                  title="Kaldır"
                >
                  <X size={12} />
                </button>
              )}
            </span>
          ))
        )}

        <div className="ml-auto flex items-center gap-1 pl-1 shrink-0">
          {selectedTags.length > 0 && !disabled && (
            <button
              type="button"
              onClick={clearAll}
              title="Tümünü Temizle (VBA Delete Karşılığı)"
              className="p-1 text-slate-400 hover:text-red-600 rounded-md hover:bg-red-50 transition-colors"
            >
              <Trash2 size={13} />
            </button>
          )}
          <ChevronDown
            size={15}
            className={`text-slate-400 transition-transform ${isOpen ? 'rotate-180 text-blue-600' : ''}`}
          />
        </div>
      </div>

      {isOpen && !disabled && (
        <div className="absolute left-0 z-50 mt-1.5 w-80 sm:w-96 rounded-2xl bg-white shadow-2xl border border-slate-200 overflow-hidden">
          <div className="p-2.5 bg-slate-50 border-b border-slate-200 flex items-center gap-2">
            <Search size={14} className="text-slate-400 shrink-0" />
            <input
              type="text"
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              placeholder="Listede ara..."
              className="w-full bg-transparent text-xs font-medium text-slate-700 outline-none"
              autoFocus
            />
            {selectedTags.length > 0 && (
              <button
                type="button"
                onClick={clearAll}
                className="text-[10px] font-bold text-red-600 hover:underline whitespace-nowrap px-1.5 py-0.5 rounded bg-red-50"
              >
                Temizle ({selectedTags.length})
              </button>
            )}
          </div>

          <div className="max-h-60 overflow-y-auto p-1.5 space-y-0.5 custom-scrollbar">
            {filteredOptions.length === 0 ? (
              <div className="p-3 text-center text-xs text-slate-400 italic">
                Eşleşen seçenek bulunamadı.
              </div>
            ) : (
              filteredOptions.map((opt) => {
                const isSelected = selectedTags.includes(opt);
                return (
                  <button
                    type="button"
                    key={opt}
                    onClick={() => toggleOption(opt)}
                    className={`w-full flex items-center justify-between text-left px-3 py-2 rounded-xl text-xs font-medium transition-colors ${
                      isSelected
                        ? 'bg-blue-600 text-white font-bold'
                        : 'text-slate-700 hover:bg-slate-100'
                    }`}
                  >
                    <span className="pr-2 leading-snug">{opt}</span>
                    {isSelected && <Check size={14} className="shrink-0" />}
                  </button>
                );
              })
            )}
          </div>

          <div className="px-3 py-2 bg-slate-50 border-t border-slate-200 flex items-center justify-between text-[10px] text-slate-500">
            <span>VBA Çoklu Seçim Modu (Virgülle Ayrılmış)</span>
            <span className="font-bold text-blue-600">{selectedTags.length} seçili</span>
          </div>
        </div>
      )}
    </div>
  );
}
