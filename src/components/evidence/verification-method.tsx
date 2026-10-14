import { Typography } from "@mui/material";

function linkTarget(text: string) {
  let target = text.replace(/[.,;:!?]+$/, "");
  for (const [open, close] of [
    ["(", ")"],
    ["[", "]"],
    ["{", "}"],
  ]) {
    if (!open || !close) continue;
    while (
      target.endsWith(close) &&
      target.split(close).length > target.split(open).length
    ) {
      target = target.slice(0, -1);
    }
  }
  try {
    const url = new URL(target);
    if (
      ["http:", "https:"].includes(url.protocol) &&
      url.hostname &&
      !url.username &&
      !url.password
    ) {
      return target;
    }
  } catch {
    return null;
  }
  return null;
}

export function VerificationMethod({ text }: { text: string }) {
  return (
    <Typography
      variant="body2"
      sx={{ whiteSpace: "pre-wrap", overflowWrap: "anywhere" }}
    >
      {text.split(/(https?:\/\/[^\s<>"']+)/gi).map((part, index) => {
        const target = /^https?:\/\//i.test(part) ? linkTarget(part) : null;
        return target ? (
          <span key={index}>
            <Typography
              component="a"
              href={target}
              target="_blank"
              rel="noopener noreferrer"
              variant="inherit"
              color="primary"
            >
              {target}
            </Typography>
            {part.slice(target.length)}
          </span>
        ) : (
          part
        );
      })}
    </Typography>
  );
}
