import React, { useState, useEffect } from 'react';
import { Box, Skeleton } from '@mui/material';

interface SpotifyWidgetProps {
  spotifyEmbed: string;
  height?: number | string;
  borderColor?: string;
}

const SpotifyWidget: React.FC<SpotifyWidgetProps> = ({
  spotifyEmbed,
  height = 380,
  borderColor = 'rgba(255, 255, 255, 0.3)'
}) => {
  const [isLoading, setIsLoading] = useState<boolean>(true);

  // Fallback timeout in case onLoad never fires
  useEffect(() => {
    setIsLoading(true);
    const timeout = setTimeout(() => setIsLoading(false), 3000);
    return () => clearTimeout(timeout);
  }, [spotifyEmbed]);

  if (!spotifyEmbed) {
    return null;
  }

  return (
    <Box sx={{ position: 'relative', width: '100%', height: height }}>

      {/* 1. The Skeleton Loader */}
      {isLoading && (
        <Skeleton
          variant="rounded"
          width="100%"
          height={height}
          animation="wave"
          sx={{
            bgcolor: '#121212', // Match Spotify's base dark color
            borderRadius: '16px',
            position: 'absolute',
            top: 0,
            left: 0,
            zIndex: 2,
            '&::after': {
              background: 'linear-gradient(90deg, transparent, rgba(255,255,255,0.06), transparent)',
            },
          }}
        />
      )}

      {/* 2. The Spotify Iframe */}
      <iframe
        key={spotifyEmbed} // forces remount on URL change
        src={spotifyEmbed}
        width="100%"
        height={height}
        allow="autoplay; clipboard-write; encrypted-media; fullscreen; picture-in-picture"
        allowTransparency={true}
        onLoad={() => setIsLoading(false)}
        style={{
          borderRadius: '12px',
          border: `0.5px solid ${borderColor}`,
          backgroundColor: '#000',
          display: isLoading ? 'none' : 'block',
        }}
      />
    </Box>
  );
};

export default SpotifyWidget;