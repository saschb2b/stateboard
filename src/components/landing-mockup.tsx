import Box from "@mui/material/Box";
import Stack from "@mui/material/Stack";
import Typography from "@mui/material/Typography";
import { StateChip } from "./state-chip";
import { STATE_META } from "@/lib/state-meta";

/**
 * Static "annotated dashboard" mockup used on the landing page.
 *
 * Mirrors the pitch deck's headline visual: a fake product screenshot
 * with our three state chips painted on top. No real data, no real
 * regions — just a visual that lets a first-time visitor get the
 * concept in five seconds.
 */
export function LandingMockup() {
  return (
    <Box
      sx={{
        position: "relative",
        width: "100%",
        maxWidth: 980,
        mx: "auto",
        borderRadius: 2,
        overflow: "hidden",
        border: "1px solid var(--mui-palette-divider)",
        boxShadow: "0 30px 80px rgba(0,0,0,0.35)",
      }}
    >
      {/* Browser chrome */}
      <Stack
        direction="row"
        alignItems="center"
        spacing={1.25}
        sx={{
          px: 2,
          py: 1.25,
          bgcolor: "var(--mui-palette-background-paper)",
          borderBottom: "1px solid var(--mui-palette-divider)",
        }}
      >
        <Box sx={{ display: "flex", gap: 0.75 }}>
          {["#FF5F57", "#FEBC2E", "#28C840"].map((c) => (
            <Box
              key={c}
              sx={{ width: 10, height: 10, borderRadius: "50%", bgcolor: c }}
            />
          ))}
        </Box>
        <Box
          sx={{
            flex: 1,
            mx: 2,
            px: 1.5,
            py: 0.5,
            borderRadius: 1,
            bgcolor: "var(--mui-palette-background-default)",
            color: "var(--mui-palette-text-secondary)",
            fontSize: 12,
            fontFamily: "monospace",
          }}
        >
          stateboard.app / acme-dashboard / overview
        </Box>
        <Box
          sx={{
            px: 1.25,
            py: 0.25,
            borderRadius: 1,
            bgcolor: STATE_META.shipped.color,
            color: STATE_META.shipped.contrast,
            fontSize: 10,
            fontWeight: 700,
            letterSpacing: "0.08em",
          }}
        >
          LIVE
        </Box>
      </Stack>

      {/* Mock product surface */}
      <Box
        sx={{
          display: "grid",
          gridTemplateColumns: { xs: "1fr", sm: "180px 1fr" },
          gap: 0,
          minHeight: { xs: 320, sm: 420 },
          bgcolor: "#0F1418",
        }}
      >
        {/* Sidebar */}
        <Stack
          spacing={1.25}
          sx={{
            p: 2,
            display: { xs: "none", sm: "flex" },
            borderRight: "1px solid #1B252B",
          }}
        >
          <Box
            sx={{
              height: 24,
              width: 80,
              bgcolor: "#1F2A30",
              borderRadius: 0.5,
            }}
          />
          {[60, 90, 70, 80, 50].map((w, i) => (
            <Box
              key={i}
              sx={{
                height: 10,
                width: `${w}%`,
                bgcolor: i === 0 ? "#2C3A41" : "#1B252B",
                borderRadius: 0.5,
              }}
            />
          ))}
        </Stack>

        {/* Content with annotated cards */}
        <Box
          sx={{
            position: "relative",
            p: { xs: 2, sm: 3 },
            display: "grid",
            gap: { xs: 1.5, sm: 2 },
            gridTemplateColumns: "repeat(3, 1fr)",
            gridTemplateRows: "auto 1fr",
          }}
        >
          {/* Card 1 — shipped */}
          <MockCard
            label="Revenue"
            value="$284k"
            chipState="shipped"
            chipPosition="topRight"
          />
          {/* Card 2 — mock */}
          <MockCard
            label="Active users"
            value="1,420"
            chipState="mock"
            chipLabel="MOCK DATA"
            chipPosition="topRight"
          />
          {/* Card 3 — missing */}
          <MockCard
            label="Churn rate"
            value="—"
            chipState="missing"
            chipPosition="topRight"
            faded
          />

          {/* Trend row spanning 3 — partial */}
          <Box sx={{ gridColumn: "1 / -1", position: "relative" }}>
            <MockCard
              label="Trend"
              chipState="mock"
              chipLabel="PARTIAL · NO LIVE DATA"
              chipPosition="topRight"
              tall
              chart
            />
          </Box>
        </Box>
      </Box>
    </Box>
  );
}

interface MockCardProps {
  label: string;
  value?: string;
  chipState: "shipped" | "mock" | "missing";
  chipLabel?: string;
  chipPosition: "topRight";
  faded?: boolean;
  tall?: boolean;
  chart?: boolean;
}

function MockCard({
  label,
  value,
  chipState,
  chipLabel,
  faded,
  tall,
  chart,
}: MockCardProps) {
  const meta = STATE_META[chipState];
  return (
    <Box
      sx={{
        position: "relative",
        p: 2,
        bgcolor: "#162028",
        border: `2px solid ${meta.color}`,
        borderRadius: 1,
        minHeight: tall ? 110 : 96,
        opacity: faded ? 0.7 : 1,
      }}
    >
      <Typography
        variant="caption"
        sx={{
          color: "#8A9AA1",
          fontWeight: 600,
          textTransform: "none",
          fontSize: 11,
        }}
      >
        {label}
      </Typography>
      {value ? (
        <Typography
          variant="h5"
          sx={{ color: "#ECECEC", fontWeight: 700, mt: 0.5 }}
        >
          {value}
        </Typography>
      ) : null}
      {chart ? (
        <Stack
          direction="row"
          spacing={0.75}
          alignItems="flex-end"
          sx={{ mt: 1.5 }}
        >
          {[34, 50, 28, 64, 46, 70, 42].map((h, i) => (
            <Box
              key={i}
              sx={{
                width: 18,
                height: h,
                bgcolor: i === 5 ? meta.color : "#243038",
                borderRadius: 0.5,
                opacity: 0.85,
              }}
            />
          ))}
        </Stack>
      ) : null}
      <Box
        sx={{
          position: "absolute",
          top: -2,
          right: -2,
          transform: "translateY(-100%)",
        }}
      >
        {chipLabel ? (
          <Box
            sx={{
              display: "inline-flex",
              alignItems: "center",
              px: 1,
              py: 0.5,
              fontSize: 10,
              fontWeight: 700,
              letterSpacing: "0.05em",
              textTransform: "uppercase",
              bgcolor: meta.color,
              color: meta.contrast,
              borderRadius: 1,
              whiteSpace: "nowrap",
              lineHeight: 1.2,
            }}
          >
            {chipLabel}
          </Box>
        ) : (
          <StateChip state={chipState} size="sm" />
        )}
      </Box>
    </Box>
  );
}
