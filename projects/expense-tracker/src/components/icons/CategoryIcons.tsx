import React from 'react';

export type IconName =
  | 'wallet'
  | 'bank'
  | 'credit-card'
  | 'piggy-bank'
  | 'trending-up'
  | 'trending-down'
  | 'shopping-cart'
  | 'home'
  | 'utensils'
  | 'car'
  | 'bolt'
  | 'heart-pulse'
  | 'briefcase'
  | 'repeat'
  | 'receipt'
  | 'pie-chart'
  | 'shield-check'
  | 'search'
  | 'plus'
  | 'arrows-right-left';

export interface LocalSvgIconProps {
  name: IconName;
  size?: number;
  className?: string;
  title?: string;
}

export const LocalSvgIcon: React.FC<LocalSvgIconProps> = ({
  name,
  size = 18,
  className = '',
  title,
}) => {
  const renderPath = () => {
    switch (name) {
      case 'wallet':
        return (
          <>
            <rect x="2" y="5" width="20" height="14" rx="2" stroke="currentColor" strokeWidth="2" fill="none" />
            <path d="M16 12h4" stroke="currentColor" strokeWidth="2" strokeLinecap="round" />
          </>
        );
      case 'bank':
        return (
          <>
            <path d="M3 10l9-6 9 6" stroke="currentColor" strokeWidth="2" fill="none" strokeLinecap="round" />
            <path d="M5 10v8M9 10v8M15 10v8M19 10v8M3 20h18" stroke="currentColor" strokeWidth="2" strokeLinecap="round" />
          </>
        );
      case 'credit-card':
        return (
          <>
            <rect x="2" y="5" width="20" height="14" rx="2" stroke="currentColor" strokeWidth="2" fill="none" />
            <path d="M2 10h20M6 15h4" stroke="currentColor" strokeWidth="2" strokeLinecap="round" />
          </>
        );
      case 'piggy-bank':
        return (
          <>
            <circle cx="12" cy="13" r="6" stroke="currentColor" strokeWidth="2" fill="none" />
            <path d="M9 5h6M10 19v2M14 19v2" stroke="currentColor" strokeWidth="2" strokeLinecap="round" />
          </>
        );
      case 'trending-up':
        return (
          <path d="M3 17l6-6 4 4 8-8M14 7h7v7" stroke="currentColor" strokeWidth="2" fill="none" strokeLinecap="round" />
        );
      case 'trending-down':
        return (
          <path d="M3 7l6 6 4-4 8 8M14 17h7v-7" stroke="currentColor" strokeWidth="2" fill="none" strokeLinecap="round" />
        );
      case 'shopping-cart':
        return (
          <>
            <circle cx="9" cy="20" r="1.5" stroke="currentColor" strokeWidth="2" fill="none" />
            <circle cx="18" cy="20" r="1.5" stroke="currentColor" strokeWidth="2" fill="none" />
            <path d="M2 4h3l2.6 11h11.4l2-8H6" stroke="currentColor" strokeWidth="2" fill="none" strokeLinecap="round" />
          </>
        );
      case 'home':
        return (
          <path d="M3 11l9-7 9 7v9a1 1 0 01-1 1h-5v-6h-6v6H4a1 1 0 01-1-1v-9z" stroke="currentColor" strokeWidth="2" fill="none" />
        );
      case 'utensils':
        return (
          <path d="M4 3v7a3 3 0 006 0V3M7 3v18M16 3c2 0 4 2 4 6v4h-3v8" stroke="currentColor" strokeWidth="2" fill="none" strokeLinecap="round" />
        );
      case 'car':
        return (
          <>
            <path d="M5 11l2-5h10l2 5v6H5v-6z" stroke="currentColor" strokeWidth="2" fill="none" />
            <circle cx="7.5" cy="15" r="1.5" fill="currentColor" />
            <circle cx="16.5" cy="15" r="1.5" fill="currentColor" />
          </>
        );
      case 'bolt':
        return (
          <path d="M13 2L4 14h7l-1 8 9-12h-7l1-8z" stroke="currentColor" strokeWidth="2" fill="none" strokeLinejoin="round" />
        );
      case 'heart-pulse':
        return (
          <path d="M3 12h4l2-4 4 8 2-4h6" stroke="currentColor" strokeWidth="2" fill="none" strokeLinecap="round" strokeLinejoin="round" />
        );
      case 'briefcase':
        return (
          <>
            <rect x="3" y="7" width="18" height="13" rx="2" stroke="currentColor" strokeWidth="2" fill="none" />
            <path d="M9 7V5a1 1 0 011-1h4a1 1 0 011 1v2" stroke="currentColor" strokeWidth="2" fill="none" />
          </>
        );
      case 'repeat':
        return (
          <path d="M17 2l4 4-4 4M3 11V9a3 3 0 013-3h15M7 22l-4-4 4-4M21 13v2a3 3 0 01-3 3H3" stroke="currentColor" strokeWidth="2" fill="none" strokeLinecap="round" />
        );
      case 'receipt':
        return (
          <path d="M5 3h14v18l-2.5-2-2.5 2-2-2-2 2-2.5-2L5 21V3zm3 5h8m-8 4h8m-8 4h5" stroke="currentColor" strokeWidth="2" fill="none" strokeLinecap="round" />
        );
      case 'pie-chart':
        return (
          <>
            <circle cx="12" cy="12" r="9" stroke="currentColor" strokeWidth="2" fill="none" />
            <path d="M12 3v9l6.5 6.5" stroke="currentColor" strokeWidth="2" fill="none" strokeLinecap="round" />
          </>
        );
      case 'shield-check':
        return (
          <path d="M12 3l7 3v5c0 5-3.5 8.5-7 10-3.5-1.5-7-5-7-10V6l7-3zm-3 9l2 2 4-4" stroke="currentColor" strokeWidth="2" fill="none" strokeLinecap="round" />
        );
      case 'search':
        return (
          <>
            <circle cx="11" cy="11" r="7" stroke="currentColor" strokeWidth="2" fill="none" />
            <path d="M20 20l-4-4" stroke="currentColor" strokeWidth="2" strokeLinecap="round" />
          </>
        );
      case 'plus':
        return <path d="M12 5v14M5 12h14" stroke="currentColor" strokeWidth="2" strokeLinecap="round" />;
      case 'arrows-right-left':
      default:
        return (
          <path d="M7 8l-4 4 4 4M3 12h14m0-4l4 4-4 4" stroke="currentColor" strokeWidth="2" fill="none" strokeLinecap="round" />
        );
    }
  };

  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 24 24"
      role={title ? 'img' : 'presentation'}
      aria-hidden={!title}
      aria-label={title}
      className={`inline-block shrink-0 ${className}`}
    >
      {title ? <title>{title}</title> : null}
      {renderPath()}
    </svg>
  );
};
