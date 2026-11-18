import { createFileRoute } from "@tanstack/react-router";
import { Holdfast } from "@/components/holdfast";

export const Route = createFileRoute("/")({ component: Holdfast });
