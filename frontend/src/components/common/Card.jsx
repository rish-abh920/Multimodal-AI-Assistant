import React, { useRef, useState } from 'react';
import { useFinePointerMotion } from '../../hooks/useMotion';

export const Card = ({
  children,
  title,
  subtitle,
  icon: Icon = null,
  iconColor = null,
  glowColor = null,
  action = null,
  badge = null,
  interactive = false,
  tilt = true,
  className = '',
  style = {},
  footer = null,
  onClick = null,
}) => {
  const cardRef = useRef(null);
  const canMotion = useFinePointerMotion();
  const [transformStyle, setTransformStyle] = useState(null);

  const handleMouseMove = (e) => {
    if (!interactive || !canMotion || !cardRef.current) return;
    const rect = cardRef.current.getBoundingClientRect();
    const px = ((e.clientX - rect.left) / rect.width) * 100;
    const py = ((e.clientY - rect.top) / rect.height) * 100;

    cardRef.current.style.setProperty('--spot-x', `${px.toFixed(1)}%`);
    cardRef.current.style.setProperty('--spot-y', `${py.toFixed(1)}%`);

    if (tilt) {
      const rotateY = ((px - 50) / 50) * 4.5;
      const rotateX = ((50 - py) / 50) * 4.5;
      setTransformStyle(
        `perspective(1000px) rotateX(${rotateX.toFixed(2)}deg) rotateY(${rotateY.toFixed(2)}deg) translateY(-4px) scale(1.008)`
      );
    }
  };

  const handleMouseLeave = () => {
    if (transformStyle) {
      setTransformStyle(null);
    }
  };

  const combinedStyle = {
    ...(glowColor ? { '--card-glow-color': glowColor } : {}),
    ...style,
    ...(transformStyle ? { transform: transformStyle } : {}),
  };

  return (
    <div
      ref={cardRef}
      onClick={onClick}
      onMouseMove={handleMouseMove}
      onMouseLeave={handleMouseLeave}
      role={onClick ? 'button' : undefined}
      tabIndex={onClick ? 0 : undefined}
      onKeyDown={
        onClick
          ? (e) => {
              if (e.key === 'Enter' || e.key === ' ') {
                e.preventDefault();
                onClick(e);
              }
            }
          : undefined
      }
      className={`glass-panel ui-card ${interactive ? 'ui-card--interactive' : ''} ${
        onClick ? 'ui-card--clickable' : ''
      } ${className}`}
      style={combinedStyle}
    >
      {interactive && (
        <>
          <div className="ui-card__spotlight" aria-hidden="true" />
          <div className="ui-card__border-glow" aria-hidden="true" />
        </>
      )}

      <div className="ui-card__inner">
        {(title || subtitle || Icon || action || badge) && (
          <div className="ui-card__header">
            <div className="ui-card__title-group">
              {Icon && (
                <div
                  className="ui-card__icon-box"
                  style={
                    iconColor
                      ? {
                          color: iconColor,
                          background: `color-mix(in srgb, ${iconColor} 14%, transparent)`,
                          borderColor: `color-mix(in srgb, ${iconColor} 32%, transparent)`,
                        }
                      : undefined
                  }
                >
                  <Icon size={20} aria-hidden="true" />
                </div>
              )}
              <div style={{ minWidth: 0 }}>
                {title && <h3 className="ui-card__title">{title}</h3>}
                {subtitle && <p className="ui-card__subtitle">{subtitle}</p>}
              </div>
            </div>

            {(badge || action) && (
              <div className="ui-card__actions">
                {badge}
                {action}
              </div>
            )}
          </div>
        )}

        <div className="ui-card__body">{children}</div>

        {footer && <div className="ui-card__footer">{footer}</div>}
      </div>
    </div>
  );
};

export default Card;
