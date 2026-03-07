'use client';

import { use, useState } from 'react';
import { Luggage, Sun, Plus, X, Check } from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';
import { MOCK_PACKING_LIST, MOCK_WEATHER, MOCK_TRIP } from '@travyl/shared';
import type { PackingItem, PackingList } from '@travyl/shared';

/* ------------------------------------------------------------------ */
/*  Skeleton                                                          */
/* ------------------------------------------------------------------ */

function SkeletonBlock({ className, style }: { className?: string; style?: React.CSSProperties }) {
  return <div className={`bg-gray-200 rounded animate-pulse ${className ?? ''}`} style={style} />;
}

function SkeletonPacking() {
  return (
    <div>
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 mb-4">
        {[1, 2, 3].map((i) => (
          <div key={i} className="rounded-lg p-3 border border-gray-200 bg-white">
            <SkeletonBlock style={{ width: 120, height: 14 }} />
            <SkeletonBlock className="mt-2" style={{ height: 6 }} />
          </div>
        ))}
      </div>
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
        {[1, 2, 3].map((i) => (
          <div key={i} className="rounded-xl p-3.5 border border-gray-200 bg-white">
            <SkeletonBlock style={{ width: 80, height: 14 }} />
            <div className="space-y-2 mt-3">
              {[1, 2, 3, 4].map((j) => (
                <div key={j} className="flex items-center gap-2.5">
                  <SkeletonBlock style={{ width: 16, height: 16 }} />
                  <SkeletonBlock style={{ width: 80 + j * 15, height: 12 }} />
                </div>
              ))}
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}

/* ------------------------------------------------------------------ */
/*  Page                                                              */
/* ------------------------------------------------------------------ */

export default function Packing({ params }: { params: Promise<{ id: string }> }) {
  const { id } = use(params);

  const [packingList, setPackingList] = useState<PackingList>({ ...MOCK_PACKING_LIST });
  const [newItemInputs, setNewItemInputs] = useState<Record<string, string>>({});
  const [isCreatingList, setIsCreatingList] = useState(false);
  const [newListName, setNewListName] = useState('');

  const trip = MOCK_TRIP;
  const destination = trip.destination ?? MOCK_WEATHER.destination;

  /* derived counts */
  const allItems = Object.values(packingList).flat();
  const totalItems = allItems.length;
  const packedCount = allItems.filter((item) => item.packed).length;
  const progressPercent = totalItems > 0 ? (packedCount / totalItems) * 100 : 0;

  /* ---- mutations ---- */

  const toggleItem = (category: string, index: number) => {
    setPackingList((prev) => {
      const updated = { ...prev };
      updated[category] = [...updated[category]];
      updated[category][index] = {
        ...updated[category][index],
        packed: !updated[category][index].packed,
      };
      return updated;
    });
  };

  const removeItem = (category: string, index: number) => {
    setPackingList((prev) => {
      const updated = { ...prev };
      updated[category] = updated[category].filter((_, i) => i !== index);
      return updated;
    });
  };

  const addItem = (category: string) => {
    const text = newItemInputs[category]?.trim();
    if (text) {
      setPackingList((prev) => ({
        ...prev,
        [category]: [...prev[category], { item: text, packed: false }],
      }));
      setNewItemInputs((prev) => ({ ...prev, [category]: '' }));
    }
  };

  const deleteCategory = (category: string) => {
    if (confirm(`Delete "${category}" list?`)) {
      setPackingList((prev) => {
        const updated = { ...prev };
        delete updated[category];
        return updated;
      });
    }
  };

  const createList = () => {
    if (newListName.trim()) {
      setPackingList((prev) => ({ ...prev, [newListName.trim()]: [] }));
      setNewListName('');
      setIsCreatingList(false);
    }
  };

  /* ---------------------------------------------------------------- */
  /*  Render                                                          */
  /* ---------------------------------------------------------------- */

  return (
    <motion.div
      className="space-y-3"
      initial={{ opacity: 0, y: 12 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.35, ease: 'easeOut' }}
    >
      {/* ========== Header row: Progress + Weather + Tips ========== */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
        {/* Packing Progress */}
        <motion.div
          className="bg-gradient-to-r from-purple-600 to-indigo-600 rounded-lg p-3 shadow-sm text-white"
          initial={{ opacity: 0, y: 8 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.05 }}
        >
          <div className="flex items-center justify-between mb-1">
            <h4 className="text-xs">Packing Progress</h4>
            <Luggage size={16} />
          </div>
          <div className="text-xl mb-1">
            {packedCount} / {totalItems}
          </div>
          <div className="w-full bg-purple-800 rounded-full h-1.5 mb-1">
            <motion.div
              className="bg-white h-1.5 rounded-full"
              initial={{ width: 0 }}
              animate={{ width: `${progressPercent}%` }}
              transition={{ duration: 0.6, ease: 'easeOut' }}
            />
          </div>
          <p className="text-xs opacity-90">{Math.round(progressPercent)}% packed</p>
        </motion.div>

        {/* Weather Info */}
        <motion.div
          className="bg-blue-50 rounded-lg p-3 shadow-sm border border-blue-200"
          initial={{ opacity: 0, y: 8 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.1 }}
        >
          <div className="flex items-center gap-2 mb-1">
            <Sun className="text-blue-600" size={16} />
            <h5 className="text-xs text-gray-900">{destination} Weather</h5>
          </div>
          <div className="grid grid-cols-2 gap-x-2 gap-y-0.5 text-xs text-gray-700 mb-1">
            <div>High: {MOCK_WEATHER.high}{MOCK_WEATHER.unit}</div>
            <div>Low: {MOCK_WEATHER.low}{MOCK_WEATHER.unit}</div>
          </div>
          <p className="text-xs text-gray-600">{MOCK_WEATHER.conditions}</p>
        </motion.div>

        {/* Packing Tips */}
        <motion.div
          className="bg-gradient-to-r from-amber-50 to-yellow-50 rounded-lg p-3 shadow-sm border border-amber-200"
          initial={{ opacity: 0, y: 8 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.15 }}
        >
          <h5 className="text-xs text-gray-900 mb-1">Packing Tips</h5>
          <div className="space-y-0.5 text-xs text-gray-700">
            <div>Roll clothes to save space</div>
            <div>Pack a change in carry-on</div>
            <div>Use packing cubes</div>
            <div>Check luggage limits</div>
          </div>
        </motion.div>
      </div>

      {/* ========== Packing Categories Grid ========== */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
        <AnimatePresence mode="popLayout">
          {Object.entries(packingList).map(([category, items], catIdx) => {
            const catPacked = items.filter((item) => item.packed).length;

            return (
              <motion.div
                key={category}
                layout
                initial={{ opacity: 0, scale: 0.95 }}
                animate={{ opacity: 1, scale: 1 }}
                exit={{ opacity: 0, scale: 0.9 }}
                transition={{ duration: 0.25, delay: catIdx * 0.04 }}
                className="bg-white rounded-lg p-3 shadow-sm border border-gray-200"
              >
                {/* Category header */}
                <div className="flex items-center justify-between mb-2">
                  <h5 className="text-sm font-semibold text-gray-900">{category}</h5>
                  <div className="flex items-center gap-2">
                    <span className="text-xs bg-purple-100 text-purple-800 px-2 py-0.5 rounded-full">
                      {catPacked}/{items.length}
                    </span>
                    <button
                      onClick={() => deleteCategory(category)}
                      className="text-gray-400 hover:text-red-600 transition-colors p-0.5"
                      title="Delete list"
                    >
                      <X size={14} />
                    </button>
                  </div>
                </div>

                {/* Items */}
                <div className="space-y-1 max-h-48 overflow-y-auto">
                  <AnimatePresence initial={false}>
                    {items.map((item, index) => (
                      <motion.div
                        key={`${category}-${index}-${item.item}`}
                        initial={{ opacity: 0, x: -8 }}
                        animate={{ opacity: 1, x: 0 }}
                        exit={{ opacity: 0, x: 8, height: 0 }}
                        transition={{ duration: 0.2 }}
                        className="flex items-center gap-2 p-1 rounded hover:bg-gray-50 transition-colors group"
                      >
                        <button
                          onClick={() => toggleItem(category, index)}
                          className="w-3.5 h-3.5 rounded flex items-center justify-center border-[1.5px] transition-colors shrink-0"
                          style={{
                            borderColor: item.packed ? '#7c3aed' : '#d1d5db',
                            backgroundColor: item.packed ? '#7c3aed' : 'transparent',
                          }}
                        >
                          {item.packed && <Check size={8} className="text-white" />}
                        </button>
                        <span
                          className={`text-xs flex-1 transition-colors ${
                            item.packed ? 'line-through text-gray-400' : 'text-gray-900'
                          }`}
                        >
                          {item.item}
                        </span>
                        <button
                          onClick={() => removeItem(category, index)}
                          className="opacity-0 group-hover:opacity-100 text-gray-400 hover:text-red-600 transition-all p-0.5"
                          title="Remove item"
                        >
                          <X size={12} />
                        </button>
                      </motion.div>
                    ))}
                  </AnimatePresence>
                </div>

                {/* Add Item Input */}
                <div className="mt-2 flex gap-1">
                  <input
                    type="text"
                    value={newItemInputs[category] || ''}
                    onChange={(e) =>
                      setNewItemInputs({ ...newItemInputs, [category]: e.target.value })
                    }
                    onKeyDown={(e) => {
                      if (e.key === 'Enter') addItem(category);
                    }}
                    placeholder="New item..."
                    className="flex-1 px-2 py-1.5 text-xs border border-purple-200 rounded focus:outline-none focus:ring-1 focus:ring-purple-500 focus:border-purple-500"
                  />
                  <button
                    onClick={() => addItem(category)}
                    className="px-3 py-1.5 bg-purple-600 text-white rounded hover:bg-purple-700 transition-colors text-xs font-medium"
                  >
                    Add
                  </button>
                </div>
              </motion.div>
            );
          })}

          {/* Create New List Card */}
          {isCreatingList ? (
            <motion.div
              key="create-form"
              layout
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.9 }}
              className="bg-purple-50 rounded-lg p-3 shadow-sm border-2 border-dashed border-purple-300"
            >
              <h5 className="text-sm font-semibold text-gray-900 mb-3">Create New List</h5>
              <input
                type="text"
                value={newListName}
                onChange={(e) => setNewListName(e.target.value)}
                onKeyDown={(e) => {
                  if (e.key === 'Enter') createList();
                }}
                placeholder="List name (e.g., Beach Gear)"
                className="w-full px-3 py-2 text-sm border border-purple-300 rounded focus:outline-none focus:ring-2 focus:ring-purple-500 focus:border-purple-500 mb-2"
                autoFocus
              />
              <div className="flex gap-2">
                <button
                  onClick={createList}
                  className="flex-1 px-3 py-2 bg-purple-600 text-white rounded hover:bg-purple-700 transition-colors text-xs font-medium"
                >
                  Create List
                </button>
                <button
                  onClick={() => {
                    setNewListName('');
                    setIsCreatingList(false);
                  }}
                  className="px-3 py-2 bg-gray-200 text-gray-700 rounded hover:bg-gray-300 transition-colors text-xs font-medium"
                >
                  Cancel
                </button>
              </div>
            </motion.div>
          ) : (
            <motion.button
              key="create-trigger"
              layout
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              whileHover={{ scale: 1.02 }}
              whileTap={{ scale: 0.98 }}
              onClick={() => setIsCreatingList(true)}
              className="bg-gradient-to-br from-purple-50 to-indigo-50 rounded-lg p-6 shadow-sm border-2 border-dashed border-purple-300 hover:border-purple-500 hover:bg-purple-100 transition-all flex flex-col items-center justify-center gap-2 min-h-[200px]"
            >
              <div className="w-12 h-12 rounded-full bg-purple-100 flex items-center justify-center">
                <Plus className="text-purple-600" size={24} />
              </div>
              <span className="text-sm font-medium text-purple-700">Create New List</span>
              <span className="text-xs text-purple-600">Add a custom packing list</span>
            </motion.button>
          )}
        </AnimatePresence>
      </div>
    </motion.div>
  );
}
