import React from 'react';

export const Badge = ({
  children,
  variant = 'default', // default, image, audio, text, doc, document, success, warning, error, info
  size = 'md', // sm, md
  icon: Icon = null,
  dot = false,
  dotOnline = true,
  className = '',
}) => {
  const iconSize = size === 'sm' ? 12 : 14;

  return (
    <span className={`ui-badge ui-badge--${size} ui-badge--${variant} ${className}`}>
      {dot && <span className={`status-dot ${dotOnline ? 'status-dot--online' : 'status-dot--offline'}`} />}
      {Icon && <Icon size={iconSize} aria-hidden="true" />}
      <span>{children}</span>
    </span>
  );
};

export default Badge;
