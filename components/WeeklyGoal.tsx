"use client";

import { useMemo } from "react";
import { notifyStudyUpdate } from "@/lib/study-updates";
import { createClient } from "@/lib/supabase/client";
import type { WeeklyGoal as Goal } from "@/lib/types";
import { WeeklyGoalEditor, type GoalPatch } from "./WeeklyGoalEditor";

export function WeeklyGoal({ goals, userId, weekStart }: { goals: Goal[]; userId: string; weekStart: string }) {
  const supabase = useMemo(() => createClient(), []);

  async function createGoal(text: string) {
    const { data, error } = await supabase
      .from("weekly_goals")
      .insert({ user_id: userId, week_start: weekStart, goal_text: text })
      .select("*")
      .single<Goal>();
    if (error) throw error;
    notifyStudyUpdate(supabase);
    return data;
  }

  async function updateGoal(id: string, patch: GoalPatch) {
    const { data, error } = await supabase
      .from("weekly_goals")
      .update(patch)
      .eq("id", id)
      .eq("user_id", userId)
      .eq("week_start", weekStart)
      .select("*")
      .single<Goal>();
    if (error) throw error;
    notifyStudyUpdate(supabase);
    return data;
  }

  async function deleteGoal(id: string) {
    const { error } = await supabase
      .from("weekly_goals")
      .delete()
      .eq("id", id)
      .eq("user_id", userId)
      .eq("week_start", weekStart)
      .select("id")
      .single();
    if (error) throw error;
    notifyStudyUpdate(supabase);
  }

  return <WeeklyGoalEditor goals={goals} onCreate={createGoal} onUpdate={updateGoal} onDelete={deleteGoal} />;
}
