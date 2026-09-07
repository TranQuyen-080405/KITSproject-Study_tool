import type { SVGProps } from "react";

export type IconProps = SVGProps<SVGSVGElement> & {
  size?: number;
};

// Official Google 4-Color 2D Logo SVG
export function GoogleLogo2D({ size = 20, ...props }: IconProps) {
  return (
    <svg height={size} viewBox="0 0 24 24" width={size} xmlns="http://www.w3.org/2000/svg" {...props}>
      <path
        d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"
        fill="#4285F4"
      />
      <path
        d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"
        fill="#34A853"
      />
      <path
        d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.06H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.94l2.85-2.22.81-.63z"
        fill="#FBBC05"
      />
      <path
        d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.06l3.66 2.84c.87-2.6 3.3-4.52 6.16-4.52z"
        fill="#EA4335"
      />
    </svg>
  );
}

// 2D Minimalist Vector Icons
export function BookIcon2D({ size = 18, color = "currentColor", ...props }: IconProps) {
  return (
    <svg fill="none" height={size} stroke={color} strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" viewBox="0 0 24 24" width={size} {...props}>
      <path d="M4 19.5A2.5 2.5 0 0 1 6.5 17H20" />
      <path d="M6.5 2H20v20H6.5A2.5 2.5 0 0 1 4 19.5v-15A2.5 2.5 0 0 1 6.5 2z" />
    </svg>
  );
}

export function EditIcon2D({ size = 18, color = "currentColor", ...props }: IconProps) {
  return (
    <svg fill="none" height={size} stroke={color} strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" viewBox="0 0 24 24" width={size} {...props}>
      <path d="M17 3a2.828 2.828 0 1 1 4 4L7.5 20.5 2 22l1.5-5.5L17 3z" />
    </svg>
  );
}

export function ManageIcon2D(props: IconProps) {
  return <EditIcon2D {...props} />;
}

export function BotIcon2D({ size = 18, color = "currentColor", ...props }: IconProps) {
  return (
    <svg fill="none" height={size} stroke={color} strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" viewBox="0 0 24 24" width={size} {...props}>
      <rect height="12" rx="2" width="18" x="3" y="11" />
      <circle cx="12" cy="5" r="2" />
      <path d="M12 7v4" />
      <line x1="8" x2="8" y1="15" y2="15" />
      <line x1="16" x2="16" y1="15" y2="15" />
    </svg>
  );
}

export function ChartIcon2D({ size = 18, color = "currentColor", ...props }: IconProps) {
  return (
    <svg fill="none" height={size} stroke={color} strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" viewBox="0 0 24 24" width={size} {...props}>
      <line x1="18" x2="18" y1="20" y2="10" />
      <line x1="12" x2="12" y1="20" y2="4" />
      <line x1="6" x2="6" y1="20" y2="14" />
    </svg>
  );
}

export function SunIcon2D({ size = 16, color = "currentColor", ...props }: IconProps) {
  return (
    <svg fill="none" height={size} stroke={color} strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" viewBox="0 0 24 24" width={size} {...props}>
      <circle cx="12" cy="12" r="5" />
      <line x1="12" x2="12" y1="1" y2="3" />
      <line x1="12" x2="12" y1="21" y2="23" />
      <line x1="4.22" x2="5.64" y1="4.22" y2="5.64" />
      <line x1="18.36" x2="19.78" y1="18.36" y2="19.78" />
      <line x1="1" x2="3" y1="12" y2="12" />
      <line x1="21" x2="23" y1="12" y2="12" />
      <line x1="4.22" x2="5.64" y1="19.78" y2="18.36" />
      <line x1="18.36" x2="19.78" y1="5.64" y2="4.22" />
    </svg>
  );
}

export function MoonIcon2D({ size = 16, color = "currentColor", ...props }: IconProps) {
  return (
    <svg fill="none" height={size} stroke={color} strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" viewBox="0 0 24 24" width={size} {...props}>
      <path d="M21 12.79A9 9 0 1 1 11.21 3 7 7 0 0 0 21 12.79z" />
    </svg>
  );
}

export function ImageIcon2D({ size = 16, color = "currentColor", ...props }: IconProps) {
  return (
    <svg fill="none" height={size} stroke={color} strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" viewBox="0 0 24 24" width={size} {...props}>
      <rect height="18" rx="2" ry="2" width="18" x="3" y="3" />
      <circle cx="8.5" cy="8.5" r="1.5" />
      <polyline points="21 15 16 10 5 21" />
    </svg>
  );
}

