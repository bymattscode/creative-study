import { useState, useEffect, useCallback, useMemo } from "react";
import { useAuth } from "@/contexts/auth";
import {
  GradeClassBlock,
  GradeConflict,
  GradeCourse,
  GradeCourseInput,
  GradeViewConfig,
} from "./types";
import { detectGradeConflicts, expandCoursesToBlocks } from "./conflict-utils";
import {
  createGradeCourseRecord,
  deleteGradeCourseRecord,
  loadGradeCourses,
  loadGradeViewConfig,
  readLocalGradeCourses,
  saveGradeViewConfig,
  updateGradeCourseRecord,
} from "./storage";

export function useGradeHorarios() {
  const { user } = useAuth();
  const userId = user?.id;

  const [courses, setCourses] = useState<GradeCourse[]>(() => readLocalGradeCourses(userId));
  const [isLoading, setIsLoading] = useState<boolean>(true);
  const [viewConfig, setViewConfig] = useState<GradeViewConfig>(() => loadGradeViewConfig(userId));

  useEffect(() => {
    let mounted = true;
    setIsLoading(true);
    setViewConfig(loadGradeViewConfig(userId));

    loadGradeCourses(userId)
      .then((loaded) => {
        if (mounted) {
          setCourses(loaded);
          setIsLoading(false);
        }
      })
      .catch(() => {
        if (mounted) {
          setIsLoading(false);
        }
      });

    return () => {
      mounted = false;
    };
  }, [userId]);

  const setShowWeekend = useCallback(
    (showWeekend: boolean) => {
      const nextConfig: GradeViewConfig = { ...viewConfig, showWeekend };
      setViewConfig(nextConfig);
      saveGradeViewConfig(nextConfig, userId);
    },
    [viewConfig, userId],
  );

  const checkConflicts = useCallback(
    (candidate: GradeCourseInput, ignoreCourseId?: string): GradeConflict[] => {
      return detectGradeConflicts(candidate, courses, ignoreCourseId);
    },
    [courses],
  );

  const createCourse = useCallback(
    async (input: GradeCourseInput): Promise<GradeCourse> => {
      const { created, courses: nextCourses } = await createGradeCourseRecord(
        input,
        courses,
        userId,
      );
      setCourses(nextCourses);
      return created;
    },
    [courses, userId],
  );

  const updateCourse = useCallback(
    async (courseId: string, input: GradeCourseInput): Promise<GradeCourse> => {
      const { updated, courses: nextCourses } = await updateGradeCourseRecord(
        courseId,
        input,
        courses,
        userId,
      );
      setCourses(nextCourses);
      return updated;
    },
    [courses, userId],
  );

  const deleteCourse = useCallback(
    async (courseId: string): Promise<void> => {
      const nextCourses = await deleteGradeCourseRecord(courseId, courses, userId);
      setCourses(nextCourses);
    },
    [courses, userId],
  );

  const blocks: GradeClassBlock[] = useMemo(() => expandCoursesToBlocks(courses), [courses]);

  const hasWeekendClasses = useMemo(
    () => blocks.some((b) => b.dayOfWeek === 5 || b.dayOfWeek === 6),
    [blocks],
  );

  return {
    courses,
    blocks,
    isLoading,
    viewConfig,
    hasWeekendClasses,
    setShowWeekend,
    checkConflicts,
    createCourse,
    updateCourse,
    deleteCourse,
  };
}

