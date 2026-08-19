// templates/reportTemplate.web.ts

export const generateWebReportHTML = ({
  session,
  selectedClass,
  presentCount,
  absentCount,
  percentage,
  chartUrl,
}: any): string => {
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
      <title>Attendance Report - ${session.className}</title>
      <style>
        * { margin: 0; padding: 0; box-sizing: border-box; }
        
        body {
          font-family: 'Segoe UI', Tahoma, Geneva, Verdana, sans-serif;
          background: #f0f2f5;
          padding: 30px;
          color: #1a1a1a;
        }

        .container {
          max-width: 900px;
          margin: auto;
          background: white;
          border-radius: 16px;
          box-shadow: 0 4px 20px rgba(0,0,0,0.08);
          overflow: hidden;
        }

        .header {
          background: linear-gradient(135deg, #F96C1B, #FF8C42);
          color: white;
          padding: 30px 40px;
          text-align: center;
        }

        .header-icon {
          width: 60px;
          height: 60px;
          margin: 0 auto 15px;
          background: rgba(255,255,255,0.2);
          border-radius: 50%;
          display: flex;
          align-items: center;
          justify-content: center;
          font-size: 28px;
        }

        .title {
          font-size: 28px;
          font-weight: bold;
          margin-bottom: 8px;
        }

        .subtitle {
          font-size: 16px;
          opacity: 0.9;
        }

        .content {
          padding: 30px 40px;
        }

        .section {
          margin-bottom: 30px;
        }

        .section-title {
          font-size: 18px;
          font-weight: bold;
          color: #F96C1B;
          margin-bottom: 15px;
          padding-bottom: 8px;
          border-bottom: 2px solid #FFF0E5;
          display: flex;
          align-items: center;
          gap: 8px;
        }

        .info-row {
          display: flex;
          gap: 20px;
          flex-wrap: wrap;
          margin-bottom: 15px;
        }

        .info-item {
          flex: 1;
          min-width: 150px;
          background: #F9FAFB;
          padding: 12px 16px;
          border-radius: 8px;
          border-left: 3px solid #F96C1B;
        }

        .info-label {
          font-size: 11px;
          text-transform: uppercase;
          color: #6B7280;
          font-weight: 600;
          margin-bottom: 4px;
        }

        .info-value {
          font-size: 16px;
          font-weight: 600;
          color: #1F2937;
        }

        .grid {
          display: flex;
          gap: 15px;
          flex-wrap: wrap;
        }

        .card {
          flex: 1;
          min-width: 130px;
          background: white;
          padding: 20px;
          border-radius: 12px;
          text-align: center;
          border: 1px solid #E5E7EB;
          transition: transform 0.2s;
        }

        .card:hover { transform: translateY(-2px); }

        .card-icon {
          font-size: 24px;
          margin-bottom: 8px;
        }

        .card h2 {
          font-size: 28px;
          margin: 5px 0;
        }

        .card p {
          font-size: 12px;
          color: #6B7280;
          font-weight: 500;
          text-transform: uppercase;
          letter-spacing: 0.5px;
        }

        .card-green { border-top: 3px solid #10B981; }
        .card-green h2 { color: #10B981; }
        .card-red { border-top: 3px solid #EF4444; }
        .card-red h2 { color: #EF4444; }
        .card-yellow { border-top: 3px solid #F59E0B; }
        .card-yellow h2 { color: #F59E0B; }
        .card-blue { border-top: 3px solid #3B82F6; }
        .card-blue h2 { color: #3B82F6; }
        .card-purple { border-top: 3px solid #8B5CF6; }
        .card-purple h2 { color: #8B5CF6; }

        .chart-container {
          text-align: center;
          margin: 20px 0;
          background: #F9FAFB;
          padding: 20px;
          border-radius: 12px;
        }

        .chart-container img {
          max-width: 350px;
          height: auto;
        }

        .table-container {
          overflow-x: auto;
        }

        table {
          width: 100%;
          border-collapse: collapse;
          margin-top: 10px;
          font-size: 14px;
        }

        th {
          background: #F9FAFB;
          padding: 12px;
          text-align: left;
          font-weight: 600;
          color: #374151;
          border-bottom: 2px solid #E5E7EB;
          font-size: 12px;
          text-transform: uppercase;
          letter-spacing: 0.5px;
        }

        td {
          padding: 12px;
          border-bottom: 1px solid #F3F4F6;
        }

        tr:hover td {
          background: #FFFBF5;
        }

        .status-badge {
          display: inline-block;
          padding: 4px 12px;
          border-radius: 20px;
          font-size: 12px;
          font-weight: 600;
        }

        .status-present {
          background: #ECFDF5;
          color: #059669;
        }

        .status-absent {
          background: #FEF2F2;
          color: #DC2626;
        }

        .status-unknown {
          background: #FFF7ED;
          color: #EA580C;
        }

        .insight-box {
          background: linear-gradient(135deg, #FFF5F0, #FFF0E5);
          border-left: 4px solid #F96C1B;
          padding: 16px 20px;
          border-radius: 8px;
          margin-top: 15px;
        }

        .insight-text {
          font-size: 14px;
          color: #9A3412;
          line-height: 1.5;
        }

        .progress-bar {
          height: 10px;
          background: #F3F4F6;
          border-radius: 5px;
          overflow: hidden;
          margin-top: 10px;
        }

        .progress-fill {
          height: 100%;
          border-radius: 5px;
          transition: width 0.3s;
        }

        .footer {
          text-align: center;
          padding: 20px 40px;
          background: #F9FAFB;
          border-top: 1px solid #E5E7EB;
          font-size: 12px;
          color: #9CA3AF;
        }

        .footer img {
          height: 20px;
          vertical-align: middle;
          margin-right: 5px;
        }

        @media print {
          body { background: white; padding: 0; }
          .container { box-shadow: none; border-radius: 0; }
          .header { background: #F96C1B !important; -webkit-print-color-adjust: exact; }
          .card { break-inside: avoid; }
        }
      </style>
    </head>

    <body>
      <div class="container">
        
        <!-- HEADER -->
        <div class="header">
          <div class="header-icon">📋</div>
          <div class="title">Attendance Report</div>
          <div class="subtitle">${session.className} • ${session.date} at ${session.time}</div>
        </div>

        <div class="content">

          <!-- SESSION INFO -->
          <div class="section">
            <div class="section-title">📌 Session Information</div>
            <div class="info-row">
              <div class="info-item">
                <div class="info-label">Class</div>
                <div class="info-value">${session.className}</div>
              </div>
              <div class="info-item">
                <div class="info-label">Date</div>
                <div class="info-value">${session.date}</div>
              </div>
              <div class="info-item">
                <div class="info-label">Time</div>
                <div class="info-value">${session.time}</div>
              </div>
              <div class="info-item">
                <div class="info-label">Total Students</div>
                <div class="info-value">${selectedClass.students.length}</div>
              </div>
            </div>
          </div>

          <!-- ATTENDANCE OVERVIEW -->
          <div class="section">
            <div class="section-title">📊 Attendance Overview</div>
            
            <div class="grid">
              <div class="card card-green">
                <div class="card-icon">✅</div>
                <h2>${presentCount}</h2>
                <p>Present</p>
              </div>
              
              <div class="card card-red">
                <div class="card-icon">❌</div>
                <h2>${absentCount}</h2>
                <p>Absent</p>
              </div>
              
              <div class="card card-yellow">
                <div class="card-icon">❓</div>
                <h2>${session.unknownStudents || 0}</h2>
                <p>Unknown</p>
              </div>
              
              <div class="card card-blue">
                <div class="card-icon">👤</div>
                <h2>${session.totalFacesDetected || session.results.length}</h2>
                <p>Faces Detected</p>
              </div>
            </div>

            <!-- Attendance Rate -->
            <div style="margin-top: 20px;">
              <div style="display: flex; justify-content: space-between; align-items: center; margin-bottom: 5px;">
                <span style="font-weight: 600; font-size: 14px;">Attendance Rate</span>
                <span style="font-weight: bold; font-size: 18px; color: ${percentage >= 80 ? '#10B981' : percentage >= 60 ? '#F59E0B' : '#EF4444'};">${percentage}%</span>
              </div>
              <div class="progress-bar">
                <div class="progress-fill" style="width: ${percentage}%; background: ${percentage >= 80 ? '#10B981' : percentage >= 60 ? '#F59E0B' : '#EF4444'};"></div>
              </div>
            </div>

            <div class="chart-container">
              <img src="${chartUrl}" alt="Attendance Distribution Chart" />
            </div>
          </div>

          <!-- FACE DETECTION DETAILS -->
          ${(session.totalFacesDetected || session.uniqueFacesDetected) ? `
          <div class="section">
            <div class="section-title">🔍 Face Detection Summary</div>
            <div class="grid">
              <div class="card card-blue">
                <div class="card-icon">📸</div>
                <h2>${session.totalFacesDetected || 0}</h2>
                <p>Total Faces</p>
              </div>
              <div class="card card-green">
                <div class="card-icon">🧑</div>
                <h2>${session.uniqueFacesDetected || 0}</h2>
                <p>Unique Faces</p>
              </div>
              ${session.duplicateFaces > 0 ? `
              <div class="card card-purple">
                <div class="card-icon">🔄</div>
                <h2>${session.duplicateFaces}</h2>
                <p>Duplicates Removed</p>
              </div>
              ` : ''}
              <div class="card card-yellow">
                <div class="card-icon">🎯</div>
                <h2>${avgConfidence ? (avgConfidence * 100).toFixed(1) + '%' : 'N/A'}</h2>
                <p>Avg Confidence</p>
              </div>
            </div>
          </div>
          ` : ''}

          <!-- INSIGHT -->
          <div class="section">
            <div class="insight-box">
              <div style="font-weight: bold; margin-bottom: 5px; color: #F96C1B;">📝 Analysis</div>
              <div class="insight-text">
                ${insight}
                ${session.unknownStudents > 0 ? ` There were ${session.unknownStudents} unrecognized face(s) detected in this session.` : ''}
                ${session.duplicateFaces > 0 ? ` ${session.duplicateFaces} duplicate detection(s) were automatically removed.` : ''}
              </div>
            </div>
          </div>

          <!-- ATTENDANCE LIST -->
          <div class="section">
            <div class="section-title">📋 Detailed Attendance Record</div>
            <div class="table-container">
              <table>
                <thead>
                  <tr>
                    <th>#</th>
                    <th>Student ID</th>
                    <th>Name</th>
                    <th>Status</th>
                    ${session.results.some((r: any) => r.confidence) ? '<th>Confidence</th>' : ''}
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
                          <td style="font-family: monospace;">${student.student_id}</td>
                          <td>${student.name}</td>
                          <td><span class="status-badge status-${status.toLowerCase()}">${status}</span></td>
                          ${session.results.some((r: any) => r.confidence) ? 
                            `<td>${confidence ? (confidence * 100).toFixed(1) + '%' : '-'}</td>` : ''}
                        </tr>
                      `;
                    })
                    .join("")}
                </tbody>
              </table>
            </div>
          </div>

        </div>

        <!-- FOOTER -->
        <div class="footer">
          <p>Generated by <strong>Attendify</strong> Facial Attendance System</p>
          <p>Report generated on ${new Date().toLocaleString()}</p>
          <p style="margin-top: 5px; font-style: italic;">This is an automated report. Please verify for accuracy.</p>
        </div>

      </div>
    </body>
  </html>
  `;
};