import React, { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import axios from "axios";
import { toast } from "react-toastify";
import "../styles/AttendanceList.css";

export default function AttendanceList() {
  const [records, setRecords] = useState([]);
  const [loading, setLoading] = useState(false);

  // pagination states
  const [page, setPage] = useState(1);
  const [limit, setLimit] = useState(20);
  const [total, setTotal] = useState(0);

  // filters
  const [search, setSearch] = useState("");
  const [typeFilter, setTypeFilter] = useState("");

  const token =
    JSON.parse(localStorage.getItem("auth")) ||
    localStorage.getItem("token") ||
    "";

  // API CALL
  const fetchRecords = async (p = page, l = limit) => {
    setLoading(true);
    try {
      const res = await axios.get(
        `/api/v1/attendance/list?page=${p}&limit=${l}`,
        {
          headers: { Authorization: `Bearer ${token}` },
        }
      );

      if (res.data) {
        setRecords(res.data.records || []);
        setTotal(res.data.total || 0);
        setPage(res.data.page || p);
        setLimit(res.data.limit || l);
      }
    } catch (err) {
      console.error(err);
      const msg =
        err.response?.data?.message ||
        err.message ||
        "Failed to load attendance records";
      toast.error(msg);
    }
    setLoading(false);
  };

  // Initial load
  useEffect(() => {
    fetchRecords(1, limit);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // Pagination
  const handlePrev = () => {
    if (page > 1) fetchRecords(page - 1, limit);
  };

  const handleNext = () => {
    const maxPage = Math.ceil(total / limit) || 1;
    if (page < maxPage) fetchRecords(page + 1, limit);
  };

  // Page size update
  const handleLimitChange = (e) => {
    const newLimit = Number(e.target.value);
    setLimit(newLimit);
    fetchRecords(1, newLimit);
  };

  // Apply search + filters on UI (not API)
  const filtered = records.filter((r) => {
    const matchesName =
      r.userId?.name?.toLowerCase().includes(search.toLowerCase()) ||
      r.userId?.email?.toLowerCase().includes(search.toLowerCase());

    const matchesType =
      typeFilter === "" ? true : r.attendanceType === typeFilter;

    return matchesName && matchesType;
  });

  return (
    <div className="attendance-list-page">
      <h2>Attendance Records</h2>

      {/* SEARCH + FILTERS */}
      <div className="filter-row" style={{ marginBottom: 20, display: "flex", gap: 15 }}>
        <input
          type="text"
          placeholder="Search by name or email"
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          style={{
            padding: "6px 10px",
            width: "240px",
            borderRadius: "6px",
            border: "1px solid #DDD",
          }}
        />

        <select
          value={typeFilter}
          onChange={(e) => setTypeFilter(e.target.value)}
          style={{
            padding: "6px 10px",
            borderRadius: "6px",
            border: "1px solid #DDD",
          }}
        >
          <option value="">All Types</option>
          <option value="IN">IN</option>
          <option value="OUT">OUT</option>
        </select>

       
      </div>

      {loading ? (
        <div className="loading">Loading...</div>
      ) : (
        <>
          {/* TABLE */}
          <div className="table-wrap">
            <table className="attendance-table">
              <thead>
                <tr>
                  <th>Name</th>
                  <th>Type</th>
                  <th>Device Time</th>
                  <th>Latitude</th>
                  <th>Longitude</th>
                  <th>Address</th>
                  <th>Battery (%)</th>
                </tr>
              </thead>

              <tbody>
                {filtered.length === 0 ? (
                  <tr>
                    <td colSpan={7} style={{ textAlign: "center" }}>
                      No records found
                    </td>
                  </tr>
                ) : (
                  filtered.map((r) => (
                    <tr key={r._id}>
                      {/* NAME → CLICKABLE LINK */}
                     <td>
  <Link
    to={`/dashboard/attendance/${r.userId._id}?date=${r.deviceTime.split("T")[0]}`}
    style={{
      color: "#2563eb",
      textDecoration: "underline",
      fontWeight: "500",
    }}
  >
    {r.userId?.name || "-"}
  </Link>
</td>


                      <td>{r.attendanceType}</td>
                      <td>
                        {r.deviceTime
                          ? new Date(r.deviceTime).toLocaleString()
                          : ""}
                      </td>
                      <td>{r.latitude}</td>
                      <td>{r.longitude}</td>
                      <td className="address-cell">{r.address}</td>
                      <td>{r.batteryPercentage ?? "-"}</td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>

          {/* PAGINATION */}
          <div
            className="pager"
            style={{
              marginTop: 15,
              display: "flex",
              alignItems: "center",
              gap: 15,
            }}
          >
            <button onClick={handlePrev} disabled={page <= 1}>
              Prev
            </button>

            <span>
              Page {page} / {Math.max(1, Math.ceil(total / limit))}
            </span>

            <button
              onClick={handleNext}
              disabled={page >= Math.ceil(total / limit)}
            >
              Next
            </button>
          </div>
        </>
      )}
    </div>
  );
}
