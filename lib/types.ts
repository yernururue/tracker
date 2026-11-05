export type Profile = {
  id: string;
  display_name: string;
  seen_instructions: boolean;
  created_at: string;
};

export type ActiveTimer = {
  user_id: string;
  started_at: string;
  accumulated_ms: number;
  running_since: string | null;
};

export type Session = {
  id: string;
  user_id: string;
  started_at: string;
  ended_at: string;
  minutes: number;
  report: string;
  created_at: string;
};

export type TimerRpcResult = {
  timer: ActiveTimer | null;
  now: string;
};

export type GoalStatus = "pending" | "done" | "partial" | "missed";

export type WeeklyGoal = {
  id: string;
  user_id: string;
  week_start: string;
  goal_text: string;
  status: GoalStatus;
  created_at: string;
  updated_at: string;
};

export const GOAL_STATUS_LABEL: Record<GoalStatus, string> = {
  pending: "In progress",
  done: "Done",
  partial: "Partial",
  missed: "Missed",
};
