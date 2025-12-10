import { Box, Typography } from "@mui/material";

// Reusable feature item for icons
function FeatureItem({ icon, label }) {
  return (
    <Box display="flex" flexDirection="column" alignItems="center">
      {icon}
      <Typography
        variant="subtitle1"
        textAlign="center"
        fontSize={{ xs: "17px", sm: "18px", md: "20px" }}
        fontWeight={500}
      >
        {label}
      </Typography>
    </Box>
  );
}

export default FeatureItem;