export function CheckIcon2D({ size = 16, color = "currentColor", ...props }: IconProps) {
  return (
    <svg fill="none" height={size} stroke={color} strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" viewBox="0 0 24 24" width={size} {...props}>
      <polyline points="20 6 9 17 4 12" />
    </svg>
  );
}

export function PlusIcon2D({ size = 16, color = "currentColor", ...props }: IconProps) {
  return (
    <svg fill="none" height={size} stroke={color} strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" viewBox="0 0 24 24" width={size} {...props}>
      <line x1="12" x2="12" y1="5" y2="19" />
      <line x1="5" x2="19" y1="12" y2="12" />
    </svg>
  );
}

export function TrashIcon2D({ size = 16, color = "currentColor", ...props }: IconProps) {
  return (
    <svg fill="none" height={size} stroke={color} strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" viewBox="0 0 24 24" width={size} {...props}>
      <polyline points="3 6 5 6 21 6" />
      <path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2" />
    </svg>
  );
}

export function ArrowRightIcon2D({ size = 16, color = "currentColor", ...props }: IconProps) {
  return (
    <svg fill="none" height={size} stroke={color} strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" viewBox="0 0 24 24" width={size} {...props}>
      <line x1="5" x2="19" y1="12" y2="12" />
      <polyline points="12 5 19 12 12 19" />
    </svg>
  );
}

export function ArrowLeftIcon2D({ size = 16, color = "currentColor", ...props }: IconProps) {
  return (
    <svg fill="none" height={size} stroke={color} strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" viewBox="0 0 24 24" width={size} {...props}>
      <line x1="19" x2="5" y1="12" y2="12" />
      <polyline points="12 19 5 12 12 5" />
    </svg>
  );
}

export function RefreshIcon2D({ size = 16, color = "currentColor", ...props }: IconProps) {
  return (
    <svg fill="none" height={size} stroke={color} strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" viewBox="0 0 24 24" width={size} {...props}>
      <polyline points="23 4 23 10 17 10" />
      <path d="M20.49 15a9 9 0 1 1-2.12-9.36L23 10" />
    </svg>
  );
}

export function LogoutIcon2D({ size = 14, color = "currentColor", ...props }: IconProps) {
  return (
    <svg fill="none" height={size} stroke={color} strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" viewBox="0 0 24 24" width={size} {...props}>
      <path d="M9 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h4" />
      <polyline points="16 17 21 12 16 7" />
      <line x1="21" x2="9" y1="12" y2="12" />
    </svg>
  );
}

export function EyeIcon2D({ size = 16, color = "currentColor", ...props }: IconProps) {
  return (
    <svg fill="none" height={size} stroke={color} strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" viewBox="0 0 24 24" width={size} {...props}>
      <path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z" />
      <circle cx="12" cy="12" r="3" />
    </svg>
  );
}

export function EyeOffIcon2D({ size = 16, color = "currentColor", ...props }: IconProps) {
  return (
    <svg fill="none" height={size} stroke={color} strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" viewBox="0 0 24 24" width={size} {...props}>
      <path d="M17.94 17.94A10.07 10.07 0 0 1 12 20c-7 0-11-8-11-8a18.45 18.45 0 0 1 5.06-5.94M9.9 4.24A9.12 9.12 0 0 1 12 4c7 0 11 8 11 8a18.5 18.5 0 0 1-2.16 3.19m-6.72-1.07a3 3 0 1 1-4.24-4.24" />
      <line x1="1" x2="23" y1="1" y2="23" />
    </svg>
  );
}

