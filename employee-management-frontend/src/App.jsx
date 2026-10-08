import { useEffect, useState } from "react";

const App = () => {

  const [employees, setEmployees] = useState([]);
  const [loading, setLoading] = useState(true);

  const fetchEmployees = async () => {
    try {
      const response = await fetch(`${import.meta.env.VITE_API_URL}/employees`);

      if (!response.ok) {
        throw new Error("Failed to fetch employees");
      }

      const data = await response.json();
      setEmployees(data);
    } catch (error) {
      console.error("Error fetching employees:", error);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchEmployees();
  }, []);

  return (
    <div className="min-h-screen bg-gray-100 px-6 py-10">

      <div className="mx-auto max-w-7xl">

        <h1 className="mb-6 text-3xl font-bold text-gray-800">
          Employee Management
        </h1>

        <div className="overflow-hidden rounded-lg bg-white shadow">

          {loading ? (
            <div className="p-6 text-center text-gray-600">
              Loading employees...
            </div>
          ) : (
            <div className="overflow-x-auto">

              <table className="w-full text-left">

                <thead className="bg-gray-800 text-white">
                  <tr>
                    <th className="px-6 py-3">ID</th>
                    <th className="px-6 py-3">Name</th>
                    <th className="px-6 py-3">Email</th>
                    <th className="px-6 py-3">Department</th>
                    <th className="px-6 py-3">Salary</th>
                    <th className="px-6 py-3">Phone</th>
                  </tr>
                </thead>

                <tbody>

                  {employees.length > 0 ? (
                    employees.map((employee) => (
                      <tr
                        key={employee.id}
                        className="border-b border-gray-200 hover:bg-gray-50"
                      >
                        <td className="px-6 py-4">
                          {employee.id}
                        </td>

                        <td className="px-6 py-4 font-medium text-gray-800">
                          {employee.name}
                        </td>

                        <td className="px-6 py-4">
                          {employee.email}
                        </td>

                        <td className="px-6 py-4">
                          {employee.department}
                        </td>

                        <td className="px-6 py-4">
                          ₹{employee.salary}
                        </td>

                        <td className="px-6 py-4">
                          {employee.phone || "-"}
                        </td>
                      </tr>
                    ))
                  ) : (
                    <tr>
                      <td
                        colSpan="6"
                        className="px-6 py-8 text-center text-gray-500"
                      >
                        No employees found
                      </td>
                    </tr>
                  )}

                </tbody>

              </table>

            </div>
          )}

        </div>

      </div>

    </div>
  );
}

export default App;