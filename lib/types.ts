export type Profile = {
  id: string;
  display_name: string;
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
