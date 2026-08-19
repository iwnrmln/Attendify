import AsyncStorage from "@react-native-async-storage/async-storage";

export type Student = {
  student_id: string;
  name: string;
  email?: string;
  department?: string;
  faceRegistered?: boolean;
  imageUri?: string;
};

export type Class = {
  id: number;
  name: string;
  students: Student[];
  totalStudents: number;
  lastSession: string;
  schedule?: {
    day: string;
    time: string;
  }[];
};

export type AttendanceSession = {
  id: number;
  classId: number;
  className: string;
  date: string;
  time: string;
  totalStudents: number;
  presentCount: number;
  absentCount: number;
  image?: string;
  images?: string[];
  unknownStudents: number;
  results: {
    name: string;
    student_id: string;
    status: "Present" | "Absent" | "Unknown";
  }[];
};

let classes: Class[] = [];
export const getClasses = async (): Promise<Class[]> => {
  const data = await AsyncStorage.getItem("classes");
  return data ? JSON.parse(data) : [];
};

export const addClass = async (newClass: Class) => {
  const existing = await AsyncStorage.getItem("classes");
  const classes = existing ? JSON.parse(existing) : [];
  classes.push(newClass);
  await AsyncStorage.setItem("classes", JSON.stringify(classes));
};

export const getClassById = (id: number) => {
  return classes.find(c => c.id === id);
};

let sessions: AttendanceSession[] = [];
export const addSession = async (newSession: AttendanceSession) => {
  const existing = await AsyncStorage.getItem("sessions");
  const sessions = existing ? JSON.parse(existing) : [];

  sessions.push(newSession);

  await AsyncStorage.setItem("sessions", JSON.stringify(sessions));
};

export const getSessions = async (): Promise<AttendanceSession[]> => {
  const data = await AsyncStorage.getItem("sessions");
  return data ? JSON.parse(data) : [];
};

export const getSessionById = async (id: number) => {
  const data = await AsyncStorage.getItem("sessions");
  const sessions = data ? JSON.parse(data) : [];

  return sessions.find((s: any) => s.id === id);
};

//Delete Class
export const deleteClass = async (classId: number) => {
  const existing = await AsyncStorage.getItem("classes");
  const classes = existing ? JSON.parse(existing) : [];

  const updatedClasses = classes.filter(
    (c: any) => c.id !== classId
  );
  await AsyncStorage.setItem("classes", JSON.stringify(updatedClasses));
};

//Delete Sessions
export const deleteSession = async (sessionId: number) => {
  const existing = await AsyncStorage.getItem("sessions");
  const sessions = existing ? JSON.parse(existing) : [];

  const updatedSessions = sessions.filter(
    (s: any) => s.id !== sessionId
  );
  await AsyncStorage.setItem("sessions", JSON.stringify(updatedSessions));
};


export const updateClassSchedule = async (classId: number, newSchedule: any[]) => {
  const existing = await AsyncStorage.getItem("classes");
  const classes = existing ? JSON.parse(existing) : [];

  const updated = classes.map((c: any) =>
    c.id === classId ? { ...c, schedule: newSchedule } : c
  );

  await AsyncStorage.setItem("classes", JSON.stringify(updated));
};

export const updateClasses = async (classes: any[]) => {
  await AsyncStorage.setItem("classes", JSON.stringify(classes));
};


const SESSIONS_KEY = "sessions";
export const updateSessions = async (sessions: any[]) => {
  try {
    await AsyncStorage.setItem(
      SESSIONS_KEY,
      JSON.stringify(sessions)
    );
  } catch (error) {
    console.error("Error updating sessions:", error);
  }
};

// In data/store.ts
export const updateClass = async (classId: number, updatedStudents: any[]) => {
  const classes = await getClasses();
  const classIndex = classes.findIndex(c => c.id === classId);

  if (classIndex !== -1) {
    classes[classIndex].students = updatedStudents;
    classes[classIndex].totalStudents = updatedStudents.length;

    // Make sure we're saving the full student object including faceRegistered
    console.log("💾 Saving class:", classes[classIndex].name,
      "Students:", classes[classIndex].students.map((s: any) => `${s.name}: faceRegistered=${s.faceRegistered}`));

    await AsyncStorage.setItem('classes', JSON.stringify(classes));
  }
};