export function SettingsIcon2D({ size = 16, color = "currentColor", ...props }: IconProps) {
  return (
    <svg fill="none" height={size} stroke={color} strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" viewBox="0 0 24 24" width={size} {...props}>
      <circle cx="12" cy="12" r="3" />
      <path d="M19.4 15a1.65 1.65 0 0 0 .33 1.82l.06.06a2 2 0 0 1 0 2.83 2 2 0 0 1-2.83 0l-.06-.06a1.65 1.65 0 0 0-1.82-.33 1.65 1.65 0 0 0-1 1.51V21a2 2 0 0 1-2 2 2 2 0 0 1-2-2v-.09A1.65 1.65 0 0 0 9 19.4a1.65 1.65 0 0 0-1.82.33l-.06.06a2 2 0 0 1-2.83 0 2 2 0 0 1 0-2.83l.06-.06a1.65 1.65 0 0 0 .33-1.82 1.65 1.65 0 0 0-1.51-1H3a2 2 0 0 1-2-2 2 2 0 0 1 2-2h.09A1.65 1.65 0 0 0 4.6 9a1.65 1.65 0 0 0-.33-1.82l-.06-.06a2 2 0 0 1 0-2.83 2 2 0 0 1 2.83 0l.06.06a1.65 1.65 0 0 0 1.82.33H9a1.65 1.65 0 0 0 1-1.51V3a2 2 0 0 1 2-2 2 2 0 0 1 2 2v.09a1.65 1.65 0 0 0 1 1.51 1.65 1.65 0 0 0 1.82-.33l.06-.06a2 2 0 0 1 2.83 0 2 2 0 0 1 0 2.83l-.06.06a1.65 1.65 0 0 0-.33 1.82V9a1.65 1.65 0 0 0 1.51 1H21a2 2 0 0 1 2 2 2 2 0 0 1-2 2h-.09a1.65 1.65 0 0 0-1.51 1z" />
    </svg>
  );
}

export function ClockIcon2D({ size = 16, color = "currentColor", ...props }: IconProps) {
  return (
    <svg fill="none" height={size} stroke={color} strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" viewBox="0 0 24 24" width={size} {...props}>
      <circle cx="12" cy="12" r="10" />
      <polyline points="12 6 12 12 16 14" />
    </svg>
  );
}

export function BrainIcon2D({ size = 16, color = "currentColor", ...props }: IconProps) {
  return (
    <svg fill="none" height={size} stroke={color} strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" viewBox="0 0 24 24" width={size} {...props}>
      <path d="M9.5 2A2.5 2.5 0 0 1 12 4.5v15a2.5 2.5 0 0 1-4.96.44 2.5 2.5 0 0 1-2.96-3.08 3 3 0 0 1-.34-5.58 2.5 2.5 0 0 1 1.32-4.24 2.5 2.5 0 0 1 4.44-2.04" />
      <path d="M14.5 2A2.5 2.5 0 0 0 12 4.5v15a2.5 2.5 0 0 0 4.96.44 2.5 2.5 0 0 0 2.96-3.08 3 3 0 0 0 .34-5.58 2.5 2.5 0 0 0-1.32-4.24 2.5 2.5 0 0 0-4.44-2.04" />
    </svg>
  );
}

export function TrophyIcon2D({ size = 16, color = "currentColor", ...props }: IconProps) {
  return (
    <svg fill="none" height={size} stroke={color} strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" viewBox="0 0 24 24" width={size} {...props}>
      <path d="M6 9H4.5a2.5 2.5 0 0 1 0-5H6" />
      <path d="M18 9h1.5a2.5 2.5 0 0 0 0-5H18" />
      <path d="M4 22h16" />
      <path d="M10 14.66V17c0 .55-.47.98-.97 1.21C7.85 18.75 7 20.24 7 22" />
      <path d="M14 14.66V17c0 .55.47.98.97 1.21C16.15 18.75 17 20.24 17 22" />
      <path d="M18 2H6v7a6 6 0 0 0 12 0V2z" />
    </svg>
  );
}

export function QuestionIcon2D({ size = 16, color = "currentColor", ...props }: IconProps) {
  return (
    <svg fill="none" height={size} stroke={color} strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" viewBox="0 0 24 24" width={size} {...props}>
      <circle cx="12" cy="12" r="10" />
      <path d="M9.09 9a3 3 0 0 1 5.83 1c0 2-3 3-3 3" />
      <line x1="12" x2="12.01" y1="17" y2="17" />
    </svg>
  );
}

export function LightbulbIcon2D({ size = 16, color = "currentColor", ...props }: IconProps) {
  return (
    <svg fill="none" height={size} stroke={color} strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" viewBox="0 0 24 24" width={size} {...props}>
      <path d="M9 18h6" />
      <path d="M10 22h4" />
      <path d="M15.09 14c.18-.98.65-1.74 1.41-2.5A4.65 4.65 0 0 0 18 8 6 6 0 0 0 6 8c0 1.55.64 2.94 1.7 3.93.75.76 1.22 1.52 1.4 2.57" />
    </svg>
  );
}

export function SendIcon2D({ size = 16, color = "currentColor", ...props }: IconProps) {
  return (
    <svg fill="none" height={size} stroke={color} strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" viewBox="0 0 24 24" width={size} {...props}>
      <line x1="22" y1="2" x2="11" y2="13" />
      <polygon points="22 2 15 22 11 13 2 9 22 2" />
    </svg>
  );
}

