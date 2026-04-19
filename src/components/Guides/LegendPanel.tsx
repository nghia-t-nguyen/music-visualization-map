import { Box, Stack } from '@mui/material';
import PaletteOutlinedIcon from '@mui/icons-material/PaletteOutlined';
import LandscapeOutlinedIcon from '@mui/icons-material/LandscapeOutlined';
import { useState } from 'react';
import type { Tab } from './types';
import ElevationPanel from './ElevationPanel';
import EmotionPanel from './EmotionPanel';

interface LegendPanelProps {
  elevationMin: number;
  elevationMax: number;
  elevationSteps: number;
}

const LegendPanel = ({ elevationMin, elevationMax, elevationSteps }: LegendPanelProps) => {
  const [activeTab, setActiveTab] = useState<Tab>(null);

  const handleClick = (tabName: Tab) => {
    if (activeTab === tabName) {
      setActiveTab(null);
    } else {
      setActiveTab(tabName);
    }
  }

  const tabSx = (tab: Tab) => ({
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    width: 44,
    height: 44,
    borderRadius: 1,
    border: '1px solid',
    borderColor: activeTab === tab ? '#888' : '#444',
    bgcolor: activeTab === tab ? '#2a2a2a' : 'transparent',
    cursor: 'pointer',
    transition: 'border-color 0.15s ease, background-color 0.15s ease',
    '&:hover': { borderColor: '#666' },
  });

  return (
    <Stack spacing={1} sx={{ alignItems: 'flex-start' }}>
      {/* Tab buttons */}
      <Box sx={{ display: 'flex', gap: 1 }}>
        <Box sx={tabSx('emotions')} onClick={() => handleClick('emotions')}>
          <PaletteOutlinedIcon fontSize="large" sx={{ color: activeTab === 'emotions' ? '#fff' : '#aaa' }} />
        </Box>
        <Box sx={tabSx('elevation')} onClick={() => handleClick('elevation')}>
          <LandscapeOutlinedIcon fontSize="large" sx={{ color: activeTab === 'elevation' ? '#fff' : '#aaa' }} />
        </Box>
      </Box>

      {/* Panel content */}
      <EmotionPanel open={activeTab === 'emotions'} />
      <ElevationPanel open={activeTab === 'elevation'} min={elevationMin} max={elevationMax} steps={elevationSteps} />
    </Stack>
  );
};

export default LegendPanel;
