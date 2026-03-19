import { useState } from "react";

const sampleData = [
  { id: "001", nom: "Dupont", prénom: "Jean", email: "jean.dupont@example.com" },
  { id: "002", nom: "Martin", prénom: "Sophie", email: "sophie.martin@example.com" },
  { id: "003", nom: "Bernard", prénom: "Pierre", email: "pierre.bernard@example.com" },
  { id: "004", nom: "Leroy", prénom: "Marie", email: "marie.leroy@example.com" },
];

const columns = ["ID", "Nom", "Prénom", "Email"];

export default function TableSection() {
  const [selectedRows, setSelectedRows] = useState<Set<string>>(new Set(["002"]));

  const toggleRow = (id: string) => {
    setSelectedRows((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  };

  return (
    <section className="space-y-6">
      <h2 className="text-[20px] font-semibold text-foreground border-b border-border pb-3">
        Table
      </h2>
      <div
        className="overflow-hidden"
        style={{ borderRadius: 8, border: "1px solid #B6BBD1" }}
      >
        <table className="w-full border-collapse">
          <thead>
            <tr style={{ backgroundColor: "#F4F6F9" }}>
              {columns.map((col) => (
                <th
                  key={col}
                  className="text-left text-[14px] font-semibold px-4 py-3"
                  style={{ color: "#232332", borderBottom: "1px solid #B6BBD1" }}
                >
                  {col}
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {sampleData.map((row, idx) => {
              const isSelected = selectedRows.has(row.id);
              return (
                <tr
                  key={row.id}
                  className={`transition-colors cursor-pointer ${!isSelected ? "hover:bg-[#E5E7EF]" : ""}`}
                  style={{
                    backgroundColor: isSelected
                      ? "rgba(201,211,255,0.20)" // Blue 200 #C9D3FF at 20% opacity
                      : "#FFFFFF",
                    borderBottom: idx < sampleData.length - 1 ? "1px solid #B6BBD1" : undefined,
                  }}
                  onClick={() => toggleRow(row.id)}
                >
                  <td className="text-[14px] font-normal px-4 py-3" style={{ color: "#232332" }}>{row.id}</td>
                  <td className="text-[14px] font-normal px-4 py-3" style={{ color: "#232332" }}>{row.nom}</td>
                  <td className="text-[14px] font-normal px-4 py-3" style={{ color: "#232332" }}>{row.prénom}</td>
                  <td className="text-[14px] font-normal px-4 py-3" style={{ color: "#232332" }}>{row.email}</td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>
    </section>
  );
}