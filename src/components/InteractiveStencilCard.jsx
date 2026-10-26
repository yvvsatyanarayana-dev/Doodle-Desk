import React, { useState } from 'react';
import {
  ToggleLeft,
  Layers,
  ChevronDown,
  Smartphone,
  Trash2,
  Check,
  Sparkles,
  Type,
  CheckSquare,
  Square,
  MousePointerClick,
  Loader2,
  X,
} from 'lucide-react';
import { proceduralAudio } from '../utils/proceduralAudio.js';

export const STENCIL_TYPE_METADATA = {
  toggle: { label: 'Toggle Switch', icon: ToggleLeft, width: 280, height: 110 },
  tabs: { label: 'Segmented Tabs', icon: Layers, width: 340, height: 130 },
  dropdown: { label: 'Dropdown Selector', icon: ChevronDown, width: 280, height: 120 },
  input: { label: 'Text Input', icon: Type, width: 320, height: 120 },
  checkbox: { label: 'Checklist', icon: CheckSquare, width: 300, height: 170 },
  button: { label: 'Action Button', icon: MousePointerClick, width: 260, height: 110 },
  phone: { label: 'Mobile Mockup', icon: Smartphone, width: 270, height: 390 },
};

export const STENCIL_PRESETS = Object.entries(STENCIL_TYPE_METADATA).map(([type, meta]) => ({
  type,
  title: meta.label,
  width: meta.width,
  height: meta.height,
}));

