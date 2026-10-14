"use client";

import { createContext } from "react";
import type { createWorkspaceDrafts } from "@/lib/workspace-refresh";

export const WorkspaceDrafts = createContext<ReturnType<
  typeof createWorkspaceDrafts
> | null>(null);
