import './App.css'
import Map from './components/Map/Map'
import { useState } from 'react'
import {
  Box,
  Typography,
} from '@mui/material'
import type { Dot } from './data/DotType';
import LegendPanel from './components/Guides/LegendPanel';
import MusicDrawer from './components/Drawer/MusicDrawer';

const BORDER_COLOR = "#555";

function App() {
  const [selectedDot, setSelectedDot] = useState<Dot | null>(null);

  return (
    <>
      <Map onDotClick={(dot: Dot) => setSelectedDot(dot)} />

      <Box
        sx={{
          position: 'fixed',
          top: 80,
          left: 16,
        }}
      >
        <LegendPanel elevationMin={100} elevationMax={150} elevationSteps={11} />
      </Box>

      <Typography
        variant='h6'
        sx={{
          position: 'fixed',
          top: 16,
          left: 16,
          color: "#fff",
          bgcolor: "rgba(22,22,22,0.8)",
          backdropFilter: "blur(4px)",
          borderRadius: 4,
          border: `1px solid ${BORDER_COLOR}`,
          p: 1,
        }}
      >
        GT Music Listening Visualization Map
      </Typography>
      <MusicDrawer selectedDot={selectedDot} setSelectedDot={setSelectedDot} />
    </>
  )
}

export default App