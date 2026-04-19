import { Box, Typography } from '@mui/material';

const BPMDisplay = ({ bpm = 60 }) => {
  const duration = 60 / bpm;

  return (
    <Box sx={{ width: '100%', overflow: 'hidden' }}>

      <svg viewBox="0 0 200 50" style={{ width: '100%', height: 'auto', display: 'block' }}>
        <defs>
          <pattern id="grid" width="10" height="10" patternUnits="userSpaceOnUse">
            <path d="M 10 0 L 0 0 0 10" fill="none" stroke="#333" strokeWidth="0.5" />
          </pattern>
        </defs>
        <rect width="200" height="50" fill="url(#grid)" />
        <path
          d="M0 25h40l5-5 5 5h5l5-15 5 30 5-15h5l10-10 10 10h105"
          fill="none"
          stroke="#bbb"
          strokeWidth="1"
          style={{
            strokeDasharray: 1000,
            animation: `draw ${duration}s linear infinite`,
          }}
        />
      </svg>
      <style>{`
        @keyframes draw {
          from { stroke-dashoffset: 1000; }
          to { stroke-dashoffset: 0; }
        }
      `}</style>
      <Typography sx={{ textAlign: 'right' }}>
        BPM {bpm}
      </Typography>
    </Box>
  );
};

export default BPMDisplay;