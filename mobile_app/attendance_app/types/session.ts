import { Timestamp } from "firebase/firestore";

export type Session = {
  id: string;
  created_at: Timestamp;
  class_name: string;
  module_name: string;
  total_detected_raw: number;
  total_unique_individuals: number;
  unknown_count: number;
};


