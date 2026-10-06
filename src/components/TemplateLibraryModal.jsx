import React, { useState, useEffect, useMemo } from 'react';
import {
  GitFork,
  Cpu,
  Network,
  Kanban,
  Smartphone,
  Plus,
  Bookmark,
  Trash2,
  Sparkles,
  Layers,
  Check,
  FolderPlus,
  Clock,
  X,
} from 'lucide-react';
import {
  generateFlowchart,
  generateArchitecture,
  generateMindMap,
  generateKanban,
  generateWireframe,
} from '../templates/templatePresets';

const STORAGE_KEY = 'doodle_custom_templates_v1';

export function TemplateLibraryModal({ isOpen, onClose, doodleAPI }) {
  const [activeTab, setActiveTab] = useState('presets'); // 'presets' | 'my_templates'
  const [customTemplates, setCustomTemplates] = useState([]);
  const [isCreating, setIsCreating] = useState(false);
  const [saveSuccessMsg, setSaveSuccessMsg] = useState('');

  // Form State
  const [formTitle, setFormTitle] = useState('');
  const [formCategory, setFormCategory] = useState('Custom');
  const [formDesc, setFormDesc] = useState('');
  const [saveScope, setSaveScope] = useState('all'); // 'all' | 'selection'
  const [hasSelection, setHasSelection] = useState(false);
  const [selectionCount, setSelectionCount] = useState(0);
  const [totalCount, setTotalCount] = useState(0);
  const [confirmDeleteId, setConfirmDeleteId] = useState(null);

  // Load custom templates from localStorage
  const loadCustomTemplates = () => {
    try {
      const stored = localStorage.getItem(STORAGE_KEY);
      if (stored) {
        setCustomTemplates(JSON.parse(stored));
      } else {
        setCustomTemplates([]);
      }
    } catch (e) {
      console.error('Failed to load custom templates:', e);
      setCustomTemplates([]);
    }
  };

  useEffect(() => {
    if (!isOpen) {
      setIsCreating(false);
      setSaveSuccessMsg('');
      setConfirmDeleteId(null);
      return;
    }
    loadCustomTemplates();

    // Check canvas elements & selection count when opening
    if (doodleAPI) {
      const elements = (doodleAPI.getSceneElements() || []).filter(el => !el.isDeleted);
      const appState = doodleAPI.getAppState() || {};
      const selectedIds = Object.keys(appState.selectedElementIds || {}).filter(
        id => appState.selectedElementIds[id]
      );
      const selected = elements.filter(el => selectedIds.includes(el.id));
      
      setTotalCount(elements.length);
      setSelectionCount(selected.length);
      setHasSelection(selected.length > 0);
      setSaveScope(selected.length > 0 ? 'selection' : 'all');
    }

    const handleKeyDown = (e) => {
      if (e.key === 'Escape') {
        e.stopPropagation();
        onClose();
      }
    };
    window.addEventListener('keydown', handleKeyDown, { capture: true });
    return () => window.removeEventListener('keydown', handleKeyDown, { capture: true });
  }, [isOpen, onClose, doodleAPI]);

  if (!isOpen) return null;

  // Insert built-in preset generator
  const handleInsertPreset = (generator) => {
    if (!doodleAPI) return;
    const currentElements = doodleAPI.getSceneElements() || [];
    
    const appState = doodleAPI.getAppState();
    const spawnX = appState ? -appState.scrollX + 150 : 150;
    const spawnY = appState ? -appState.scrollY + 100 : 100;

    const newElements = generator(spawnX, spawnY);
    doodleAPI.updateScene({
      elements: [...currentElements, ...newElements],
      commitToHistory: true,
    });

    setTimeout(() => {
      doodleAPI.scrollToContent(newElements, { fitToContent: true, animate: true });
    }, 50);

    onClose();
  };

  // Insert user-created custom template
  const handleInsertCustom = (tpl) => {
    if (!doodleAPI || !tpl.elements || tpl.elements.length === 0) return;
    const currentElements = doodleAPI.getSceneElements() || [];
    const appState = doodleAPI.getAppState();
    const spawnX = appState ? -appState.scrollX + 150 : 150;
    const spawnY = appState ? -appState.scrollY + 100 : 100;

    // Remap element IDs to ensure fresh instances without collision
    const idMap = new Map();
    const newElements = tpl.elements.map((el) => {
      const newId = 'doodle_' + Math.random().toString(36).substr(2, 9);
      idMap.set(el.id, newId);
      return {
        ...el,
        id: newId,
        x: el.x + spawnX,
        y: el.y + spawnY,
      };
    });

    // Remap bindings and text containers
    const finalElements = newElements.map((el) => {
      const updated = { ...el };
      if (updated.boundElements && Array.isArray(updated.boundElements)) {
        updated.boundElements = updated.boundElements.map((b) => ({
          ...b,
          id: idMap.get(b.id) || b.id,
        }));
      }
      if (updated.containerId && idMap.has(updated.containerId)) {
        updated.containerId = idMap.get(updated.containerId);
      }
      return updated;
    });

    doodleAPI.updateScene({
      elements: [...currentElements, ...finalElements],
      commitToHistory: true,
    });

    setTimeout(() => {
      doodleAPI.scrollToContent(finalElements, { fitToContent: true, animate: true });
    }, 50);

    onClose();
  };

  // Open creation panel
  const handleStartCreate = () => {
    if (!doodleAPI) return;
    const elements = (doodleAPI.getSceneElements() || []).filter(el => !el.isDeleted);
    const appState = doodleAPI.getAppState() || {};
    const selectedIds = Object.keys(appState.selectedElementIds || {}).filter(
      id => appState.selectedElementIds[id]
    );
    const selected = elements.filter(el => selectedIds.includes(el.id));

    setTotalCount(elements.length);
    setSelectionCount(selected.length);
    setHasSelection(selected.length > 0);
    setSaveScope(selected.length > 0 ? 'selection' : 'all');
    setFormTitle(`Template ${customTemplates.length + 1}`);
    setFormCategory('Custom');
    setFormDesc('');
    setIsCreating(true);
  };

  // Save new custom template
  const handleSaveTemplate = (e) => {
    e.preventDefault();
    if (!doodleAPI) return;

    const allElements = (doodleAPI.getSceneElements() || []).filter(el => !el.isDeleted);
    const appState = doodleAPI.getAppState() || {};
    const selectedIds = Object.keys(appState.selectedElementIds || {}).filter(
      id => appState.selectedElementIds[id]
    );

    let targetElements = [];
    if (saveScope === 'selection' && selectedIds.length > 0) {
      targetElements = allElements.filter(el => selectedIds.includes(el.id));
    } else {
      targetElements = allElements;
    }

    if (targetElements.length === 0) {
      alert('Cannot save an empty template. Please create or select shapes on your canvas first.');
      return;
    }

    // Normalize coordinates so (minX, minY) is at (0, 0)
    const minX = Math.min(...targetElements.map(e => e.x));
    const minY = Math.min(...targetElements.map(e => e.y));

    const normalizedElements = targetElements.map(el => ({
      ...JSON.parse(JSON.stringify(el)),
      x: el.x - minX,
      y: el.y - minY,
    }));

    const newTemplate = {
      id: 'tpl_' + Date.now(),
      title: formTitle.trim() || `Template ${customTemplates.length + 1}`,
      category: formCategory.trim() || 'Custom',
      desc: formDesc.trim() || `${targetElements.length} elements saved internally`,
      elements: normalizedElements,
      createdAt: Date.now(),
      elementCount: targetElements.length,
    };

    const updated = [newTemplate, ...customTemplates];
    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(updated));
      setCustomTemplates(updated);

      // Also register into internal library so it shows in the right sidebar too!
      if (doodleAPI.updateLibrary) {
        doodleAPI.updateLibrary({
          libraryItems: [
            {
              id: newTemplate.id,
              status: 'unpublished',
              elements: normalizedElements,
              created: newTemplate.createdAt,
            },
          ],
          merge: true,
        });
      }

      setIsCreating(false);
      setActiveTab('my_templates');
      setSaveSuccessMsg(`Template "${newTemplate.title}" saved successfully!`);
      setTimeout(() => setSaveSuccessMsg(''), 4000);
    } catch (err) {
      console.error('Failed to save template:', err);
      alert('Failed to save template to local storage.');
    }
  };

  // Delete a custom template
  const handleDeleteTemplate = (id, e) => {
    e.stopPropagation();
    const updated = customTemplates.filter(t => t.id !== id);
    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(updated));
      setCustomTemplates(updated);
      setConfirmDeleteId(null);
    } catch (err) {
      console.error('Failed to delete template:', err);
    }
  };

  const presetTemplates = [
    {
      id: 'flowchart',
      title: 'Flowchart & Decision Tree',
      category: 'Logic & Workflows',
      desc: 'User authentication flowchart with decision diamond, branched conditions, and error loops.',
      icon: <GitFork size={18} />,
      action: () => handleInsertPreset(generateFlowchart),
    },
    {
      id: 'architecture',
      title: 'Cloud System Architecture',
      category: 'Infrastructure',
      desc: 'Frontend client, API Gateway, Auth/Sync microservices with Redis cache and PostgreSQL database.',
      icon: <Cpu size={18} />,
      action: () => handleInsertPreset(generateArchitecture),
    },
    {
      id: 'mindmap',
      title: 'Brainstorming Mind Map',
      category: 'Ideation',
      desc: 'Central core initiative with 4 branch topics and curved connectors.',
      icon: <Network size={18} />,
      action: () => handleInsertPreset(generateMindMap),
    },
    {
      id: 'kanban',
      title: 'Agile Kanban Board',
      category: 'Management',
      desc: 'Three swimlanes (To Do, In Progress, Completed) populated with status cards.',
      icon: <Kanban size={18} />,
      action: () => handleInsertPreset(generateKanban),
    },
    {
      id: 'wireframe',
      title: 'Mobile App Wireframe',
      category: 'Product Design',
      desc: 'Modern smartphone frame featuring status bar, hero card, action button, and tab bar.',
      icon: <Smartphone size={18} />,
      action: () => handleInsertPreset(generateWireframe),
    },
  ];

  return (
    <div className="modal-overlay" onClick={onClose}>
      <div className="pref-modal-content template-modal-container" onClick={e => e.stopPropagation()}>
        {/* Header */}
        <div className="pref-header">
          <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
            <h2 className="pref-title">Smart Template Library</h2>
            {saveSuccessMsg && (
              <span className="template-success-badge">
                <Check size={12} />
                {saveSuccessMsg}
              </span>
            )}
          </div>
          <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
            {!isCreating && (
              <button
                className="template-header-create-btn"
                onClick={handleStartCreate}
                title="Save current canvas or selection as a reusable template"
              >
                <FolderPlus size={14} />
                <span>+ Save Canvas as Template</span>
              </button>
            )}
            <button className="pref-esc-pill" onClick={onClose} aria-label="Close templates">
              Esc to close
            </button>
          </div>
        </div>

        {/* Subtitle & Tabs */}
        <div className="template-modal-top-bar">
          <div className="template-tabs-container">
            <button
              className={`template-tab-pill ${activeTab === 'presets' ? 'active' : ''}`}
              onClick={() => {
                setActiveTab('presets');
                setIsCreating(false);
              }}
            >
              <Sparkles size={13} />
              <span>Built-in Presets ({presetTemplates.length})</span>
            </button>
            <button
              className={`template-tab-pill ${activeTab === 'my_templates' ? 'active' : ''}`}
              onClick={() => {
                setActiveTab('my_templates');
                setIsCreating(false);
              }}
            >
              <Bookmark size={13} />
              <span>My Templates ({customTemplates.length})</span>
            </button>
          </div>
        </div>

        {/* Creation Drawer / Form */}
        {isCreating && (
          <form className="template-create-form" onSubmit={handleSaveTemplate}>
            <div className="template-create-form-header">
              <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                <FolderPlus size={16} style={{ color: '#a78bfa' }} />
                <h4 style={{ margin: 0, fontSize: '13px', fontWeight: 600 }}>Create New Internal Template</h4>
              </div>
              <button
                type="button"
                className="template-close-icon-btn"
                onClick={() => setIsCreating(false)}
                aria-label="Close creation form"
              >
                <X size={14} />
              </button>
            </div>

            <div className="template-create-grid">
              <div className="template-form-group">
                <label className="template-form-label">Template Name</label>
                <input
                  type="text"
                  className="template-form-input"
                  placeholder="e.g., User Authentication Flow"
                  value={formTitle}
                  onChange={(e) => setFormTitle(e.target.value)}
                  autoFocus
                  required
                />
              </div>

              <div className="template-form-group">
                <label className="template-form-label">Category</label>
                <select
                  className="template-form-select"
                  value={formCategory}
                  onChange={(e) => setFormCategory(e.target.value)}
                >
                  <option value="Custom">Custom</option>
                  <option value="Logic & Workflows">Logic & Workflows</option>
                  <option value="UI & Wireframe">UI & Wireframe</option>
                  <option value="Infrastructure">Infrastructure</option>
                  <option value="Ideation">Ideation</option>
                  <option value="Management">Management</option>
                  <option value="Notes & Cards">Notes & Cards</option>
                </select>
              </div>

              <div className="template-form-group full-width">
                <label className="template-form-label">Description (Optional)</label>
                <input
                  type="text"
                  className="template-form-input"
                  placeholder="Brief note about the purpose or contents of this template..."
                  value={formDesc}
                  onChange={(e) => setFormDesc(e.target.value)}
                />
              </div>

              {hasSelection && (
                <div className="template-form-group full-width">
                  <label className="template-form-label">Source Scope</label>
                  <div className="template-radio-group">
                    <label className="template-radio-label">
                      <input
                        type="radio"
                        name="saveScope"
                        value="selection"
                        checked={saveScope === 'selection'}
                        onChange={() => setSaveScope('selection')}
                      />
                      <span>Selected items only ({selectionCount} shapes)</span>
                    </label>
                    <label className="template-radio-label">
                      <input
                        type="radio"
                        name="saveScope"
                        value="all"
                        checked={saveScope === 'all'}
                        onChange={() => setSaveScope('all')}
                      />
                      <span>Entire canvas ({totalCount} shapes)</span>
                    </label>
                  </div>
                </div>
              )}
            </div>

            <div className="template-create-actions">
              <span className="template-element-summary">
                Saving {saveScope === 'selection' && hasSelection ? selectionCount : totalCount} shapes to internal library
              </span>
              <div style={{ display: 'flex', gap: '8px' }}>
                <button
                  type="button"
                  className="template-btn-secondary"
                  onClick={() => setIsCreating(false)}
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="template-btn-primary"
                  disabled={(saveScope === 'selection' && hasSelection ? selectionCount : totalCount) === 0}
                >
                  <Check size={14} />
                  <span>Save Template Internally</span>
                </button>
              </div>
            </div>
          </form>
        )}

        {/* Presets Tab View */}
        {activeTab === 'presets' && !isCreating && (
          <div className="templates-grid">
            {presetTemplates.map(tpl => (
              <div key={tpl.id} className="template-card" onClick={tpl.action}>
                <div className="template-card-header">
                  <div className="template-icon-wrapper">
                    {tpl.icon}
                  </div>
                  <div className="template-meta">
                    <span className="template-category">{tpl.category}</span>
                    <h4 className="template-title">{tpl.title}</h4>
                  </div>
                </div>
                <p className="template-desc">{tpl.desc}</p>
                <div className="template-card-footer">
                  <button className="template-insert-btn" onClick={(e) => {
                    e.stopPropagation();
                    tpl.action();
                  }}>
                    <Plus size={13} />
                    <span>Insert to Canvas</span>
                  </button>
                </div>
              </div>
            ))}
          </div>
        )}

        {/* Custom Templates Tab View */}
        {activeTab === 'my_templates' && !isCreating && (
          <>
            {customTemplates.length === 0 ? (
              <div className="template-empty-box">
                <div className="template-empty-icon">
                  <Bookmark size={28} />
                </div>
                <h4 className="template-empty-title">No Custom Templates Saved Yet</h4>
                <p className="template-empty-desc">
                  Draw or assemble any diagram or wireframe on your canvas, then save it internally as a reusable template.
                  Your templates stay private and 100% offline within your Doodle Desk library.
                </p>
                <button
                  className="template-btn-primary"
                  onClick={handleStartCreate}
                  style={{ marginTop: '8px' }}
                >
                  <FolderPlus size={14} />
                  <span>+ Save Current Canvas Now</span>
                </button>
              </div>
            ) : (
              <div className="templates-grid">
                {customTemplates.map(tpl => (
                  <div key={tpl.id} className="template-card custom-card" onClick={() => handleInsertCustom(tpl)}>
                    <div className="template-card-header">
                      <div className="template-icon-wrapper custom-icon">
                        <Bookmark size={18} />
                      </div>
                      <div className="template-meta">
                        <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                          <span className="template-category">{tpl.category}</span>
                          <span className="template-pill-count">{tpl.elementCount || tpl.elements?.length || 0} shapes</span>
                        </div>
                        <h4 className="template-title">{tpl.title}</h4>
                      </div>
                    </div>
                    <p className="template-desc">{tpl.desc}</p>
                    <div className="template-card-footer">
                      <div className="template-date-tag">
                        <Clock size={11} />
                        <span>{tpl.createdAt ? new Date(tpl.createdAt).toLocaleDateString() : 'Saved'}</span>
                      </div>
                      <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                        {confirmDeleteId === tpl.id ? (
                          <div className="template-delete-confirm" onClick={e => e.stopPropagation()}>
                            <span>Delete?</span>
                            <button
                              className="template-delete-btn-confirm"
                              onClick={(e) => handleDeleteTemplate(tpl.id, e)}
                            >
                              Yes
                            </button>
                            <button
                              className="template-delete-btn-cancel"
                              onClick={(e) => {
                                e.stopPropagation();
                                setConfirmDeleteId(null);
                              }}
                            >
                              No
                            </button>
                          </div>
                        ) : (
                          <button
                            className="template-trash-btn"
                            title="Delete template"
                            onClick={(e) => {
                              e.stopPropagation();
                              setConfirmDeleteId(tpl.id);
                            }}
                          >
                            <Trash2 size={13} />
                          </button>
                        )}
                        <button
                          className="template-insert-btn"
                          onClick={(e) => {
                            e.stopPropagation();
                            handleInsertCustom(tpl);
                          }}
                        >
                          <Plus size={13} />
                          <span>Insert to Canvas</span>
                        </button>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </>
        )}
      </div>
    </div>
  );
}
