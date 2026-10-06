import React from 'react';

export function DoodleDeskLogo({ theme = 'dark', size = 56 }) {
  const isDark = theme === 'dark';
  const textColor = isDark ? '#ffffff' : '#1e1e1e';

  return (
    <div
      style={{
        display: 'inline-flex',
        alignItems: 'center',
        justifyContent: 'center',
        marginBottom: '12px',
        userSelect: 'none',
      }}
    >
      {/* Hand-drawn D icon acts directly as the leading letter D */}
      <img
        src="./doodle-logo-clean.png"
        alt="D"
        style={{
          height: '66px',
          width: 'auto',
          marginRight: '-6px',
          verticalAlign: 'middle',
          filter: isDark ? 'none' : 'invert(1) hue-rotate(180deg)',
          display: 'inline-block',
          transform: 'translateY(1px)',
        }}
      />
      {/* Remaining letters oodle Desk */}
      <span
        style={{
          fontFamily: 'Doodlefont, Virgil, "Comic Shanns", cursive',
          fontSize: '48px',
          fontWeight: 700,
          letterSpacing: '0.8px',
          color: textColor,
          lineHeight: 1,
        }}
      >
        oodle Desk
      </span>
    </div>
  );
}
