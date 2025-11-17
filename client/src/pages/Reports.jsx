import React, { useEffect, useState } from "react";
import axios from "axios";
import "../styles/Reports.css";

export default function Reports() {
  const [month, setMonth] = useState("");
  const [report, setReport] = useState(null);
  const token = JSON.parse(localStorage.getItem("auth")) || "";

  const fetchReport = async () => {
    if (!month) return;

    try {
      const res = await axios.get(`/api/v1/attendance/report?month=${month}`, {
        headers: { Authorization: `Bearer ${token}` },
      });
      setReport(res.data);
    } catch (err) {
      console.error("REPORT ERROR:", err);
    }
  };

  useEffect(() => {
    fetchReport();
  }, [month]);

  return (
    <div className="reports-container">
      <h1 className="title">Attendance Reports</h1>
      <p className="subtitle">View your monthly attendance performance</p>

      {/* Month Selector */}
      <div className="report-filter">
        <label>Select Month</label>
        <select value={month} onChange={(e) => setMonth(e.target.value)}>
          <option value="">-- Choose Month --</option>
          <option value="1">January</option>
          <option value="2">February</option>
          <option value="3">March</option>
          <option value="4">April</option>
          <option value="5">May</option>
          <option value="6">June</option>
          <option value="7">July</option>
          <option value="8">August</option>
          <option value="9">September</option>
          <option value="10">October</option>
          <option value="11">November</option>
          <option value="12">December</option>
        </select>
      </div>

      {/* Report Results */}
      {report && (
        <div className="report-cards">
          <div className="report-card">
            <h3>Total Present Days</h3>
            <p className="value">{report.presentDays}</p>
          </div>

          <div className="report-card">
            <h3>Total Absent Days</h3>
            <p className="value">{report.absentDays}</p>
          </div>

          <div className="report-card">
            <h3>Total Working Hours</h3>
            <p className="value">{report.totalHours}</p>
          </div>

          <div className="report-card">
            <h3>Average Hours / Day</h3>
            <p className="value">{report.averageHours}</p>
          </div>
        </div>
      )}

      {!month && (
        <div className="no-report">Please select a month to view the report.</div>
      )}
    </div>
  );
}
