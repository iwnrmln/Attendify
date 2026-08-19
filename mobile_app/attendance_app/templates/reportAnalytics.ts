export const generateClassAnalytics = (sessions: any[], selectedClass: any) => {
    const totalSessions = sessions.length;

    if (totalSessions === 0) {
        return null;
    }

    const trendData: any[] = [];

    let totalAttendanceRate = 0;
    let highest = { value: 0, date: "" };
    let lowest = { value: 100, date: "" };
    let totalUnknown = 0;

    const studentStats: any = {};

    // Initialize student stats
    selectedClass.students.forEach((s: any) => {
        studentStats[s.student_id] = {
            name: s.name,
            present: 0,
            total: totalSessions,
        };
    });

    sessions.forEach((session) => {
        const presentCount = session.results.filter(
            (r: any) => r.status === "Present"
        ).length;

        const rate = (presentCount / selectedClass.students.length) * 100;

        totalAttendanceRate += rate;

        if (rate > highest.value) {
            highest = { value: rate, date: session.date };
        }

        if (rate < lowest.value) {
            lowest = { value: rate, date: session.date };
        }

        totalUnknown += session.unknownStudents || 0;

        // Update per-student stats
        selectedClass.students.forEach((student: any) => {
            const found = session.results.find(
                (r: any) => r.student_id === student.student_id
            );

            if (found && found.status === "Present") {
                studentStats[student.student_id].present += 1;
            }
        });

        trendData.push({
            date: `${session.date} (S${trendData.length + 1})`,
            rate: Math.round(rate),
        });
    });

    const averageAttendance = Math.round(
        totalAttendanceRate / totalSessions
    );

    // Convert to array
    const studentPerformance = Object.values(studentStats).map((s: any) => {
        const rate = Math.round((s.present / s.total) * 100);
        return {
            ...s,
            rate,
            risk:
                rate < 60 ? "High"
                    : rate < 80 ? "Moderate"
                        : "Low",
        };
    });

    // At-risk students
    const atRisk = studentPerformance.filter((s: any) => s.rate < 60);

    return {
        totalSessions,
        averageAttendance,
        highest,
        lowest,
        totalUnknown,
        studentPerformance,
        atRisk,
        trendData,
    };
};

