import React from 'react';
import { View } from 'react-native';
import Svg, { Path, Circle, Rect, Line, Polyline } from 'react-native-svg';

interface IconProps {
  name: IconName;
  size?: number;
  color?: string;
  strokeWidth?: number;
}

export type IconName =
  | 'home'
  | 'search'
  | 'heart'
  | 'heart-filled'
  | 'user'
  | 'building'
  | 'shield'
  | 'play'
  | 'calendar'
  | 'clock'
  | 'users'
  | 'door'
  | 'clipboard'
  | 'settings'
  | 'plus'
  | 'trash'
  | 'edit'
  | 'chevron-right'
  | 'chevron-left'
  | 'x'
  | 'check'
  | 'alert-circle'
  | 'refresh'
  | 'sliders'
  | 'grid'
  | 'list'
  | 'volume-on'
  | 'volume-off';

/**
 * Minimal iOS-style monochrome icon component.
 * Stroke-based (no fills), using react-native-svg.
 */
export const Icon: React.FC<IconProps> = ({
  name,
  size = 24,
  color = '#18181B',
  strokeWidth = 1.8,
}) => {
  const props = { width: size, height: size, viewBox: '0 0 24 24', fill: 'none' };
  const sp = { stroke: color, strokeWidth, strokeLinecap: 'round' as const, strokeLinejoin: 'round' as const };

  switch (name) {
    case 'home':
      return (
        <Svg {...props}>
          <Path d="M3 9.5L12 3l9 6.5V20a1 1 0 0 1-1 1H4a1 1 0 0 1-1-1V9.5z" {...sp} />
          <Polyline points="9,21 9,14 15,14 15,21" {...sp} />
        </Svg>
      );
    case 'search':
      return (
        <Svg {...props}>
          <Circle cx="11" cy="11" r="7" {...sp} />
          <Line x1="16.5" y1="16.5" x2="21" y2="21" {...sp} />
        </Svg>
      );
    case 'heart':
      return (
        <Svg {...props}>
          <Path d="M20.84 4.61a5.5 5.5 0 0 0-7.78 0L12 5.67l-1.06-1.06a5.5 5.5 0 0 0-7.78 7.78L12 21.23l8.84-8.84a5.5 5.5 0 0 0 0-7.78z" {...sp} />
        </Svg>
      );
    case 'heart-filled':
      return (
        <Svg {...props}>
          <Path d="M20.84 4.61a5.5 5.5 0 0 0-7.78 0L12 5.67l-1.06-1.06a5.5 5.5 0 0 0-7.78 7.78L12 21.23l8.84-8.84a5.5 5.5 0 0 0 0-7.78z" stroke={color} strokeWidth={strokeWidth} strokeLinecap="round" strokeLinejoin="round" fill={color} />
        </Svg>
      );
    case 'user':
      return (
        <Svg {...props}>
          <Path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2" {...sp} />
          <Circle cx="12" cy="7" r="4" {...sp} />
        </Svg>
      );
    case 'building':
      return (
        <Svg {...props}>
          <Rect x="4" y="2" width="16" height="20" rx="1" {...sp} />
          <Line x1="9" y1="6" x2="9" y2="6.01" {...sp} strokeWidth={strokeWidth + 0.5} />
          <Line x1="15" y1="6" x2="15" y2="6.01" {...sp} strokeWidth={strokeWidth + 0.5} />
          <Line x1="9" y1="10" x2="9" y2="10.01" {...sp} strokeWidth={strokeWidth + 0.5} />
          <Line x1="15" y1="10" x2="15" y2="10.01" {...sp} strokeWidth={strokeWidth + 0.5} />
          <Line x1="9" y1="14" x2="9" y2="14.01" {...sp} strokeWidth={strokeWidth + 0.5} />
          <Line x1="15" y1="14" x2="15" y2="14.01" {...sp} strokeWidth={strokeWidth + 0.5} />
          <Path d="M10 22V18h4v4" {...sp} />
        </Svg>
      );
    case 'shield':
      return (
        <Svg {...props}>
          <Path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z" {...sp} />
        </Svg>
      );
    case 'play':
      return (
        <Svg {...props}>
          <Path d="M5 3l14 9-14 9V3z" {...sp} />
        </Svg>
      );
    case 'calendar':
      return (
        <Svg {...props}>
          <Rect x="3" y="4" width="18" height="18" rx="2" {...sp} />
          <Line x1="16" y1="2" x2="16" y2="6" {...sp} />
          <Line x1="8" y1="2" x2="8" y2="6" {...sp} />
          <Line x1="3" y1="10" x2="21" y2="10" {...sp} />
        </Svg>
      );
    case 'clock':
      return (
        <Svg {...props}>
          <Circle cx="12" cy="12" r="10" {...sp} />
          <Polyline points="12,6 12,12 16,14" {...sp} />
        </Svg>
      );
    case 'users':
      return (
        <Svg {...props}>
          <Path d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2" {...sp} />
          <Circle cx="9" cy="7" r="4" {...sp} />
          <Path d="M23 21v-2a4 4 0 0 0-3-3.87" {...sp} />
          <Path d="M16 3.13a4 4 0 0 1 0 7.75" {...sp} />
        </Svg>
      );
    case 'door':
      return (
        <Svg {...props}>
          <Path d="M18 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V4a2 2 0 0 0-2-2z" {...sp} />
          <Line x1="15" y1="13" x2="15" y2="13.01" {...sp} strokeWidth={strokeWidth + 1} />
        </Svg>
      );
    case 'clipboard':
      return (
        <Svg {...props}>
          <Path d="M16 4h2a2 2 0 0 1 2 2v14a2 2 0 0 1-2 2H6a2 2 0 0 1-2-2V6a2 2 0 0 1 2-2h2" {...sp} />
          <Rect x="8" y="2" width="8" height="4" rx="1" {...sp} />
        </Svg>
      );
    case 'settings':
      return (
        <Svg {...props}>
          <Circle cx="12" cy="12" r="3" {...sp} />
          <Path d="M19.4 15a1.65 1.65 0 0 0 .33 1.82l.06.06a2 2 0 1 1-2.83 2.83l-.06-.06a1.65 1.65 0 0 0-1.82-.33 1.65 1.65 0 0 0-1 1.51V21a2 2 0 0 1-4 0v-.09a1.65 1.65 0 0 0-1.08-1.51 1.65 1.65 0 0 0-1.82.33l-.06.06a2 2 0 1 1-2.83-2.83l.06-.06a1.65 1.65 0 0 0 .33-1.82 1.65 1.65 0 0 0-1.51-1H3a2 2 0 0 1 0-4h.09a1.65 1.65 0 0 0 1.51-1.08 1.65 1.65 0 0 0-.33-1.82l-.06-.06a2 2 0 1 1 2.83-2.83l.06.06a1.65 1.65 0 0 0 1.82.33H9a1.65 1.65 0 0 0 1-1.51V3a2 2 0 0 1 4 0v.09a1.65 1.65 0 0 0 1.08 1.51 1.65 1.65 0 0 0 1.82-.33l.06-.06a2 2 0 1 1 2.83 2.83l-.06.06a1.65 1.65 0 0 0-.33 1.82V9c.26.604.852.997 1.51 1H21a2 2 0 0 1 0 4h-.09a1.65 1.65 0 0 0-1.51 1.08z" {...sp} />
        </Svg>
      );
    case 'plus':
      return (
        <Svg {...props}>
          <Line x1="12" y1="5" x2="12" y2="19" {...sp} />
          <Line x1="5" y1="12" x2="19" y2="12" {...sp} />
        </Svg>
      );
    case 'trash':
      return (
        <Svg {...props}>
          <Polyline points="3,6 5,6 21,6" {...sp} />
          <Path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2" {...sp} />
        </Svg>
      );
    case 'edit':
      return (
        <Svg {...props}>
          <Path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7" {...sp} />
          <Path d="M18.5 2.5a2.121 2.121 0 0 1 3 3L12 15l-4 1 1-4 9.5-9.5z" {...sp} />
        </Svg>
      );
    case 'chevron-right':
      return (
        <Svg {...props}>
          <Polyline points="9,6 15,12 9,18" {...sp} />
        </Svg>
      );
    case 'chevron-left':
      return (
        <Svg {...props}>
          <Polyline points="15,18 9,12 15,6" {...sp} />
        </Svg>
      );
    case 'x':
      return (
        <Svg {...props}>
          <Line x1="18" y1="6" x2="6" y2="18" {...sp} />
          <Line x1="6" y1="6" x2="18" y2="18" {...sp} />
        </Svg>
      );
    case 'check':
      return (
        <Svg {...props}>
          <Polyline points="20,6 9,17 4,12" {...sp} />
        </Svg>
      );
    case 'alert-circle':
      return (
        <Svg {...props}>
          <Circle cx="12" cy="12" r="10" {...sp} />
          <Line x1="12" y1="8" x2="12" y2="12" {...sp} />
          <Line x1="12" y1="16" x2="12.01" y2="16" {...sp} />
        </Svg>
      );
    case 'refresh':
      return (
        <Svg {...props}>
          <Polyline points="23,4 23,10 17,10" {...sp} />
          <Path d="M20.49 15a9 9 0 1 1-2.12-9.36L23 10" {...sp} />
        </Svg>
      );
    case 'sliders':
      return (
        <Svg {...props}>
          <Line x1="4" y1="21" x2="4" y2="14" {...sp} />
          <Line x1="4" y1="10" x2="4" y2="3" {...sp} />
          <Line x1="12" y1="21" x2="12" y2="12" {...sp} />
          <Line x1="12" y1="8" x2="12" y2="3" {...sp} />
          <Line x1="20" y1="21" x2="20" y2="16" {...sp} />
          <Line x1="20" y1="12" x2="20" y2="3" {...sp} />
          <Line x1="1" y1="14" x2="7" y2="14" {...sp} />
          <Line x1="9" y1="8" x2="15" y2="8" {...sp} />
          <Line x1="17" y1="16" x2="23" y2="16" {...sp} />
        </Svg>
      );
    case 'grid':
      return (
        <Svg {...props}>
          <Rect x="3" y="3" width="7" height="7" {...sp} />
          <Rect x="14" y="3" width="7" height="7" {...sp} />
          <Rect x="14" y="14" width="7" height="7" {...sp} />
          <Rect x="3" y="14" width="7" height="7" {...sp} />
        </Svg>
      );
    case 'list':
      return (
        <Svg {...props}>
          <Line x1="8" y1="6" x2="21" y2="6" {...sp} />
          <Line x1="8" y1="12" x2="21" y2="12" {...sp} />
          <Line x1="8" y1="18" x2="21" y2="18" {...sp} />
          <Line x1="3" y1="6" x2="3.01" y2="6" {...sp} strokeWidth={strokeWidth + 1} />
          <Line x1="3" y1="12" x2="3.01" y2="12" {...sp} strokeWidth={strokeWidth + 1} />
          <Line x1="3" y1="18" x2="3.01" y2="18" {...sp} strokeWidth={strokeWidth + 1} />
        </Svg>
      );
    case 'volume-on':
      return (
        <Svg {...props}>
          <Path d="M11 5L6 9H2v6h4l5 4V5z" {...sp} />
          <Path d="M19.07 4.93a10 10 0 0 1 0 14.14" {...sp} />
          <Path d="M15.54 8.46a5 5 0 0 1 0 7.07" {...sp} />
        </Svg>
      );
    case 'volume-off':
      return (
        <Svg {...props}>
          <Path d="M11 5L6 9H2v6h4l5 4V5z" {...sp} />
          <Line x1="23" y1="9" x2="17" y2="15" {...sp} />
          <Line x1="17" y1="9" x2="23" y2="15" {...sp} />
        </Svg>
      );
    default:
      return <View style={{ width: size, height: size }} />;
  }
};
