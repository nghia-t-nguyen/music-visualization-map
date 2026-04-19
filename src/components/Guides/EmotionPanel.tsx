import { Box, Typography } from '@mui/material';
import { emotionColorMap } from '../../data/EmotionColorMap';
import TreePanel from './TreePanel';

const categories = [
  { label: "High energy\npositive", emotions: [["Hyped", "Energetic", "Amazed"], ["Joyful", "Motivated", "Eager"]] },
  { label: "Low energy\npositive", emotions: [["Cathartic", "Confident", "Peaceful"], ["Hopeful", "Relaxed"]] },
  { label: "Cognitive", emotions: [["Focused", "Interested", "Confused"]] },
  { label: "Low energy\nnegative", emotions: [["Hurt", "Unhappy"]] },
  { label: "High energy\nnegative", emotions: [["Angry", "Stressed"], ["Anxious", "Frustrated"]] },
];

// ─── Shared sub-components ───────────────────────────────────────────────────

const EmotionDot = ({ color }: { color: string }) => (
  <Box
    component="span"
    sx={{ width: 8, height: 8, borderRadius: '50%', bgcolor: color, flexShrink: 0, display: 'inline-block' }}
  />
);

const EmotionChip = ({ emotion }: { emotion: string }) => {
  const color = emotionColorMap[emotion as keyof typeof emotionColorMap];
  return (
    <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.75, px: 1.25, py: 0.4, border: '0.5px solid', borderColor: '#333', borderRadius: '10px', bgcolor: '#222' }}>
      <EmotionDot color={color} />
      <Typography variant="caption" sx={{ lineHeight: 1, color: '#aaa', userSelect: 'none' }}>{emotion}</Typography>
    </Box>
  );
};

const EmotionPanel = ({ open }: { open: boolean }) => (
  <TreePanel open={open}>
    {categories.map((cat, i) => {
      const delay = open ? `${i * 60}ms` : '0ms';
      return (
        <Box
          key={cat.label}
          sx={{
            display: 'flex',
            alignItems: 'flex-start',
            mb: i === categories.length - 1 ? 0 : 6,
            opacity: open ? 1 : 0,
            transform: open ? 'translateY(0)' : 'translateY(-8px)',
            transition: open
              ? `opacity 0.25s ease ${delay}, transform 0.25s ease ${delay}`
              : 'none',
          }}
        >
          <Box sx={{ width: 32, height: '1.5px', bgcolor: '#555', mt: '9px', flexShrink: 0 }} />
          <Box sx={{ display: 'flex', alignItems: 'flex-start', gap: 2 }}>
            <Typography variant="caption" sx={{ color: '#fff', whiteSpace: 'pre-line', lineHeight: 1.4, minWidth: 64, textAlign: 'left', mt: 0.25, ml: 0.5, userSelect: 'none' }}>
              {cat.label}
            </Typography>
            <Box sx={{ display: 'flex', flexDirection: 'column', gap: 0.75 }}>
              {cat.emotions.map((row, ri) => (
                <Box key={ri} sx={{ display: 'flex', flexWrap: 'wrap', gap: 0.75 }}>
                  {row.map(emotion => <EmotionChip key={emotion} emotion={emotion} />)}
                </Box>
              ))}
            </Box>
          </Box>
        </Box>
      );
    })}
  </TreePanel>
);

export default EmotionPanel;