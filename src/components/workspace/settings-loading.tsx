import { Box, Paper, Skeleton, Stack } from "@mui/material";
import { SettingsFrame, type SettingsSection } from "./settings-frame";

export function SettingsLoading({
  section,
  title,
}: {
  section: SettingsSection;
  title: string;
}) {
  return (
    <SettingsFrame section={section} title={title}>
      <Stack
        spacing={3}
        aria-label={`Loading ${title.toLowerCase()}`}
        aria-busy="true"
      >
        {section === "api-keys" && (
          <Paper sx={{ p: 2.5 }}>
            <Skeleton width={90} />
            <Skeleton variant="rounded" height={40} sx={{ mt: 2 }} />
          </Paper>
        )}
        <Paper sx={{ overflow: "hidden" }}>
          <Stack
            divider={<Box sx={{ borderTop: 1, borderColor: "divider" }} />}
          >
            {Array.from({ length: 4 }, (_, index) => (
              <Box key={index} sx={{ p: 2 }}>
                <Skeleton width="35%" />
                <Skeleton width="65%" />
              </Box>
            ))}
          </Stack>
        </Paper>
      </Stack>
    </SettingsFrame>
  );
}
