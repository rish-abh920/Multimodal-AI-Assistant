import React, { useRef, useState } from 'react';
import { Loader2 } from 'lucide-react';
import { useFinePointerMotion } from '../../hooks/useMotion';

export const Button = ({
  children,
  onClick,
  type = 'button',
  variant = 'primary', // primary, secondary, outline, ghost, danger
  size = 'md', // sm, md, lg
  disabled = false,
  loading = false,
  loadingText = 'Processing...',
  magnetic = false,
  icon: Icon = null,
  iconPosition = 'left',
  fullWidth = false,
  className = '',
  style = {},
  ...props
}) => {
  const btnRef = useRef(null);
  const canHoverMotion = useFinePointerMotion();
  const [ripples, setRipples] = useState([]);
  const [offset, setOffset] = useState({ x: 0, y: 0 });

  const handleMouseMove = (e) => {
    if (!magnetic || !canHoverMotion || disabled || loading || !btnRef.current) return;
    const rect = btnRef.current.getBoundingClientRect();
    const dx = e.clientX - (rect.left + rect.width / 2);
    const dy = e.clientY - (rect.top + rect.height / 2);
    setOffset({ x: dx * 0.14, y: dy * 0.18 });
  };

  const handleMouseLeave = () => {
    if (offset.x !== 0 || offset.y !== 0) {
      setOffset({ x: 0, y: 0 });
    }
  };

  const handleClick = (e) => {
    if (!disabled && !loading && btnRef.current) {
      const rect = btnRef.current.getBoundingClientRect();
      const diameter = Math.max(rect.width, rect.height);
      const x = e.clientX ? e.clientX - rect.left - diameter / 2 : rect.width / 2 - diameter / 2;
      const y = e.clientY ? e.clientY - rect.top - diameter / 2 : rect.height / 2 - diameter / 2;
      const rippleId = `${Date.now()}-${Math.random()}`;
      setRipples((prev) => [...prev.slice(-2), { id: rippleId, x, y, diameter }]);
      window.setTimeout(() => {
        setRipples((prev) => prev.filter((r) => r.id !== rippleId));
      }, 520);
    }
    onClick?.(e);
  };

  const iconSize = size === 'sm' ? 15 : size === 'lg' ? 19 : 17;
  const dynamicStyle =
    offset.x || offset.y
      ? { ...style, transform: `translate3d(${offset.x.toFixed(1)}px, ${offset.y.toFixed(1)}px, 0)` }
      : style;

  return (
    <button
      ref={btnRef}
      type={type}
      onClick={handleClick}
      onMouseMove={handleMouseMove}
      onMouseLeave={handleMouseLeave}
      disabled={disabled || loading}
      className={`ui-btn ui-btn--${variant} ui-btn--${size} ${fullWidth ? 'ui-btn--full' : ''} ${className}`}
      style={dynamicStyle}
      {...props}
    >
      {ripples.map((r) => (
        <span
          key={r.id}
          className="ui-btn__ripple"
          style={{ width: r.diameter, height: r.diameter, left: r.x, top: r.y }}
          aria-hidden="true"
        />
      ))}

      {loading ? (
        <>
          <Loader2 size={iconSize} className="animate-spin-fast" aria-hidden="true" />
          <span>{loadingText}</span>
        </>
      ) : (
        <>
          {Icon && iconPosition === 'left' && <Icon size={iconSize} aria-hidden="true" />}
          <span>{children}</span>
          {Icon && iconPosition === 'right' && (
            <Icon size={iconSize} className="ui-btn__icon-right" aria-hidden="true" />
          )}
        </>
      )}
    </button>
  );
};

export default Button;
