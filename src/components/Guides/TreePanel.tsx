import Box from '@mui/material/Box';

const TreePanel = ({ open, children }: { open: boolean; children: React.ReactNode }) => (
  <Box sx={{ display: 'flex', gap: 3, alignItems: 'flex-start', height: open ? 'auto' : 0 }}>
    <Box sx={{ position: 'relative', display: 'flex', flexDirection: 'column', gap: 0 }}>
      {/* Trunk */}
      <Box sx={{
        position: 'absolute', left: 0, top: 0, bottom: 0, width: '1.5px', bgcolor: '#555',
        opacity: open ? 1 : 0,
        transition: 'opacity 0.2s ease',
      }} />
      {children}
    </Box>
  </Box>
);

export default TreePanel;