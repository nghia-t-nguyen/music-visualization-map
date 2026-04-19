import { Box, Typography } from '@mui/material';
import TreePanel from './TreePanel';

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
        const delay = open ? `${i * 20}ms` : '0ms';;
        const isLast = i === levels.length - 1;
        return (
          <Box
            key={level.elevation}
            sx={{
              display: 'flex',
              alignItems: 'center',
              mb: isLast ? 0 : 1.5,
              opacity: open ? 1 : 0,
              transform: open ? 'translateY(0)' : 'translateY(-8px)',
              transition: open
                ? `opacity 0.25s ease ${delay}, transform 0.25s ease ${delay}`
                : 'none',
            }}
          >
            <Box sx={{ width: 32, height: '1.5px', bgcolor: '#555', flexShrink: 0 }} />
            <Typography variant="caption" sx={{ color: '#aaa', ml: 1, lineHeight: 1, fontVariantNumeric: 'tabular-nums', userSelect: 'none' }}>
              {level.elevation.toLocaleString()} BPM
            </Typography>
          </Box>
        );
      })}
    </TreePanel>
  );
};

export default ElevationPanel;