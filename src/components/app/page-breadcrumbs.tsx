"use client";

import Link from "next/link";
import { Box, Breadcrumbs, Link as MuiLink, Typography } from "@mui/material";
import ArrowBackIcon from "@mui/icons-material/ArrowBack";
import { useTranslations } from "next-intl";

export interface PageBreadcrumb {
  label: string;
  href?: string;
}

/** Parent destinations remain usable when the current page was opened directly. */
export function PageBreadcrumbs({
  items,
}: {
  items: readonly PageBreadcrumb[];
}) {
  const t = useTranslations("Common");
  const parent = items.slice(0, -1).findLast((item) => item.href);
  return (
    <Box
      sx={{
        px: { xs: 2, sm: 3 },
        minHeight: 40,
        display: "flex",
        alignItems: "center",
        minWidth: 0,
      }}
    >
      <Breadcrumbs
        aria-label={t("breadcrumbs")}
        sx={{
          display: { xs: "none", sm: "block" },
          minWidth: 0,
          "& ol": { flexWrap: "nowrap" },
          "& li:not(.MuiBreadcrumbs-separator)": { minWidth: 0 },
        }}
      >
        {items.map((item, index) =>
          item.href && index < items.length - 1 ? (
            <MuiLink
              key={item.href}
              component={Link}
              href={item.href}
              color="inherit"
              underline="hover"
              title={item.label}
              sx={{
                display: "block",
                overflow: "hidden",
                textOverflow: "ellipsis",
                whiteSpace: "nowrap",
                maxWidth: { sm: 200, lg: 320 },
                fontSize: 13,
                py: 0.75,
              }}
            >
              {item.label}
            </MuiLink>
          ) : (
            <Typography
              key={`${index}-${item.label}`}
              aria-current="page"
              title={item.label}
              sx={{
                fontSize: 13,
                color: "text.primary",
                overflow: "hidden",
                textOverflow: "ellipsis",
                whiteSpace: "nowrap",
                maxWidth: { sm: 260, lg: 440 },
              }}
            >
              {item.label}
            </Typography>
          ),
        )}
      </Breadcrumbs>
      {parent?.href && (
        <Box
          component="nav"
          aria-label={t("breadcrumbs")}
          sx={{ display: { xs: "block", sm: "none" }, minWidth: 0 }}
        >
          <MuiLink
            component={Link}
            href={parent.href}
            color="inherit"
            underline="hover"
            aria-label={t("backTo", { name: parent.label })}
            sx={{
              display: "flex",
              gap: 1,
              alignItems: "center",
              minHeight: 40,
              fontSize: 13,
              minWidth: 0,
            }}
          >
            <ArrowBackIcon sx={{ fontSize: 16, flexShrink: 0 }} />
            <Box
              component="span"
              sx={{
                overflow: "hidden",
                textOverflow: "ellipsis",
                whiteSpace: "nowrap",
              }}
            >
              {parent.label}
            </Box>
          </MuiLink>
        </Box>
      )}
    </Box>
  );
}