export function InteractiveStencilCard({
  element,
  doodleAPI,
  isDark = true,
}) {
  const stencilType = element.stencilType || 'toggle';

  // State management for each stencil component
  const [toggleState, setToggleState] = useState(element.state?.enabled ?? true);
  const [activeTab, setActiveTab] = useState(element.state?.activeTab || 0);
  const [isDropdownOpen, setIsDropdownOpen] = useState(false);
  const [selectedDropdownOption, setSelectedDropdownOption] = useState(element.state?.selectedOption || 'Standard Tier');
  const [phoneScreen, setPhoneScreen] = useState(element.state?.phoneScreen || 'Home');
  const [inputValue, setInputValue] = useState(element.state?.textValue ?? (element.textValue || ''));
  const [checkboxItems, setCheckboxItems] = useState(
    element.items || [
      { id: 'c1', label: 'TLS / SSL Certificate Valid', checked: true },
      { id: 'c2', label: 'Redis Cache Connected', checked: true },
      { id: 'c3', label: 'Database Migrations Synced', checked: false },
    ]
  );
  const [buttonState, setButtonState] = useState(element.state?.buttonState || 'idle'); // 'idle' | 'loading' | 'success'
  const [isTypePickerOpen, setIsTypePickerOpen] = useState(false);

  const cardBg = isDark ? '#141418' : '#ffffff';
  const textColor = isDark ? '#f4f4f5' : '#18181b';
  const borderColor = isDark ? 'rgba(255, 255, 255, 0.12)' : '#e4e4e7';

  // Sync state mutation back to Doodle element
  const updateElementState = (newState, newProps = {}) => {
    if (!doodleAPI) return;
    const all = doodleAPI.getSceneElements?.() || [];
    const updated = all.map((el) =>
      el.id === element.id
        ? {
            ...el,
            ...newProps,
            state: { ...(el.state || {}), ...newState },
            version: (el.version || 1) + 1,
            versionNonce: Math.floor(Math.random() * 100000),
          }
        : el
    );
    doodleAPI.updateScene({ elements: updated, commitToHistory: false });
  };

  // Switch between stencil types directly on the card
  const handleSwitchStencilType = (newType, e) => {
    e.stopPropagation();
    proceduralAudio.playSnapClick();
    setIsTypePickerOpen(false);
    const meta = STENCIL_TYPE_METADATA[newType];
    if (!meta || !doodleAPI) return;

    const all = doodleAPI.getSceneElements?.() || [];
    const updated = all.map((el) =>
      el.id === element.id
        ? {
            ...el,
            stencilType: newType,
            title: meta.label,
            width: meta.width,
            height: meta.height,
            version: (el.version || 1) + 1,
            versionNonce: Math.floor(Math.random() * 100000),
          }
        : el
    );
    doodleAPI.updateScene({ elements: updated, commitToHistory: true });
  };

  // 1. Toggle Handler
  const handleToggle = (e) => {
    e.stopPropagation();
    proceduralAudio.playSnapClick();
    const next = !toggleState;
    setToggleState(next);
    updateElementState({ enabled: next });
  };

  // 2. Tabs Handler
  const handleTabClick = (idx, e) => {
    e.stopPropagation();
    proceduralAudio.playSnapClick();
    setActiveTab(idx);
    updateElementState({ activeTab: idx });
  };

  // 3. Dropdown Handler
  const handleSelectOption = (opt, e) => {
    e.stopPropagation();
    proceduralAudio.playSnapClick();
    setSelectedDropdownOption(opt);
    setIsDropdownOpen(false);
    updateElementState({ selectedOption: opt });
  };

  // 4. Input Handler
  const handleInputChange = (e) => {
    const val = e.target.value;
    setInputValue(val);
    updateElementState({ textValue: val }, { textValue: val });
  };

  // 5. Checkbox Toggle
  const handleToggleCheckbox = (id, e) => {
    e.stopPropagation();
    proceduralAudio.playSnapClick();
    const updated = checkboxItems.map((item) =>
      item.id === id ? { ...item, checked: !item.checked } : item
    );
    setCheckboxItems(updated);
    updateElementState({ checkedItems: updated.map((i) => i.id) }, { items: updated });
  };

  // 6. Stateful Action Button
  const handleButtonClick = (e) => {
    e.stopPropagation();
    if (buttonState !== 'idle') return;
    proceduralAudio?.playSnapClick?.();
    setButtonState('loading');
    updateElementState({ buttonState: 'loading' });

    setTimeout(() => {
      proceduralAudio?.playLaserTone?.(780);
      setButtonState('success');
      updateElementState({ buttonState: 'success' });

      setTimeout(() => {
        setButtonState('idle');
        updateElementState({ buttonState: 'idle' });
      }, 1500);
    }, 850);
  };

  // Delete Card
  const handleDelete = (e) => {
    e.stopPropagation();
    if (!doodleAPI) return;
    const all = doodleAPI.getSceneElements?.() || [];
    const updated = all.map((el) =>
      el.id === element.id ? { ...el, isDeleted: true } : el
    );
    doodleAPI.updateScene({ elements: updated, commitToHistory: true });
  };

  const meta = STENCIL_TYPE_METADATA[stencilType] || STENCIL_TYPE_METADATA.toggle;
  const StencilIcon = meta.icon;

  return (
    <div
      style={{
        width: '100%',
        height: '100%',
        display: 'flex',
        flexDirection: 'column',
        background: cardBg,
        borderRadius: '10px',
        color: textColor,
        boxSizing: 'border-box',
        overflow: 'hidden',
        boxShadow: '0 8px 24px rgba(0, 0, 0, 0.35)',
        border: `1.5px solid ${borderColor}`,
        fontFamily: '"Virgil", "Doodlefont", cursive, sans-serif',
        userSelect: 'none',
        pointerEvents: 'auto',
      }}
      onPointerDown={(e) => {
        if (['button', 'input', 'select', 'textarea'].includes(e.target.tagName?.toLowerCase())) {
          e.stopPropagation();
        }
      }}
      onClick={() => doodleAPI?.setSelectedElements?.({ [element.id]: true })}
    >
      {/* Mini Stencil Header with Type Switcher & Delete */}
      <div
        style={{
          padding: '6px 10px',
          background: isDark ? 'rgba(255, 255, 255, 0.04)' : 'rgba(0, 0, 0, 0.03)',
          borderBottom: `1px solid ${borderColor}`,
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          fontSize: '11px',
          fontWeight: 600,
          position: 'relative',
        }}
      >
        {/* Interactive Type Selector Pill */}
        <button
          type="button"
          onClick={(e) => {
            e.stopPropagation();
            setIsTypePickerOpen(!isTypePickerOpen);
          }}
          style={{
            background: isDark ? 'rgba(99, 102, 241, 0.15)' : 'rgba(99, 102, 241, 0.1)',
            border: '1px solid rgba(99, 102, 241, 0.3)',
            borderRadius: '6px',
            color: '#818cf8',
            padding: '2px 7px',
            display: 'flex',
            alignItems: 'center',
            gap: '5px',
            cursor: 'pointer',
            fontSize: '11px',
            fontWeight: 700,
          }}
          title="Click to switch stencil component"
        >
          <StencilIcon size={12} />
          <span>{element.title || meta.label}</span>
          <ChevronDown size={11} style={{ transform: isTypePickerOpen ? 'rotate(180deg)' : 'none' }} />
        </button>

        {/* Dropdown Type Switcher Menu */}
        {isTypePickerOpen && (
          <div
            style={{
              position: 'absolute',
              top: '32px',
              left: '10px',
              background: isDark ? '#1a1a22' : '#ffffff',
              border: `1px solid ${borderColor}`,
              borderRadius: '8px',
              boxShadow: '0 8px 24px rgba(0, 0, 0, 0.45)',
              zIndex: 50,
              minWidth: '180px',
              padding: '4px',
              display: 'flex',
              flexDirection: 'column',
              gap: '2px',
            }}
          >
            {Object.entries(STENCIL_TYPE_METADATA).map(([tKey, tMeta]) => {
              const TIcon = tMeta.icon;
              const isActive = stencilType === tKey;
              return (
                <button
                  key={tKey}
                  type="button"
                  onClick={(e) => handleSwitchStencilType(tKey, e)}
                  style={{
                    background: isActive ? (isDark ? 'rgba(99, 102, 241, 0.25)' : '#e0e7ff') : 'transparent',
                    border: 'none',
                    borderRadius: '5px',
                    padding: '5px 8px',
                    display: 'flex',
                    alignItems: 'center',
                    gap: '8px',
                    color: isActive ? '#818cf8' : textColor,
                    cursor: 'pointer',
                    fontSize: '11px',
                    fontWeight: isActive ? 700 : 500,
                    textAlign: 'left',
                  }}
                >
                  <TIcon size={13} style={{ color: isActive ? '#818cf8' : '#71717a' }} />
                  <span style={{ flex: 1 }}>{tMeta.label}</span>
                  {isActive && <Check size={11} style={{ color: '#818cf8' }} />}
                </button>
              );
            })}
          </div>
        )}

        <button
          type="button"
          onClick={handleDelete}
          style={{ background: 'none', border: 'none', color: '#71717a', cursor: 'pointer', padding: '2px' }}
          title="Delete stencil"
        >
          <Trash2 size={12} />
        </button>
      </div>

      {/* ── 1. Interactive Toggle Stencil ── */}
      {stencilType === 'toggle' && (
        <div style={{ flex: 1, padding: '16px', display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
          <div>
            <div style={{ fontSize: '15px', fontWeight: 700 }}>{element.label || 'Feature Switch'}</div>
            <div style={{ fontSize: '12px', color: isDark ? '#a1a1aa' : '#71717a' }}>Click to interact</div>
          </div>
          <button
            type="button"
            onClick={handleToggle}
            aria-label="Toggle switch"
            style={{
              background: toggleState ? '#10b981' : isDark ? '#27272a' : '#e4e4e7',
              border: 'none',
              borderRadius: '24px',
              width: '56px',
              height: '30px',
              cursor: 'pointer',
              position: 'relative',
              transition: 'background 0.2s ease',
              display: 'flex',
              alignItems: 'center',
              padding: '3px',
              boxSizing: 'border-box',
            }}
          >
            <div
              style={{
                width: '24px',
                height: '24px',
                background: '#ffffff',
                borderRadius: '50%',
                boxShadow: '0 2px 4px rgba(0,0,0,0.2)',
                transform: toggleState ? 'translateX(26px)' : 'translateX(0)',
                transition: 'transform 0.2s cubic-bezier(0.34, 1.56, 0.64, 1)',
              }}
            />
          </button>
        </div>
      )}

      {/* ── 2. Interactive Tab Bar Stencil ── */}
      {stencilType === 'tabs' && (
        <div style={{ flex: 1, padding: '14px', display: 'flex', flexDirection: 'column', gap: '10px' }}>
          <div style={{ display: 'flex', background: isDark ? '#1f1f26' : '#f1f5f9', padding: '3px', borderRadius: '8px', gap: '3px' }}>
            {(element.tabs || ['Overview', 'Traffic', 'Settings']).map((tabName, idx) => (
              <button
                key={tabName}
                type="button"
                onClick={(e) => handleTabClick(idx, e)}
                style={{
                  flex: 1,
                  padding: '6px 10px',
                  borderRadius: '6px',
                  border: 'none',
                  background: activeTab === idx ? (isDark ? '#312e81' : '#ffffff') : 'transparent',
                  color: activeTab === idx ? '#818cf8' : isDark ? '#a1a1aa' : '#64748b',
                  fontWeight: activeTab === idx ? 700 : 500,
                  fontSize: '12px',
                  cursor: 'pointer',
                  transition: 'all 0.15s ease',
                }}
              >
                {tabName}
              </button>
            ))}
          </div>
          <div style={{ flex: 1, border: `1px dashed ${borderColor}`, borderRadius: '6px', padding: '12px', fontSize: '13px', color: isDark ? '#d4d4d8' : '#3f3f46' }}>
            Active View: <strong>{(element.tabs || ['Overview', 'Traffic', 'Settings'])[activeTab]}</strong>
          </div>
        </div>
      )}

      {/* ── 3. Interactive Dropdown Stencil ── */}
      {stencilType === 'dropdown' && (
        <div style={{ flex: 1, padding: '16px', position: 'relative' }}>
          <label style={{ fontSize: '12px', color: isDark ? '#a1a1aa' : '#71717a', display: 'block', marginBottom: '6px' }}>
            {element.label || 'Select Tier'}
          </label>
          <button
            type="button"
            onClick={(e) => {
              e.stopPropagation();
              setIsDropdownOpen(!isDropdownOpen);
            }}
            style={{
              width: '100%',
              padding: '8px 12px',
              background: isDark ? '#1e1e24' : '#f8fafc',
              border: `1.5px solid ${borderColor}`,
              borderRadius: '6px',
              color: textColor,
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'space-between',
              cursor: 'pointer',
              fontSize: '13px',
              fontWeight: 600,
            }}
          >
            <span>{selectedDropdownOption}</span>
            <ChevronDown size={14} style={{ transform: isDropdownOpen ? 'rotate(180deg)' : 'none', transition: 'transform 0.15s ease' }} />
          </button>

          {isDropdownOpen && (
            <div
              style={{
                position: 'absolute',
                top: '72px',
                left: '16px',
                right: '16px',
                background: isDark ? '#1c1c22' : '#ffffff',
                border: `1.5px solid ${borderColor}`,
                borderRadius: '6px',
                boxShadow: '0 10px 25px rgba(0,0,0,0.4)',
                zIndex: 30,
                overflow: 'hidden',
              }}
            >
              {(element.options || ['Standard Tier', 'Pro Cluster', 'Enterprise Mesh']).map((opt) => (
                <div
                  key={opt}
                  onClick={(e) => handleSelectOption(opt, e)}
                  style={{
                    padding: '8px 12px',
                    fontSize: '12px',
                    cursor: 'pointer',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'space-between',
                    background: selectedDropdownOption === opt ? (isDark ? 'rgba(99, 102, 241, 0.2)' : '#e0e7ff') : 'transparent',
                  }}
                >
                  <span>{opt}</span>
                  {selectedDropdownOption === opt && <Check size={13} style={{ color: '#818cf8' }} />}
                </div>
              ))}
            </div>
          )}
        </div>
      )}

      {/* ── 4. Interactive Typable Text Input Stencil ── */}
      {stencilType === 'input' && (
        <div style={{ flex: 1, padding: '14px', display: 'flex', flexDirection: 'column', gap: '8px' }}>
          <label style={{ fontSize: '12px', color: isDark ? '#a1a1aa' : '#71717a', fontWeight: 600 }}>
            {element.label || 'Search or API Endpoint'}
          </label>
          <div style={{ position: 'relative', display: 'flex', alignItems: 'center' }}>
            <input
              type="text"
              value={inputValue}
              onChange={handleInputChange}
              onPointerDown={(e) => e.stopPropagation()}
              placeholder={element.placeholder || 'Type text here...'}
              style={{
                width: '100%',
                padding: '8px 12px',
                paddingRight: inputValue ? '32px' : '12px',
                background: isDark ? '#1f1f26' : '#f8fafc',
                border: `1.5px solid ${borderColor}`,
                borderRadius: '6px',
                color: textColor,
                fontSize: '13px',
                fontFamily: 'inherit',
                outline: 'none',
                boxSizing: 'border-box',
              }}
            />
            {inputValue && (
              <button
                type="button"
                onClick={(e) => {
                  e.stopPropagation();
                  setInputValue('');
                  updateElementState({ textValue: '' }, { textValue: '' });
                }}
                style={{
                  position: 'absolute',
                  right: '8px',
                  background: 'none',
                  border: 'none',
                  color: '#71717a',
                  cursor: 'pointer',
                  padding: '2px',
                }}
                title="Clear text"
              >
                <X size={13} />
              </button>
            )}
          </div>
          <div style={{ fontSize: '10px', color: isDark ? '#71717a' : '#a1a1aa', textAlign: 'right' }}>
            {inputValue.length} characters
          </div>
        </div>
      )}

      {/* ── 5. Interactive Checkbox Checklist Stencil ── */}
      {stencilType === 'checkbox' && (
        <div style={{ flex: 1, padding: '12px 14px', display: 'flex', flexDirection: 'column', gap: '8px', overflowY: 'auto' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
            <span style={{ fontSize: '12px', fontWeight: 700, color: isDark ? '#d4d4d8' : '#27272a' }}>
              {element.label || 'Checklist'}
            </span>
            <span style={{ fontSize: '10px', color: '#10b981', fontWeight: 700 }}>
              {checkboxItems.filter((i) => i.checked).length}/{checkboxItems.length} Done
            </span>
          </div>

          <div style={{ display: 'flex', flexDirection: 'column', gap: '6px' }}>
            {checkboxItems.map((item) => (
              <div
                key={item.id}
                data-stencil-checkbox-id={item.id}
                onClick={(e) => handleToggleCheckbox(item.id, e)}
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  gap: '8px',
                  padding: '5px 8px',
                  borderRadius: '5px',
                  cursor: 'pointer',
                  background: isDark ? 'rgba(255, 255, 255, 0.02)' : 'rgba(0, 0, 0, 0.02)',
                  border: `1px solid ${borderColor}`,
                }}
              >
                <div
                  style={{
                    width: '16px',
                    height: '16px',
                    borderRadius: '4px',
                    background: item.checked ? '#10b981' : isDark ? '#27272a' : '#e4e4e7',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    color: '#ffffff',
                    transition: 'all 0.15s ease',
                  }}
                >
                  {item.checked && <Check size={11} strokeWidth={3} />}
                </div>
                <span
                  style={{
                    fontSize: '12px',
                    color: item.checked ? (isDark ? '#71717a' : '#94a3b8') : textColor,
                    textDecoration: item.checked ? 'line-through' : 'none',
                    userSelect: 'none',
                  }}
                >
                  {item.label}
                </span>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* ── 6. Stateful Action Button Stencil ── */}
      {stencilType === 'button' && (
        <div style={{ flex: 1, padding: '16px', display: 'flex', flexDirection: 'column', justifyContent: 'center' }}>
          <button
            type="button"
            onClick={handleButtonClick}
            style={{
              width: '100%',
              padding: '12px 18px',
              borderRadius: '8px',
              border: 'none',
              background:
                buttonState === 'success'
                  ? '#10b981'
                  : buttonState === 'loading'
                  ? '#6366f1'
                  : isDark
                  ? '#4f46e5'
                  : '#4338ca',
              color: '#ffffff',
              fontSize: '13px',
              fontWeight: 700,
              cursor: buttonState === 'loading' ? 'wait' : 'pointer',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              gap: '8px',
              boxShadow: '0 4px 14px rgba(79, 70, 229, 0.35)',
              transition: 'all 0.2s cubic-bezier(0.34, 1.56, 0.64, 1)',
              transform: buttonState === 'loading' ? 'scale(0.98)' : 'scale(1)',
            }}
          >
            {buttonState === 'loading' && <Loader2 size={16} className="animate-spin" />}
            {buttonState === 'success' && <Check size={16} strokeWidth={3} />}
            {buttonState === 'idle' && <MousePointerClick size={15} />}
            <span>
              {buttonState === 'loading'
                ? 'Processing...'
                : buttonState === 'success'
                ? 'Verified & Saved!'
                : element.label || 'Execute Action'}
            </span>
          </button>
        </div>
      )}

      {/* ── 7. Interactive Mobile Phone Shell Stencil ── */}
      {stencilType === 'phone' && (
        <div style={{ flex: 1, display: 'flex', flexDirection: 'column', background: isDark ? '#000' : '#f8fafc', padding: '10px 14px', position: 'relative' }}>
          {/* Dynamic Island / Speaker Notch */}
          <div style={{ width: '60px', height: '14px', background: isDark ? '#27272a' : '#000', borderRadius: '10px', alignSelf: 'center', marginBottom: '8px' }} />

          {/* Phone Header Status Bar */}
          <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '10px', color: isDark ? '#a1a1aa' : '#52525b', marginBottom: '10px' }}>
            <span>9:41</span>
            <span>5G 100%</span>
          </div>

          {/* Interactive Screen Content */}
          <div style={{ flex: 1, border: `1px dashed ${borderColor}`, borderRadius: '8px', padding: '10px', display: 'flex', flexDirection: 'column', gap: '8px' }}>
            <span style={{ fontSize: '14px', fontWeight: 700 }}>{phoneScreen} Screen</span>
            <div style={{ display: 'flex', gap: '4px' }}>
              {['Home', 'Cart', 'Profile'].map((s) => (
                <button
                  key={s}
                  type="button"
                  onClick={(e) => {
                    e.stopPropagation();
                    proceduralAudio.playSnapClick();
                    setPhoneScreen(s);
                  }}
                  style={{
                    flex: 1,
                    padding: '4px',
                    fontSize: '10px',
                    borderRadius: '4px',
                    border: 'none',
                    background: phoneScreen === s ? '#6366f1' : isDark ? '#27272a' : '#e4e4e7',
                    color: phoneScreen === s ? '#fff' : textColor,
                    cursor: 'pointer',
                  }}
                >
                  {s}
                </button>
              ))}
            </div>
          </div>

          {/* Home indicator bar */}
          <div style={{ width: '70px', height: '4px', background: isDark ? '#52525b' : '#cbd5e1', borderRadius: '4px', alignSelf: 'center', marginTop: '10px' }} />
        </div>
      )}
    </div>
  );
}

export default InteractiveStencilCard;
