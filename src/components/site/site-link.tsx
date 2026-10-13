"use client";

import Link from "next/link";
import Button, { type ButtonProps } from "@mui/material/Button";

export function SiteLink(props: ButtonProps & { href: string }) {
  return <Button component={Link} {...props} />;
}
