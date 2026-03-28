export interface UserProfile {
  user_id: string
  current_weight_kg: number | null
  current_body_fat_pct: number | null
  height_cm: number | null
  age: number | null
  activity_level: 'sedentary' | 'light' | 'moderate' | 'active' | null
  updated_at: string
}

export interface Goal {
  id: string
  user_id: string
  title: string
  type: 'weight' | 'body_fat' | 'strength' | 'endurance' | 'custom'
  target_value: number | null
  target_unit: string | null
  target_date: string | null
  progress_score: number
  is_active: boolean
  created_at: string
}

export interface LogEntry {
  id: string
  user_id: string
  raw_text: string
  parsed_food: FoodItem[] | null
  parsed_workout: WorkoutItem[] | null
  parsed_symptoms: SymptomItem[] | null
  logged_at: string
  created_at: string
}

export interface FoodItem {
  item: string
  time: string
  notes: string
}

export interface WorkoutItem {
  activity: string
  duration: string
  intensity: string
  notes: string
}

export interface SymptomItem {
  symptom: string
  severity: 'mild' | 'moderate' | 'severe'
  notes: string
}

export interface BodyCheckin {
  id: string
  user_id: string
  weight_kg: number
  body_fat_pct: number | null
  notes: string | null
  checked_at: string
}

export interface ConsultSession {
  id: string
  user_id: string
  summary: string
  nutritionist_advice: string
  trainer_advice: string
  consultant_advice: string
  logs_covered_from: string
  logs_covered_to: string
  consulted_at: string
}

export interface Reminder {
  id: string
  user_id: string
  type: 'body_checkin' | 'workout' | 'meal' | 'custom'
  message: string
  due_date: string
  is_dismissed: boolean
}
