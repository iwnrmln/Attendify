export const generateOverallReportHTML = ({
  analytics,
  className,
  trendChartUrl,
}: any): string => {
  return `
  <html>
    <head>
      <meta charset="UTF-8">
      <title>Overall Attendance Report - ${className}</title>
      <style>
        @page {
          size: A4;
          margin: 20mm;
        }
        
        * { margin: 0; padding: 0; box-sizing: border-box; }
        
        body {
          font-family: 'Times New Roman', Georgia, 'Palatino Linotype', 'Book Antiqua', Palatino, serif;
          background: #ffffff;
          padding: 0;
          color: #1a1a1a;
          line-height: 1.7;
          font-size: 12pt;
        }

        .container {
          max-width: 210mm;
          margin: auto;
          background: white;
          padding: 0;
        }

        .header {
          text-align: center;
          padding: 30px 40px 20px;
          border-bottom: 3px double #1a1a1a;
          margin-bottom: 25px;
        }

        .logo {
          font-size: 14pt;
          font-weight: bold;
          text-transform: uppercase;
          letter-spacing: 3px;
          color: #333;
          margin-bottom: 15px;
        }

        .title {
          font-size: 22pt;
          font-weight: bold;
          text-transform: uppercase;
          letter-spacing: 1px;
          color: #1a1a1a;
          margin-bottom: 6px;
        }

        .subtitle {
          font-size: 13pt;
          color: #555;
          font-style: italic;
        }

        .date-range {
          font-size: 10pt;
          color: #777;
          margin-top: 8px;
        }

        .content {
          padding: 0 40px;
        }

        .section {
          margin-bottom: 28px;
          page-break-inside: avoid;
        }

        .section-title {
          font-size: 13pt;
          font-weight: bold;
          color: #1a1a1a;
          margin-bottom: 12px;
          padding-bottom: 4px;
          border-bottom: 1px solid #999;
          text-transform: uppercase;
          letter-spacing: 1px;
        }

        .summary-box {
          background: #fafafa;
          border: 1px solid #ddd;
          padding: 16px 20px;
          margin-bottom: 15px;
        }

        .summary-box p {
          margin: 6px 0;
          font-size: 11pt;
        }

        .summary-box strong {
          font-weight: 600;
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
          padding: 16px 14px;
          text-align: center;
          border: 1px solid #ddd;
        }

        .card-label {
          font-size: 9pt;
          text-transform: uppercase;
          color: #666;
          letter-spacing: 1px;
          margin-bottom: 6px;
        }

        .card-value {
          font-size: 20pt;
          font-weight: bold;
          color: #1a1a1a;
          margin: 0;
        }

        .chart-container {
          margin: 20px 0;
          text-align: center;
          border: 1px solid #ddd;
          padding: 15px;
          background: #fafafa;
        }

        .chart-container img {
          width: 100%;
          max-width: 700px;
          height: auto;
        }

        .highlights-grid {
          display: flex;
          gap: 15px;
          flex-wrap: wrap;
        }

        .highlight-card {
          flex: 1;
          min-width: 200px;
          padding: 14px 18px;
          border: 1px solid #ddd;
          background: #fafafa;
        }

        .highlight-label {
          font-size: 9pt;
          text-transform: uppercase;
          color: #666;
          letter-spacing: 1px;
          margin-bottom: 4px;
          font-weight: 600;
        }

        .highlight-value {
          font-size: 18pt;
          font-weight: bold;
          margin: 4px 0;
        }

        .highlight-date {
          font-size: 10pt;
          color: #777;
        }

        .highlight-best .highlight-value { color: #1a7a3a; }
        .highlight-worst .highlight-value { color: #c41e3a; }

        .table-container {
          margin-top: 10px;
        }

        table {
          width: 100%;
          border-collapse: collapse;
          font-size: 10pt;
        }

        thead th {
          background: #f5f5f5;
          padding: 10px 12px;
          text-align: left;
          font-weight: 600;
          color: #1a1a1a;
          border-bottom: 2px solid #999;
          font-size: 9pt;
          text-transform: uppercase;
          letter-spacing: 0.5px;
        }

        tbody td {
          padding: 9px 12px;
          border-bottom: 1px solid #e5e5e5;
          vertical-align: middle;
        }

        tbody tr:nth-child(even) td {
          background: #fafafa;
        }

        .student-name {
          font-weight: 600;
          color: #1a1a1a;
        }

        .student-id {
          font-size: 8pt;
          color: #999;
          font-family: 'Courier New', Courier, monospace;
        }

        .progress-cell {
          display: flex;
          align-items: center;
          gap: 8px;
        }

        .mini-progress {
          flex: 1;
          height: 6px;
          background: #e5e5e5;
          min-width: 50px;
        }

        .mini-progress-fill {
          height: 100%;
        }

        .risk-text {
          font-size: 9pt;
        }

        .risk-high { color: #c41e3a; font-weight: 600; }
        .risk-moderate { color: #cc6600; font-weight: 600; }
        .risk-low { color: #1a7a3a; }
        .risk-excellent { color: #0d6b3d; }

        .recommendations-box {
          background: #fafafa;
          border: 1px solid #ddd;
          padding: 16px 20px;
          margin-top: 10px;
        }

        .recommendations-box p {
          margin: 5px 0;
          font-size: 11pt;
        }

        .recommendations-box strong {
          font-weight: 600;
        }

        .signature-section {
          margin-top: 40px;
          display: flex;
          justify-content: space-between;
        }

        .signature-block {
          width: 45%;
        }

        .signature-line {
          border-top: 1px solid #1a1a1a;
          margin-top: 50px;
          padding-top: 5px;
          font-size: 10pt;
          color: #555;
        }

        .footer {
          margin-top: 30px;
          padding: 15px 40px;
          border-top: 1px solid #ddd;
          text-align: center;
          font-size: 9pt;
          color: #999;
        }

        .footer p {
          margin: 2px 0;
        }

        .page-break {
          page-break-before: always;
        }

        @media print {
          body {
            background: white;
          }
          
          .container {
            box-shadow: none;
            margin: 0;
            max-width: 100%;
          }

          .page-break {
            page-break-before: always;
          }
          
          .section {
            page-break-inside: avoid;
          }
        }
      </style>
    </head>

    <body>
      <div class="container">

        <!-- HEADER -->
        <div class="header">
          <div class="logo">Attendify Facial Attendance System</div>
          <div class="title">Overall Attendance Report</div>
          <div class="subtitle">${className}</div>
          <div class="date-range">
            Reporting Period: ${analytics.trendData && analytics.trendData.length > 0 ? 
              `${analytics.trendData[0].date} — ${analytics.trendData[analytics.trendData.length - 1].date}` : 
              'No sessions recorded'}
          </div>
        </div>

        <div class="content">

          <!-- 1. EXECUTIVE SUMMARY -->
          <div class="section">
            <div class="section-title">1. Executive Summary</div>
            <div class="summary-box">
              <p>
                This report presents a comprehensive analysis of attendance records for 
                <strong> ${className}</strong> over the reporting period.
                A total of <strong>${analytics.totalSessions} session(s)</strong> 
                were conducted during this period.
              </p>
              <p>
                The overall average attendance rate is 
                <strong> ${analytics.averageAttendance.toFixed(1)}%</strong>.
              </p>
              ${analytics.averageAttendance >= 80 ? 
                '<p>The attendance performance meets institutional standards and is considered <strong>satisfactory</strong>.</p>' :
                analytics.averageAttendance >= 60 ?
                '<p>The attendance performance is <strong>moderate</strong> and may require monitoring to ensure continued improvement.</p>' :
                '<p>The attendance performance is <strong>below institutional expectations</strong> and requires immediate intervention.</p>'
              }
              ${analytics.totalUnknown > 0 ? 
                `<p>A total of <strong>${analytics.totalUnknown}</strong> unrecognized face(s) were detected across all sessions.</p>` : ''}
            </div>
          </div>

          <!-- 2. KEY METRICS -->
          <div class="section">
            <div class="section-title">2. Key Metrics</div>
            
            <div class="grid">
              <div class="card">
                <div class="card-label">Total Sessions</div>
                <div class="card-value">${analytics.totalSessions}</div>
              </div>

              <div class="card">
                <div class="card-label">Average Attendance</div>
                <div class="card-value">${analytics.averageAttendance.toFixed(1)}%</div>
              </div>

              <div class="card">
                <div class="card-label">Total Students</div>
                <div class="card-value">${analytics.studentPerformance?.length || 0}</div>
              </div>

              ${analytics.totalUnknown !== undefined ? `
              <div class="card">
                <div class="card-label">Unknown Detections</div>
                <div class="card-value">${analytics.totalUnknown}</div>
              </div>
              ` : ''}
            </div>
          </div>

          <!-- 3. ATTENDANCE TREND -->
          ${trendChartUrl ? `
          <div class="section">
            <div class="section-title">3. Attendance Trend Analysis</div>
            <div class="chart-container">
              <img src="${trendChartUrl}" alt="Figure 1: Attendance Trend Chart" />
              <p style="text-align: center; font-size: 9pt; color: #777; margin-top: 8px; font-style: italic;">
                Figure 1: Attendance rate trend over the reporting period
              </p>
            </div>
          </div>
          ` : ''}

          <!-- 4. SESSION HIGHLIGHTS -->
          ${analytics.highest && analytics.lowest ? `
          <div class="section">
            <div class="section-title">4. Session Highlights</div>
            <div class="highlights-grid">
              <div class="highlight-card highlight-best">
                <div class="highlight-label">Highest Attendance</div>
                <div class="highlight-value">${analytics.highest.value.toFixed(1)}%</div>
                <div class="highlight-date">Recorded on ${analytics.highest.date}</div>
              </div>
              <div class="highlight-card highlight-worst">
                <div class="highlight-label">Lowest Attendance</div>
                <div class="highlight-value">${analytics.lowest.value.toFixed(1)}%</div>
                <div class="highlight-date">Recorded on ${analytics.lowest.date}</div>
              </div>
            </div>
          </div>
          ` : ''}

          <!-- 5. STUDENT PERFORMANCE -->
          <div class="section">
            <div class="section-title">5. Individual Student Performance</div>
            
            <div class="table-container">
              <table>
                <thead>
                  <tr>
                    <th>No.</th>
                    <th>Student Name</th>
                    <th>Student ID</th>
                    <th>Attendance Rate</th>
                    <th>Status</th>
                  </tr>
                </thead>
                <tbody>
                  ${analytics.studentPerformance
                    .map((s: any, index: number) => {
                      const rate = s.rate || 0;
                      const barColor = rate >= 80 ? '#1a7a3a' : rate >= 60 ? '#cc6600' : '#c41e3a';
                      const riskLevel = rate >= 90 ? 'Excellent' : rate >= 80 ? 'Satisfactory' : rate >= 60 ? 'Moderate' : 'At Risk';
                      const riskClass = rate >= 90 ? 'risk-excellent' : rate >= 80 ? 'risk-low' : rate >= 60 ? 'risk-moderate' : 'risk-high';
                      
                      return `
                      <tr>
                        <td>${index + 1}</td>
                        <td class="student-name">${s.name}</td>
                        <td class="student-id">${s.student_id || 'N/A'}</td>
                        <td>
                          <div class="progress-cell">
                            <div class="mini-progress">
                              <div class="mini-progress-fill" style="width: ${rate}%; background: ${barColor};"></div>
                            </div>
                            <strong>${rate}%</strong>
                          </div>
                        </td>
                        <td class="risk-text ${riskClass}">${riskLevel}</td>
                      </tr>
                    `;
                    })
                    .join("")}
                </tbody>
              </table>
            </div>
          </div>

          <!-- 6. ANALYSIS & RECOMMENDATIONS -->
          <div class="section">
            <div class="section-title">6. Analysis &amp; Recommendations</div>
            <div class="recommendations-box">
              ${analytics.averageAttendance < 60 ? `
                <p><strong>Critical Concern:</strong> The overall attendance rate of ${analytics.averageAttendance.toFixed(1)}% is significantly below the institutional benchmark. Immediate intervention strategies should be implemented, including:</p>
                <p>&bull; Individual counseling for students with attendance below 60%</p>
                <p>&bull; Parent/guardian notification for at-risk students</p>
                <p>&bull; Review of class schedule and timing for potential conflicts</p>
              ` : analytics.averageAttendance < 80 ? `
                <p><strong>Moderate Concern:</strong> The overall attendance rate of ${analytics.averageAttendance.toFixed(1)}% indicates room for improvement. Recommended actions include:</p>
                <p>&bull; Monitoring of students with irregular attendance patterns</p>
                <p>&bull; Implementation of attendance incentives</p>
                <p>&bull; Regular review of attendance data to identify trends</p>
              ` : `
                <p><strong>Satisfactory Performance:</strong> The overall attendance rate of ${analytics.averageAttendance.toFixed(1)}% meets institutional standards. Recommendations to maintain this performance:</p>
                <p>&bull; Continue current attendance monitoring practices</p>
                <p>&bull; Recognize and reward consistent attendance</p>
                <p>&bull; Maintain communication with students regarding attendance expectations</p>
              `}
              ${analytics.studentPerformance && analytics.studentPerformance.filter((s: any) => s.rate < 60).length > 0 ? `
                <p style="margin-top: 8px;"><strong>Note:</strong> <strong>${analytics.studentPerformance.filter((s: any) => s.rate < 60).length} student(s)</strong> have been identified with attendance rates below 60% and require individual attention and support.</p>
              ` : ''}
            </div>
          </div>

          <!-- 7. CONCLUSION -->
          <div class="section">
            <div class="section-title">7. Conclusion</div>
            <div class="summary-box">
              <p>
                This attendance report has been automatically generated by the Attendify Facial Attendance System 
                based on data collected during the reporting period. The data presented herein reflects the attendance 
                records captured through the facial recognition attendance system.
              </p>
              <p>
                It is recommended that this report be reviewed by the appropriate academic staff and any discrepancies 
                be addressed through manual verification of attendance records.
              </p>
            </div>
          </div>

          <!-- SIGNATURE SECTION -->
          <div class="signature-section">
            <div class="signature-block">
              <div class="signature-line">Prepared by</div>
            </div>
            <div class="signature-block">
              <div class="signature-line">Reviewed by</div>
            </div>
          </div>

        </div>

        <!-- FOOTER -->
        <div class="footer">
          <p><strong>Attendify Facial Attendance System</strong></p>
          <p>This is an automated report generated on ${new Date().toLocaleDateString('en-GB', { 
            day: 'numeric', month: 'long', year: 'numeric' 
          })} at ${new Date().toLocaleTimeString('en-GB', { 
            hour: '2-digit', minute: '2-digit' 
          })}</p>
          <p style="margin-top: 5px;">Document Reference: ATT-${className.replace(/\s+/g, '-').toUpperCase()}-${new Date().getFullYear()}</p>
        </div>

      </div>
    </body>
  </html>
  `;
};