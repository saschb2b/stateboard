"use client";

import { useState } from "react";
import { useLocale, useTranslations } from "next-intl";
import {
  IconButton,
  ListItemText,
  Menu,
  MenuItem,
  Tooltip,
} from "@mui/material";
import TranslateIcon from "@mui/icons-material/Translate";
import CheckIcon from "@mui/icons-material/Check";
import { useLocalePreference } from "./provider";
import { locales } from "./config";

export function LanguageSwitcher() {
  const t = useTranslations("Common.language");
  const locale = useLocale();
  const setLocale = useLocalePreference();
  const [anchor, setAnchor] = useState<HTMLElement | null>(null);
  return (
    <>
      <Tooltip title={t("choose")}>
        <IconButton
          size="small"
          aria-label={t("choose")}
          aria-haspopup="menu"
          aria-expanded={!!anchor}
          onClick={(event) => setAnchor(event.currentTarget)}
        >
          <TranslateIcon fontSize="small" />
        </IconButton>
      </Tooltip>
      <Menu
        anchorEl={anchor}
        open={!!anchor}
        onClose={() => setAnchor(null)}
        slotProps={{ list: { "aria-label": t("choose") } }}
      >
        {locales.map((option) => (
          <MenuItem
            key={option}
            selected={locale === option}
            lang={option}
            role="menuitemradio"
            aria-checked={locale === option}
            onClick={() => {
              setLocale(option);
              setAnchor(null);
            }}
          >
            <ListItemText primary={option === "de" ? "Deutsch" : "English"} />
            {locale === option && <CheckIcon fontSize="small" sx={{ ml: 2 }} />}
          </MenuItem>
        ))}
      </Menu>
    </>
  );
}
