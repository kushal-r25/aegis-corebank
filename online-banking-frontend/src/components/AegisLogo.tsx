import React from 'react';

export const AegisLogo: React.FC<{ className?: string; size?: number }> = ({ className = 'h-8 w-auto', size = 32 }) => {
  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 48 48"
      fill="none"
      xmlns="http://www.w3.org/2000/svg"
      className={className}
    >
      <rect width="48" height="48" rx="8" fill="#0F172A" />
      {/* Outer shield frame */}
      <path
        d="M24 8L36 13V23C36 30.5 30.9 37.4 24 40C17.1 37.4 12 30.5 12 23V13L24 8Z"
        stroke="#3755C3"
        strokeWidth="2.5"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
      {/* Internal Vault geometric lattice */}
      <path
        d="M24 16L30 19.5V26.5C30 30.2 27.5 33.6 24 35C20.5 33.6 18 30.2 18 26.5V19.5L24 16Z"
        fill="#3755C3"
        fillOpacity="0.2"
        stroke="#85F8C4"
        strokeWidth="1.5"
      />
      {/* Core central node */}
      <circle cx="24" cy="25" r="3" fill="#85F8C4" />
      <path d="M24 22V16M24 35V28M18 25H12M36 25H30" stroke="#85F8C4" strokeWidth="1.5" strokeLinecap="round" />
    </svg>
  );
};
