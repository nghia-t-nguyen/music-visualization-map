import { Box, Typography } from '@mui/material';
import TreePanel from './TreePanel';
import React from 'react';

interface ElevationPanelProps {
  open: boolean;
  min: number;
  max: number;
  steps: number;
}

const ElevationPanel = ({ open, min, max, steps }: ElevationPanelProps) => {
  const levels = Array.from({ length: steps }, (_, i) => {
    const t = steps === 1 ? 0 : i / (steps - 1);
    const elevation = Math.round(min + t * (max - min));
    return { elevation, t };
  }).reverse();

  return (
    <TreePanel open={open}>
      {levels.map((level, i) => {
        // Shared animation constants
        const delay = open ? `${i * 20}ms` : '0ms';
        const hatchDelay = open ? `${i * 20 + 10}ms` : '0ms'; // Slightly offset for a "fluid" feel
        const isLast = i === levels.length - 1;

        const transitionStyle = open
          ? `opacity 0.25s ease ${delay}, transform 0.25s ease ${delay}`
          : 'none';

        return (
          <React.Fragment key={level.elevation}>
            {/* Primary Label Row */}
            <Box
              sx={{
                display: 'flex',
                alignItems: 'center',
                opacity: open ? 1 : 0,
                transform: open ? 'translateY(0)' : 'translateY(-8px)',
                transition: transitionStyle,
              }}
            >
              <Box sx={{ width: 32, height: '1.5px', bgcolor: '#555', flexShrink: 0 }} />
              <Typography
                variant="caption"
                sx={{
                  color: '#aaa',
                  ml: 1,
                  lineHeight: 1,
                  fontVariantNumeric: 'tabular-nums',
                  userSelect: 'none',
                }}
              >
                {level.elevation.toLocaleString()} BPM
              </Typography>
            </Box>

            {/* Hatch Mark */}
            {!isLast && (
              <Box
                sx={{
                  width: 24,
                  height: '1px',
                  bgcolor: '#aaa',
                  my: 0.75, // Maintains the spacing
                  opacity: open ? 0.5 : 0,
                  transform: open ? 'translateY(0)' : 'translateY(-8px)',
                  // We use hatchDelay to make the "middle" marks follow their parent labels
                  transition: open
                    ? `opacity 0.25s ease ${hatchDelay}, transform 0.25s ease ${hatchDelay}`
                    : 'none',
                }}
              />
            )}
          </React.Fragment>
        );
      })}
    </TreePanel>
  );
};

export default ElevationPanel;