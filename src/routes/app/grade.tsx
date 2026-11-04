import { createFileRoute } from "@tanstack/react-router";
import { GradeHorariosPage } from "@/features/grade-horarios/GradeHorariosPage";

export const Route = createFileRoute("/app/grade")({
  component: GradeHorariosPage,
});

