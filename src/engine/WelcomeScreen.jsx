import React from 'react';
import { Folder, HelpCircle } from 'lucide-react';

function WelcomeScreen({ children }) {
  return <>{children}</>;
}

WelcomeScreen.Center = function Center({ children }) {
  return (
    <div
      className="welcome-screen-center"
      style={{
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'center',
        justifyContent: 'center',
        gap: '14px',
        pointerEvents: 'none',
        userSelect: 'none',
        textAlign: 'center',
      }}
    >
      {children}
    </div>
  );
};

WelcomeScreen.Center.Logo = function Logo({ children }) {
  return (
    <div style={{ marginBottom: '2px', display: 'flex', justifyContent: 'center' }}>
      {children}
    </div>
  );
};

WelcomeScreen.Center.Heading = function Heading({ children }) {
  return (
    <div className="welcome-screen-heading">
      {children}
    </div>
  );
};

WelcomeScreen.Center.Menu = function Menu({ children }) {
  return (
    <div
      className="welcome-screen-menu"
      style={{
        display: 'flex',
        flexDirection: 'column',
        gap: '8px',
        width: '280px',
        marginTop: '6px',
        pointerEvents: 'auto',
      }}
    >
      {children}
    </div>
  );
};

WelcomeScreen.Center.MenuItemLoadScene = function MenuItemLoadScene({ onSelect }) {
  return (
    <button
      type="button"
      className="welcome-menu-item"
      onClick={onSelect}
      aria-label="Open diagram"
    >
      <Folder size={18} strokeWidth={1.8} className="welcome-menu-item__icon" />
      <span className="welcome-menu-item__text">Open</span>
      <span className="welcome-menu-item__shortcut">Ctrl+O</span>
    </button>
  );
};

WelcomeScreen.Center.MenuItemHelp = function MenuItemHelp({ onSelect }) {
  return (
    <button
      type="button"
      className="welcome-menu-item"
      onClick={onSelect}
      aria-label="Open help and shortcuts"
    >
      <HelpCircle size={18} strokeWidth={1.8} className="welcome-menu-item__icon" />
      <span className="welcome-menu-item__text">Help</span>
      <span className="welcome-menu-item__shortcut">?</span>
    </button>
  );
};

export { WelcomeScreen };
