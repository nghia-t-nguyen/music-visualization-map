import { Drawer, Box, Typography, IconButton, Divider, Stack } from '@mui/material';
import ChevronRightIcon from '@mui/icons-material/ChevronRight';
import type { Dot } from '../../data/DotType';
import SpotifyWidget from './SpotifyWidget';
import BPMDisplay from './BPMDisplay';

// Assuming these constants and components are defined elsewhere in your project
const DRAWER_WIDTH = 320;
const BORDER_COLOR = 'rgba(255, 255, 255, 0.12)';

interface MusicDrawerProps {
  selectedDot: Dot | null;
  setSelectedDot: (dot: Dot | null) => void;
}

const MusicDrawer = ({ selectedDot, setSelectedDot }: MusicDrawerProps) => {
  return (
    <Drawer
      anchor="right"
      open={!!selectedDot}
      sx={{
        width: 0,
        flexShrink: 0,
        pointerEvents: 'none',
        '& .MuiDrawer-paper': {
          width: DRAWER_WIDTH,
          backgroundColor: 'rgba(22,22,22,0.8) !important',
          color: '#ffffff',
          backgroundImage: 'none !important',
          boxShadow: 'none',
          pointerEvents: 'auto',
          borderLeft: `1px solid ${BORDER_COLOR}`,
          backdropFilter: "blur(4px)",
        },
      }}
      slotProps={{
        backdrop: {
          sx: {
            backgroundColor: 'rgba(0,0,0,0)',
          },
        },
      }}
    >
      <Box
        sx={{
          width: DRAWER_WIDTH,
          display: 'flex',
          flexDirection: 'column',
          height: '100%',
        }}
      >
        {/* Header */}
        <Box
          sx={{
            display: 'flex',
            alignItems: 'flex-start',
            justifyContent: 'space-between',
            px: 2,
            py: 1.5,
          }}
        >
          <Typography variant="h6" sx={{ pt: 0.5 }}>
            {selectedDot?.locationName}
          </Typography>
          <IconButton onClick={() => setSelectedDot(null)} sx={{ mr: -1.5 }}>
            <ChevronRightIcon sx={{ color: "#fff" }} />
          </IconButton>
        </Box>

        <Divider sx={{ borderColor: BORDER_COLOR }} />

        {/* Content */}
        {selectedDot && (
          <Stack sx={{ px: 2, py: 2 }} spacing={2}>
            <SpotifyWidget spotifyEmbed={selectedDot.spotifyEmbed} />
            <BPMDisplay bpm={selectedDot.bpm} />
          </Stack>
        )}
      </Box>
    </Drawer>
  );
};

export default MusicDrawer;