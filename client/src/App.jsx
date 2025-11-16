import { RouterProvider, createBrowserRouter } from "react-router-dom";
import { Dashboard, HomeLayout, Landing, Login, Logout, Register } from "./pages";
import { ToastContainer } from 'react-toastify';

import Attendance from "./pages/Attendance";
import AttendanceList from "./pages/AttendanceList";
import GetAttendanceByIdDetails from "./pages/GetAttendanceByIdDetails";

const router = createBrowserRouter([
  {
    path: "/",
    element: <HomeLayout />,
    children: [
      { index: true, element: <Landing /> },
      { path: "login", element: <Login /> },
      { path: "register", element: <Register /> },

      {
        path: "dashboard",
        element: <Dashboard />,
        children: [
          { index: true, element: <Attendance /> },
          { path: "attendance", element: <Attendance /> },
          { path: "attendance-list", element: <AttendanceList /> },

          // ✔ DETAILS PAGE INSIDE DASHBOARD NOW
          { path: "attendance/:id", element: <GetAttendanceByIdDetails /> },
        ],
      },

      { path: "logout", element: <Logout /> },
    ],
  },
]);

function App() {
  return (
    <>
      <RouterProvider router={router} />
      <ToastContainer position="top-center" />
    </>
  );
}

export default App;
