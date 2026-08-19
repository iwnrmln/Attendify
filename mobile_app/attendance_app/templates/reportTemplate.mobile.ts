export const generateMobileReportHTML = ({
    session,
    selectedClass,
    presentCount,
    absentCount,
    percentage,
    chartUrl,
}: any) => {
    const insight =
        percentage >= 80
            ? "Overall attendance is excellent."
            : percentage >= 60
                ? "Attendance is acceptable but could be improved."
                : "Attendance is below expectations and requires attention.";

    const avgConfidence = session.results
        .filter((r: any) => r.confidence)
        .reduce((sum: number, r: any) => sum + r.confidence, 0) / 
        (session.results.filter((r: any) => r.confidence).length || 1);

    return `
  <html>
    <head>
      <meta name="viewport" content="width=device-width, initial-scale=1.0">
      <style>
        * { margin: 0; padding: 0; box-sizing: border-box; }
        
        body {
          font-family: 'Times New Roman', Georgia, serif;
          padding: 30px 25px;
          color: #1a1a1a;
          line-height: 1.6;
          font-size: 13px;
        }

        .header {
          text-align: center;
          border-bottom: 3px double #F96C1B;
          padding-bottom: 15px;
          margin-bottom: 20px;
        }

        .logo {
          font-size: 32px;
          margin-bottom: 5px;
        }

        .title {
          font-size: 22px;
          font-weight: bold;
          text-transform: uppercase;
          letter-spacing: 1px;
          color: #F96C1B;
        }

        .subtitle {
          font-size: 13px;
          color: #555;
          margin-top: 5px;
        }

        .section {
          margin-top: 18px;
          page-break-inside: avoid;
        }

        .section-title {
          font-weight: bold;
          font-size: 14px;
          text-transform: uppercase;
          margin-bottom: 8px;
          padding-bottom: 4px;
          border-bottom: 1px solid #ddd;
          color: #F96C1B;
        }

        .info-table {
          width: 100%;
          margin-bottom: 10px;
        }

        .info-table td {
          padding: 4px 8px;
          vertical-align: top;
        }

        .info-table td:first-child {
          font-weight: bold;
          width: 120px;
        }

        .stats-grid {
          display: flex;
          gap: 10px;
          margin: 10px 0;
        }

        .stat-card {
          flex: 1;
          border: 1px solid #ddd;
          padding: 10px;
          text-align: center;
          border-radius: 6px;
        }

        .stat-card h2 {
          font-size: 22px;
          margin: 0;
        }

        .stat-card p {
          font-size: 10px;
          text-transform: uppercase;
          color: #666;
          margin-top: 2px;
        }

        .stat-present { border-top: 3px solid #10B981; }
        .stat-present h2 { color: #10B981; }
        .stat-absent { border-top: 3px solid #EF4444; }
        .stat-absent h2 { color: #EF4444; }
        .stat-unknown { border-top: 3px solid #F59E0B; }
        .stat-unknown h2 { color: #F59E0B; }

        .chart-container {
          text-align: center;
          margin: 15px 0;
        }

        .chart-container img {
          max-width: 250px;
          height: auto;
        }

        .insight-box {
          border: 1px solid #FED7AA;
          background: #FFF7ED;
          padding: 10px 14px;
          border-radius: 6px;
          margin: 10px 0;
          font-style: italic;
          color: #9A3412;
        }

        .attendance-table {
          width: 100%;
          border-collapse: collapse;
          margin-top: 8px;
          font-size: 12px;
        }

        .attendance-table th {
          background: #f5f5f5;
          padding: 8px 6px;
          text-align: left;
          font-weight: bold;
          border: 1px solid #ddd;
          font-size: 11px;
          text-transform: uppercase;
        }

        .attendance-table td {
          padding: 6px;
          border: 1px solid #ddd;
          vertical-align: middle;
        }

        .attendance-table tr:nth-child(even) td {
          background: #fafafa;
        }

        .status-present {
          color: #059669;
          font-weight: bold;
        }

        .status-absent {
          color: #DC2626;
          font-weight: bold;
        }

        .status-unknown {
          color: #EA580C;
          font-weight: bold;
        }

        .badge {
          display: inline-block;
          padding: 2px 8px;
          border-radius: 10px;
          font-size: 10px;
          font-weight: bold;
        }

        .badge-present {
          background: #ECFDF5;
          color: #059669;
        }

        .badge-absent {
          background: #FEF2F2;
          color: #DC2626;
        }

        .badge-unknown {
          background: #FFF7ED;
          color: #EA580C;
        }

        .footer {
          margin-top: 30px;
          padding-top: 10px;
          border-top: 1px solid #ddd;
          font-size: 10px;
          text-align: center;
          color: #999;
        }

        .face-stats {
          display: flex;
          gap: 10px;
          margin: 10px 0;
        }

        .face-stat-item {
          flex: 1;
          text-align: center;
          padding: 8px;
          border: 1px solid #e5e7eb;
          border-radius: 6px;
        }

        .face-stat-item h3 {
          font-size: 18px;
          color: #F96C1B;
          margin: 0;
        }

        .face-stat-item p {
          font-size: 9px;
          text-transform: uppercase;
          color: #666;
          margin-top: 2px;
        }

        @media print {
          body { padding: 20px; }
          .section { page-break-inside: avoid; }
        }
      </style>
    </head>

    <body>

      <!-- HEADER -->
      <div class="header">
        <div class="logo">📋</div>
        <div class="title">Attendance Report</div>
        <div class="subtitle">
          ${session.className} &bull; ${session.date} at ${session.time}
        </div>
      </div>

      <!-- SESSION INFO -->
      <div class="section">
        <div class="section-title">1. Session Information</div>
        <table class="info-table">
          <tr><td>Class:</td><td>${session.className}</td></tr>
          <tr><td>Date:</td><td>${session.date}</td></tr>
          <tr><td>Time:</td><td>${session.time}</td></tr>
          <tr><td>Total Students:</td><td>${selectedClass.students.length}</td></tr>
          <tr><td>Faces Detected:</td><td>${session.totalFacesDetected || session.results.length || 0}</td></tr>
        </table>
      </div>

      <!-- SUMMARY -->
      <div class="section">
        <div class="section-title">2. Executive Summary</div>
        <p>
          This report summarizes attendance for the session held on 
          <strong>${session.date}</strong>. 
          The overall attendance rate was <strong>${percentage}%</strong> 
          with <strong>${presentCount}</strong> students present out of 
          <strong>${selectedClass.students.length}</strong>.
        </p>
        
        <div class="insight-box">
          ${insight}
          ${session.unknownStudents > 0 ? ` ${session.unknownStudents} unrecognized face(s) were detected.` : ''}
          ${session.duplicateFaces > 0 ? ` ${session.duplicateFaces} duplicate detection(s) removed.` : ''}
        </div>

        <div class="stats-grid">
          <div class="stat-card stat-present">
            <h2>${presentCount}</h2>
            <p>Present</p>
          </div>
          <div class="stat-card stat-absent">
            <h2>${absentCount}</h2>
            <p>Absent</p>
          </div>
          <div class="stat-card stat-unknown">
            <h2>${session.unknownStudents || 0}</h2>
            <p>Unknown</p>
          </div>
        </div>

        <div class="chart-container">
          <img src="${chartUrl}" alt="Attendance Chart" />
        </div>
      </div>

      <!-- FACE DETECTION DETAILS -->
      ${(session.totalFacesDetected || session.uniqueFacesDetected) ? `
      <div class="section">
        <div class="section-title">3. Face Detection Details</div>
        
        <div class="face-stats">
          <div class="face-stat-item">
            <h3>${session.totalFacesDetected || 0}</h3>
            <p>Total Detected</p>
          </div>
          <div class="face-stat-item">
            <h3>${session.uniqueFacesDetected || 0}</h3>
            <p>Unique Faces</p>
          </div>
          ${session.duplicateFaces > 0 ? `
          <div class="face-stat-item">
            <h3>${session.duplicateFaces}</h3>
            <p>Duplicates</p>
          </div>
          ` : ''}
          <div class="face-stat-item">
            <h3>${avgConfidence ? (avgConfidence * 100).toFixed(1) + '%' : 'N/A'}</h3>
            <p>Avg Confidence</p>
          </div>
        </div>
      </div>
      ` : ''}

      <!-- ATTENDANCE LIST -->
      <div class="section">
        <div class="section-title">${session.totalFacesDetected || session.uniqueFacesDetected ? '4' : '3'}. Attendance Record</div>

        <table class="attendance-table">
          <thead>
            <tr>
              <th>#</th>
              <th>ID</th>
              <th>Name</th>
              <th>Status</th>
              ${session.results.some((r: any) => r.confidence) ? '<th>Conf.</th>' : ''}
            </tr>
          </thead>
          <tbody>
            ${selectedClass.students
              .map((student: any, index: number) => {
                const result = session.results.find(
                  (r: any) => r.student_id === student.student_id
                );
                const status = result?.status || "Absent";
                const confidence = result?.confidence;

                return `
                <tr>
                  <td>${index + 1}</td>
                  <td style="font-family: monospace; font-size: 11px;">${student.student_id}</td>
                  <td>${student.name}</td>
                  <td><span class="badge badge-${status.toLowerCase()}">${status}</span></td>
                  ${session.results.some((r: any) => r.confidence) ? 
                    `<td>${confidence ? (confidence * 100).toFixed(1) + '%' : '-'}</td>` : ''}
                </tr>
              `;
              })
              .join("")}
          </tbody>
        </table>
      </div>

      <!-- UNKNOWN FACES (if any) -->
      ${session.results.some((r: any) => r.status === 'Unknown') ? `
      <div class="section">
        <div class="section-title">${session.totalFacesDetected || session.uniqueFacesDetected ? '5' : '4'}. Unrecognized Faces</div>
        <table class="attendance-table">
          <thead>
            <tr>
              <th>Face ID</th>
              <th>Confidence</th>
              <th>Image Index</th>
            </tr>
          </thead>
          <tbody>
            ${session.results
              .filter((r: any) => r.status === 'Unknown')
              .map((r: any, i: number) => `
                <tr>
                  <td style="font-family: monospace;">${r.student_id || `Unknown #${i + 1}`}</td>
                  <td>${r.confidence ? (r.confidence * 100).toFixed(1) + '%' : 'N/A'}</td>
                  <td>Image ${(r.image_index || 0) + 1}</td>
                </tr>
              `)
              .join("")}
          </tbody>
        </table>
      </div>
      ` : ''}

      <!-- REMARKS -->
      <div class="section">
        <div class="section-title">Remarks</div>
        <p>
          This report was automatically generated by the <strong>Attendify</strong> 
          Facial Attendance System. Face detection and recognition were performed 
          using automated algorithms. Any discrepancies should be reviewed manually 
          by the instructor.
        </p>
      </div>

      <!-- FOOTER -->
      <div class="footer">
        <p>Generated by Attendify on ${new Date().toLocaleString()}</p>
        <p>This is a computer-generated document</p>
      </div>

    </body>
  </html>
  `;
};